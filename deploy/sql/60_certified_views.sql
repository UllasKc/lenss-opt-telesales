-- Certified gold views: the only objects the app and Genie read. Grain view first (qry_calls, one
-- row per call), then one view per question the Command Center and Explorer answer. Thresholds and
-- targets come live from gold.qry_rules. Every view carries a description (Genie reads them).
-- Periods: As_Of_Date is the latest call date in the data. "MTD" is its month so far; the "last full
-- month" is the latest complete calendar month (September 2026 for data to 20 October 2026).

-- 1. One row per call, with its sales, revenue, the next contact and the period flags.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_calls AS
WITH o AS (
  SELECT Call_ID,
         SUM(CASE WHEN Sale_Type = 'New sale' THEN 1 ELSE 0 END) AS New_Sales,
         SUM(CASE WHEN Sale_Type = 'Renewal' THEN 1 ELSE 0 END)  AS Renewal_Sales,
         COUNT(*)                                                AS Sales_Lines,
         SUM(CASE WHEN Sale_Source = 'Cross-sell' THEN 1 ELSE 0 END) AS Cross_Sell_Lines,
         SUM(Monthly_Revenue)                                    AS Monthly_Revenue,
         SUM(First_12M_Revenue)                                  AS First_12M_Revenue
  FROM {{catalog}}.{{prefix}}_silver.sales_orders GROUP BY Call_ID
), d AS (
  SELECT MAX(Call_Date) AS As_Of_Date FROM {{catalog}}.{{prefix}}_silver.fact_calls
), p AS (
  SELECT As_Of_Date,
         date_format(As_Of_Date, 'yyyy-MM') AS Current_Month,
         date_format(CASE WHEN As_Of_Date = last_day(As_Of_Date) THEN As_Of_Date
                          ELSE add_months(trunc(As_Of_Date, 'MM'), -1) END, 'yyyy-MM') AS Last_Full_Month
  FROM d
)
SELECT
  c.*,
  CASE WHEN c.Call_Reason IN ('New Mobile Plan / Port In', 'Prepaid to Postpaid', 'Mobile Recontract / Device Upgrade') THEN 'Mobile'
       WHEN c.Call_Reason IN ('New NBN Service', 'New 5G/4G Home Internet', 'Home Internet Recontract') THEN 'Home Internet'
       WHEN c.Call_Reason = 'Connected Device / Tablet' THEN 'Connected Device'
       ELSE 'Service / other' END                                                       AS Reason_Group,
  CASE WHEN c.Call_Reason IN ('New Mobile Plan / Port In', 'Prepaid to Postpaid') THEN 'Postpaid Voice - New Connection'
       WHEN c.Call_Reason IN ('New NBN Service', 'New 5G/4G Home Internet') THEN 'Total Home - New Connection'
       WHEN c.Call_Reason = 'Mobile Recontract / Device Upgrade' THEN 'Postpaid Voice - Renewal'
       WHEN c.Call_Reason = 'Home Internet Recontract' THEN 'Home - Renewal'
       WHEN c.Call_Reason = 'Connected Device / Tablet' THEN 'Connected Device - New Connection' END AS Intended_Category,
  CASE WHEN c.Call_Reason IN ('Mobile Recontract / Device Upgrade', 'Home Internet Recontract') THEN 'Renewal'
       WHEN c.Sales_Opportunity_Flag = 1 THEN 'New sale' END                            AS Intended_Sale_Type,
  COALESCE(o.New_Sales, 0)                                                              AS New_Sales,
  COALESCE(o.Renewal_Sales, 0)                                                          AS Renewal_Sales,
  COALESCE(o.Sales_Lines, 0)                                                            AS Sales_Lines,
  COALESCE(o.Cross_Sell_Lines, 0)                                                       AS Cross_Sell_Lines,
  COALESCE(o.Monthly_Revenue, 0)                                                        AS Monthly_Revenue,
  COALESCE(o.First_12M_Revenue, 0)                                                      AS First_12M_Revenue,
  HOUR(c.Call_Start_Datetime)                                                           AS Call_Hour,
  date_format(c.Call_Date, 'EEEE')                                                      AS Day_Of_Week,
  CASE WHEN dayofweek(c.Call_Date) IN (1, 7) THEN 1 ELSE 0 END                          AS Weekend_Flag,
  CASE WHEN c.Agent_Tenure_Months < r.nesting_max_months THEN 1 ELSE 0 END              AS Nesting_Flag,
  CASE WHEN c.Agent_Tenure_Months < r.nesting_max_months THEN 'Nesting (<3m)'
       WHEN c.Agent_Tenure_Months < 6 THEN '3-6m' WHEN c.Agent_Tenure_Months < 12 THEN '6-12m' ELSE '12m+' END AS Tenure_Band,
  CASE WHEN c.Cross_Sell_Opportunity_Flag = 1 AND c.Cross_Sell_Attempted_Flag = 0 THEN 1 ELSE 0 END AS Missed_Cross_Sell_Flag,
  CASE WHEN c.Transfer_Valid_Flag = 0 THEN 1 ELSE 0 END                                 AS Avoidable_Transfer_Flag,
  CASE WHEN c.Lost_Sale_Flag = 1 AND c.Jarvis_Error_Flag = 1 THEN 1 ELSE 0 END           AS Jarvis_Lost_Sale_Flag,
  nx.Sale_Flag                                                                          AS Next_Contact_Sale_Flag,
  CASE WHEN c.Lost_Sale_Flag = 1 AND c.Repeat_14D_Flag = 1 THEN 1 ELSE 0 END             AS Lost_Came_Back_Flag,
  CASE WHEN c.Lost_Sale_Flag = 1 AND nx.Sale_Flag = 1 THEN 1 ELSE 0 END                  AS Lost_Bought_On_Return_Flag,
  CASE WHEN c.Callback_Promised_Flag = 1 AND c.Repeat_14D_Flag = 1 AND nx.Call_Direction = 'Inbound' THEN 1 ELSE 0 END AS Callback_Chased_Flag,
  CASE WHEN c.Repeat_14D_Flag = 1 AND c.Sales_Opportunity_Flag = 1 AND c.Sale_Flag = 0 AND c.Is_Repeat_Contact_Flag = 0 THEN 1 ELSE 0 END AS Unresolved_Sales_First_Call_Flag,
  p.As_Of_Date,
  CASE WHEN c.Call_Date = p.As_Of_Date THEN 1 ELSE 0 END                                AS Is_Latest_Day,
  CASE WHEN c.Month = p.Current_Month THEN 1 ELSE 0 END                                 AS Is_MTD,
  CASE WHEN c.Month = p.Last_Full_Month THEN 1 ELSE 0 END                               AS Is_Last_Full_Month,
  p.Last_Full_Month
FROM {{catalog}}.{{prefix}}_silver.fact_calls c
LEFT JOIN o ON o.Call_ID = c.Call_ID
LEFT JOIN {{catalog}}.{{prefix}}_silver.fact_calls nx ON nx.Call_ID = c.Next_Contact_Call_ID
CROSS JOIN p
CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_calls IS 'The grain view: one row per handled telesales call (1 Nov 2025 to 20 Oct 2026). New_Sales and Renewal_Sales count the order lines sold on the call (a cross-sell is an extra line), so new sales conversion = SUM(New_Sales) / COUNT(*) over handled calls. Reason_Group: Mobile, Home Internet, Connected Device or Service / other. Intended_Category: the sales category the call reason could convert to. Period flags: Is_Latest_Day (As_Of_Date), Is_MTD (the current month so far) and Is_Last_Full_Month (the latest complete month, September 2026). FCR rates use answered calls (FCR_Flag not NULL) and only locked calls (FCR_Locked_Flag = 1) are final. Lost_Bought_On_Return_Flag: a lost sale whose customer called back and bought. Callback_Chased_Flag: a callback was promised but the customer had to call in again.';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_calls.New_Sales IS 'New-connection order lines sold on the call (Postpaid Voice, Total Home, Connected Device), including cross-sells';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_calls.Renewal_Sales IS 'Renewal order lines sold on the call (Postpaid Voice and Home renewals)';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_calls.Monthly_Revenue IS 'Monthly plan revenue of everything sold on the call (AUD)';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_calls.First_12M_Revenue IS 'Plan revenue over the first 12 months of everything sold on the call (AUD)';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_calls.Missed_Cross_Sell_Flag IS '1 when a sale call had a cross-sell opportunity and the consultant did not offer it';
COMMENT ON COLUMN {{catalog}}.{{prefix}}_gold.qry_calls.Jarvis_Lost_Sale_Flag IS '1 when a Jarvis error on the call stopped a sale the customer wanted';

-- Average first-year value of a sale, by category (all data): prices a lost or missed sale.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_sale_value AS
SELECT Sales_Category, Sale_Type, COUNT(*) AS Sales, AVG(Monthly_Revenue) AS Avg_Monthly_Revenue, AVG(First_12M_Revenue) AS Avg_First_12M_Revenue
FROM {{catalog}}.{{prefix}}_silver.sales_orders GROUP BY Sales_Category, Sale_Type;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_sale_value IS 'Average monthly and first-12-month plan revenue of a sale in each sales category, over all the data. Used to put a value on lost and missed sales.';

-- 2. Daily KPIs (the "yesterday" and month-to-date view; Optus asked for daily sales reporting).
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_daily_kpis AS
SELECT c.Call_Date, MAX(c.Day_Of_Week) AS Day_Of_Week, MAX(c.Week_Ending) AS Week_Ending, MAX(c.Month) AS Month,
       COUNT(*) AS Calls, SUM(c.New_Sales) AS New_Sales, SUM(c.Renewal_Sales) AS Renewal_Sales,
       1.0*SUM(c.New_Sales)/COUNT(*) AS New_Conversion, 1.0*SUM(c.Renewal_Sales)/COUNT(*) AS Renewal_Conversion,
       SUM(c.Monthly_Revenue) AS Monthly_Revenue, SUM(c.Lost_Sale_Flag) AS Lost_Sales, SUM(c.Jarvis_Lost_Sale_Flag) AS Jarvis_Lost_Sales,
       1.0*SUM(c.FCR_Flag)/COUNT(c.FCR_Flag) AS FCR_Rate, MIN(c.FCR_Locked_Flag) AS FCR_Locked,
       AVG(c.Handle_Time_Seconds) AS Avg_Handle_Seconds, MAX(r.target_new_conversion) AS Target_New_Conversion
FROM {{catalog}}.{{prefix}}_gold.qry_calls c CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r
GROUP BY c.Call_Date;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_daily_kpis IS 'Answers: "How did we do yesterday?" and "What is the daily new sales conversion this month?". One row per day: calls, new and renewal sales and conversion, monthly revenue sold, lost sales, Jarvis-blocked sales, FCR (FCR_Locked = 0 means repeats can still arrive), handle time and the new sales conversion target.';

-- 3. Weekly KPIs (weeks end Friday, as in the Concentrix slides: WE3010 = 2026-10-30).
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_weekly_kpis AS
WITH s AS (
  SELECT Week_Ending,
         SUM(CASE WHEN Sales_Category = 'Postpaid Voice - New Connection' THEN 1 ELSE 0 END)   AS PV_New_Sales,
         SUM(CASE WHEN Sales_Category = 'Total Home - New Connection' THEN 1 ELSE 0 END)       AS Home_New_Sales,
         SUM(CASE WHEN Sales_Category = 'Connected Device - New Connection' THEN 1 ELSE 0 END) AS CD_New_Sales,
         SUM(CASE WHEN Sales_Category = 'Postpaid Voice - Renewal' THEN 1 ELSE 0 END)          AS PV_Renewals,
         SUM(CASE WHEN Sales_Category = 'Home - Renewal' THEN 1 ELSE 0 END)                    AS Home_Renewals
  FROM {{catalog}}.{{prefix}}_silver.sales_orders GROUP BY Week_Ending
), c AS (
  SELECT Week_Ending, COUNT(*) AS Calls, COUNT(FCR_Flag) AS Answered_Calls, MIN(Call_Date) AS First_Date, MAX(Call_Date) AS Last_Date,
         SUM(CASE WHEN FCR_Outcome = 'Achieved' THEN 1 ELSE 0 END) AS FCR_Achieved,
         SUM(CASE WHEN FCR_Outcome = 'Repeat' THEN 1 ELSE 0 END) AS FCR_Repeat,
         SUM(CASE WHEN FCR_Outcome = 'Transfer' THEN 1 ELSE 0 END) AS FCR_Transfer,
         SUM(CASE WHEN FCR_Outcome = 'Transfer & Repeat' THEN 1 ELSE 0 END) AS FCR_Transfer_Repeat,
         MIN(FCR_Locked_Flag) AS FCR_Locked
  FROM {{catalog}}.{{prefix}}_silver.fact_calls GROUP BY Week_Ending
)
SELECT c.Week_Ending, CONCAT('WE', date_format(c.Week_Ending, 'ddMM')) AS Week_Label, c.First_Date, c.Last_Date, c.Calls,
       s.PV_New_Sales, s.Home_New_Sales, s.CD_New_Sales, s.PV_New_Sales + s.Home_New_Sales + s.CD_New_Sales AS New_Sales,
       s.PV_Renewals, s.Home_Renewals, s.PV_Renewals + s.Home_Renewals AS Renewal_Sales,
       1.0*s.PV_New_Sales/c.Calls AS PV_New_Conversion, 1.0*s.Home_New_Sales/c.Calls AS Home_New_Conversion,
       1.0*(s.PV_New_Sales + s.Home_New_Sales + s.CD_New_Sales)/c.Calls AS New_Conversion,
       1.0*s.PV_Renewals/c.Calls AS PV_Renewal_Conversion, 1.0*s.Home_Renewals/c.Calls AS Home_Renewal_Conversion,
       1.0*(s.PV_Renewals + s.Home_Renewals)/c.Calls AS Renewal_Conversion,
       1.0*c.FCR_Achieved/c.Answered_Calls AS FCR_Achieved_Rate, 1.0*c.FCR_Repeat/c.Answered_Calls AS FCR_Repeat_Rate,
       1.0*c.FCR_Transfer/c.Answered_Calls AS FCR_Transfer_Rate, 1.0*c.FCR_Transfer_Repeat/c.Answered_Calls AS FCR_Transfer_Repeat_Rate,
       c.FCR_Locked, r.target_new_conversion AS Target_New_Conversion, r.target_fcr AS Target_FCR
FROM c LEFT JOIN s ON s.Week_Ending = c.Week_Ending CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_weekly_kpis IS 'Answers: "Show weekly conversion by product" and "What is FCR achieved, repeat and transfer % by week?". One row per week ending Friday (Week_Label WE1610 = week ending 16 Oct 2026, as in the Concentrix slides): new sales and renewals by category and their conversion (sales / handled calls), and the FCR mix of answered calls (Achieved, Repeat only, Transfer only, Transfer & Repeat, adding to 100%). FCR_Locked = 0: the week''s 14-day repeat window has not closed, so its FCR is unlocked and will fall.';

-- 4. Monthly trend.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_monthly_trend AS
SELECT c.Month, MIN(c.Call_Date) AS First_Date, MAX(c.Call_Date) AS Last_Date, COUNT(DISTINCT c.Call_Date) AS Days,
       MAX(c.Is_MTD) AS Is_Partial_Month,
       COUNT(*) AS Calls, SUM(c.New_Sales) AS New_Sales, SUM(c.Renewal_Sales) AS Renewal_Sales,
       1.0*SUM(c.New_Sales)/COUNT(*) AS New_Conversion, 1.0*SUM(c.Renewal_Sales)/COUNT(*) AS Renewal_Conversion,
       SUM(c.Monthly_Revenue) AS Monthly_Revenue, SUM(c.First_12M_Revenue) AS First_12M_Revenue,
       SUM(c.Lost_Sale_Flag) AS Lost_Sales, SUM(c.Jarvis_Lost_Sale_Flag) AS Jarvis_Lost_Sales, SUM(c.Jarvis_Error_Flag) AS Jarvis_Error_Calls,
       1.0*SUM(c.Jarvis_Lost_Sale_Flag)/COUNT(*) AS Jarvis_Conversion_Impact,
       1.0*SUM(CASE WHEN c.FCR_Locked_Flag = 1 THEN c.FCR_Flag END)/COUNT(CASE WHEN c.FCR_Locked_Flag = 1 THEN c.FCR_Flag END) AS FCR_Rate_Locked,
       1.0*SUM(c.FCR_Flag)/COUNT(c.FCR_Flag) AS FCR_Rate_All, COUNT(c.FCR_Flag) AS Answered_Calls,
       1.0*SUM(c.Transfer_Flag)/COUNT(c.FCR_Flag) AS Transfer_Rate, 1.0*SUM(c.Repeat_14D_Flag)/COUNT(c.FCR_Flag) AS Repeat_Rate,
       SUM(c.Avoidable_Transfer_Flag) AS Avoidable_Transfers,
       SUM(c.Cross_Sell_Opportunity_Flag) AS Cross_Sell_Opportunities, SUM(c.Cross_Sell_Attempted_Flag) AS Cross_Sell_Attempts,
       1.0*SUM(c.Cross_Sell_Attempted_Flag)/NULLIF(SUM(c.Cross_Sell_Opportunity_Flag), 0) AS Cross_Sell_Attempt_Rate,
       AVG(c.Handle_Time_Seconds) AS Avg_Handle_Seconds,
       AVG(CASE WHEN c.Jarvis_Error_Flag = 1 THEN c.Handle_Time_Seconds END) AS Avg_Handle_Seconds_Jarvis,
       AVG(CASE WHEN c.Jarvis_Error_Flag = 0 THEN c.Handle_Time_Seconds END) AS Avg_Handle_Seconds_No_Jarvis,
       MAX(r.target_new_conversion) AS Target_New_Conversion, MAX(r.target_renewal_conversion) AS Target_Renewal_Conversion,
       MAX(r.target_fcr) AS Target_FCR
FROM {{catalog}}.{{prefix}}_gold.qry_calls c CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r
GROUP BY c.Month;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_monthly_trend IS 'Answers: "How has conversion / FCR / revenue trended month by month?". One row per month (October 2026 is partial, to the 20th: Is_Partial_Month = 1): calls, new and renewal sales and conversion, revenue sold, lost sales, Jarvis-blocked sales and their conversion impact (points = Jarvis_Conversion_Impact x 100), FCR (locked calls only, and all answered calls), transfer and repeat rates, avoidable transfers, cross-sell attempt rate, handle time with and without a Jarvis error, and the targets.';

-- 5. What we sold: category, product and plan.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_sales_mix AS
SELECT Month, Sales_Category, Sale_Type, Product_Line, Plan_Name, Plan_Code,
       COUNT(*) AS Sales, SUM(CASE WHEN Sale_Source = 'Cross-sell' THEN 1 ELSE 0 END) AS Cross_Sell_Sales,
       SUM(Promo_Applied_Flag) AS Promo_Sales, SUM(Monthly_Revenue) AS Monthly_Revenue, SUM(First_12M_Revenue) AS First_12M_Revenue
FROM {{catalog}}.{{prefix}}_silver.sales_orders GROUP BY Month, Sales_Category, Sale_Type, Product_Line, Plan_Name, Plan_Code;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_sales_mix IS 'Answers: "What did we sell, and what is it worth?". Sales (order lines) per month, Optus reporting category, product line and plan, with cross-sell and promo counts, monthly revenue and first-12-month revenue (AUD).';

-- 6. Conversion by call reason (why customers call, and how often it turns into a sale).
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_reason_conversion AS
SELECT Month, Call_Reason, Reason_Group, Intended_Category,
       COUNT(*) AS Calls, SUM(Sale_Flag) AS Sale_Calls, 1.0*SUM(Sale_Flag)/COUNT(*) AS Sale_Conversion,
       SUM(Lost_Sale_Flag) AS Lost_Sales,
       SUM(CASE WHEN Lost_Sale_Driver = 'People' THEN 1 ELSE 0 END) AS Lost_People,
       SUM(CASE WHEN Lost_Sale_Driver = 'Customer' THEN 1 ELSE 0 END) AS Lost_Customer,
       SUM(CASE WHEN Lost_Sale_Driver = 'System' THEN 1 ELSE 0 END) AS Lost_System,
       SUM(Transfer_Flag) AS Transfers, AVG(Handle_Time_Seconds) AS Avg_Handle_Seconds
FROM {{catalog}}.{{prefix}}_gold.qry_calls GROUP BY Month, Call_Reason, Reason_Group, Intended_Category;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_reason_conversion IS 'Answers: "Which call reasons convert best and worst?" and "Why is mobile weaker than NBN?". Per month and call reason: calls, calls that closed a sale and their share (Sale_Conversion = sale calls / calls with that reason), lost sales by driver, transfers and handle time. Service reasons (billing, order status) never convert.';

-- 7. Lost sales: why customers who wanted to buy did not, and what it is worth.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_lost_sales AS
SELECT c.Month, c.Lost_Sale_Driver, c.Lost_Sale_Reason, c.Reason_Group, c.Intended_Category, c.Intended_Sale_Type,
       COUNT(*) AS Lost_Sales, SUM(c.Lost_Came_Back_Flag) AS Came_Back, SUM(c.Lost_Bought_On_Return_Flag) AS Bought_On_Return,
       SUM(c.Jarvis_Error_Flag) AS With_Jarvis_Error,
       SUM(v.Avg_Monthly_Revenue) AS Est_Monthly_Revenue_Lost, SUM(v.Avg_First_12M_Revenue) AS Est_First_12M_Value_Lost
FROM {{catalog}}.{{prefix}}_gold.qry_calls c
LEFT JOIN {{catalog}}.{{prefix}}_gold.qry_sale_value v ON v.Sales_Category = c.Intended_Category
WHERE c.Lost_Sale_Flag = 1
GROUP BY c.Month, c.Lost_Sale_Driver, c.Lost_Sale_Reason, c.Reason_Group, c.Intended_Category, c.Intended_Sale_Type;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_lost_sales IS 'Answers: "Why are we losing sales?" and "Break down lost sales by driver and reason". A lost sale: the customer intended to buy and the sale did not close for an identified reason. Per month, driver (Customer, People, System), reason and intended category: lost sales, how many customers came back within 14 days and how many bought when they did, how many had a Jarvis error, and the estimated value (the average sale in that category, AUD). Over the data the drivers split Customer 43.3%, People 25.8%, System 30.9%, as Optus confirmed.';

-- 8. Jarvis: errors, the sales they cost, tickets.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_jarvis_impact AS
SELECT c.Month, c.Jarvis_Error_Type,
       COUNT(*) AS Error_Calls, SUM(c.Jarvis_Lost_Sale_Flag) AS Lost_Sales, SUM(c.Sale_Flag) AS Sold_Despite_Error,
       COUNT(c.Jarvis_Ticket_ID) AS Tickets, AVG(c.Jarvis_Ticket_Resolution_Days) AS Avg_Resolution_Days,
       MAX(c.Jarvis_Ticket_Resolution_Days) AS Max_Resolution_Days,
       SUM(CASE WHEN c.Jarvis_Ticket_Resolution_Days > 5 THEN 1 ELSE 0 END) AS Tickets_Over_5_Days,
       AVG(c.Handle_Time_Seconds) AS Avg_Handle_Seconds,
       SUM(c.Lost_Came_Back_Flag * c.Jarvis_Lost_Sale_Flag) AS Lost_Came_Back,
       SUM(c.Lost_Bought_On_Return_Flag * c.Jarvis_Lost_Sale_Flag) AS Lost_Bought_On_Return,
       SUM(CASE WHEN c.Jarvis_Lost_Sale_Flag = 1 THEN v.Avg_First_12M_Revenue ELSE 0 END) AS Est_First_12M_Value_Lost
FROM {{catalog}}.{{prefix}}_gold.qry_calls c
LEFT JOIN {{catalog}}.{{prefix}}_gold.qry_sale_value v ON v.Sales_Category = c.Intended_Category
WHERE c.Jarvis_Error_Flag = 1
GROUP BY c.Month, c.Jarvis_Error_Type;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_jarvis_impact IS 'Answers: "How many sales did Jarvis errors cost?" and "How long do Jarvis tickets take?". Per month and Jarvis error type: calls with an error, sales the error stopped (Lost_Sales), sales closed despite it, tickets and their resolution days (average, maximum, over 5 days), handle time on error calls, how many blocked customers came back and how many bought, and the estimated first-year value lost (AUD). Jarvis is the system consultants use to check eligibility and submit orders; it shows eligibility only, no credit score.';

-- 9. Cross-sell on sale calls (the revised Elevate form: opportunity, attempted, outcome).
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_cross_sell AS
SELECT c.Month, c.Team_Lead, c.Agent_ID, a.Agent_Name, c.Sales_Category, c.Cross_Sell_Product,
       COUNT(*) AS Sale_Calls, SUM(c.Cross_Sell_Opportunity_Flag) AS Opportunities,
       SUM(COALESCE(c.Cross_Sell_Attempted_Flag, 0)) AS Attempted, SUM(c.Missed_Cross_Sell_Flag) AS Not_Offered,
       SUM(CASE WHEN c.Cross_Sell_Outcome = 'Sold' THEN 1 ELSE 0 END) AS Sold,
       SUM(CASE WHEN c.Cross_Sell_Outcome = 'Declined' THEN 1 ELSE 0 END) AS Declined
FROM {{catalog}}.{{prefix}}_gold.qry_calls c
LEFT JOIN {{catalog}}.{{prefix}}_silver.agent_dim a ON a.Agent_ID = c.Agent_ID
WHERE c.Sale_Flag = 1
GROUP BY c.Month, c.Team_Lead, c.Agent_ID, a.Agent_Name, c.Sales_Category, c.Cross_Sell_Product;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_cross_sell IS 'Answers: "How many NBN sales had no mobile offered?" and "Which consultants cross-sell least?". Per month, team lead, consultant, sales category and cross-sell product, over sale calls: opportunities (the customer lacks the complementary Optus service), attempted, not offered, sold and declined. Attempt rate = Attempted / Opportunities; take-up = Sold / Attempted. Sum across rows for a team or month.';

-- 10. "The first call is the only call": what happens after a sale is lost or a callback is promised.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_first_call AS
SELECT Month,
       SUM(Lost_Sale_Flag) AS Lost_Sales, SUM(Lost_Came_Back_Flag) AS Lost_Came_Back, SUM(Lost_Bought_On_Return_Flag) AS Lost_Bought_On_Return,
       SUM(Callback_Promised_Flag) AS Callbacks_Promised, SUM(Callback_Chased_Flag) AS Callbacks_Chased,
       SUM(CASE WHEN Is_Repeat_Contact_Flag = 0 THEN 1 ELSE 0 END) AS First_Contacts,
       SUM(CASE WHEN Is_Repeat_Contact_Flag = 0 THEN Sale_Flag ELSE 0 END) AS First_Contact_Sale_Calls,
       SUM(Is_Repeat_Contact_Flag) AS Repeat_Contacts, SUM(CASE WHEN Is_Repeat_Contact_Flag = 1 THEN Sale_Flag ELSE 0 END) AS Repeat_Contact_Sale_Calls,
       1.0*SUM(CASE WHEN Is_Repeat_Contact_Flag = 0 THEN Sale_Flag ELSE 0 END)/NULLIF(SUM(CASE WHEN Is_Repeat_Contact_Flag = 0 THEN 1 ELSE 0 END), 0) AS First_Contact_Conversion,
       1.0*SUM(CASE WHEN Is_Repeat_Contact_Flag = 1 THEN Sale_Flag ELSE 0 END)/NULLIF(SUM(Is_Repeat_Contact_Flag), 0) AS Repeat_Contact_Conversion,
       SUM(Repeat_14D_Flag) AS Repeats, SUM(CASE WHEN Repeat_Timeline = '<1hr' THEN 1 ELSE 0 END) AS Repeats_Within_1hr,
       SUM(Unresolved_Sales_First_Call_Flag) AS Unresolved_Sales_First_Calls
FROM {{catalog}}.{{prefix}}_gold.qry_calls GROUP BY Month;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_first_call IS 'Answers: "Do customers we lose come back and buy?" and "Are promised callbacks kept?". Per month: lost sales, how many of those customers called again within 14 days and how many bought when they did; callbacks promised and how many customers had to call in again themselves (Callbacks_Chased); sale conversion of first contacts vs repeat contacts (sale calls / calls); repeats and how many came within an hour; first calls with a sales reason that did not close and brought the customer back (Scenario 3).';

-- 11. Transfers: where calls go, and which could have been resolved.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_transfers AS
SELECT Month, Transfer_Destination, CASE WHEN Transfer_Valid_Flag = 1 THEN 'Valid' ELSE 'Avoidable' END AS Transfer_Validity,
       Invalid_Transfer_Reason, CASE WHEN Sales_Opportunity_Flag = 1 THEN 'Sales call' ELSE 'Service call' END AS Call_Type,
       COUNT(*) AS Transfers, AVG(Handle_Time_Seconds) AS Avg_Handle_Seconds, SUM(Repeat_14D_Flag) AS Then_Repeated
FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Transfer_Flag = 1
GROUP BY Month, Transfer_Destination, CASE WHEN Transfer_Valid_Flag = 1 THEN 'Valid' ELSE 'Avoidable' END, Invalid_Transfer_Reason,
         CASE WHEN Sales_Opportunity_Flag = 1 THEN 'Sales call' ELSE 'Service call' END;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_transfers IS 'Answers: "Where do transfers go, and which were avoidable?". Per month, destination (Optus queues: Retention Voice, Service Voice, Service Prepaid Voice, Tech Assurance, SMB, Hardship, Payment Support, Messaging, ...; shares beyond the top three are synthetic until Optus shares them), validity (Avoidable = the consultant could have resolved it), the reason it was avoidable, and whether it was a sales or service call: transfers, handle time and how many then repeated. Fixing avoidable transfers lifts FCR by Avoidable transfers / answered calls.';

-- 12. Consultants by month.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_agent_month AS
WITH au AS (
  SELECT date_format(Call_Date, 'yyyy-MM') AS Month, Agent_ID, COUNT(*) AS Audits, AVG(Discovery_Probing_Score) AS Avg_Discovery_Score,
         AVG(Overall_Score_Pct) AS Avg_Audit_Score, SUM(CASE WHEN Discovery_Probing_Score <= 2 THEN 1 ELSE 0 END) AS Low_Discovery_Audits
  FROM {{catalog}}.{{prefix}}_silver.elevate_audits GROUP BY date_format(Call_Date, 'yyyy-MM'), Agent_ID
)
SELECT c.Month, c.Agent_ID, a.Agent_Name, c.Team_Lead, MAX(c.Tenure_Band) AS Tenure_Band, MAX(c.Nesting_Flag) AS Nesting_Flag,
       COUNT(*) AS Calls, SUM(c.Sale_Flag) AS Sale_Calls, SUM(c.New_Sales) AS New_Sales, SUM(c.Renewal_Sales) AS Renewal_Sales,
       1.0*SUM(c.New_Sales)/COUNT(*) AS New_Conversion, 1.0*SUM(c.Sale_Flag)/COUNT(*) AS Sale_Conversion,
       SUM(c.Monthly_Revenue) AS Monthly_Revenue, SUM(c.Lost_Sale_Flag) AS Lost_Sales,
       SUM(CASE WHEN c.Lost_Sale_Driver = 'People' THEN 1 ELSE 0 END) AS Lost_People,
       SUM(c.Cross_Sell_Opportunity_Flag) AS Cross_Sell_Opportunities, SUM(COALESCE(c.Cross_Sell_Attempted_Flag, 0)) AS Cross_Sell_Attempts,
       1.0*SUM(c.FCR_Flag)/COUNT(c.FCR_Flag) AS FCR_Rate, SUM(c.Transfer_Flag) AS Transfers, SUM(c.Avoidable_Transfer_Flag) AS Avoidable_Transfers,
       SUM(c.Callback_Promised_Flag) AS Callbacks_Promised, AVG(c.Handle_Time_Seconds) AS Avg_Handle_Seconds,
       MAX(au.Audits) AS Audits, MAX(au.Avg_Discovery_Score) AS Avg_Discovery_Score, MAX(au.Avg_Audit_Score) AS Avg_Audit_Score,
       MAX(au.Low_Discovery_Audits) AS Low_Discovery_Audits
FROM {{catalog}}.{{prefix}}_gold.qry_calls c
LEFT JOIN {{catalog}}.{{prefix}}_silver.agent_dim a ON a.Agent_ID = c.Agent_ID
LEFT JOIN au ON au.Month = c.Month AND au.Agent_ID = c.Agent_ID
GROUP BY c.Month, c.Agent_ID, a.Agent_Name, c.Team_Lead;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_agent_month IS 'Answers: "How is each consultant doing?". Per month and consultant (real consultant names, synthetic team lead names; performance synthetic): calls, sale calls, new and renewal sales and conversion, revenue, lost sales (and those lost to people causes), cross-sell opportunities and attempts, FCR, transfers and avoidable transfers, callbacks promised, handle time, and their Elevate audits (count, average discovery score out of 5, average audit score, audits with discovery 2 or less).';

-- 13. Consultant scorecard over the last three full months (who to coach first).
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_agent_scorecard AS
WITH w AS (
  SELECT Last_Full_Month, date_format(add_months(to_date(CONCAT(Last_Full_Month, '-01')), -2), 'yyyy-MM') AS Window_Start
  FROM {{catalog}}.{{prefix}}_gold.qry_calls LIMIT 1
), m AS (
  SELECT g.Agent_ID, MAX(g.Agent_Name) AS Agent_Name, MAX(g.Team_Lead) AS Team_Lead, MAX(g.Tenure_Band) AS Tenure_Band,
         SUM(g.Calls) AS Calls, SUM(g.Sale_Calls) AS Sale_Calls, SUM(g.New_Sales) AS New_Sales,
         1.0*SUM(g.Sale_Calls)/SUM(g.Calls) AS Sale_Conversion, 1.0*SUM(g.New_Sales)/SUM(g.Calls) AS New_Conversion,
         SUM(g.Lost_People) AS Lost_People, SUM(g.Cross_Sell_Opportunities) AS Cross_Sell_Opportunities,
         1.0*SUM(g.Cross_Sell_Attempts)/NULLIF(SUM(g.Cross_Sell_Opportunities), 0) AS Cross_Sell_Attempt_Rate,
         SUM(g.Avoidable_Transfers) AS Avoidable_Transfers, SUM(g.Audits) AS Audits,
         SUM(g.Avg_Discovery_Score * g.Audits)/NULLIF(SUM(g.Audits), 0) AS Avg_Discovery_Score,
         SUM(g.Low_Discovery_Audits) AS Low_Discovery_Audits
  FROM {{catalog}}.{{prefix}}_gold.qry_agent_month g CROSS JOIN w
  WHERE g.Month BETWEEN w.Window_Start AND w.Last_Full_Month
  GROUP BY g.Agent_ID
), ranked AS (
  SELECT m.*, r.min_agent_calls, r.low_discovery_score,
         CASE WHEN m.Calls >= r.min_agent_calls THEN NTILE(4) OVER (PARTITION BY CASE WHEN m.Calls >= r.min_agent_calls THEN 1 ELSE 0 END ORDER BY m.Sale_Conversion) END AS Conversion_Quartile,
         percentile(m.Sale_Conversion, 0.5) OVER () AS Median_Sale_Conversion
  FROM m CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r
)
SELECT w.Window_Start, w.Last_Full_Month AS Window_End,
       ranked.Agent_ID, ranked.Agent_Name, ranked.Team_Lead, ranked.Tenure_Band, ranked.Calls, ranked.Sale_Calls, ranked.New_Sales,
       ranked.Sale_Conversion, ranked.New_Conversion, ranked.Lost_People, ranked.Cross_Sell_Opportunities, ranked.Cross_Sell_Attempt_Rate,
       ranked.Avoidable_Transfers, ranked.Audits, ranked.Avg_Discovery_Score, ranked.Low_Discovery_Audits,
       ranked.Conversion_Quartile, ranked.Median_Sale_Conversion,
       GREATEST(0, (Median_Sale_Conversion - Sale_Conversion) * Calls) AS Sales_Below_Median,
       CASE WHEN Conversion_Quartile = 1 AND Avg_Discovery_Score <= low_discovery_score + 1 THEN 'Coach first: conversion and discovery'
            WHEN Conversion_Quartile = 1 THEN 'Coach: conversion'
            WHEN Cross_Sell_Attempt_Rate < 0.15 THEN 'Coach: cross-sell'
            WHEN Conversion_Quartile = 4 THEN 'Top performer' ELSE 'On track' END AS Coaching_Focus
FROM ranked CROSS JOIN w;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_agent_scorecard IS 'Answers: "Which consultants should we coach first?" and "Who are our top performers?". One row per consultant over the last three full months (Window_Start to Window_End): calls, sale conversion and its quartile among consultants with at least min_agent_calls calls (1 = lowest), new sales, sales lost to people causes, cross-sell attempt rate, avoidable transfers and Elevate discovery score (out of 5). Sales_Below_Median: extra sale calls if the consultant converted at the median. Coaching_Focus is a rule, not a judgement on the person.';

-- 14. Team leads by month.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_team_month AS
SELECT Month, Team_Lead, COUNT(DISTINCT Agent_ID) AS Consultants, SUM(Calls) AS Calls, SUM(Sale_Calls) AS Sale_Calls, SUM(New_Sales) AS New_Sales,
       1.0*SUM(New_Sales)/SUM(Calls) AS New_Conversion, 1.0*SUM(Sale_Calls)/SUM(Calls) AS Sale_Conversion,
       1.0*SUM(Cross_Sell_Attempts)/NULLIF(SUM(Cross_Sell_Opportunities), 0) AS Cross_Sell_Attempt_Rate,
       SUM(Lost_People) AS Lost_People, SUM(Avoidable_Transfers) AS Avoidable_Transfers,
       SUM(Avg_Discovery_Score * Audits)/NULLIF(SUM(Audits), 0) AS Avg_Discovery_Score
FROM {{catalog}}.{{prefix}}_gold.qry_agent_month GROUP BY Month, Team_Lead;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_team_month IS 'Answers: "How do the teams compare?". Per month and team lead (real consultant names, synthetic team lead names; performance synthetic): consultants, calls, new sales and conversion, sale conversion, cross-sell attempt rate, sales lost to people causes, avoidable transfers and Elevate discovery score. Teams differ little; compare consultants (qry_agent_scorecard) for coaching.';

-- 15. The five scenarios, in the last full month.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_scenario_calls AS
SELECT 1 AS Scenario_ID, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls
 WHERE Is_Last_Full_Month = 1 AND Sales_Category = 'Total Home - New Connection' AND Missed_Cross_Sell_Flag = 1
UNION ALL SELECT 2, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_Last_Full_Month = 1 AND Jarvis_Lost_Sale_Flag = 1
UNION ALL SELECT 3, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_Last_Full_Month = 1 AND Unresolved_Sales_First_Call_Flag = 1
UNION ALL SELECT 4, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_Last_Full_Month = 1 AND Avoidable_Transfer_Flag = 1
UNION ALL SELECT 5, Call_ID FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_Last_Full_Month = 1 AND Lost_Sale_Driver = 'Customer';
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_scenario_calls IS 'The calls in each scenario (Scenario_ID 1 to 5) in the last full month (September 2026). Join to qry_calls on Call_ID for the details. See qry_scenario_summary for what each scenario means.';

CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_scenario_summary AS
WITH n AS (
  SELECT s.Scenario_ID, COUNT(*) AS Calls, COUNT(DISTINCT c.Customer_ID) AS Customers, MAX(c.Last_Full_Month) AS Month,
         SUM(v.Avg_First_12M_Revenue) AS Value_If_Sold
  FROM {{catalog}}.{{prefix}}_gold.qry_scenario_calls s
  JOIN {{catalog}}.{{prefix}}_gold.qry_calls c ON c.Call_ID = s.Call_ID
  LEFT JOIN {{catalog}}.{{prefix}}_gold.qry_sale_value v ON v.Sales_Category = c.Intended_Category
  GROUP BY s.Scenario_ID
), t AS (
  SELECT 1.0*SUM(CASE WHEN Cross_Sell_Outcome = 'Sold' THEN 1 ELSE 0 END)/NULLIF(SUM(COALESCE(Cross_Sell_Attempted_Flag, 0)), 0) AS Take_Up
  FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Sales_Category = 'Total Home - New Connection'
), mob AS (
  SELECT Avg_First_12M_Revenue FROM {{catalog}}.{{prefix}}_gold.qry_sale_value WHERE Sales_Category = 'Postpaid Voice - New Connection'
)
SELECT g.Scenario_ID, g.Scenario_Name, g.Business_Question, g.Filter_Logic, n.Month, n.Calls, n.Customers,
       CASE g.Scenario_ID WHEN 1 THEN n.Calls * t.Take_Up * mob.Avg_First_12M_Revenue
                          WHEN 4 THEN NULL ELSE n.Value_If_Sold END AS Est_First_12M_Value,
       CASE g.Scenario_ID WHEN 1 THEN 'Missed opportunities x observed take-up x average mobile sale'
                          WHEN 4 THEN 'No sales value: an FCR measure' ELSE 'Average sale value of the intended category' END AS Value_Basis
FROM (VALUES
  (1, 'Missed Mobile Cross-Sell on NBN Sales', 'Home internet sales where the customer has no Optus mobile and the consultant did not offer one.', 'Sales_Category = Total Home - New Connection AND Cross_Sell_Opportunity_Flag = 1 AND Cross_Sell_Attempted_Flag = 0'),
  (2, 'Jarvis Errors Blocking Sales', 'Sales the customer wanted that a Jarvis error stopped.', 'Jarvis_Error_Flag = 1 AND Lost_Sale_Flag = 1'),
  (3, 'Lost Sales from Unresolved First Calls', 'First calls with a sales reason that did not close and brought the customer back within 14 days.', 'Repeat_14D_Flag = 1 AND Sales_Opportunity_Flag = 1 AND Sale_Flag = 0 AND Is_Repeat_Contact_Flag = 0'),
  (4, 'Avoidable Transfers', 'Transfers the consultant could have resolved: Retention without checking other plans, basic billing, a plan change.', 'Transfer_Valid_Flag = 0'),
  (5, 'Customer Eligibility Blockers', 'Sales lost to a failed credit check, failed ID verification or a missing port-in account number.', 'Lost_Sale_Driver = Customer')
) AS g(Scenario_ID, Scenario_Name, Business_Question, Filter_Logic)
LEFT JOIN n ON n.Scenario_ID = g.Scenario_ID CROSS JOIN t CROSS JOIN mob;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_scenario_summary IS 'Answers: "Show the scenarios" and "How many calls are in each scenario?". The five scenarios of the Scenario Guide in the last full month (September 2026: 302, 115, 1,957, 730 and 288 calls), with customers and an estimated first-year value (Value_Basis says how; Scenario 4 has none). The calls are in qry_scenario_calls.';

-- 16. The recovery plan: how the last full month''s gap to target could close.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_recovery_plan AS
WITH m AS (
  SELECT COUNT(*) AS Calls, SUM(New_Sales) AS New_Sales, SUM(Renewal_Sales) AS Renewal_Sales, MAX(Last_Full_Month) AS Month
  FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_Last_Full_Month = 1
), nv AS (
  SELECT SUM(Avg_First_12M_Revenue * Sales)/SUM(Sales) AS New_Sale_Value FROM {{catalog}}.{{prefix}}_gold.qry_sale_value WHERE Sale_Type = 'New sale'
), l AS (
  SELECT
    SUM(Jarvis_Lost_Sale_Flag) AS Jarvis_All, SUM(CASE WHEN Jarvis_Lost_Sale_Flag = 1 AND Intended_Sale_Type = 'New sale' THEN 1 ELSE 0 END) AS Jarvis_New,
    SUM(CASE WHEN Lost_Sale_Driver = 'People' THEN 1 ELSE 0 END) AS People_All,
    SUM(CASE WHEN Lost_Sale_Driver = 'People' AND Intended_Sale_Type = 'New sale' THEN 1 ELSE 0 END) AS People_New,
    SUM(Missed_Cross_Sell_Flag) AS Missed_Xsell
  FROM {{catalog}}.{{prefix}}_gold.qry_calls WHERE Is_Last_Full_Month = 1
), tk AS (
  SELECT 1.0*SUM(CASE WHEN Cross_Sell_Outcome = 'Sold' THEN 1 ELSE 0 END)/NULLIF(SUM(COALESCE(Cross_Sell_Attempted_Flag, 0)), 0) AS Take_Up
  FROM {{catalog}}.{{prefix}}_gold.qry_calls
), base AS (
  SELECT m.*, nv.New_Sale_Value, l.*, tk.Take_Up, r.target_new_conversion, r.target_renewal_conversion, r.people_recovery_share, r.xsell_full_attempt_share
  FROM m CROSS JOIN nv CROSS JOIN l CROSS JOIN tk CROSS JOIN {{catalog}}.{{prefix}}_gold.qry_rules r
)
SELECT Month, 0 AS Lever_Order, 'Gap to target' AS Lever, 'Sales needed to reach the new sales conversion target' AS Detail, 'Telesales' AS Owner,
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
       CONCAT(CAST(People_New AS STRING), ' new sales lost to people causes x ', CAST(ROUND(people_recovery_share*100, 0) AS STRING), '% assumed recovered') FROM base;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_recovery_plan IS 'Answers: "How do we close the gap to target?". For the last full month (September 2026): the gap in new sales to the new sales conversion target (Lever_Order 0), and three levers with the new sales each could add and their first-year value (AUD): fixing Jarvis order errors (observed blocked new sales), offering the cross-sell on every eligible sale (missed opportunities x the observed take-up), and coaching discovery and ownership (new sales lost to people causes x people_recovery_share, an assumption). Estimates for planning, not forecasts.';

-- 17. Audits, exposed for questions about quality.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_elevate_audits AS
SELECT e.*, a.Agent_Name FROM {{catalog}}.{{prefix}}_silver.elevate_audits e LEFT JOIN {{catalog}}.{{prefix}}_silver.agent_dim a ON a.Agent_ID = e.Agent_ID;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_elevate_audits IS 'Answers: "What do quality audits say about discovery and cross-sell?". One row per Elevate audit: scores out of 5 (discovery and probing, product knowledge, objection handling), overall score %, ownership, cross-sell opportunity / attempted / effectiveness / reason not attempted, compliance and the auditor''s comment.';

CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_fcr_audits AS
SELECT * FROM {{catalog}}.{{prefix}}_silver.fcr_audits;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_fcr_audits IS 'Answers: "Why are calls not resolved first time?". One row per FCR audit of a transferred or repeat call: what the customer called about, why they called back, the opportunity identifier (People / Technology / Customer / Process), the FCR identifier (topic) and whether it was avoidable.';

CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_product_catalog AS
SELECT * FROM {{catalog}}.{{prefix}}_silver.product_catalog;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_product_catalog IS 'Answers: "What plans do we sell and at what price?". Optus plans with promo price and months, standard price, minimum cost, modem term and inclusions. Price_Source marks assumed prices.';
