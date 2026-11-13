import express from 'express';
import { currentVersions, type Lakebase } from '../lib/answerCache.js';
import { runSql } from '../lib/sql.js';

const GOLD = process.env.LENSS_GOLD_SCHEMA ?? 'optus_telesales.optus_telesales_gold';
if (!/^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(GOLD)) {
  throw new Error(`LENSS_GOLD_SCHEMA must be "<catalog>.<schema>", got: ${GOLD}`);
}
const BASE = `${GOLD}.qry_calls`;

/** Filterable dimensions: query parameter -> column (or expression) of qry_calls for a table alias, and its sort order. */
const DIMS: Record<string, { col: (a?: string) => string; order?: string }> = {
  month: { col: (a = '') => `${a}Month` },
  team: { col: (a = '') => `${a}Team_Lead` },
  product: { col: (a = '') => `${a}Reason_Group` },
  reason: { col: (a = '') => `${a}Call_Reason` },
  category: { col: (a = '') => `COALESCE(${a}Sales_Category, 'No sale')` },
  tenure: { col: (a = '') => `${a}Tenure_Band`, order: 'MIN(Agent_Tenure_Months)' },
  state: { col: (a = '') => `${a}State` },
  customer: { col: (a = '') => `${a}Customer_Type` },
  direction: { col: (a = '') => `${a}Call_Direction` },
  result: { col: (a = '') => `${a}Call_Result` },
  driver: { col: (a = '') => `COALESCE(${a}Lost_Sale_Driver, 'Not a lost sale')` },
  fcr: { col: (a = '') => `${a}FCR_Outcome` },
};

/**
 * Every measure uses the same formula as the certified views (deploy/sql/60_certified_views.sql,
 * 70_command_center_views.sql), so with the last full month selected and no other filter the
 * Explorer reconciles exactly to the Command Center. Conversion is over handled calls; FCR,
 * transfer and repeat rates over answered calls (FCR_Flag not NULL).
 */
const MEASURES = `
  COUNT(*) AS calls,
  COUNT(DISTINCT Month) AS months,
  COUNT(DISTINCT Agent_ID) AS consultants,
  SUM(New_Sales) AS new_sales,
  SUM(Renewal_Sales) AS renewal_sales,
  SUM(Sale_Flag) AS sale_calls,
  1.0*SUM(New_Sales)/COUNT(*) AS new_conversion,
  1.0*SUM(Renewal_Sales)/COUNT(*) AS renewal_conversion,
  1.0*SUM(Sale_Flag)/COUNT(*) AS sale_conversion,
  SUM(Monthly_Revenue) AS revenue,
  SUM(First_12M_Revenue) AS first_year_revenue,
  SUM(Lost_Sale_Flag) AS lost_sales,
  1.0*SUM(Lost_Sale_Flag)/COUNT(*) AS lost_rate,
  SUM(Jarvis_Lost_Sale_Flag) AS jarvis_lost,
  SUM(Jarvis_Error_Flag) AS jarvis_errors,
  COUNT(FCR_Flag) AS answered,
  1.0*SUM(FCR_Flag)/NULLIF(COUNT(FCR_Flag),0) AS fcr_rate,
  1.0*SUM(CASE WHEN FCR_Flag IS NOT NULL THEN Transfer_Flag END)/NULLIF(COUNT(FCR_Flag),0) AS transfer_rate,
  1.0*SUM(CASE WHEN FCR_Flag IS NOT NULL THEN Repeat_14D_Flag END)/NULLIF(COUNT(FCR_Flag),0) AS repeat_rate,
  1.0*SUM(CASE WHEN FCR_Outcome = 'Achieved' THEN 1 ELSE 0 END)/NULLIF(COUNT(FCR_Flag),0) AS fcr_achieved,
  1.0*SUM(CASE WHEN FCR_Outcome = 'Repeat' THEN 1 ELSE 0 END)/NULLIF(COUNT(FCR_Flag),0) AS fcr_repeat,
  1.0*SUM(CASE WHEN FCR_Outcome = 'Transfer' THEN 1 ELSE 0 END)/NULLIF(COUNT(FCR_Flag),0) AS fcr_transfer,
  1.0*SUM(CASE WHEN FCR_Outcome = 'Transfer & Repeat' THEN 1 ELSE 0 END)/NULLIF(COUNT(FCR_Flag),0) AS fcr_both,
  SUM(Avoidable_Transfer_Flag) AS avoidable_transfers,
  SUM(Cross_Sell_Opportunity_Flag) AS xsell_opportunities,
  1.0*SUM(Cross_Sell_Attempted_Flag)/NULLIF(SUM(Cross_Sell_Opportunity_Flag),0) AS xsell_attempt_rate,
  SUM(Missed_Cross_Sell_Flag) AS xsell_missed,
  AVG(Handle_Time_Seconds) AS avg_handle,
  SUM(CASE WHEN Lost_Sale_Driver = 'Customer' THEN 1 ELSE 0 END) AS lost_customer,
  SUM(CASE WHEN Lost_Sale_Driver = 'People' THEN 1 ELSE 0 END) AS lost_people,
  SUM(CASE WHEN Lost_Sale_Driver = 'System' THEN 1 ELSE 0 END) AS lost_system`;

/** The columns of a call record, for the call lists and the Explorer's records. */
export const CALL_COLUMNS = `b.Call_ID, CAST(b.Call_Start_Datetime AS STRING) AS Call_Start, b.Month, b.Agent_ID, b.Team_Lead, b.Tenure_Band,
  b.Customer_ID, b.Customer_Type, b.State, b.Call_Direction, b.Call_Reason, b.Call_Result, b.Sales_Category, b.New_Sales, b.Renewal_Sales,
  b.Monthly_Revenue, b.Lost_Sale_Driver, b.Lost_Sale_Reason, b.Jarvis_Error_Flag, b.Jarvis_Error_Type, b.Jarvis_Ticket_Resolution_Days,
  b.Cross_Sell_Outcome, b.Cross_Sell_Product, b.Transfer_Destination, b.Transfer_Valid_Flag, b.FCR_Outcome, b.Repeat_Timeline,
  b.Callback_Promised_Flag, b.Handle_Time_Seconds`;

type Rows = Record<string, string | null>[];
type Options = { dims: Record<string, string[]>; latestMonth: string | null };

const sqlStr = (v: string) => `'${v.replace(/'/g, "''")}'`;

export function buildExplorerRouter(db: Lakebase): express.Router {
  const router = express.Router();

  // Results are cached per data version, like the Command Center; filters are part of the key.
  const entries = new Map<string, { version: string | null; at: number; value: unknown }>();
  async function cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const version = await currentVersions(db).then((v) => v.data, () => null);
    const e = entries.get(key);
    if (e && (version && e.version ? e.version === version : Date.now() - e.at < 10 * 60_000)) return e.value as T;
    const value = await compute();
    if (entries.size > 300) entries.clear();
    entries.set(key, { version, at: Date.now(), value });
    return value;
  }

  const options = () => cached<Options>('options', async () => {
    const dims: Record<string, string[]> = {};
    const lists = await Promise.all(Object.entries(DIMS).map(([k, d]) =>
      runSql(`SELECT ${d.col()} AS v FROM ${BASE} WHERE ${d.col()} IS NOT NULL GROUP BY ${d.col()} ORDER BY ${d.order ?? d.col()}`)
        .then((rows) => [k, rows.map((r) => String(r.v))] as const)));
    for (const [k, v] of lists) dims[k] = v;
    // The Explorer opens on the current month to date (the Command Center's chapters).
    const [l] = await runSql(`SELECT MAX(date_format(As_Of_Date, 'yyyy-MM')) AS m FROM ${BASE}`);
    return { dims, latestMonth: l?.m ?? null };
  });

  /**
   * The WHERE clause for the request's filters; `alias` prefixes the columns (e.g. 'b.'). Only values that
   * exist in the data are accepted, so nothing user-typed reaches the SQL. `skip` leaves one filter out
   * (the monthly trend ignores the month filter).
   */
  async function filtersFrom(query: express.Request['query'], alias = '', skip?: string) {
    const opts = await options();
    const clauses: string[] = [];
    const applied: Record<string, string> = {};
    for (const [k, d] of Object.entries(DIMS)) {
      const v = typeof query[k] === 'string' ? query[k] as string : '';
      if (!v) continue;
      if (!opts.dims[k]?.includes(v)) throw Object.assign(new Error(`Unknown ${k}: ${v}`), { status: 400 });
      applied[k] = v;
      if (k === skip) continue;
      clauses.push(`${d.col(alias)} = ${sqlStr(v)}`);
    }
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', applied };
  }

  const fail = (res: express.Response, err: unknown) => {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/api/explorer/options', async (_req, res) => {
    try { res.json(await options()); } catch (err) { fail(res, err); }
  });

  /**
   * The calls behind any Explorer item: the current filters plus the item's own (a team, reason,
   * … sent as one more filter, so it is checked the same way), optionally narrowed to a stage.
   * Same columns as the Command Center's lists, shown in the same window.
   */
  const STAGES: Record<string, string> = {
    sale: 'b.Sale_Flag = 1', new_sale: 'b.New_Sales > 0', renewal: 'b.Renewal_Sales > 0', no_sale: 'b.Sale_Flag = 0',
    lost: 'b.Lost_Sale_Flag = 1', jarvis: 'b.Jarvis_Error_Flag = 1', jarvis_lost: 'b.Jarvis_Lost_Sale_Flag = 1',
    fcr: 'b.FCR_Flag = 1', not_fcr: 'b.FCR_Flag = 0', transferred: 'b.Transfer_Flag = 1', avoidable: 'b.Avoidable_Transfer_Flag = 1',
    repeat: 'b.Repeat_14D_Flag = 1', xsell_missed: 'b.Missed_Cross_Sell_Flag = 1', xsell_opportunity: 'b.Cross_Sell_Opportunity_Flag = 1',
  };
  const callList = async (req: express.Request, res: express.Response) => {
    try {
      const { where, applied } = await filtersFrom(req.query, 'b.');
      const clauses = where ? [where.replace(/^WHERE /, '')] : [];
      const stage = typeof req.query.stage === 'string' ? req.query.stage : '';
      if (stage) {
        if (!STAGES[stage]) throw Object.assign(new Error(`Unknown stage: ${stage}`), { status: 400 });
        clauses.push(STAGES[stage]);
      }
      const w = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const from = `FROM ${BASE} b`;
      const value = await cached('calls:' + JSON.stringify({ applied, stage }), async () => {
        const [[totals], rows] = await Promise.all([
          runSql(`SELECT COUNT(*) AS rows, COUNT(DISTINCT b.Customer_ID) AS customers, SUM(b.New_Sales) AS new_sales,
                         SUM(b.Renewal_Sales) AS renewal_sales, SUM(b.Monthly_Revenue) AS revenue, SUM(b.Lost_Sale_Flag) AS lost_sales ${from} ${w}`),
          runSql(`SELECT ${CALL_COLUMNS} ${from} ${w} ORDER BY b.Call_Start_Datetime DESC LIMIT 1000`),
        ]);
        return { totals, rows, truncated: Number(totals?.rows ?? 0) > rows.length };
      });
      res.json(value);
    } catch (err) { fail(res, err); }
  };
  router.get('/api/explorer/calls', callList);

  /**
   * One round trip for the whole Explorer: filtered headline measures (and the same month for the
   * whole operation, for comparison), every breakdown, the monthly trend of this view and the call
   * records. A breakdown that fails comes back empty.
   */
  router.get('/api/explorer/data', async (req, res) => {
    try {
      const { where, applied } = await filtersFrom(req.query);
      const { where: trendWhere } = await filtersFrom(req.query, '', 'month');
      const { where: whereB } = await filtersFrom(req.query, 'b.');
      const monthOnly = applied.month ? `WHERE Month = ${sqlStr(applied.month)}` : '';
      const key = 'data:' + JSON.stringify(applied);
      const value = await cached(key, async () => {
        const q = (sql: string) => runSql(sql).catch((err): Rows => {
          console.warn('[explorer] query failed:', err instanceof Error ? err.message : err);
          return [];
        });
        const by = (k: string) => {
          const d = DIMS[k];
          return q(`SELECT ${d.col()} AS k, ${d.order ?? 'NULL'} AS ord, ${MEASURES} FROM ${BASE} ${where} GROUP BY ${d.col()} ORDER BY ${d.order ?? 'calls DESC'}`);
        };
        const dimKeys = Object.keys(DIMS).filter((k) => k !== 'month');
        const [totals, book, trend, calls, ...breakdowns] = await Promise.all([
          q(`SELECT ${MEASURES} FROM ${BASE} ${where}`),
          cached(`book:${applied.month ?? ''}`, () => q(`SELECT ${MEASURES} FROM ${BASE} ${monthOnly}`)),
          q(`SELECT Month AS k, MAX(Is_MTD) AS partial, ${MEASURES} FROM ${BASE} ${trendWhere} GROUP BY Month ORDER BY Month`),
          q(`SELECT ${CALL_COLUMNS} FROM ${BASE} b ${whereB}
               ORDER BY b.Sale_Flag DESC, b.Lost_Sale_Flag DESC, b.Call_Start_Datetime DESC LIMIT 500`),
          ...dimKeys.map(by),
        ]);
        return {
          applied, latestMonth: (await options()).latestMonth,
          totals: totals[0] ?? null, book: book[0] ?? null, trend, calls,
          by: Object.fromEntries(dimKeys.map((k, i) => [k, breakdowns[i]])),
        };
      });
      res.json(value);
    } catch (err) { fail(res, err); }
  });

  /**
   * Two dimensions at once (the Explorer's heatmap): every measure for each rows × cols pair, with
   * the current filters. Both dimensions are keys of DIMS, so nothing user-typed reaches the SQL.
   */
  router.get('/api/explorer/grid', async (req, res) => {
    try {
      const rows = String(req.query.rows ?? 'team'), cols = String(req.query.cols ?? 'product');
      if (!DIMS[rows] || !DIMS[cols] || rows === cols) {
        throw Object.assign(new Error('Unknown or repeated dimension'), { status: 400 });
      }
      const { where, applied } = await filtersFrom(req.query);
      const r = DIMS[rows], c = DIMS[cols];
      const value = await cached('grid:' + JSON.stringify({ applied, rows, cols }), () => runSql(`
        SELECT ${r.col()} AS r, ${r.order ?? 'NULL'} AS r_ord, ${c.col()} AS c, ${c.order ?? 'NULL'} AS c_ord, ${MEASURES}
        FROM ${BASE} ${where} GROUP BY ${r.col()}, ${c.col()}`));
      res.json({ rows, cols, applied, cells: value });
    } catch (err) { fail(res, err); }
  });

  return router;
}
