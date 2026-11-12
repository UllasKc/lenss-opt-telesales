-- Business thresholds and targets as data, not hardcoded logic. Every certified and Command Center
-- view reads them through gold.qry_rules, so changing a value here and re-running the deploy's
-- transform and views steps moves every figure. Each note says where the value comes from: an
-- Optus / Concentrix source, or "assumed - to confirm" (see context.assumptions_and_questions).
CREATE OR REPLACE TABLE {{catalog}}.{{prefix}}_gold.business_rules_config (
  rule_name STRING COMMENT 'Name used by gold.qry_rules and the views',
  threshold_value DOUBLE COMMENT 'The value in force (NULL = not set)',
  notes STRING COMMENT 'What the rule means, where it comes from and which views use it'
) COMMENT 'Every target and threshold the gold views use, with its meaning and source. Views read these values through gold.qry_rules; quote this table when asked how a figure is defined or what a target is.';

INSERT INTO {{catalog}}.{{prefix}}_gold.business_rules_config VALUES
-- Targets
('target_new_conversion', 0.054, 'New sales conversion target: new sales (Postpaid Voice, Total Home and Connected Device new connections, including cross-sells) / handled calls. 5.4% from the Concentrix Sales Conversion slide (MTD vs target).'),
('target_renewal_conversion', 0.035, 'Renewals conversion target: Postpaid Voice and Home renewals / handled calls. Assumed - to confirm with Optus.'),
('target_fcr', 0.50, 'First contact resolution target (locked calls). Assumed - to confirm with Optus.'),
('target_xsell_attempt', 0.60, 'Cross-sell attempt rate target: attempted / sale calls with a cross-sell opportunity. Assumed - to confirm with Optus.'),
('target_aht_seconds', 900, 'Average handle time target in seconds. Assumed - to confirm with Optus.'),
-- Definitions
('repeat_window_days', 14, 'A call is a repeat when the same customer calls again within this many days (Optus FCR definition). FCR for calls in the last 14 days of data is unlocked: repeats can still arrive.'),
('nesting_max_months', 3, 'A consultant with fewer than this many months of tenure is in nesting (new starter).'),
('low_discovery_score', 2, 'An Elevate discovery and probing score at or below this (out of 5) is a coaching flag. Used by qry_agent_scorecard.'),
('min_agent_calls', 150, 'Minimum calls in the window before a consultant is ranked. Used by qry_agent_scorecard.'),
('min_segment_calls', 100, 'Minimum calls before a segment (call reason, state, hour) is ranked or called out.'),
-- The recovery plan (Command Center chapter 6)
('people_recovery_share', 0.5, 'Share of sales lost to people causes (discovery, ownership, objection handling) that coaching is assumed to win back in the recovery plan. Assumed - a planning figure, not an observed result.'),
('xsell_full_attempt_share', 1.0, 'Share of missed cross-sell opportunities assumed offered in the recovery plan (1 = every eligible sale call); the take-up is the observed attempt-to-sale rate.'),
('top_agents', 10, 'How many consultants the Command Center lists for coaching.');

CREATE OR REPLACE VIEW {{catalog}}.{{prefix}}_gold.qry_rules AS
SELECT
  MAX(CASE WHEN rule_name = 'target_new_conversion' THEN threshold_value END)     AS target_new_conversion,
  MAX(CASE WHEN rule_name = 'target_renewal_conversion' THEN threshold_value END) AS target_renewal_conversion,
  MAX(CASE WHEN rule_name = 'target_fcr' THEN threshold_value END)                AS target_fcr,
  MAX(CASE WHEN rule_name = 'target_xsell_attempt' THEN threshold_value END)      AS target_xsell_attempt,
  MAX(CASE WHEN rule_name = 'target_aht_seconds' THEN threshold_value END)        AS target_aht_seconds,
  MAX(CASE WHEN rule_name = 'repeat_window_days' THEN threshold_value END)        AS repeat_window_days,
  MAX(CASE WHEN rule_name = 'nesting_max_months' THEN threshold_value END)        AS nesting_max_months,
  MAX(CASE WHEN rule_name = 'low_discovery_score' THEN threshold_value END)       AS low_discovery_score,
  MAX(CASE WHEN rule_name = 'min_agent_calls' THEN threshold_value END)           AS min_agent_calls,
  MAX(CASE WHEN rule_name = 'min_segment_calls' THEN threshold_value END)         AS min_segment_calls,
  MAX(CASE WHEN rule_name = 'people_recovery_share' THEN threshold_value END)     AS people_recovery_share,
  MAX(CASE WHEN rule_name = 'xsell_full_attempt_share' THEN threshold_value END)  AS xsell_full_attempt_share,
  MAX(CASE WHEN rule_name = 'top_agents' THEN threshold_value END)                AS top_agents
FROM {{catalog}}.{{prefix}}_gold.business_rules_config;
COMMENT ON TABLE {{catalog}}.{{prefix}}_gold.qry_rules IS 'Every target and threshold as one row (one column per rule), read by the gold views. Values come from gold.business_rules_config, which explains each one.';
