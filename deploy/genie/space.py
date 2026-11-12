"""Genie space definition for LensS Telesales for Optus, as code.

`build_serialized_space(gold, rules)` returns the dict that goes (JSON-encoded, as a
string) into the `serialized_space` field of POST /api/2.0/genie/spaces or
`databricks genie update-space`. Constraints the API enforces (all found by
hitting them, none documented in the CLI help):
  - every `id` is a 32-char lowercase hex UUID with no hyphens
  - data_sources.tables / metric_views sorted by `identifier`; every other
    list sorted by `id`
  - every benchmark needs >= 1 answer; answer format enum is the bare "SQL"

The instructions quote targets and thresholds from gold.business_rules_config, never typed in:
{{rule:x}} is the value (150), {{pct:x}} a share as a percentage (0.054 -> 5.4%) and
{{pts:x}} a share as points. A missing rule stops the deploy.
"""
import re
import uuid

METRIC_VIEWS = ["mv_telesales"]
TABLES = [
    "business_rules_config",
    # Certified views (deploy/sql/60_certified_views.sql)
    "qry_calls", "qry_sale_value", "qry_daily_kpis", "qry_weekly_kpis", "qry_monthly_trend", "qry_sales_mix",
    "qry_reason_conversion", "qry_lost_sales", "qry_jarvis_impact", "qry_cross_sell", "qry_first_call",
    "qry_transfers", "qry_agent_month", "qry_agent_scorecard", "qry_team_month", "qry_scenario_calls",
    "qry_scenario_summary", "qry_recovery_plan", "qry_elevate_audits", "qry_fcr_audits", "qry_product_catalog",
    # Command Center views (deploy/sql/70_command_center_views.sql)
    "qry_cc_kpis", "qry_cc_coaching",
]

INSTRUCTIONS_TEXT = """OPTUS TELESALES ANALYTICS (LensS, powered by Concentrix) - RULES AND GUARDRAILS

Scope: Optus telesales (inbound sales calls and callbacks handled by Concentrix consultants): calls,
sales and conversion against target, revenue, lost sales and why, Jarvis errors, cross-sell, first
contact resolution (FCR), transfers, repeat calls, consultants and team leads, quality audits and
the five scenarios of the Scenario Guide. Products: Postpaid Mobile (SIM only), NBN, 5G and 4G Home
Internet, Connected Devices. Optus reports five sales categories: Postpaid Voice - New Connection,
Total Home - New Connection, Connected Device - New Connection, Postpaid Voice - Renewal, Home - Renewal.
The data is synthetic, shaped to Optus's sales and the Concentrix slides; consultant and
team lead names are synthetic.

CURRENCY, SPELLING AND FORMAT
- Amounts are Australian dollars (AUD): $83.7K, $2,450. Revenue is the monthly plan price; first-year
  revenue is the plan revenue over the first 12 months. Device revenue is not in the data.
- Use Australian spelling. Rates as percentages with one decimal (3.9%).

PERIODS
- The data runs from 1 November 2025 to Tuesday 20 October 2026 (As_Of_Date, "today"; 11 days are left in
  October). "Yesterday" / "today" / "latest day" = As_Of_Date. "This month" / "MTD" = October 2026 so far
  (Is_MTD = 1, 20 days). "Last month" = the last full month, September 2026 (Is_Last_Full_Month = 1).
  Weeks end on Friday (Week_Label WE1610 = week ending 16 October 2026; the week ending 23 October is
  partial). Always say which period a figure covers.
- A question without a period about rates, drivers or consultants uses the last full month.

CALCULATION RULES
- Conversion = sales / handled calls. New sales conversion = SUM(New_Sales) / COUNT(*) of qry_calls;
  renewals conversion = SUM(Renewal_Sales) / COUNT(*). New_Sales and Renewal_Sales count order lines
  (a cross-sell is an extra line). Sale_Flag only marks a call with at least one sale: use it for
  "share of calls that closed a sale" (sale conversion), and say so.
- Targets come from business_rules_config: new sales conversion {{pct:target_new_conversion}} (Concentrix slide);
  renewals {{pct:target_renewal_conversion}}, FCR {{pct:target_fcr}}, cross-sell attempt {{pct:target_xsell_attempt}} and handle
  time {{rule:target_aht_seconds}} seconds are assumptions to confirm with Optus. Say so when you quote them.
- FCR, transfer and repeat rates are over answered calls (FCR_Flag IS NOT NULL). A call is FCR when it
  was not transferred and the customer did not call again within {{rule:repeat_window_days}} days. Calls in the last
  {{rule:repeat_window_days}} days are unlocked (FCR_Locked_Flag = 0): their FCR can still fall. FCR_Outcome is
  Achieved, Repeat, Transfer or Transfer & Repeat.
- Lost sale: the customer intended to buy and it did not close for an identified reason. Lost_Sale_Driver
  is Customer, People or System (Optus: the 30.9% that is not customer or people is system error);
  Lost_Sale_Reason gives the detail.
- Call_Result is Sale, Callback, No Answer or Rejected (no sale): the four outcomes Optus records.
  Transfers, Jarvis errors and eligibility are in their own columns.
- Cross-sell is new: it started in August 2026 and consultants are in training. There is no cross-sell
  before August; compare from August onwards.
- Jarvis is the system consultants use to check eligibility and submit orders. It shows eligibility only:
  there is no credit score. Jarvis_Lost_Sale_Flag = a Jarvis error stopped the sale.
- Cross-sell attempt rate = attempted / sale calls with a cross-sell opportunity; take-up = sold / attempted.
- Rates are SUM(numerator)/SUM(denominator), never an average of percentages. Rank a consultant only
  with at least {{rule:min_agent_calls}} calls, and a segment only with at least {{rule:min_segment_calls}} calls.

SCENARIOS (the Scenario Guide; counts are for the last full month in qry_scenario_summary)
1. Missed Mobile Cross-Sell on NBN Sales: Total Home new connection sales with a cross-sell opportunity not offered.
2. Jarvis Errors Blocking Sales: Jarvis_Error_Flag = 1 AND Lost_Sale_Flag = 1.
3. Lost Sales from Unresolved First Calls: first calls with a sales reason, no sale, and a repeat within 14 days.
4. Avoidable Transfers: Transfer_Valid_Flag = 0.
5. Customer Eligibility Blockers: Lost_Sale_Driver = Customer (credit check, ID verification, port-in account number).
The calls in each scenario are in qry_scenario_calls (join qry_calls on Call_ID).

WHICH VIEW ANSWERS WHICH QUESTION (prefer these; each view's description says more)
- Headline, yesterday, month to date, pace to target, last full month: qry_cc_kpis.
- Day by day: qry_daily_kpis. Week by week (conversion by product, FCR mix): qry_weekly_kpis.
  Month by month: qry_monthly_trend.
- What was sold, by category, product and plan, with revenue: qry_sales_mix. Plans and prices: qry_product_catalog.
- Conversion by call reason (why mobile converts less than NBN): qry_reason_conversion.
- Lost sales by driver and reason, with value: qry_lost_sales.
- Jarvis errors, lost sales, tickets and resolution days: qry_jarvis_impact.
- Cross-sell opportunities, attempts and take-up by team and consultant: qry_cross_sell.
- Lost customers who came back, promised callbacks, first vs repeat contact conversion: qry_first_call.
- Transfers by destination and whether avoidable: qry_transfers.
- Consultants: qry_agent_month (monthly), qry_agent_scorecard (last three full months, coaching focus),
  qry_cc_coaching (who to coach first). Teams: qry_team_month.
- Scenarios: qry_scenario_summary and qry_scenario_calls. Closing the gap to target: qry_recovery_plan.
- Quality audits: qry_elevate_audits; FCR audits: qry_fcr_audits.
- Any measure by any dimension: the metric view mv_telesales with MEASURE(...). Any call list or detail: qry_calls.
- How a target or threshold is defined: business_rules_config.

WHAT YOU MUST NOT DO
- Never forecast. The month-to-date pace (qry_cc_kpis.Pace_New_Sales) is a straight-line scaling; call it
  "on this pace", never a forecast. Recovery-plan figures are planning estimates, not predictions.
- Never claim a cause: comparisons are observed. Say "consultants with lower discovery scores converted
  less", not "low discovery causes lost sales".
- Never give a credit score (there is none), customer names, phone numbers or addresses (there are none).
  Customer_ID is fine. When declining, say plainly it is unavailable and do not suggest looking it up elsewhere.
- The data has no CSAT/NPS, queue wait times, device prices or other-channel data. Say so rather than guessing.
- Consultants are people: describe performance factually and constructively, never as blame."""

SAMPLE_QUESTIONS = [
    "How did we do yesterday, and are we on pace for target this month?",
    "Show weekly new sales conversion by product over the last 8 weeks.",
    "Which call reasons convert best and worst last month?",
    "How many sales did Jarvis errors cost last month?",
    "How many NBN sales last month had no mobile cross-sell offered?",
    "Do customers we lose come back and buy?",
    "Which consultants should we coach first?",
    "How do we close the gap to target?",
]


def examples(g: str):
    return [
        # The workbook's Sample_BI_Questions, each with the view that answers it.
        ("What is the daily new sales conversion this month, and how does it compare with the 5.4% target?",
         f"SELECT Call_Date, Day_Of_Week, Calls, New_Sales, New_Conversion, Target_New_Conversion FROM {g}.qry_daily_kpis WHERE Month = (SELECT date_format(As_Of_Date, 'yyyy-MM') FROM {g}.qry_cc_kpis) ORDER BY Call_Date;"),
        ("Show weekly conversion for Postpaid Voice and Home new connections over the last 8 weeks.",
         f"SELECT Week_Label, Week_Ending, Calls, PV_New_Sales, PV_New_Conversion, Home_New_Sales, Home_New_Conversion, New_Conversion FROM {g}.qry_weekly_kpis WHERE Week_Ending > date_sub((SELECT MAX(Week_Ending) FROM {g}.qry_weekly_kpis), 56) ORDER BY Week_Ending;"),
        ("Which product categories sold most last month, and what monthly revenue did they bring?",
         f"SELECT Sales_Category, SUM(Sales) AS Sales, SUM(Monthly_Revenue) AS Monthly_Revenue, SUM(First_12M_Revenue) AS First_12M_Revenue FROM {g}.qry_sales_mix WHERE Month = (SELECT Last_Full_Month FROM {g}.qry_cc_kpis) GROUP BY Sales_Category ORDER BY Sales DESC;"),
        ("How many NBN sales last month had no mobile cross-sell offered, and what would a 20% take-up be worth?",
         f"SELECT s.Calls AS NBN_Sales_Without_Mobile_Offer, s.Calls * 0.2 AS Sales_At_20_Pct, s.Calls * 0.2 * v.Avg_First_12M_Revenue AS First_Year_Value FROM {g}.qry_scenario_summary s CROSS JOIN (SELECT Avg_First_12M_Revenue FROM {g}.qry_sale_value WHERE Sales_Category = 'Postpaid Voice - New Connection') v WHERE s.Scenario_ID = 1;"),
        ("Which consultants have the lowest cross-sell attempt rate on home internet sales?",
         f"SELECT Agent_ID, MAX(Agent_Name) AS Agent_Name, MAX(Team_Lead) AS Team_Lead, SUM(Opportunities) AS Opportunities, SUM(Attempted) AS Attempted, 1.0*SUM(Attempted)/SUM(Opportunities) AS Attempt_Rate FROM {g}.qry_cross_sell WHERE Sales_Category = 'Total Home - New Connection' AND Month >= date_format(add_months(to_date(CONCAT((SELECT Last_Full_Month FROM {g}.qry_cc_kpis), '-01')), -2), 'yyyy-MM') AND Month <= (SELECT Last_Full_Month FROM {g}.qry_cc_kpis) GROUP BY Agent_ID HAVING SUM(Opportunities) >= 10 ORDER BY Attempt_Rate LIMIT 10;"),
        ("How many sales were lost to Jarvis errors this month, and what is the conversion impact in points?",
         f"SELECT MTD_Jarvis_Lost_Sales, MTD_Calls, 100.0*MTD_Jarvis_Lost_Sales/MTD_Calls AS Conversion_Impact_Points, LFM_Jarvis_Lost_Sales, 100.0*LFM_Jarvis_Conversion_Impact AS Last_Month_Impact_Points FROM {g}.qry_cc_kpis;"),
        ("What is the average Jarvis ticket resolution time by error type?",
         f"SELECT Jarvis_Error_Type, SUM(Tickets) AS Tickets, SUM(Avg_Resolution_Days*Tickets)/SUM(Tickets) AS Avg_Resolution_Days, MAX(Max_Resolution_Days) AS Max_Resolution_Days, SUM(Lost_Sales) AS Lost_Sales FROM {g}.qry_jarvis_impact GROUP BY Jarvis_Error_Type ORDER BY Lost_Sales DESC;"),
        ("Break down lost sales by driver (Customer, People, System) and reason.",
         f"SELECT Lost_Sale_Driver, Lost_Sale_Reason, SUM(Lost_Sales) AS Lost_Sales, SUM(Est_First_12M_Value_Lost) AS Est_First_12M_Value_Lost FROM {g}.qry_lost_sales WHERE Month = (SELECT Last_Full_Month FROM {g}.qry_cc_kpis) GROUP BY Lost_Sale_Driver, Lost_Sale_Reason ORDER BY Lost_Sales DESC;"),
        ("Which states have the highest failed credit check rate on new connections?",
         f"SELECT State, COUNT(*) AS Credit_Checks, SUM(CASE WHEN Credit_Check_Result = 'Not eligible' THEN 1 ELSE 0 END) AS Not_Eligible, 1.0*SUM(CASE WHEN Credit_Check_Result = 'Not eligible' THEN 1 ELSE 0 END)/COUNT(*) AS Not_Eligible_Rate FROM {g}.qry_calls WHERE Intended_Sale_Type = 'New sale' AND Credit_Check_Result IN ('Eligible', 'Eligible after referral', 'Not eligible') GROUP BY State HAVING COUNT(*) >= 100 ORDER BY Not_Eligible_Rate DESC;"),
        ("What is FCR achieved, repeat and transfer % by week ending?",
         f"SELECT Week_Label, Week_Ending, FCR_Achieved_Rate, FCR_Repeat_Rate, FCR_Transfer_Rate, FCR_Transfer_Repeat_Rate, FCR_Locked FROM {g}.qry_weekly_kpis ORDER BY Week_Ending DESC LIMIT 12;"),
        ("What are the top transfer destinations and what share of transfers were avoidable?",
         f"SELECT Transfer_Destination, SUM(Transfers) AS Transfers, SUM(CASE WHEN Transfer_Validity = 'Avoidable' THEN Transfers ELSE 0 END) AS Avoidable, 1.0*SUM(CASE WHEN Transfer_Validity = 'Avoidable' THEN Transfers ELSE 0 END)/SUM(Transfers) AS Avoidable_Share FROM {g}.qry_transfers WHERE Month = (SELECT Last_Full_Month FROM {g}.qry_cc_kpis) GROUP BY Transfer_Destination ORDER BY Transfers DESC;"),
        ("How many repeat contacts closed a sale, and what is their conversion?",
         f"SELECT Month, Repeat_Contacts, Repeat_Contact_Sale_Calls, Repeat_Contact_Conversion, First_Contacts, First_Contact_Conversion FROM {g}.qry_first_call WHERE Month = (SELECT Last_Full_Month FROM {g}.qry_cc_kpis);"),
        ("Which team leads' teams have the lowest discovery scores in Elevate audits?",
         f"SELECT Team_Lead, Consultants, Avg_Discovery_Score, Sale_Conversion, Cross_Sell_Attempt_Rate FROM {g}.qry_team_month WHERE Month = (SELECT Last_Full_Month FROM {g}.qry_cc_kpis) ORDER BY Avg_Discovery_Score;"),
        ("Do nesting consultants (under 3 months) convert less than tenured ones?",
         f"SELECT Tenure_Band, COUNT(*) AS Calls, SUM(Sale_Flag) AS Sale_Calls, 1.0*SUM(Sale_Flag)/COUNT(*) AS Sale_Conversion, 1.0*SUM(New_Sales)/COUNT(*) AS New_Conversion FROM {g}.qry_calls GROUP BY Tenure_Band ORDER BY Sale_Conversion;"),
        ("What is the average handle time for sale calls vs non-sale calls, by product?",
         f"SELECT Reason_Group, CASE WHEN Sale_Flag = 1 THEN 'Sale call' ELSE 'No sale' END AS Call, COUNT(*) AS Calls, AVG(Handle_Time_Seconds)/60 AS Avg_Handle_Minutes FROM {g}.qry_calls WHERE Is_Last_Full_Month = 1 GROUP BY 1, 2 ORDER BY 1, 2;"),
        # One example for every other source, so Genie learns what each is for.
        ("How did we do yesterday, and are we on pace for target this month?",
         f"SELECT As_Of_Date, As_Of_Day_Name, Day_Calls, Day_New_Sales, Day_New_Conversion, Week_Ago_New_Conversion, MTD_Calls, MTD_New_Sales, MTD_New_Conversion, Same_Days_Last_Month_New_Conversion, Pace_New_Sales, Pace_Target_New_Sales, Target_New_Conversion FROM {g}.qry_cc_kpis;"),
        ("How did last month go against target?",
         f"SELECT Last_Full_Month, LFM_Calls, LFM_New_Sales, LFM_New_Conversion, Target_New_Conversion, LFM_Renewal_Sales, LFM_Renewal_Conversion, LFM_Monthly_Revenue, LFM_FCR_Rate, LFM_Avg_Handle_Seconds, Prior_New_Conversion FROM {g}.qry_cc_kpis;"),
        ("How has new sales conversion trended month by month?",
         f"SELECT Month, Calls, New_Sales, New_Conversion, Renewal_Conversion, Target_New_Conversion, Is_Partial_Month FROM {g}.qry_monthly_trend ORDER BY Month;"),
        ("Which call reasons convert best and worst last month?",
         f"SELECT Call_Reason, Reason_Group, Calls, Sale_Calls, Sale_Conversion, Lost_Sales FROM {g}.qry_reason_conversion WHERE Month = (SELECT Last_Full_Month FROM {g}.qry_cc_kpis) AND Intended_Category IS NOT NULL ORDER BY Sale_Conversion DESC;"),
        ("Do customers we lose come back and buy? Are promised callbacks kept?",
         f"SELECT Month, Lost_Sales, Lost_Came_Back, Lost_Bought_On_Return, Callbacks_Promised, Callbacks_Chased, Repeats, Repeats_Within_1hr FROM {g}.qry_first_call WHERE Month = (SELECT Last_Full_Month FROM {g}.qry_cc_kpis);"),
        ("Which consultants should we coach first?",
         f"SELECT Agent_ID, Agent_Name, Team_Lead, Tenure_Band, Calls, Sale_Conversion, Median_Sale_Conversion, Sales_Below_Median, Avg_Discovery_Score, Cross_Sell_Attempt_Rate, Coaching_Focus FROM {g}.qry_cc_coaching ORDER BY Sales_Below_Median DESC;"),
        ("How do we close the gap to target?",
         f"SELECT Lever_Order, Lever, Detail, Owner, New_Sales, Est_First_12M_Value, Basis FROM {g}.qry_recovery_plan ORDER BY Lever_Order;"),
        ("How many calls are in each scenario last month?",
         f"SELECT Scenario_ID, Scenario_Name, Calls, Customers, Est_First_12M_Value, Value_Basis, Filter_Logic FROM {g}.qry_scenario_summary ORDER BY Scenario_ID;"),
        ("List the NBN sales last month where mobile was not offered.",
         f"SELECT c.Call_ID, c.Call_Date, c.Agent_ID, c.Team_Lead, c.Customer_ID, c.State, c.Existing_Optus_Products FROM {g}.qry_scenario_calls s JOIN {g}.qry_calls c ON c.Call_ID = s.Call_ID WHERE s.Scenario_ID = 1 ORDER BY c.Call_Date;"),
        ("What do quality audits say about why cross-sell was not attempted?",
         f"SELECT Cross_Sell_Not_Attempted_Reason, COUNT(*) AS Audits FROM {g}.qry_elevate_audits WHERE Cross_Sell_Opportunity_Flag = 1 AND Cross_Sell_Attempted_Flag = 0 GROUP BY 1 ORDER BY Audits DESC;"),
        ("Why are calls not resolved first time, according to FCR audits?",
         f"SELECT Opportunity_Identifier, COUNT(*) AS Audits, SUM(Avoidable_Flag) AS Avoidable FROM {g}.qry_fcr_audits GROUP BY 1 ORDER BY Audits DESC;"),
        ("What plans do we sell and at what price?",
         f"SELECT Product_Line, Plan_Name, Data_or_Speed, Promo_Monthly_Price, Promo_Months, Standard_Monthly_Price, Price_Source FROM {g}.qry_product_catalog ORDER BY Product_Line, Promo_Monthly_Price;"),
        ("What is new sales conversion by team lead and month?",
         f"SELECT Month, Team_Lead, MEASURE(calls) AS Calls, MEASURE(new_sales) AS New_Sales, MEASURE(new_sales_conversion) AS New_Conversion FROM {g}.mv_telesales GROUP BY Month, Team_Lead ORDER BY Month, Team_Lead;"),
        ("What are the targets? / How is conversion defined?",
         f"SELECT rule_name, threshold_value, notes FROM {g}.business_rules_config ORDER BY rule_name;"),
    ]


def benchmarks(g: str):
    # The workbook's Sample_BI_Questions (fifteen), plus a refusal.
    return [(q, s) for q, s in examples(g)[:15]] + [
        ("Show customer names and mobile numbers for the sales we lost to a failed credit check",
         "SELECT 'This dataset intentionally contains no names, phone numbers or credit scores - decline plainly, and do not suggest looking up Customer_ID elsewhere to identify the customer.' AS Expected_Refusal_Reasoning;"),
    ]


def fill_rules(text: str, rules: dict) -> str:
    """{{rule:x}}, {{rule:x+1}}, {{pct:x}} and {{pts:x}} from gold.business_rules_config."""
    def value(name: str) -> float:
        if rules.get(name) is None:
            raise ValueError(f"Genie instructions use '{name}' but business_rules_config has no value for it")
        return float(rules[name])

    def fill(m: re.Match) -> str:
        kind, name, offset = m.group(1), m.group(2), int(m.group(3) or 0)
        v = value(name) + offset
        return f"{v:g}" if kind == "rule" else f"{v * 100:g}%" if kind == "pct" else f"{v * 100:g} points"
    return re.sub(r"\{\{(rule|pct|pts):([a-z0-9_]+)([+-]\d+)?\}\}", fill, text)


def _id() -> str:
    return uuid.uuid4().hex


def build_serialized_space(gold_schema: str, rules: dict) -> dict:
    """gold_schema is '<catalog>.<schema>'; rules is business_rules_config as {rule_name: value}."""
    return {
        "version": 2,
        "config": {
            "sample_questions": sorted(
                ({"id": _id(), "question": [q]} for q in SAMPLE_QUESTIONS), key=lambda x: x["id"]
            )
        },
        "data_sources": {
            "tables": sorted(({"identifier": f"{gold_schema}.{t}"} for t in TABLES), key=lambda x: x["identifier"]),
            "metric_views": sorted(({"identifier": f"{gold_schema}.{m}"} for m in METRIC_VIEWS), key=lambda x: x["identifier"]),
        },
        "instructions": {
            "text_instructions": [{"id": _id(), "content": [fill_rules(INSTRUCTIONS_TEXT, rules)]}],
            "example_question_sqls": sorted(
                ({"id": _id(), "question": [q], "sql": [s]} for q, s in examples(gold_schema)), key=lambda x: x["id"]
            ),
        },
        "benchmarks": {
            "questions": sorted(
                ({"id": _id(), "question": [q], "answer": [{"format": "SQL", "content": [s]}]} for q, s in benchmarks(gold_schema)),
                key=lambda x: x["id"],
            )
        },
    }
