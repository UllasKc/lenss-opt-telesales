import express from 'express';
import { currentVersions, type Lakebase } from '../lib/answerCache.js';
import { runSql } from '../lib/sql.js';
import { CALL_COLUMNS } from './explorer.js';

const GOLD = process.env.LENSS_GOLD_SCHEMA ?? 'optus_telesales.optus_telesales_gold';
if (!/^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(GOLD)) {
  throw new Error(`LENSS_GOLD_SCHEMA must be "<catalog>.<schema>", got: ${GOLD}`);
}

/** Keep results this long if the data version can't be read (e.g. Lakebase down). */
const FALLBACK_TTL_MS = 10 * 60_000;

/** How often the app checks whether the data changed, to have the Command Center ready again. */
const WARM_EVERY_MS = 5 * 60_000;

/**
 * The Command Center only changes when deploy.py reloads gold data, so each
 * panel's result is kept in memory for the current data version: every
 * visitor gets it instantly and the warehouse isn't queried. The app fills it
 * itself when it starts and when the data changes (see `warm`), so the first
 * visitor doesn't wait for the warehouse either; visitors arriving while it is
 * being computed share that one computation.
 */
function dashboardCache(db: Lakebase) {
  const entries = new Map<string, { version: string | null; at: number; value: unknown }>();
  const inflight = new Map<string, Promise<unknown>>();
  const get = async (name: string, compute: () => Promise<unknown>): Promise<{ value: unknown; hit: boolean }> => {
    const version = await currentVersions(db).then((v) => v.data, () => null);
    const e = entries.get(name);
    if (e && (version && e.version ? e.version === version : Date.now() - e.at < FALLBACK_TTL_MS)) return { value: e.value, hit: true };
    const key = `${name}|${version}`;
    let p = inflight.get(key);
    if (!p) {
      p = compute()
        .then((value) => { entries.set(name, { version, at: Date.now(), value }); return value; })
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return { value: await p, hit: false };
  };
  const send = async (name: string, res: express.Response, compute: () => Promise<unknown>) => {
    try {
      const { value, hit } = await get(name, compute);
      res.setHeader('X-Cache', hit ? 'hit' : 'miss');
      res.json(value);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  };
  return { get, send };
}

export function buildDashboardRouter(db: Lakebase): express.Router {
  const router = express.Router();
  const cache = dashboardCache(db);
  const cached = cache.send;

  const computeSummary = async () => {
    const [[kpis], [narrative], [rules]] = await Promise.all([
      runSql(`SELECT *, CAST(As_Of_Date AS STRING) AS as_of, CAST(Month_Start AS STRING) AS month_start,
                     CAST(First_Date AS STRING) AS first_date FROM ${GOLD}.qry_cc_kpis`),
      // Written once by deploy.py's `summary` step; missing until that step has run.
      runSql(`
        SELECT narrative, CAST(generated_at AS STRING) AS narrative_generated_at,
               CAST(data_refreshed_at AS STRING) AS data_refreshed_at FROM ${GOLD}.exec_summary LIMIT 1
      `).catch(() => [{ narrative: null, narrative_generated_at: null }]),
      // Every target and threshold, so the cards name the values in force (gold.business_rules_config).
      runSql(`SELECT * FROM ${GOLD}.qry_rules`).catch(() => [{}]),
    ]);
    return { ...kpis, ...narrative, rules: rules ?? {} };
  };
  router.get('/api/dashboard/summary', (_req, res) => cached('summary', res, computeSummary));

  /**
   * Everything the Command Center shows beyond the headline, in one round trip:
   * each panel is a certified-view query (no AI), run in parallel and cached per
   * data version like the rest. A panel that fails comes back empty rather than
   * failing the page. The Command Center's month is the current month to date ("CM"); the last
   * full month ("LFM") comes back in `ref`, for the small comparison lines.
   */
  const CM = `(SELECT Current_Month FROM ${GOLD}.qry_cc_kpis)`;
  const LFM = `(SELECT Last_Full_Month FROM ${GOLD}.qry_cc_kpis)`;
  const computeOverview = async () => {
    const q = (sql: string) => runSql(sql).catch((err) => {
      console.warn('[dashboard] overview panel failed:', err instanceof Error ? err.message : err);
      return [] as Record<string, string | null>[];
    });
    const [daily, weekly, monthly, salesMix, reasons, lostDrivers, jarvis, xsellTeams, xsellCats, firstCall, transfers,
      scenarios, recovery, coaching, tenure, saleValue, customerReasons, refReasons, refDrivers, refXsell, refTransfers, refRecovery] = await Promise.all([
      q(`SELECT *, CAST(Call_Date AS STRING) AS d FROM ${GOLD}.qry_daily_kpis
           WHERE Call_Date > date_sub((SELECT As_Of_Date FROM ${GOLD}.qry_cc_kpis), 42) ORDER BY Call_Date`),
      q(`SELECT *, CAST(Week_Ending AS STRING) AS we FROM ${GOLD}.qry_weekly_kpis ORDER BY Week_Ending`),
      q(`SELECT * FROM ${GOLD}.qry_monthly_trend ORDER BY Month`),
      q(`SELECT Sales_Category, Sale_Type, SUM(Sales) AS Sales, SUM(Cross_Sell_Sales) AS Cross_Sell_Sales, SUM(Monthly_Revenue) AS Monthly_Revenue,
                SUM(First_12M_Revenue) AS First_12M_Revenue FROM ${GOLD}.qry_sales_mix WHERE Month = ${CM}
           GROUP BY Sales_Category, Sale_Type ORDER BY Sales DESC`),
      q(`SELECT Call_Reason, Reason_Group, Intended_Category, SUM(Calls) AS Calls, SUM(Sale_Calls) AS Sale_Calls,
                1.0*SUM(Sale_Calls)/SUM(Calls) AS Sale_Conversion, SUM(Lost_Sales) AS Lost_Sales, SUM(Lost_People) AS Lost_People,
                SUM(Customer_No_Sales) AS Customer_No_Sales, SUM(Lost_System) AS Lost_System,
                SUM(Transfers) AS Transfers
           FROM ${GOLD}.qry_reason_conversion WHERE Month = ${CM} GROUP BY Call_Reason, Reason_Group, Intended_Category ORDER BY Calls DESC`),
      q(`SELECT Lost_Sale_Driver, Lost_Sale_Reason, SUM(Lost_Sales) AS Lost_Sales, SUM(Came_Back) AS Came_Back,
                SUM(Bought_On_Return) AS Bought_On_Return, SUM(Est_First_12M_Value_Lost) AS Value_Lost
           FROM ${GOLD}.qry_lost_sales WHERE Month = ${CM} GROUP BY Lost_Sale_Driver, Lost_Sale_Reason ORDER BY Lost_Sales DESC`),
      q(`SELECT Jarvis_Error_Type, SUM(Error_Calls) AS Error_Calls, SUM(Lost_Sales) AS Lost_Sales, SUM(Sold_Despite_Error) AS Sold_Despite_Error,
                SUM(Tickets) AS Tickets, SUM(Avg_Resolution_Days*Tickets)/NULLIF(SUM(Tickets),0) AS Avg_Resolution_Days,
                MAX(Max_Resolution_Days) AS Max_Resolution_Days, SUM(Tickets_Over_5_Days) AS Tickets_Over_5_Days,
                SUM(Avg_Handle_Seconds*Error_Calls)/SUM(Error_Calls) AS Avg_Handle_Seconds, SUM(Lost_Came_Back) AS Lost_Came_Back,
                SUM(Lost_Bought_On_Return) AS Lost_Bought_On_Return, SUM(Est_First_12M_Value_Lost) AS Value_Lost
           FROM ${GOLD}.qry_jarvis_impact WHERE Month = ${CM} GROUP BY Jarvis_Error_Type ORDER BY Lost_Sales DESC`),
      q(`SELECT Team_Lead, SUM(Opportunities) AS Opportunities, SUM(Attempted) AS Attempted, SUM(Not_Offered) AS Not_Offered,
                SUM(Sold) AS Sold, 1.0*SUM(Attempted)/NULLIF(SUM(Opportunities),0) AS Attempt_Rate
           FROM ${GOLD}.qry_cross_sell WHERE Month = ${CM} GROUP BY Team_Lead ORDER BY Attempt_Rate`),
      q(`SELECT Sales_Category, Cross_Sell_Product, SUM(Sale_Calls) AS Sale_Calls, SUM(Opportunities) AS Opportunities, SUM(Attempted) AS Attempted,
                SUM(Not_Offered) AS Not_Offered, SUM(Sold) AS Sold, SUM(Declined) AS Declined
           FROM ${GOLD}.qry_cross_sell WHERE Month = ${CM} GROUP BY Sales_Category, Cross_Sell_Product ORDER BY Opportunities DESC`),
      q(`SELECT * FROM ${GOLD}.qry_first_call ORDER BY Month`),
      q(`SELECT Transfer_Destination, Transfer_Validity, Invalid_Transfer_Reason, Call_Type, SUM(Transfers) AS Transfers
           FROM ${GOLD}.qry_transfers WHERE Month = ${CM} GROUP BY Transfer_Destination, Transfer_Validity, Invalid_Transfer_Reason, Call_Type`),
      q(`SELECT * FROM ${GOLD}.qry_cc_scenarios ORDER BY Scenario_ID`),
      q(`SELECT * FROM ${GOLD}.qry_cc_recovery ORDER BY Lever_Order`),
      q(`SELECT * FROM ${GOLD}.qry_cc_coaching ORDER BY Sales_Below_Median DESC`),
      q(`SELECT Tenure_Band, COUNT(*) AS Calls, 1.0*SUM(Sale_Flag)/COUNT(*) AS Sale_Conversion, 1.0*SUM(New_Sales)/COUNT(*) AS New_Conversion,
                MIN(Agent_Tenure_Months) AS ord
           FROM ${GOLD}.qry_calls WHERE Month BETWEEN (SELECT MIN(Window_Start) FROM ${GOLD}.qry_agent_scorecard)
                                        AND (SELECT MAX(Window_End) FROM ${GOLD}.qry_agent_scorecard)
           GROUP BY Tenure_Band ORDER BY ord`),
      q(`SELECT * FROM ${GOLD}.qry_sale_value`),
      // Customers who wanted to buy but couldn't or chose not to: shown beside lost sales, not counted in them.
      q(`SELECT Customer_No_Sale_Reason, COUNT(*) AS Calls FROM ${GOLD}.qry_calls
           WHERE Is_MTD = 1 AND Customer_No_Sale_Flag = 1 GROUP BY Customer_No_Sale_Reason ORDER BY Calls DESC`),
      // The last full month, for the small "September: ..." reference lines
      q(`SELECT Call_Reason, 1.0*SUM(Sale_Calls)/SUM(Calls) AS Sale_Conversion, SUM(Calls) AS Calls
           FROM ${GOLD}.qry_reason_conversion WHERE Month = ${LFM} AND Intended_Category IS NOT NULL GROUP BY Call_Reason`),
      q(`SELECT Lost_Sale_Driver, SUM(Lost_Sales) AS Lost_Sales FROM ${GOLD}.qry_lost_sales WHERE Month = ${LFM} GROUP BY Lost_Sale_Driver`),
      q(`SELECT SUM(Sale_Calls) AS Sale_Calls, SUM(Opportunities) AS Opportunities, SUM(Attempted) AS Attempted, SUM(Not_Offered) AS Not_Offered, SUM(Sold) AS Sold
           FROM ${GOLD}.qry_cross_sell WHERE Month = ${LFM} AND Sales_Category = 'Total Home - New Connection'`),
      q(`SELECT SUM(Transfers) AS Transfers, SUM(CASE WHEN Transfer_Validity = 'Avoidable' THEN Transfers ELSE 0 END) AS Avoidable
           FROM ${GOLD}.qry_transfers WHERE Month = ${LFM}`),
      q(`SELECT * FROM ${GOLD}.qry_recovery_plan ORDER BY Lever_Order`),
    ]);
    const ref = { reasons: refReasons, drivers: refDrivers, xsell: refXsell[0] ?? {}, transfers: refTransfers[0] ?? {}, recovery: refRecovery };
    return { daily, weekly, monthly, salesMix, reasons, lostDrivers, jarvis, xsellTeams, xsellCats, firstCall, transfers,
      scenarios, recovery, coaching, tenure, saleValue, customerReasons, ref };
  };
  router.get('/api/dashboard/overview', (_req, res) => cached('overview', res, computeOverview));

  /**
   * The calls behind a Command Center figure: every card can show its list. Each list uses the
   * same rule as the card's number, on the governed call view. Lists are fixed here; a request
   * only picks one, plus a value where the list needs it (a scenario, a lost-sale driver or
   * reason, a Jarvis error type, a call reason, a transfer destination, a team or a consultant),
   * checked against the data.
   */
  const L = 'b.Is_MTD = 1';   // the Command Center's month: the current month to date
  type Needs = 'scenario' | 'driver' | 'reason' | 'jarvis' | 'callreason' | 'destination' | 'team' | 'agent';
  const LISTS: Record<string, { where: (v: string) => string; order: string; needs?: Needs }> = {
    day_sales: { where: () => 'b.Is_Latest_Day = 1 AND b.Sale_Flag = 1', order: 'b.Call_Start_Datetime DESC' },
    mtd_sales: { where: () => 'b.Is_MTD = 1 AND b.Sale_Flag = 1', order: 'b.Call_Start_Datetime DESC' },
    mtd_lost: { where: () => 'b.Is_MTD = 1 AND b.Lost_Sale_Flag = 1', order: 'b.Call_Start_Datetime DESC' },
    customer_no_sale: { where: () => 'b.Is_MTD = 1 AND b.Customer_No_Sale_Flag = 1', order: 'b.Call_Start_Datetime DESC' },
    driver: { where: (v) => `${L} AND b.Lost_Sale_Driver = ${v}`, order: 'b.Call_Start_Datetime DESC', needs: 'driver' },
    reason: { where: (v) => `${L} AND b.Lost_Sale_Reason = ${v}`, order: 'b.Call_Start_Datetime DESC', needs: 'reason' },
    call_reason_lost: { where: (v) => `${L} AND b.Call_Reason = ${v} AND b.Sale_Flag = 0`, order: 'b.Lost_Sale_Flag DESC, b.Call_Start_Datetime DESC', needs: 'callreason' },
    jarvis_lost: { where: () => `${L} AND b.Jarvis_Lost_Sale_Flag = 1`, order: 'b.Jarvis_Ticket_Resolution_Days DESC' },
    jarvis_type: { where: (v) => `${L} AND b.Jarvis_Error_Flag = 1 AND b.Jarvis_Error_Type = ${v}`, order: 'b.Jarvis_Lost_Sale_Flag DESC, b.Jarvis_Ticket_Resolution_Days DESC', needs: 'jarvis' },
    xsell_missed: { where: () => `${L} AND b.Missed_Cross_Sell_Flag = 1`, order: 'b.Call_Start_Datetime DESC' },
    team_xsell_missed: { where: (v) => `${L} AND b.Missed_Cross_Sell_Flag = 1 AND b.Team_Lead = ${v}`, order: 'b.Call_Start_Datetime DESC', needs: 'team' },
    lost_came_back: { where: () => `${L} AND b.Lost_Came_Back_Flag = 1`, order: 'b.Call_Start_Datetime DESC' },
    lost_bought: { where: () => `${L} AND b.Lost_Bought_On_Return_Flag = 1`, order: 'b.Call_Start_Datetime DESC' },
    callbacks_chased: { where: () => `${L} AND b.Callback_Chased_Flag = 1`, order: 'b.Call_Start_Datetime DESC' },
    avoidable: { where: () => `${L} AND b.Avoidable_Transfer_Flag = 1`, order: 'b.Call_Start_Datetime DESC' },
    destination: { where: (v) => `${L} AND b.Transfer_Flag = 1 AND b.Transfer_Destination = ${v}`, order: 'b.Avoidable_Transfer_Flag DESC, b.Call_Start_Datetime DESC', needs: 'destination' },
    scenario: {
      where: (v) => `EXISTS (SELECT 1 FROM ${GOLD}.qry_cc_scenario_calls s WHERE s.Scenario_ID = ${v} AND s.Call_ID = b.Call_ID)`,
      order: 'b.Call_Start_Datetime DESC', needs: 'scenario',
    },
    agent_lost: {
      where: (v) => `b.Agent_ID = ${v} AND b.Lost_Sale_Flag = 1 AND b.Month BETWEEN (SELECT MIN(Window_Start) FROM ${GOLD}.qry_agent_scorecard) AND (SELECT MAX(Window_End) FROM ${GOLD}.qry_agent_scorecard)`,
      order: 'b.Call_Start_Datetime DESC', needs: 'agent',
    },
  };
  const LIST_SOURCE: Record<Needs, string> = {
    scenario: `SELECT DISTINCT CAST(Scenario_ID AS STRING) AS v FROM ${GOLD}.qry_cc_scenarios`,
    driver: `SELECT DISTINCT Lost_Sale_Driver AS v FROM ${GOLD}.qry_lost_sales`,
    reason: `SELECT DISTINCT Lost_Sale_Reason AS v FROM ${GOLD}.qry_lost_sales`,
    jarvis: `SELECT DISTINCT Jarvis_Error_Type AS v FROM ${GOLD}.qry_jarvis_impact`,
    callreason: `SELECT DISTINCT Call_Reason AS v FROM ${GOLD}.qry_reason_conversion`,
    destination: `SELECT DISTINCT Transfer_Destination AS v FROM ${GOLD}.qry_transfers`,
    team: `SELECT DISTINCT Team_Lead AS v FROM ${GOLD}.qry_team_month`,
    agent: `SELECT DISTINCT Agent_ID AS v FROM ${GOLD}.qry_agent_scorecard`,
  };
  const FROM = `FROM ${GOLD}.qry_calls b`;
  /** The values a list may be narrowed to, from the data itself (so nothing else reaches the SQL). */
  const allowed = (needs: Needs) => cache.get(`values:${needs}`, async () => (await runSql(LIST_SOURCE[needs])).map((r) => String(r.v)))
    .then((r) => r.value as string[]);

  const callsHandler = async (req: express.Request, res: express.Response) => {
    const name = String(req.query.list ?? '');
    const list = LISTS[name];
    if (!list) { res.status(400).json({ error: 'unknown list' }); return; }
    let value = '';
    if (list.needs) {
      const v = String(req.query.value ?? '');
      if (!(await allowed(list.needs).catch(() => [] as string[])).includes(v)) { res.status(400).json({ error: `unknown ${list.needs}` }); return; }
      value = list.needs === 'scenario' ? String(Number(v)) : `'${v.replace(/'/g, "''")}'`;
    }
    const where = `WHERE ${list.where(value)}`;
    await cached(`calls:${name}:${value}`, res, async () => {
      const [[totals], rows] = await Promise.all([
        runSql(`SELECT COUNT(*) AS rows, COUNT(DISTINCT b.Customer_ID) AS customers, SUM(b.New_Sales) AS new_sales,
                       SUM(b.Renewal_Sales) AS renewal_sales, SUM(b.Monthly_Revenue) AS revenue, SUM(b.Lost_Sale_Flag) AS lost_sales
                  ${FROM} ${where}`),
        runSql(`SELECT ${CALL_COLUMNS} ${FROM} ${where} ORDER BY ${list.order} LIMIT 1000`),
      ]);
      return { totals, rows, truncated: Number(totals?.rows ?? 0) > rows.length };
    });
  };
  router.get('/api/dashboard/calls', callsHandler);

  // Have the Command Center ready before anyone asks: when the app starts, then whenever the
  // data version changes (a quick Lakebase read every few minutes; the warehouse is only
  // queried when something changed).
  const warm = () => {
    void Promise.all([cache.get('summary', computeSummary), cache.get('overview', computeOverview)])
      .catch((err: unknown) => console.warn('[dashboard] warm-up failed:', err instanceof Error ? err.message : err));
  };
  setTimeout(warm, 3000).unref();
  setInterval(warm, WARM_EVERY_MS).unref();

  return router;
}
