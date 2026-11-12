-- Governance content that is not in the workbook: how SQL must be written, what the data can't
-- answer, and the demo order. The workbook's own Data_Dictionary, Scenario_Guide,
-- Sample_BI_Questions and Assumptions_and_Questions land in the context schema at ingest.
CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_context.sql_generation_controls (
  control_id INT, control_text STRING
);

INSERT INTO {{catalog}}.{{prefix}}_context.sql_generation_controls VALUES
(1,  'State the period of every figure. "Yesterday" / "today" means the latest day in the data (As_Of_Date, Tuesday 20 October 2026, with 11 days left in the month); "this month" / "MTD" means October 2026 so far; "last month" means the last full month, September 2026.'),
(2,  'Conversion = sales / handled calls (COUNT(*) of qry_calls). New sales conversion uses New_Sales (new-connection order lines, cross-sells included); renewals conversion uses Renewal_Sales. Say which one you report.'),
(3,  'Count sales from order lines (New_Sales, Renewal_Sales or qry_sales_mix.Sales), not from Sale_Flag, which marks a call with at least one sale.'),
(4,  'Calculate rates as SUM(numerator)/SUM(denominator), never an average of per-segment percentages.'),
(5,  'FCR, transfer and repeat rates are over answered calls (FCR_Flag IS NOT NULL). Calls in the last 14 days are unlocked (FCR_Locked_Flag = 0): say their FCR can still fall.'),
(6,  'Cross-sell attempt rate = attempted / sale calls with a cross-sell opportunity; take-up = sold / attempted.'),
(7,  'Apply min_segment_calls (100) calls before ranking a segment and min_agent_calls (150) before ranking a consultant.'),
(8,  'Label comparisons as observed, not causal. Recovery estimates (qry_recovery_plan) are planning figures, not forecasts.'),
(9,  'Return a plain limitation message when required data is unavailable, rather than approximating.'),
(10, 'Consultant names are the real roster; team lead names are synthetic. Every call and figure about them is synthetic; customers are identifiers only (no names, phone numbers or addresses).');

CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_context.known_limitations (
  topic STRING, question_pattern STRING, why_blocked STRING, required_behavior STRING
);

INSERT INTO {{catalog}}.{{prefix}}_context.known_limitations VALUES
('Forecasting', 'What will next month''s conversion / sales be?',
 'The data has a year of history but no model or plan to project from.',
 'Do not forecast. Report the trend and the month-to-date pace (qry_cc_kpis.Pace_New_Sales, a straight-line scaling, not a forecast).'),
('Targets', 'What are the targets for renewals, FCR, cross-sell and handle time?',
 'Only the 5.4% new sales conversion target is confirmed by Optus; the others in business_rules_config are placeholders.',
 'Give the target with its source from business_rules_config.notes; say when it is assumed.'),
('Credit score', 'What is the customer''s credit score?',
 'Jarvis shows eligibility only; Optus does not use or share a credit score.',
 'Say the data has the credit check result (eligible / not eligible) but no credit score.'),
('Device revenue', 'How much did we make on phones and devices?',
 'Revenue is the monthly plan price only. Device prices and repayments are not in the data (Device_Included_Flag only marks a recontract that included a phone).',
 'Report plan revenue and say device revenue is not included.'),
('Customer satisfaction', 'What is CSAT / NPS?',
 'No CSAT, tNPS or survey data was supplied.',
 'Say it is not in this data.'),
('Queue and channel', 'How long did customers wait, or did they move to another channel?',
 'No queue wait time, abandonment or other-channel data was supplied.',
 'Say it is not in this data; repeat calls (Repeat_14D_Flag) are the closest signal.'),
('Cross-sell history', 'How did cross-sell do last year / before August?',
 'Cross-sell is new: it started in August 2026 and consultants are still in training. There are no cross-sell offers or Elevate cross-sell scores before August.',
 'Say cross-sell started in August 2026; compare August, September and October only, and describe the trend as training landing.'),
('Call outcomes', 'How many calls were transferred / not eligible / failed?',
 'Optus records four call outcomes only: Sale, Callback, No Answer, Rejected (no sale).',
 'Use Call_Result for those four; use Transfer_Flag, Jarvis_Error_Flag, Credit_Check_Result and ID_Verification_Result for the detail.'),
('Transfer shares', 'What share of transfers goes to each queue?',
 'The queues are Optus''s list; only Retention Voice, Service Voice and Service Prepaid Voice shares come from Optus (FCR slide). The other shares are synthetic until Optus shares them.',
 'Give the figures and say the smaller queues'' shares are synthetic.'),
('Synthetic data', 'Is this real Optus data?',
 'The data is synthetic, shaped to Optus''s sales, the Concentrix FCR and conversion slides and the plans Optus shared. It runs to 20 October 2026.',
 'Say so when asked. Consultant names are real but their figures are synthetic: never present them as real performance. Team lead names are synthetic.');

CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_context.demo_query_sequence (
  step_order INT, question STRING
);

INSERT INTO {{catalog}}.{{prefix}}_context.demo_query_sequence VALUES
(1, 'How did we do yesterday, and are we on pace for target this month?'),
(2, 'Show weekly new sales conversion by product over the last 8 weeks.'),
(3, 'Which call reasons convert best and worst last month?'),
(4, 'How many sales did Jarvis errors cost last month, and how long do tickets take?'),
(5, 'How many NBN sales last month had no mobile cross-sell offered?'),
(6, 'Do customers we lose come back and buy?'),
(7, 'Which consultants should we coach first?'),
(8, 'How do we close the gap to target?');
