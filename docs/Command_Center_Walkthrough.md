# Command Center walkthrough (v0.3.1, October view)

The Command Center is the app's home page. It tells **one story in five chapters**, and every figure comes from the certified gold views; no AI calculates any of them.

**The story, top to bottom:**

1. **Are we on target?** No: 4.2% against 5.4%.
2. **Where are sales lost?** Mobile calls, and 245 customers who wanted to buy, lost to systems or people.
3. **Systems:** Jarvis errors stopped 65 sales.
4. **People:** the call itself, covering discovery, the mobile cross-sell, callbacks and transfers.
5. **Closing the gap:** fixing Jarvis, the cross-sell and discovery would have added about 165 sales, more than the 118-sale gap.

"Today" in the data is **Tue 20 Oct 2026**. Every chapter shows **this month so far: 1–20 October 2026**. September 2026, the last full month, appears only in small grey reference lines.

**What counts as a lost sale:** the customer intended to buy, and the sale didn't close for a reason Optus could have fixed:
- **People:** discovery, ownership, transfers.
- **Systems:** Jarvis, disconnects, IVR, lookups.

Some customers couldn't buy or chose not to: a failed credit check, failed ID verification, no port-in account number, price, or wanting to think about it. These are **customer reasons**. They are shown beside lost sales but **not counted** as lost sales.

The figures come from the deployed v0.3.1 data (synthetic, calibrated to Optus's figures). If the data is regenerated, check them again.

---

## Top of the page (the banner)

**The headline sentence:**
- New sales conversion for October so far (20 days) is **4.2%** against a **5.4%** target. That's level with the same 20 days of September (4.2%).
- At this pace, October closes near **668** new sales against **851** needed.
- To hit target, the last **11 days** need **7.5%**.

**Progress bar:** 431 new sales so far. The pace is 668 of 851, which is **79% of target pace**.

**Four tiles:**

| Tile | Big figure | Detail | Reference line |
|---|---|---|---|
| Sales this month | **431** | new sales · 362 renewals · $57,793 a month in plan revenue | September: 702 new sales, 520 renewals |
| New sales conversion | **4.2%** | target 5.4% · **420 more** new sales needed in 11 days (7.5%) | September: 4.1% |
| Sales stopped by Jarvis | **65** | Jarvis errors this month · 0.6 points of conversion | September: 114 |
| FCR this month | **41.0%** | target 50% (assumed) | September: 42.7% |

Under the tiles: "Data to Tuesday 20 October 2026. Every chapter below is 1–20 October 2026; September is shown in small lines for reference." Then "Data refreshed on …", with a small yellow **Synthetic data** pill at the end. Hovering over it shows "Demo data shaped to Optus's sales and the Concentrix slides. No real customer records."

**What the tile figures mean:**
- **$57,793 a month:** the monthly plan price of all 793 sales (new and renewals, including cross-sells), added together. It's recurring revenue, not a one-off amount.
- **0.6 points:** 65 sales stopped ÷ 10,166 calls = 0.64%. Had they gone through, conversion would be about 0.6 points higher. The 65 includes renewals; counting new sales only (50), it's about 0.5 points on the 5.4% target (4.2% to about 4.7%). It matches the 0.6 points Optus reported.
- **target 50% (assumed):** Optus has confirmed only one target, 5.4% new sales conversion. FCR 50%, renewals 3.5%, cross-sell attempt 60% and handle time 900 seconds are our placeholders. They can be changed in `business_rules_config`.

---

## Executive summary: "The month in 30 seconds" (5 lines, each jumps to its chapter)

| # | Line | Figure |
|---|---|---|
| 1 | **Are we on target?** 431 new sales from 10,166 calls: 4.2% against a 5.4% target, 118 sales short so far. | **4.2%** new sales conversion |
| 2 | **Where sales are lost:** Mobile is the biggest reason customers call (1,529 calls) but closes only 5.4% of them. | **5.4%** of mobile calls sell |
| 3 | **Systems: Jarvis:** Jarvis errors stopped 65 sales customers wanted to buy. | **65** sales blocked |
| 4 | **People: the call:** 172 of 296 home internet sales had no mobile offered. | **172** NBN sales, no mobile offer |
| 5 | **Closing the gap:** Fixing Jarvis, the cross-sell and discovery would have added about 165 new sales so far, against a gap of 118. | **165** new sales so far |

**Bottom line:** October needs 420 more new sales in 11 days to reach 5.4%. The sales are there: 245 customers who wanted to buy were lost to Jarvis or to how the call was handled. Fixing Jarvis, the cross-sell and discovery would have added about 165 sales so far, enough to close the 118-sale gap.

**The bottom-line numbers:**

| Number | What it is | Where it comes from |
|---|---|---|
| 420 | New sales still needed by 31 October | About 851 needed for the month − 431 so far |
| 11 days | Days left | 21 to 31 October |
| 245 | Lost sales so far | Systems 132 + People 113 (chapter 2) |
| 165 | Extra sales the three fixes would have made so far | 50 + 87 + 28 (chapter 5) |
| 118 | How far behind target we are today | 5.4% × 10,166 calls (549) − 431 |

420 is about the rest of the month; 118 is about the month so far.

**Lines 4 and 5:**
- Line 4's **172** counts missed offers: NBN customers with no Optus mobile who weren't offered one.
- Line 5's **165** counts the sales the three fixes would bring.
- Line 4's 172 is part of the 363 missed cross-sells behind the cross-sell fix.

**Watch out for line 2:** the 5.4% there is **mobile calls that sell** (83 of 1,529 "New Mobile Plan / Port In" calls closed a sale). It is not the 5.4% target, which is all new sales ÷ all calls (4.2% so far). The two match by coincidence.

---

## Chapter 1: Are we on target this month?

**Headline:** 10,166 calls and 431 new sales in 1–20 October: 4.2% against 5.4%, 118 sales short so far (about $102,732 of first-year plan revenue). The last 11 days need 7.5%.
*September: 4.1%, 219 sales short of target.*

**Four cards:**

| Card | Value | Detail | Reference line |
|---|---|---|---|
| New sales conversion | **4.2%** | Target 5.4% | September: 4.1% |
| Renewals conversion | **3.6%** | 362 renewals · target 3.5% (assumed) | September: 3.1% |
| Plan revenue sold | **$57,793 / month** | $701,868 over the first year | September: $88,728 a month |
| First contact resolution | **41.0%** | 30.4% transferred · target 50% (assumed) | September: 42.7% |

**Weekly chart (last 9 weeks, stacked by product against the 5.4% line):**

| Week ending | Postpaid Voice | Home | Connected Device | Total |
|---|---|---|---|---|
| 28 Aug | 0.8% | 2.8% | 0.1% | 3.6% |
| 4 Sep | 1.0% | 3.0% | 0.2% | 4.1% |
| 11 Sep (slide) | 0.6% | 4.5% | 0.2% | 5.3% |
| 18 Sep (slide) | 0.9% | 2.4% | 0.2% | 3.5% |
| 25 Sep (slide) | 1.2% | 2.7% | 0.1% | 4.0% |
| **2 Oct** | 1.1% | 2.4% | 0.2% | 3.7% |
| **9 Oct** | 1.3% | 3.0% | 0.2% | 4.5% |
| **16 Oct** | 1.0% | 3.0% | 0.1% | 4.1% |
| **23 Oct** (partial, to 20th) | 1.0% | 2.8% | 0.2% | 4.0% |

**Daily chart:** conversion for each day over the last 6 weeks, with October highlighted.

**What we sold, 1–20 October (793 sales, $57,793 a month):**
*September: 1,222 sales, $88,728 a month.*

| Category | Sales | Per month | First year |
|---|---|---|---|
| Total Home – New Connection | 300 (4 from cross-sell) | $22,870 | $282,792 |
| Postpaid Voice – Renewal | 219 | $15,778 | $189,336 |
| Home – Renewal | 143 | $11,727 | $140,724 |
| Postpaid Voice – New Connection | 114 (19 from cross-sell) | $7,088 | $85,056 |
| Connected Device – New Connection | 17 | $330 | $3,960 |

**To say:** "We're behind. So where are the sales going?"

---

## Chapter 2: Where are we losing sales?

**Headline:**
- New Mobile Plan / Port In is the biggest reason customers call (15% of calls), but only 5.4% of those calls sell. That compares with 14.8% for new NBN and 19.5% for home internet recontracts.
- **245** customers who wanted to buy were lost for reasons we can fix: systems 54%, people 46%.
- The next two chapters take each cause in turn.

*September: mobile 3.8%, 395 lost sales.*

**Which calls turn into sales (calls with a sales reason; average 12.5%):**

| Call reason | Calls | Converts | Lost sales | September |
|---|---|---|---|---|
| **New Mobile Plan / Port In** | 1,529 | **5.4%** | 61 | 3.8% |
| New NBN Service | 1,430 | 14.8% | 56 | 15.7% |
| Mobile Recontract / Device Upgrade | 1,328 | 16.5% | 52 | 13.0% |
| Home Internet Recontract | 734 | 19.5% | 30 | 17.1% |
| New 5G/4G Home Internet | 542 | 15.5% | 20 | 13.5% |
| Connected Device / Tablet | 320 | 5.3% | 11 | 5.4% |
| Prepaid to Postpaid | 294 | 4.1% | 15 | 4.5% |

**Why customers who wanted to buy didn't (245 lost sales, about $204,796 of first-year revenue):**

| Driver | Lost | Share | Top reasons | September |
|---|---|---|---|---|
| Systems | 132 | 54% | Jarvis order error 56 · IVR misroute 23 · stock lookup 18 | 57% |
| People | 113 | 46% | Poor discovery 54 · deferred to callback 30 · sent to Retention 13 | 43% |

**The 132 system lost sales, split:**

| Group | Reason | October |
|---|---|---|
| Jarvis (65) | Jarvis error, order could not be submitted | 56 |
| | Jarvis slow / timed out | 9 |
| Other systems (67) | IVR misrouted the call | 23 |
| | Serviceability / stock lookup failed | 18 |
| | Call disconnected / audio issue | 15 |
| | Credit check service unavailable | 11 |

So 245 = People 113 + Jarvis 65 + other systems 67.

**Not counted as lost: 172 customer reasons**, shown in a grey box under the chart with a View button. The customer couldn't buy or chose not to:

| Reason | October |
|---|---|
| Failed credit check | 59 |
| Failed ID verification | 44 |
| No port-in account number | 34 |
| Price / comparing other providers | 24 |
| Wants to think about it | 11 |

These need a process fix, not a sales recovery. For example, ask for the port-in account number up front.

**About the failed credit check:** the check ran and Jarvis returned "Not eligible". Optus's systems worked; the customer didn't meet the criteria. There is no credit score in the data, because Jarvis shows eligibility only. If the check service was down ("Credit check service unavailable", 11 in October), that *is* a lost sale under Systems.

**Optus's split:** Optus's slide gives Customer 43.3%, People 25.8% and System 30.9%. That split includes customer reasons. Without them it becomes People 45% and Systems 55%, close to October's 46 / 54. The note under the chart says this.

**To say:** "Systems and people. Systems first."

---

## Chapter 3: Systems: what is Jarvis costing us?

**Headline:**
- Jarvis errors stopped **65 sales** in 1–20 October. That cost 0.6 points of conversion, about $50,872 of first-year revenue.
- 32 of those customers called back, and **none** bought.
- A call with a Jarvis error takes **24.2 minutes**, against 11.7 without one.
- Order submission failed is the error to fix first.

*September: 114 sales stopped, 0.7 points.*

**By error type (157 error calls, 105 tickets, 4.2 days on average to resolve):**

| Error | Lost | Calls | Tickets | Avg days | Longest |
|---|---|---|---|---|---|
| Order submission failed | 23 | 72 | 48 | 4.2 | 19 |
| Session timeout | 13 | 24 | 17 | 4.6 | 16 |
| Serviceability lookup failed | 12 | 32 | 18 | 4.7 | 12 |
| Plan not loading | 12 | 19 | 15 | 3.2 | 7 |
| Credit check API error | 5 | 10 | 7 | 4.0 | 7 |

**Reading a bar (Order submission failed):**
- 72 calls showed this error.
- **23** of them were lost sales: the customer wanted to buy, no sale happened, and the call is recorded as a system loss. That's counted from the calls, not calculated. The other 49 still sold, or weren't buying calls.
- 48 incident tickets were raised. They took 4.2 days on average to resolve, and the longest took 19.
- **View** lists the 72 calls.

**Two ways of splitting the same 65:**
- **Chapter 2** splits by the lost-sale reason the consultant recorded: 56 + 9.
- **Chapter 3** splits by the technical error type: 23 + 13 + 12 + 12 + 5.

**Month-by-month chart (October to date is the dark bar):** about 85 to 115 sales stopped every month, 0.5 to 0.7 points. The problem hasn't gone away. Optus quoted a 0.6-point impact.

**To say:** "That's the system. Now the people: what happens on the call."

---

## Chapter 4: People: are consultants making the most of every call?

**Headline:**
- **113** sales were lost to how the call was handled: insufficient discovery and probing (54), and no ownership, deferred to a promised callback (30).
- **172 of 296** home internet sales had no mobile offered, though **24%** say yes when asked.
- **295 of 765** promised callbacks were left to the customer, and **509** transfers were avoidable.
- A sale missed on the first call is rarely won later: **2 of 245** lost sales were won back.

*September: 171 lost to people causes; 302 of 507 NBN sales without a mobile offer; 518 of 1,348 callbacks chased; 730 avoidable transfers.*

**4a. The mobile sale on home internet calls:**

| Step | Count | Note | September |
|---|---|---|---|
| Home internet sales | 296 | | 507 |
| Customer had no Optus mobile | 231 | 78% of sales | 420 |
| Mobile offered | 59 | 26% of opportunities; the 60% target is assumed | 28% |
| Mobile sold | 14 | 24% of offers | 33% |

Of the 231 customers without an Optus mobile, 59 were offered one and **172 were not**. Of the 59 offered, 14 bought: **24%**.

Scenario 1: 172 sales without a mobile offer, worth $32,724 of first-year revenue. Cross-sell started in August and consultants are still in training.

**Cross-sell offered, by team** (every team is far below the 60% target; team lead names are synthetic):

| Team lead | Offered |
|---|---|
| Joanna Medina | 9.1% (4 of 44) |
| Paulo Serrano | 15.4% (6 of 39) |
| Rico Bernabe | 20.3% (12 of 59) |
| Dennis Velasco | 22.4% (15 of 67) |
| Marisol Aguinaldo | 23.3% (10 of 43) |
| Katrina Uy | 23.9% (22 of 92) |
| Arnel Vergara | 29.3% (22 of 75) |
| Lorna Castro | 35.2% (19 of 54) |

**4b. Lost on the first call, lost for good:**
- 245 lost sales.
- 133 (54%) of those customers called again within 14 days.
- Only **2** bought on that call.
- A first call converts **9.9%**; a repeat call converts **3.7%**.

**Promised callbacks and repeat calls:**
- 765 callbacks were promised. In **295 (39%)** of them, the customer had to call us instead.
- 3,683 repeat calls; **2,627 (71%)** came within the hour, which means something broke on the first call.

**Where transfers go (2,956 transfers; 509 avoidable, 17%):**

| Queue | Transfers | Avoidable |
|---|---|---|
| Retention Voice | 984 (33%) | 188 |
| Service Voice | 521 (18%) | 85 |
| Service Prepaid Voice | 415 (14%) | 70 |
| Tech Assurance Fixed Voice | 175 | 29 |
| Service Account Security | 127 | 22 |
| Payment Support Voice | 104 | 19 |

Only the top three queues' shares come from Optus; the rest are synthetic until Optus shares them. Avoidable transfers break down as:
- Retention without checking other plans: 255
- Basic billing question: 180
- Plan change: 74

**To say:** "So, systems and people. What's it worth if we fix them?"

---

## Chapter 5: How do we close the gap?

**Headline:**
- In 1–20 October we are **118** new sales short of target so far.
- Three fixes would have added about **165** ($143,358 of first-year revenue), *enough to close the gap*.
- The month still needs **420** new sales in 11 days.

*September: 219 short; the same fixes were worth 271.*

**The recovery plan:** a gap of **118** (5.4% × 10,166 calls − 431 new sales):

| Lever | Owner | New sales so far | First-year value | How it's worked out | September |
|---|---|---|---|---|---|
| Fix Jarvis order errors (chapter 3) | IT / Optus | 50 | $43,544 | 50 new sales blocked (65 including renewals) | 85 |
| Offer the cross-sell on every eligible sale (chapter 4) | Training | 87 | $75,430 | 363 not offered × 24% take-up | 137 |
| Coach discovery and ownership (chapter 4) | Team leads | 28 | $24,384 | 70 new sales lost to people causes × 40% (assumed) | 49 |
| **Together** | | **165** | **$143,358** | **140% of the gap: enough to close it** | 271 vs 219 |

**The 363 missed cross-sells (every sale where a second product could have been offered and wasn't):**

| Customer bought | Didn't have | Could offer | Not offered |
|---|---|---|---|
| Home internet (new) | Optus mobile | Mobile SIM | 172 |
| Mobile renewal | Optus home internet | NBN / 5G | 80 |
| Mobile (new) | Optus home internet | NBN / 5G | 64 |
| Home internet renewal | Optus mobile | Mobile SIM | 47 |
| **Total** | | | **363** |

**Coaching, 28:** 70 *new* sales were lost to people causes (113 in all; 43 were renewals, which don't count toward the new sales target). Coaching won't save every one, so we assume 40% could be won back: 70 × 40% = 28.

These are planning estimates, not forecasts. The 40% for coaching is our assumption (changed from 50% so the total doesn't repeat line 4's 172), to agree with the team leads. Customer reasons are not in the plan, because they aren't lost sales.

**Scenario cards (1–20 October, with September underneath):**

| # | Scenario | Calls | First-year value | September |
|---|---|---|---|---|
| 1 | Missed mobile cross-sell on NBN sales | 172 | $32,724 | 302 |
| 2 | Jarvis errors blocking sales | 65 | $50,872 | 114 |
| 3 | Lost sales from unresolved first calls | 1,038 | $847,804 | 1,957 |
| 4 | Avoidable transfers | 509 | (an FCR measure, no sales value) | 730 |
| 5 | Customer reasons (not lost sales) | 172 | (not lost sales, no value) | 288 |

Every card has a **View** button that lists the exact calls behind the number (October), downloadable as CSV, and an **Ask** button that sends the question to the assistant.

---

## Moved to Explorer: who to coach first

Coaching is at the bottom of the **Explorer** tab, under "Who to coach first". It uses the last three months to date (August to 20 October), so each consultant has 150+ calls to rank. The Explorer filters don't apply to it.

The median consultant closes a sale on **6.8%** of calls. The 10 furthest below it would have made about **182 more sales** at the median. Most have low Elevate discovery scores, and new starters in nesting convert 4.0% against 7.3% for everyone else.

Consultant names are real (pending Optus confirmation). Team lead names are synthetic. Every figure about them is synthetic.

---

## Questions to expect

- **Why isn't a failed credit check a lost sale?** The customer wasn't eligible, so we couldn't have sold to them. Lost sales count only what Optus could fix: People and Systems. Customer reasons (172 in October) are shown beside them.
- **Optus's slide says Customer 43.3%. Why don't we show that?** Optus's split includes customer reasons. Remove them and it's People 45% and Systems 55%, which matches our 46 / 54.
- **Why is October's gap (118) smaller than September's (219)?** October is 20 days, not a full month, and the gap is measured on the calls so far. The banner shows where the month is heading: 668 against 851, with 420 more needed in 11 days.
- **Why does recent repeat-call data look low?** Won-back, callback and FCR figures count a repeat call within 14 days. Calls from the last two weeks haven't had their 14 days yet, so these numbers will rise.
- **Why does the Assistant say September when I ask about "last month"?** "Last month" means September. Ask "this month" for October.
- **How do we know the customer intended to buy?** Two fields on each call: a sales call reason (e.g. New Mobile Plan / Port In, New NBN Service; `Sales_Opportunity_Flag`) and, when no sale happened, a recorded lost-sale reason. This data is synthetic. In real Optus data this needs the call reason or IVR selection and a wrap-up code for why no sale happened. Optus records the call result (Sale / Callback / No Answer / Rejected), but we haven't confirmed they record a reason for no sale. That is an open question for Optus.
- **What is $701,868?** Each sale's plan revenue over its first 12 months: the promo price for the promo months, then the standard price for the rest. It's higher than 12 × $57,793 ($693.5K), because some plans go up when the promo ends. Device repayments are not included.
- **Is the 5.4% in summary line 2 the target?** No. It's the share of mobile calls that sell. The target is all new sales ÷ all calls (4.2% so far).
