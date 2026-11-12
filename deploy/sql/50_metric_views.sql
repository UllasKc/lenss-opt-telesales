-- Governed metric view over calls. Requires DBR 16.4+ / a current SQL warehouse.
-- Built after the certified views (its source is gold.qry_calls). Metric views can't read a table at
-- query time: {{rule:<name>}} is filled in by the deploy from gold.business_rules_config.
-- At most 10 synonyms per field, or the create fails.
CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.mv_telesales WITH METRICS LANGUAGE YAML AS $$
version: 1.1
comment: "Optus telesales measures over handled calls (1 Nov 2025 to 20 Oct 2026, amounts in AUD). Conversion is sales / handled calls. FCR uses answered calls; only locked calls (14-day window closed) are final. Filter Month or Call_Date for a period."
source: {{catalog}}.{{prefix}}_gold.qry_calls
fields:
  - name: Month
    expr: source.Month
    synonyms: [month, period, MTD, last month]
  - name: Week_Ending
    expr: source.Week_Ending
    synonyms: [week, week ending, WE]
  - name: Call_Date
    expr: source.Call_Date
    synonyms: [day, date, yesterday]
  - name: Call_Reason
    expr: source.Call_Reason
    synonyms: [reason, intent, why they called, call type]
  - name: Reason_Group
    expr: source.Reason_Group
    synonyms: [product interest, mobile, home internet, NBN]
  - name: Sales_Category
    expr: source.Sales_Category
    synonyms: [category, product category, postpaid voice, total home, renewal]
  - name: Team_Lead
    expr: source.Team_Lead
    synonyms: [team, TL, team leader]
  - name: Agent_ID
    expr: source.Agent_ID
    synonyms: [consultant, agent, rep]
  - name: Tenure_Band
    expr: source.Tenure_Band
    synonyms: [tenure, nesting, new starters]
  - name: State
    expr: source.State
    synonyms: [state, territory, NSW, VIC, QLD, WA, SA]
  - name: Call_Result
    expr: source.Call_Result
    synonyms: [disposition, outcome, call outcome, result]
  - name: Lost_Sale_Driver
    expr: source.Lost_Sale_Driver
    synonyms: [driver, lost sale driver, people, customer, system, system error]
  - name: FCR_Outcome
    expr: source.FCR_Outcome
    synonyms: [FCR outcome, first contact resolution, repeat, transfer]
  - name: Customer_Type
    expr: source.Customer_Type
    synonyms: [new customer, existing customer]
measures:
  - name: calls
    expr: COUNT(1)
    comment: "Handled calls"
    synonyms: [call volume, contacts, handled calls]
  - name: new_sales
    expr: SUM(source.New_Sales)
    comment: "New-connection sales (order lines), including cross-sells"
    synonyms: [new connections, new sales, sales]
  - name: renewal_sales
    expr: SUM(source.Renewal_Sales)
    comment: "Renewal sales (order lines)"
    synonyms: [renewals, recontracts]
  - name: new_sales_conversion
    expr: SUM(source.New_Sales) / COUNT(1)
    comment: "New sales / handled calls. Target {{rule:target_new_conversion}} (as a fraction)."
    synonyms: [conversion, new sales conversion, conversion rate]
  - name: renewal_conversion
    expr: SUM(source.Renewal_Sales) / COUNT(1)
    comment: "Renewal sales / handled calls"
  - name: monthly_revenue
    expr: SUM(source.Monthly_Revenue)
    comment: "Monthly plan revenue sold (AUD)"
    synonyms: [revenue, MRR, monthly revenue]
  - name: first_year_revenue
    expr: SUM(source.First_12M_Revenue)
    comment: "Plan revenue over the first 12 months of what was sold (AUD)"
  - name: lost_sales
    expr: SUM(source.Lost_Sale_Flag)
    comment: "Calls where a customer who wanted to buy did not, for an identified reason"
    synonyms: [lost opportunities, missed sales]
  - name: jarvis_lost_sales
    expr: SUM(source.Jarvis_Lost_Sale_Flag)
    comment: "Sales a Jarvis error stopped"
    synonyms: [system errors, Jarvis errors]
  - name: fcr_rate
    expr: SUM(source.FCR_Flag) / COUNT(source.FCR_Flag)
    comment: "Answered calls not transferred and not repeated within 14 days / answered calls (recent calls are unlocked)"
    synonyms: [FCR, first contact resolution]
  - name: transfer_rate
    expr: SUM(CASE WHEN source.FCR_Flag IS NOT NULL THEN source.Transfer_Flag END) / COUNT(source.FCR_Flag)
    comment: "Transferred / answered calls"
  - name: avoidable_transfers
    expr: SUM(source.Avoidable_Transfer_Flag)
    comment: "Transfers the consultant could have resolved"
  - name: cross_sell_attempt_rate
    expr: SUM(source.Cross_Sell_Attempted_Flag) / NULLIF(SUM(source.Cross_Sell_Opportunity_Flag), 0)
    comment: "Cross-sell offered / sale calls with a cross-sell opportunity"
    synonyms: [cross-sell rate, cross sell attempts]
  - name: avg_handle_seconds
    expr: AVG(source.Handle_Time_Seconds)
    comment: "Average handle time in seconds"
    synonyms: [AHT, handle time]
$$;
