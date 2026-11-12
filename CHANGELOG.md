# Changelog

Everything that has changed in LensS Telesales Intelligence for Optus, newest first. For how things work, see `README.md`.

---

## v0.3.0 (2026-11-12): answers from the review meeting
- **Targets:** 5.4% new sales conversion confirmed; renewals, FCR, cross-sell and handle-time targets stay placeholders.
- **October Home sales** follow the slide (Total Home new connections 459 for the full month, about 10% above Optus's table), as Optus confirmed. The September slide weeks now hit the slide exactly, cross-sell lines included.
- **Call results** are the four Optus records: Sale, Callback, No Answer, Rejected. Transfers, Jarvis errors and eligibility stay in their own columns.
- **Cross-sell** is new (consultants in training): it starts in August 2026 and the attempt rate builds month by month; Elevate cross-sell fields are blank before August.
- **Names:** consultants are the real roster from the FCR file (65, with their IDs, in the same 8 teams); team lead names stay synthetic (Optus: no real team lead names). All figures stay synthetic. 3 former consultants keep synthetic names. Real consultant names still to be confirmed.
- **Lost-sale drivers:** Customer 43.3%, People 25.8%, System 30.9% (Technology and Process merged into System, as Optus confirmed). The FCR audits keep the form's four identifiers.
- **Transfers** go to Optus's 26 queues (Retention Voice, Service Voice, Service Prepaid Voice, Tech Assurance, SMB, Hardship, Payment Support, Messaging, ...); shares beyond the slide's top three are synthetic until Optus shares them.
- No CSAT / NPS (confirmed). Still open: call volume, post-promo and device pricing, transfer shares per queue.
- Data: 181,454 calls, 13,176 order lines. September: 702 new sales from 17,049 calls (4.1%), 219 short; October to date 4.2%.
- Views (`Lost_System`), Explorer, Command Center, Genie instructions, known limitations, tests and the review workbook (Questions sheet now carries the answers) follow.

## v0.2.0 (2026-11-10): "today" is 20 October
- Leaders review the dashboard in the last 10 days of the month, so the data now stops on **Tuesday 20 October 2026**; everything after it is removed, also from the synthetic workbook (generator `CUTOFF`). History before the cut is unchanged. Calls whose repeat contact fell after the cut are unlocked.
- September 2026 is the last full month (709 new sales from 16,912 calls, 4.2%, 204 short); October to date is 4.1% against 5.4% (the slide's MTD was 4.0%).
- New headline figure: the conversion the rest of the month needs to reach target (`Needed_Rest_Conversion`, `Days_Left` in `qry_cc_kpis`).
- Deploy checks, Genie instructions, guide, tests, README and the review workbook (now September and the slide weeks) follow the new dates.
- Ingest fix: CSV inference read the month ("2026-10") as a date and 12-digit call IDs as numbers; silver derives Month from the dates and casts IDs through BIGINT.

## v0.1.0 (2026-11-10): first build

Built from LensS Optus Collections (commit e9e3b47): the platform (deploy, Lakebase, Genie as code, router, guardrails, answer cache, judge, conversation memory, evaluations, observability, cost, idle stop) is unchanged; the domain layer is new.

### Data
- Synthetic workbook `Data/Optus_GenBI_Telesales_Demo_Data_v1.xlsx` from `scripts/generate_synthetic_data.py`: 191,104 calls, 13,878 order lines, plans, consultants, Elevate and FCR audits, targets, dictionary, scenarios, sample questions, assumptions and questions.
- Calibrated to Optus and Concentrix figures: October 2026 sales exactly (417 / 329 / 202 / 186 / 27), the slide weeks' conversion and FCR mix, the lost-sale driver split (Customer 43.3%, People 25.8%) and the 0.6-point Jarvis impact.
- Review copy for leadership: `Data/review/Optus_Telesales_Synthetic_Data_v1_REVIEW.xlsx` (`scripts/build_review_pack.py`).

### Pipeline
- Bronze: 6 data sheets + 5 context sheets. Silver: typed calls, orders, plans, consultants and audits (flags 1/0/NULL).
- Gold: 22 certified views on the call grain, 2 Command Center views, the `mv_telesales` metric view, 13 targets and rules. The metric view is built after the certified views (its source is `qry_calls`).
- The transform step checks row counts, October sales by category and the scenario counts against the workbook.
- Executive summary written from the views: pace, last month's gap, Jarvis, cross-sell, the first call, the recovery plan.

### App
- Command Center: hero on the latest day and month to date with pace to target; seven chapters (last month and weekly / daily trend, where sales are lost, Jarvis, cross-sell, the first call, coaching, closing the gap) with call lists behind every figure.
- Explorer on calls: 12 filters, slicer, heatmap (team by product by default), sales and FCR outcomes by dimension, lost sales, monthly trend, call records.
- Genie space: telesales instructions (targets filled from the rules table), 29 example queries, the 15 sample questions as benchmarks plus a refusal.
- Router, guardrails, platform guide, suggestions, cache keys, judge rule numbers, follow-ups and Responsible AI text retargeted to telesales.
- Smoke, routing, org smoke and org routing tests and the evaluation cases retargeted.
- Architecture diagrams regenerated.

### Open questions (from the data review)
Call volume and the conversion denominator; renewals / FCR / cross-sell / handle-time targets; which October figure is the source of truth; post-promo and Connected Device prices; the dialler's call results; when the revised Elevate form started; real or synthetic team lead names; CSAT and queue data.
