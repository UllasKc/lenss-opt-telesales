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
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_cc_coaching IS 'Answers: "Which consultants should we coach first?". The top_agents (10) consultants in the lowest conversion quartile over the last three full months, most sales below the median first, with every qry_agent_scorecard column (discovery score, cross-sell attempt rate, sales lost to people causes).';
