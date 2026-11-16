-- Command Center views: the headline row and the coaching list. Built on the certified views
-- (60_certified_views.sql); targets read live from gold.qry_rules. Each view carries a description
-- for Genie and Catalog Explorer; edit descriptions here, never in the UI (each deploy re-creates them).

-- 1. The headline: the latest day, the month so far and its pace to target, and the last full month.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_cc_kpis AS
WITH a AS (
  SELECT c.*, trunc(c.As_Of_Date, 'MM') AS Month_Start, day(c.As_Of_Date) AS Day_Of_Month,
         day(last_day(c.As_Of_Date)) AS Days_In_Month
  FROM {{catalog}}.{{prefix}}_gold.qry_calls c
), prev AS (   -- the month before the last full month
  SELECT date_format(add_months(to_date(CONCAT(MAX(Last_Full_Month), '-01')), -1), 'yyyy-MM') AS Prior_Month FROM a
)
SELECT
  MAX(a.As_Of_Date)                                                                   AS As_Of_Date,
  MAX(a.Day_Of_Week) FILTER (WHERE a.Is_Latest_Day = 1)                                AS As_Of_Day_Name,
  MAX(a.Month_Start)                                                                  AS Month_Start,
  MAX(a.Day_Of_Month)                                                                 AS Days_Elapsed,
  MAX(a.Days_In_Month)                                                                AS Days_In_Month,
  MIN(a.Call_Date)                                                                    AS First_Date,
  MAX(a.Last_Full_Month)                                                              AS Last_Full_Month,
  MAX(prev.Prior_Month)                                                               AS Prior_Month,
  -- Latest day, and the same weekday a week earlier
  COUNT(CASE WHEN a.Is_Latest_Day = 1 THEN 1 END)                                     AS Day_Calls,
  SUM(CASE WHEN a.Is_Latest_Day = 1 THEN a.New_Sales ELSE 0 END)                      AS Day_New_Sales,
  SUM(CASE WHEN a.Is_Latest_Day = 1 THEN a.Renewal_Sales ELSE 0 END)                  AS Day_Renewal_Sales,
  1.0*SUM(CASE WHEN a.Is_Latest_Day = 1 THEN a.New_Sales ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Is_Latest_Day = 1 THEN 1 END), 0) AS Day_New_Conversion,
  SUM(CASE WHEN a.Is_Latest_Day = 1 THEN a.Monthly_Revenue ELSE 0 END)                AS Day_Monthly_Revenue,
  SUM(CASE WHEN a.Is_Latest_Day = 1 THEN a.Jarvis_Lost_Sale_Flag ELSE 0 END)          AS Day_Jarvis_Lost_Sales,
  1.0*SUM(CASE WHEN a.Call_Date = date_sub(a.As_Of_Date, 7) THEN a.New_Sales ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Call_Date = date_sub(a.As_Of_Date, 7) THEN 1 END), 0) AS Week_Ago_New_Conversion,
  SUM(CASE WHEN a.Call_Date = date_sub(a.As_Of_Date, 7) THEN a.New_Sales ELSE 0 END)  AS Week_Ago_New_Sales,
  -- Month to date
  COUNT(CASE WHEN a.Is_MTD = 1 THEN 1 END)                                            AS MTD_Calls,
  SUM(CASE WHEN a.Is_MTD = 1 THEN a.New_Sales ELSE 0 END)                             AS MTD_New_Sales,
  SUM(CASE WHEN a.Is_MTD = 1 THEN a.Renewal_Sales ELSE 0 END)                         AS MTD_Renewal_Sales,
  1.0*SUM(CASE WHEN a.Is_MTD = 1 THEN a.New_Sales ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Is_MTD = 1 THEN 1 END), 0)     AS MTD_New_Conversion,
  1.0*SUM(CASE WHEN a.Is_MTD = 1 THEN a.Renewal_Sales ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Is_MTD = 1 THEN 1 END), 0) AS MTD_Renewal_Conversion,
  SUM(CASE WHEN a.Is_MTD = 1 THEN a.Monthly_Revenue ELSE 0 END)                       AS MTD_Monthly_Revenue,
  SUM(CASE WHEN a.Is_MTD = 1 THEN a.Jarvis_Lost_Sale_Flag ELSE 0 END)                 AS MTD_Jarvis_Lost_Sales,
  SUM(CASE WHEN a.Is_MTD = 1 THEN a.Lost_Sale_Flag ELSE 0 END)                        AS MTD_Lost_Sales,
  1.0*SUM(CASE WHEN a.Is_MTD = 1 THEN a.FCR_Flag END)/NULLIF(COUNT(CASE WHEN a.Is_MTD = 1 THEN a.FCR_Flag END), 0) AS MTD_FCR_Unlocked,
  AVG(CASE WHEN a.Is_MTD = 1 THEN a.Handle_Time_Seconds END)                          AS MTD_Avg_Handle_Seconds,
  MAX(date_format(a.As_Of_Date, 'yyyy-MM'))                                           AS Current_Month,
  SUM(CASE WHEN a.Is_MTD = 1 THEN a.First_12M_Revenue ELSE 0 END)                     AS MTD_First_12M_Revenue,
  1.0*SUM(CASE WHEN a.Is_MTD = 1 THEN a.Jarvis_Lost_Sale_Flag ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Is_MTD = 1 THEN 1 END), 0) AS MTD_Jarvis_Conversion_Impact,
  1.0*SUM(CASE WHEN a.Is_MTD = 1 THEN a.FCR_Flag END)/NULLIF(COUNT(CASE WHEN a.Is_MTD = 1 THEN a.FCR_Flag END), 0) AS MTD_FCR_Rate,
  1.0*SUM(CASE WHEN a.Is_MTD = 1 AND a.FCR_Flag IS NOT NULL THEN a.Transfer_Flag END)/NULLIF(COUNT(CASE WHEN a.Is_MTD = 1 THEN a.FCR_Flag END), 0) AS MTD_Transfer_Rate,
  -- The same days of the month before (a like-for-like comparison)
  1.0*SUM(CASE WHEN a.Month = a.Last_Full_Month AND day(a.Call_Date) <= a.Day_Of_Month THEN a.New_Sales ELSE 0 END)
     /NULLIF(COUNT(CASE WHEN a.Month = a.Last_Full_Month AND day(a.Call_Date) <= a.Day_Of_Month THEN 1 END), 0) AS Same_Days_Last_Month_New_Conversion,
  -- Pace: month to date scaled to the whole month
  SUM(CASE WHEN a.Is_MTD = 1 THEN a.New_Sales ELSE 0 END) * MAX(a.Days_In_Month) / MAX(a.Day_Of_Month)    AS Pace_New_Sales,
  COUNT(CASE WHEN a.Is_MTD = 1 THEN 1 END) * MAX(a.Days_In_Month) / MAX(a.Day_Of_Month) * MAX(r.target_new_conversion) AS Pace_Target_New_Sales,
  MAX(a.Days_In_Month) - MAX(a.Day_Of_Month)                                         AS Days_Left,
  -- The conversion the rest of the month needs to reach the target (calls at the month-to-date daily rate)
  (COUNT(CASE WHEN a.Is_MTD = 1 THEN 1 END) * MAX(a.Days_In_Month) / MAX(a.Day_Of_Month) * MAX(r.target_new_conversion)
     - SUM(CASE WHEN a.Is_MTD = 1 THEN a.New_Sales ELSE 0 END))
   / NULLIF(COUNT(CASE WHEN a.Is_MTD = 1 THEN 1 END) * (MAX(a.Days_In_Month) - MAX(a.Day_Of_Month)) / MAX(a.Day_Of_Month), 0) AS Needed_Rest_Conversion,
  -- Last full month
  COUNT(CASE WHEN a.Is_Last_Full_Month = 1 THEN 1 END)                                AS LFM_Calls,
  SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.New_Sales ELSE 0 END)                 AS LFM_New_Sales,
  SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.Renewal_Sales ELSE 0 END)             AS LFM_Renewal_Sales,
  1.0*SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.New_Sales ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Is_Last_Full_Month = 1 THEN 1 END), 0)     AS LFM_New_Conversion,
  1.0*SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.Renewal_Sales ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Is_Last_Full_Month = 1 THEN 1 END), 0) AS LFM_Renewal_Conversion,
  SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.Monthly_Revenue ELSE 0 END)           AS LFM_Monthly_Revenue,
  SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.First_12M_Revenue ELSE 0 END)         AS LFM_First_12M_Revenue,
  SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.Lost_Sale_Flag ELSE 0 END)            AS LFM_Lost_Sales,
  SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.Jarvis_Lost_Sale_Flag ELSE 0 END)     AS LFM_Jarvis_Lost_Sales,
  1.0*SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.Jarvis_Lost_Sale_Flag ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Is_Last_Full_Month = 1 THEN 1 END), 0) AS LFM_Jarvis_Conversion_Impact,
  1.0*SUM(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.FCR_Flag END)/NULLIF(COUNT(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.FCR_Flag END), 0)        AS LFM_FCR_Rate,
  1.0*SUM(CASE WHEN a.Is_Last_Full_Month = 1 AND a.FCR_Flag IS NOT NULL THEN a.Transfer_Flag END)/NULLIF(COUNT(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.FCR_Flag END), 0) AS LFM_Transfer_Rate,
  1.0*SUM(CASE WHEN a.Is_Last_Full_Month = 1 AND a.FCR_Flag IS NOT NULL THEN a.Repeat_14D_Flag END)/NULLIF(COUNT(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.FCR_Flag END), 0) AS LFM_Repeat_Rate,
  MIN(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.FCR_Locked_Flag END)                  AS LFM_FCR_Locked,
  AVG(CASE WHEN a.Is_Last_Full_Month = 1 THEN a.Handle_Time_Seconds END)              AS LFM_Avg_Handle_Seconds,
  -- The month before that
  1.0*SUM(CASE WHEN a.Month = prev.Prior_Month THEN a.New_Sales ELSE 0 END)/NULLIF(COUNT(CASE WHEN a.Month = prev.Prior_Month THEN 1 END), 0) AS Prior_New_Conversion,
  1.0*SUM(CASE WHEN a.Month = prev.Prior_Month THEN a.FCR_Flag END)/NULLIF(COUNT(CASE WHEN a.Month = prev.Prior_Month THEN a.FCR_Flag END), 0) AS Prior_FCR_Rate,
  -- All the data
  COUNT(*)                                                                            AS Calls_All,
  1.0*SUM(a.New_Sales)/COUNT(*)                                                       AS New_Conversion_All,
  -- Targets
  MAX(r.target_new_conversion)                                                        AS Target_New_Conversion,
  MAX(r.target_renewal_conversion)                                                    AS Target_Renewal_Conversion,
  MAX(r.target_fcr)                                                                   AS Target_FCR,
  MAX(r.target_xsell_attempt)                                                         AS Target_Xsell_Attempt,
  MAX(r.target_aht_seconds)                                                           AS Target_AHT_Seconds
FROM a CROSS JOIN prev CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_cc_kpis IS 'Answers: "How are we doing?", "How did we do yesterday?" and "Are we on pace for target this month?". One row: the latest day in the data (As_Of_Date, Tuesday 20 October 2026, with 11 days left in the month) with the same weekday a week earlier; the month to date (MTD_*) with its pace to the end of the month against the new sales conversion target and the same days of the month before; the last full month (LFM_*, September 2026: calls, new and renewal sales and conversion, revenue, lost and Jarvis-blocked sales, FCR, transfer and repeat rates, handle time); the month before that (Prior_*); and the targets. MTD FCR is unlocked: repeats within 14 days can still arrive, so it will fall.';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_cc_kpis.Pace_New_Sales IS 'Month-to-date new sales scaled to the whole month (straight-line by calendar days)';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_cc_kpis.Pace_Target_New_Sales IS 'New sales needed this month at the target conversion, on the month-to-date call volume scaled to the whole month';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_cc_kpis.MTD_FCR_Unlocked IS 'FCR of answered calls this month so far; unlocked, because repeats within 14 days can still arrive';

-- 2. Who to coach first: the consultants furthest below the median, from the scorecard.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_cc_coaching AS
SELECT * EXCEPT (rn) FROM (
  SELECT s.*, ROW_NUMBER() OVER (ORDER BY s.Sales_Below_Median DESC, s.Agent_ID) AS rn
  FROM {{catalog}}.{{prefix}}_gold.qry_agent_scorecard s
  WHERE s.Conversion_Quartile = 1
) WHERE rn <= {{live:top_agents}};
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_cc_coaching IS 'Answers: "Which consultants should we coach first?". The top_agents (10) consultants in the lowest conversion quartile over the last three months to date, most sales below the median first, with every qry_agent_scorecard column (discovery score, cross-sell attempt rate, sales lost to people causes).';

-- 3. The Command Center's month: the five scenarios and the recovery plan for the month to date.
-- (qry_scenario_* and qry_recovery_plan stay on the last full month, which the Scenario Guide and the
-- deploy checks use; these are the same rules on the month so far.)
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_cc_scenario_calls AS
SELECT 1 AS Scenario_ID, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls
 WHERE Is_MTD = 1 AND Sales_Category = 'Total Home - New Connection' AND Missed_Cross_Sell_Flag = 1
UNION ALL SELECT 2, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_MTD = 1 AND Jarvis_Lost_Sale_Flag = 1
UNION ALL SELECT 3, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_MTD = 1 AND Unresolved_Sales_First_Call_Flag = 1
UNION ALL SELECT 4, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_MTD = 1 AND Avoidable_Transfer_Flag = 1
UNION ALL SELECT 5, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_MTD = 1 AND Customer_No_Sale_Flag = 1;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_cc_scenario_calls IS 'The calls in each scenario (Scenario_ID 1 to 5) in the current month to date (October 2026 to the 20th), using the Scenario Guide rules. qry_scenario_calls holds the last full month.';

CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_cc_scenarios AS
WITH n AS (
  SELECT s.Scenario_ID, COUNT(*) AS Calls, COUNT(DISTINCT c.Customer_ID) AS Customers, SUM(v.Avg_First_12M_Revenue) AS Value_If_Sold
  FROM {{catalog}}.{{prefix}}_gold.qry_cc_scenario_calls s
  JOIN {{catalog}}.{{prefix}}_gold.qry_calls c ON c.Call_ID = s.Call_ID
  LEFT JOIN {{catalog}}.{{prefix}}_gold.qry_sale_value v ON v.Sales_Category = c.Intended_Category
  GROUP BY s.Scenario_ID
), t AS (
  SELECT 1.0*SUM(CASE WHEN Cross_Sell_Outcome = 'Sold' THEN 1 ELSE 0 END)/NULLIF(SUM(COALESCE(Cross_Sell_Attempted_Flag, 0)), 0) AS Take_Up
  FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Sales_Category = 'Total Home - New Connection'
), mob AS (
  SELECT Avg_First_12M_Revenue FROM {{catalog}}.{{prefix}}_gold.qry_sale_value WHERE Sales_Category = 'Postpaid Voice - New Connection'
), cm AS (
  SELECT MAX(date_format(As_Of_Date, 'yyyy-MM')) AS Month FROM {{catalog}}.{{prefix}}_gold.qry_calls
)
SELECT g.Scenario_ID, g.Scenario_Name, g.Business_Question, g.Filter_Logic, cm.Month, COALESCE(n.Calls, 0) AS Calls, n.Customers,
       CASE g.Scenario_ID WHEN 1 THEN n.Calls * t.Take_Up * mob.Avg_First_12M_Revenue
                          WHEN 4 THEN NULL WHEN 5 THEN NULL ELSE n.Value_If_Sold END AS Est_First_12M_Value,
       g.Value_Basis, g.Month AS Last_Full_Month, g.Calls AS Last_Full_Month_Calls
FROM {{catalog}}.{{prefix}}_gold.qry_scenario_summary g
LEFT JOIN n ON n.Scenario_ID = g.Scenario_ID CROSS JOIN t CROSS JOIN mob CROSS JOIN cm;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_cc_scenarios IS 'Answers: "How many calls are in each scenario this month?". The five Scenario Guide scenarios in the current month to date (October 2026 to the 20th): calls, customers and estimated first-year value, with the last full month''s calls for reference (Last_Full_Month_Calls). The calls are in qry_cc_scenario_calls.';

CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_cc_recovery AS
WITH m AS (
  SELECT COUNT(*) AS Calls, SUM(New_Sales) AS New_Sales, MAX(date_format(As_Of_Date, 'yyyy-MM')) AS Month
  FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_MTD = 1
), nv AS (
  SELECT SUM(Avg_First_12M_Revenue * Sales)/SUM(Sales) AS New_Sale_Value FROM {{catalog}}.{{prefix}}_gold.qry_sale_value WHERE Sale_Type = 'New sale'
), l AS (
  SELECT
    SUM(Jarvis_Lost_Sale_Flag) AS Jarvis_All, SUM(CASE WHEN Jarvis_Lost_Sale_Flag = 1 AND Intended_Sale_Type = 'New sale' THEN 1 ELSE 0 END) AS Jarvis_New,
    SUM(CASE WHEN Lost_Sale_Driver = 'People' AND Intended_Sale_Type = 'New sale' THEN 1 ELSE 0 END) AS People_New,
    SUM(Missed_Cross_Sell_Flag) AS Missed_Xsell
  FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_MTD = 1
), tk AS (
  SELECT 1.0*SUM(CASE WHEN Cross_Sell_Outcome = 'Sold' THEN 1 ELSE 0 END)/NULLIF(SUM(COALESCE(Cross_Sell_Attempted_Flag, 0)), 0) AS Take_Up
  FROM {{catalog}}.{{prefix}}_gold.qry_calls
), base AS (
  SELECT m.*, nv.New_Sale_Value, l.*, tk.Take_Up, r.target_new_conversion, r.people_recovery_share, r.xsell_full_attempt_share
  FROM m CROSS JOIN nv CROSS JOIN l CROSS JOIN tk CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r
)
SELECT Month, 0 AS Lever_Order, 'Gap to target' AS Lever, 'Sales needed to reach the new sales conversion target so far this month' AS Detail, 'Telesales' AS Owner,
       target_new_conversion * Calls - New_Sales AS New_Sales, (target_new_conversion * Calls - New_Sales) * New_Sale_Value AS Est_First_12M_Value,
       CONCAT('Target ', CAST(ROUND(target_new_conversion*100, 1) AS STRING), '% x ', CAST(Calls AS STRING), ' calls, less ', CAST(New_Sales AS STRING), ' new sales') AS Basis
FROM base
UNION ALL
SELECT Month, 1, 'Fix Jarvis order errors', 'New sales a Jarvis error stopped', 'IT / Optus', Jarvis_New, Jarvis_New * New_Sale_Value,
       CONCAT(CAST(Jarvis_New AS STRING), ' new sales blocked (', CAST(Jarvis_All AS STRING), ' including renewals)') FROM base
UNION ALL
SELECT Month, 2, 'Offer mobile on every eligible sale', 'Cross-sell opportunities not offered x observed take-up', 'Training',
       Missed_Xsell * xsell_full_attempt_share * Take_Up, Missed_Xsell * xsell_full_attempt_share * Take_Up * New_Sale_Value,
       CONCAT(CAST(Missed_Xsell AS STRING), ' not offered x ', CAST(ROUND(Take_Up*100, 0) AS STRING), '% take-up when offered') FROM base
UNION ALL
SELECT Month, 3, 'Coach discovery and ownership', 'New sales lost to people causes x recovery share', 'Team leads',
       People_New * people_recovery_share, People_New * people_recovery_share * New_Sale_Value,
       CONCAT(CAST(People_New AS STRING), ' new sales lost to people causes x ', CAST(CAST(ROUND(people_recovery_share*100, 0) AS INT) AS STRING), '% assumed recovered') FROM base;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_cc_recovery IS 'Answers: "How do we close the gap to target this month?". The same rules as qry_recovery_plan on the current month to date (October 2026 to the 20th): the gap in new sales to the new sales conversion target so far (Lever_Order 0) and what fixing Jarvis, offering the cross-sell on every eligible sale and coaching discovery and ownership would have added. Planning estimates, not forecasts.';
