-- Silver: typed, constrained, canonical. One row per call (fact_calls), one per sold product
-- (sales_orders), plus the plan catalogue, consultants and the two audit samples.
-- The workbook writes "not applicable" as text ('N/A'): here every Y/N flag becomes 1/0 and a flag
-- that does not apply becomes NULL (Cross_Sell_Attempted_Flag without an opportunity, FCR_Flag on an
-- unanswered outbound call, Transfer_Valid_Flag without a transfer).
CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_silver.fact_calls AS
SELECT
  CAST(CAST(Call_ID AS BIGINT) AS STRING)                AS Call_ID,
  CAST(Call_Start_Datetime AS TIMESTAMP)                 AS Call_Start_Datetime,
  CAST(Call_Date AS DATE)                                AS Call_Date,
  CAST(Week_Ending AS DATE)                              AS Week_Ending,
  date_format(CAST(Call_Date AS DATE), 'yyyy-MM')       AS Month,   -- CSV inference reads '2026-10' as a date
  CAST(Agent_ID AS STRING)                               AS Agent_ID,
  CAST(Team_Lead AS STRING)                              AS Team_Lead,
  CAST(Agent_Tenure_Months AS INT)                       AS Agent_Tenure_Months,
  CAST(Customer_ID AS STRING)                            AS Customer_ID,
  CAST(Customer_Type AS STRING)                          AS Customer_Type,
  CAST(Existing_Optus_Products AS STRING)                AS Existing_Optus_Products,
  CAST(State AS STRING)                                  AS State,
  CAST(Call_Direction AS STRING)                         AS Call_Direction,
  CAST(Call_Reason AS STRING)                            AS Call_Reason,
  CASE WHEN Sales_Opportunity_Flag = 'Y' THEN 1 ELSE 0 END AS Sales_Opportunity_Flag,
  CAST(Handle_Time_Seconds AS INT)                       AS Handle_Time_Seconds,
  CAST(Hold_Time_Seconds AS INT)                         AS Hold_Time_Seconds,
  CAST(Call_Result AS STRING)                            AS Call_Result,
  CASE WHEN Sale_Flag = 'Y' THEN 1 ELSE 0 END            AS Sale_Flag,
  CAST(Sales_Category AS STRING)                         AS Sales_Category,
  CAST(Credit_Check_Result AS STRING)                    AS Credit_Check_Result,
  CAST(ID_Verification_Result AS STRING)                 AS ID_Verification_Result,
  CASE WHEN Port_In_Requested_Flag = 'Y' THEN 1 ELSE 0 END AS Port_In_Requested_Flag,
  CAST(Port_In_Status AS STRING)                         AS Port_In_Status,
  CASE WHEN Lost_Sale_Flag = 'Y' THEN 1 ELSE 0 END       AS Lost_Sale_Flag,
  CAST(Lost_Sale_Driver AS STRING)                       AS Lost_Sale_Driver,
  CAST(Lost_Sale_Reason AS STRING)                       AS Lost_Sale_Reason,
  CASE WHEN Callback_Promised_Flag = 'Y' THEN 1 ELSE 0 END AS Callback_Promised_Flag,
  CASE WHEN Jarvis_Error_Flag = 'Y' THEN 1 ELSE 0 END    AS Jarvis_Error_Flag,
  CAST(Jarvis_Error_Type AS STRING)                      AS Jarvis_Error_Type,
  CAST(Jarvis_Ticket_ID AS STRING)                       AS Jarvis_Ticket_ID,
  CAST(Jarvis_Ticket_Resolution_Days AS INT)             AS Jarvis_Ticket_Resolution_Days,
  CASE WHEN Cross_Sell_Opportunity_Flag = 'Y' THEN 1 ELSE 0 END AS Cross_Sell_Opportunity_Flag,
  CAST(Cross_Sell_Product AS STRING)                     AS Cross_Sell_Product,
  CASE WHEN Cross_Sell_Attempted_Flag = 'Y' THEN 1 WHEN Cross_Sell_Attempted_Flag = 'N' THEN 0 END AS Cross_Sell_Attempted_Flag,
  CAST(Cross_Sell_Outcome AS STRING)                     AS Cross_Sell_Outcome,
  CASE WHEN Transfer_Flag = 'Y' THEN 1 ELSE 0 END        AS Transfer_Flag,
  CAST(Transfer_Destination AS STRING)                   AS Transfer_Destination,
  CASE WHEN Transfer_Flag = 'Y' THEN CASE WHEN Transfer_Valid_Flag = 'Y' THEN 1 ELSE 0 END END AS Transfer_Valid_Flag,
  CAST(Invalid_Transfer_Reason AS STRING)                AS Invalid_Transfer_Reason,
  CASE WHEN Repeat_14D_Flag = 'Y' THEN 1 ELSE 0 END      AS Repeat_14D_Flag,
  CAST(Repeat_Timeline AS STRING)                        AS Repeat_Timeline,
  CAST(CAST(Next_Contact_Call_ID AS BIGINT) AS STRING)   AS Next_Contact_Call_ID,   -- inferred as a number
  CASE WHEN Is_Repeat_Contact_Flag = 'Y' THEN 1 ELSE 0 END AS Is_Repeat_Contact_Flag,
  CAST(CAST(Previous_Call_ID AS BIGINT) AS STRING)       AS Previous_Call_ID,
  CAST(FCR_Outcome AS STRING)                            AS FCR_Outcome,
  CASE WHEN FCR_Flag = 'Y' THEN 1 WHEN FCR_Flag = 'N' THEN 0 END AS FCR_Flag,
  CASE WHEN FCR_Locked_Flag = 'Y' THEN 1 ELSE 0 END      AS FCR_Locked_Flag
FROM {{catalog}}.{{prefix}}_bronze.fact_calls;

ALTER TABLE {{catalog}}.{{prefix}}_silver.fact_calls ALTER COLUMN Call_ID SET NOT NULL;
ALTER TABLE {{catalog}}.{{prefix}}_silver.fact_calls ADD CONSTRAINT pk_calls PRIMARY KEY (Call_ID);
COMMENT ON TABLE {{catalog}}.{{prefix}}_silver.fact_calls IS 'Optus telesales, one row per handled call (1 Nov 2025 to 20 Oct 2026, synthetic demo data shaped to Optus''s sales and the Concentrix FCR and sales-conversion slides). Typed from the workbook''s Telesales_Calls_Fact: Y/N flags are 1/0; Cross_Sell_Attempted_Flag is NULL without a cross-sell opportunity, FCR_Flag is NULL on an unanswered outbound call, Transfer_Valid_Flag is NULL without a transfer.';

CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_silver.sales_orders AS
SELECT
  CAST(Order_ID AS STRING)               AS Order_ID,
  CAST(CAST(Call_ID AS BIGINT) AS STRING) AS Call_ID,
  CAST(Order_Date AS DATE)               AS Order_Date,
  CAST(Week_Ending AS DATE)              AS Week_Ending,
  date_format(CAST(Order_Date AS DATE), 'yyyy-MM') AS Month,
  CAST(Agent_ID AS STRING)               AS Agent_ID,
  CAST(Team_Lead AS STRING)              AS Team_Lead,
  CAST(Customer_ID AS STRING)            AS Customer_ID,
  CAST(State AS STRING)                  AS State,
  CAST(Sale_Source AS STRING)            AS Sale_Source,
  CAST(Sales_Category AS STRING)         AS Sales_Category,
  CASE WHEN Sales_Category LIKE '%New Connection' THEN 'New sale' ELSE 'Renewal' END AS Sale_Type,
  CAST(Product_Line AS STRING)           AS Product_Line,
  CAST(Plan_Code AS STRING)              AS Plan_Code,
  CAST(Plan_Name AS STRING)              AS Plan_Name,
  CASE WHEN Promo_Applied_Flag = 'Y' THEN 1 ELSE 0 END AS Promo_Applied_Flag,
  CAST(Monthly_Revenue AS DECIMAL(10,2)) AS Monthly_Revenue,
  CAST(Standard_Monthly_Price AS DECIMAL(10,2)) AS Standard_Monthly_Price,
  CAST(Promo_Months AS INT)              AS Promo_Months,
  CAST(First_12M_Revenue AS DECIMAL(12,2)) AS First_12M_Revenue,
  CASE WHEN Device_Included_Flag = 'Y' THEN 1 ELSE 0 END AS Device_Included_Flag,
  CASE WHEN Jarvis_Error_During_Order_Flag = 'Y' THEN 1 ELSE 0 END AS Jarvis_Error_During_Order_Flag
FROM {{catalog}}.{{prefix}}_bronze.sales_orders;
ALTER TABLE {{catalog}}.{{prefix}}_silver.sales_orders ALTER COLUMN Order_ID SET NOT NULL;
ALTER TABLE {{catalog}}.{{prefix}}_silver.sales_orders ADD CONSTRAINT pk_orders PRIMARY KEY (Order_ID);
COMMENT ON TABLE {{catalog}}.{{prefix}}_silver.sales_orders IS 'One row per product sold (an order line). A cross-sell is its own line on the same call (Sale_Source = Cross-sell). Sale_Type: New sale (the three New Connection categories) or Renewal. Revenue is the monthly plan price (AUD); device repayments are not included.';

CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_silver.product_catalog AS
SELECT CAST(Plan_Code AS STRING) AS Plan_Code, CAST(Product_Line AS STRING) AS Product_Line, CAST(Plan_Name AS STRING) AS Plan_Name,
       CAST(Data_or_Speed AS STRING) AS Data_or_Speed, CAST(Promo_Monthly_Price AS DECIMAL(10,2)) AS Promo_Monthly_Price,
       CAST(Promo_Months AS INT) AS Promo_Months, CAST(Standard_Monthly_Price AS DECIMAL(10,2)) AS Standard_Monthly_Price,
       CAST(Minimum_Cost AS DECIMAL(10,2)) AS Minimum_Cost, CAST(Modem_Term_Months AS INT) AS Modem_Term_Months,
       CAST(New_Services_Only AS STRING) AS New_Services_Only, CAST(Inclusions AS STRING) AS Inclusions, CAST(Price_Source AS STRING) AS Price_Source
FROM {{catalog}}.{{prefix}}_bronze.product_catalog;
COMMENT ON TABLE {{catalog}}.{{prefix}}_silver.product_catalog IS 'Optus plans and prices from the plan sheet Optus shared. Price_Source says which prices are from Optus and which are assumed (post-promo prices, Connected Device plans).';

CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_silver.agent_dim AS
SELECT CAST(Agent_ID AS STRING) AS Agent_ID, CAST(Agent_Name AS STRING) AS Agent_Name, CAST(Team_Lead_ID AS STRING) AS Team_Lead_ID,
       CAST(Team_Lead AS STRING) AS Team_Lead, CAST(Hire_Date AS DATE) AS Hire_Date, CAST(Exit_Date AS DATE) AS Exit_Date,
       CAST(Status AS STRING) AS Status, CAST(Tenure_Months_At_Data_End AS INT) AS Tenure_Months_At_Data_End, CAST(Tenure_Band AS STRING) AS Tenure_Band
FROM {{catalog}}.{{prefix}}_bronze.agent_dim;
COMMENT ON TABLE {{catalog}}.{{prefix}}_silver.agent_dim IS 'Consultants and their team leads (8 team leads, 65 active consultants and 3 who left). Consultant names and IDs are the real roster from the Optus FCR file; team lead names are synthetic; hire dates and performance are synthetic. The 3 former consultants have synthetic names.';

CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_silver.elevate_audits AS
SELECT CAST(Audit_ID AS STRING) AS Audit_ID, CAST(CAST(Call_ID AS BIGINT) AS STRING) AS Call_ID, CAST(Audit_Date AS DATE) AS Audit_Date,
       CAST(Call_Date AS DATE) AS Call_Date, CAST(Agent_ID AS STRING) AS Agent_ID, CAST(Team_Lead AS STRING) AS Team_Lead,
       CAST(Call_Reason AS STRING) AS Call_Reason, CASE WHEN Sale_Flag = 'Y' THEN 1 ELSE 0 END AS Sale_Flag,
       CAST(Overall_Score_Pct AS DOUBLE) AS Overall_Score_Pct, CAST(Discovery_Probing_Score AS INT) AS Discovery_Probing_Score,
       CAST(Product_Knowledge_Score AS INT) AS Product_Knowledge_Score, CAST(Objection_Handling_Score AS INT) AS Objection_Handling_Score,
       CASE WHEN Ownership_Flag = 'Y' THEN 1 ELSE 0 END AS Ownership_Flag,
       CASE WHEN Cross_Sell_Opportunity_Flag = 'Y' THEN 1 ELSE 0 END AS Cross_Sell_Opportunity_Flag,
       CASE WHEN Cross_Sell_Attempted_Flag = 'Y' THEN 1 WHEN Cross_Sell_Attempted_Flag = 'N' THEN 0 END AS Cross_Sell_Attempted_Flag,
       NULLIF(CAST(Cross_Sell_Effectiveness AS STRING), 'N/A') AS Cross_Sell_Effectiveness,
       CAST(Cross_Sell_Not_Attempted_Reason AS STRING) AS Cross_Sell_Not_Attempted_Reason,
       CASE WHEN Compliance_Pass_Flag = 'Y' THEN 1 ELSE 0 END AS Compliance_Pass_Flag,
       CAST(Auditor_Comments AS STRING) AS Auditor_Comments
FROM {{catalog}}.{{prefix}}_bronze.elevate_audits;
COMMENT ON TABLE {{catalog}}.{{prefix}}_silver.elevate_audits IS 'Elevate quality audits (about 5 per consultant per month): scores out of 5 for discovery, product knowledge and objection handling, ownership, and the cross-sell fields of the revised form (opportunity, attempted, effectiveness, reason not attempted).';

CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_silver.fcr_audits AS
SELECT CAST(FCR_Audit_ID AS STRING) AS FCR_Audit_ID, CAST(CAST(Call_ID AS BIGINT) AS STRING) AS Call_ID, CAST(Call_Date AS DATE) AS Call_Date,
       CAST(Agent_ID AS STRING) AS Agent_ID, CAST(Team_Lead AS STRING) AS Team_Lead, CAST(FCR_Outcome AS STRING) AS FCR_Outcome,
       CAST(Transfer_Destination AS STRING) AS Transfer_Destination, CAST(Transfer_Valid_Flag AS STRING) AS Transfer_Valid_Flag,
       CAST(CAST(Next_Contact_Call_ID AS BIGINT) AS STRING) AS Next_Contact_Call_ID, CAST(Next_Contact_Datetime AS TIMESTAMP) AS Next_Contact_Datetime,
       CAST(Repeat_Timeline AS STRING) AS Repeat_Timeline, CAST(Call_Reason_Summary AS STRING) AS Call_Reason_Summary,
       CAST(Callback_Reason AS STRING) AS Callback_Reason, CAST(Opportunity_Identifier AS STRING) AS Opportunity_Identifier,
       CAST(FCR_Identifier AS STRING) AS FCR_Identifier, CASE WHEN Avoidable_Flag = 'Y' THEN 1 ELSE 0 END AS Avoidable_Flag
FROM {{catalog}}.{{prefix}}_bronze.fcr_audits;
COMMENT ON TABLE {{catalog}}.{{prefix}}_silver.fcr_audits IS 'FCR audits of transferred and repeat calls (about 6% of them), in the layout of the FCR audit file the team leads keep: call reason, callback reason, opportunity identifier (People / Technology / Customer / Process) and whether it was avoidable.';
