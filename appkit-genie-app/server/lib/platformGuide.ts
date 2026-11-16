/**
 * What LensS knows about itself. Questions about the platform ("What is LensS?",
 * "How do I filter by region?", "What does Observability show?") are answered from
 * this guide instead of the telesales data. Keep it in step with the UI: it is the
 * only source the platform answers may use. No data figures here (those come from
 * the query engine), so the guide never goes stale when the data is reloaded.
 */

export interface GuideSection { id: string; title: string; keywords: string[]; text: string }

export const GUIDE: GuideSection[] = [
  {
    id: 'about', title: 'What LensS is',
    keywords: ['lenss', 'lens', 'concentrix', 'optus', 'what is', 'who built', 'who made', 'platform', 'about', 'purpose', 'what are you', 'who are you', 'what can you do'],
    text: `**LensS** is Concentrix's decision-intelligence platform, built by the **Concentrix Data & Analytics Practice**. It turns governed business data into answers people can act on, with every figure traceable to its source.
**LensS Telesales Intelligence for Optus** is LensS applied to Optus telesales: sales and conversion against target, where sales are lost and why, what Jarvis errors cost, the cross-sell, first contact resolution, transfers and repeat calls, and which consultants to coach. LensS is a Concentrix product, set up for Optus with synthetic demo data shaped to Optus's own figures.
It has four tabs: **Command Center** (how telesales is doing, in about a minute), **Explorer** (why, with filters and drill-downs), **Assistant** (ask questions in plain language) and **Observability** (how every answer was made, its quality, cost and safety).
The answers come from the **LensS Intelligence Engine**, which turns a question into SQL over certified, governed views of the telesales data, runs it and explains the result. Every figure on the dashboards comes from those same views; no AI computes them.`,
  },
  {
    id: 'command-center', title: 'Command Center tab',
    keywords: ['command center', 'command centre', 'home', 'dashboard', 'first page', 'overview', 'kpi', 'metrics', 'summary', 'chapters', 'scenarios', 'scenario', 'trend', 'view calls', 'calls behind', 'recovery plan', 'pace'],
    text: `The **Command Center** is the one-minute view of Optus telesales, told as one story in five chapters (the bar under the summary jumps to each): are we on target, where are sales lost, the systems cause (Jarvis), the people cause (the call itself), and how to close the gap.
- **The top banner:** the month so far against the new sales conversion target, the pace to the end of the month, and four tiles: sales this month, new sales conversion (with how many more new sales the rest of the month needs), sales stopped by Jarvis errors, and FCR this month. A "Synthetic data" tag sits at the bottom. Every chapter shows the current month to date (October to the 20th), with the last full month (September) in small reference lines.
- **Executive summary:** "The month in 30 seconds", five lines (one per chapter, each with its figure) and a bottom line; each line jumps to its chapter.
- **1 · Are we on target?:** conversion, renewals, plan revenue and FCR, weekly conversion by product, daily conversion, and what was sold by Optus's five categories.
- **2 · Where sales are lost:** which call reasons turn into sales (mobile against NBN), and why customers who wanted to buy didn't. A lost sale is a People or System cause; customer reasons (failed credit check, ID, port-in account number, price) are shown beside them but not counted as lost sales.
- **3 · Systems: Jarvis:** sales stopped by Jarvis errors by error type, ticket resolution days, and the month-by-month trend.
- **4 · People: the call:** the mobile cross-sell on NBN sales and by team, lost sales that came back and bought, promised callbacks the customer had to chase, repeat calls, and where transfers go (avoidable ones too).
- **5 · Closing the gap:** the recovery plan (fix Jarvis, offer the cross-sell, coach discovery) against the gap to target, and the five scenarios of the Scenario Guide.
- **Who to coach first** (consultants and conversion by tenure, over the last three months to date) is at the bottom of the **Explorer** tab.
- **View** on any figure opens the calls behind it, with **Export CSV**. **KPI definitions** (in the banner and at the bottom) explain every figure.
Every panel has an **Ask LensS** button; hover over it to see the exact question it will ask.`,
  },
  {
    id: 'explorer', title: 'Explorer tab',
    keywords: ['explorer', 'coach', 'coaching', 'filter', 'filters', 'drill', 'drill down', 'slice', 'slicer', 'why', 'state', 'product', 'month', 'team', 'call reason', 'call result', 'export', 'csv', 'download data', 'calls list', 'records', 'segment', 'heatmap'],
    text: `The **Explorer** answers "why": it slices the same governed data by any combination of filters.
- **Filters:** month (or all months), team lead, product interest, call reason, sales category, consultant tenure, state, customer type, call direction, call result, lost-sale driver and FCR outcome. It opens on the current month to date. Active filters show as chips; click a chip's × to remove it, or **Reset filters** (back to the last full month).
- **Headline tiles** show the filtered figures (calls, new sales, new sales conversion, calls that closed a sale, plan revenue, lost sales, FCR, transfers, cross-sell offered, handle time), compared with all calls in the same period.
- **Analytical exploration workspace:** pick a dimension and a measure to compare, as bars or a table. **Click any bar to filter the whole page to it** (drill-down).
- **Two dimensions at once:** a heatmap of any two dimensions (team by product by default), coloured against the view's overall figure; click a cell to see its calls.
- **Sales and FCR outcomes** by the chosen dimension, **lost sales by driver** and the **monthly trend of this view** follow the filters (the trend ignores the month filter).
- **Call records:** the calls in the current view (sales and lost sales first), with search, sort and paging. **Export CSV** downloads them. **View** on any item opens its calls.
- **Who to coach first:** at the bottom, the consultants in the lowest conversion quartile over the last three months to date, with their discovery score, cross-sell rate and coaching focus, and conversion by tenure (the filters don't apply to it).
- **Ask LensS about this view** asks why the filtered slice differs from the rest; every panel's question carries the active filters.
With the current month and no other filter, every Explorer figure reconciles exactly to the Command Center.`,
  },
  {
    id: 'assistant', title: 'Assistant tab',
    keywords: ['assistant', 'chat', 'ask', 'question', 'conversation', 'history', 'new chat', 'search chats', 'sidebar', 'prompts', 'quick start', 'library', 'suggested', 'follow-up', 'pdf', 'download', 'voice', 'microphone', 'rename', 'delete', 'notification'],
    text: `The **Assistant** answers questions about the telesales data in plain language, with charts.
- **Modes** (menu at the top left): **Quick answer** (one query, about 20 seconds), **Deep analysis** (investigates step by step with several queries and charts, 1–3 minutes), or **Auto**, which picks one for each question.
- **Quick start prompts and the question library** (lightbulb icon, top right): one-click analyses and questions grouped by Executive, Sales, Systems and process, People and First contact resolution.
- **Conversations** are saved per person. The sidebar has **New chat**, **Search** and the list of chats; when it is collapsed, the same three icons stay on the left. Hover a chat to rename or delete it.
- **Under each answer:** copy, 👍 / 👎 (👎 asks what was wrong and goes to a review queue), regenerate, and **Details**: the quality score, the data sources, the SQL that ran and how long each step took, with a link to inspect it in Observability. Follow-up questions appear after the answer.
- **Download PDF** (icon at the top right) saves the conversation, charts included.
- Answers to common questions may come from the **answer cache** (instant); **Refresh** asks the engine again.
- If you switch tabs while a deep analysis runs, you get a notification when it is ready. Where the browser supports it, the microphone lets you ask by voice.`,
  },
  {
    id: 'howto', title: 'How to do common things (exact steps)',
    keywords: ['how do i', 'how can i', 'how to', 'steps', 'filter', 'state', 'team', 'product', 'month', 'export', 'csv', 'drill', 'pdf', 'download', 'new chat', 'search', 'rename', 'delete', 'mode', 'log out', 'kpi definitions', 'sql', 'feedback', 'evals', 'run evals', 'calls'],
    text: `- **Filter the Explorer (for example by team):** open the **Explorer** tab. At the top of the page are dropdown boxes, one per filter (Month, Team lead, Product interest, Call reason, Sales category, Consultant tenure, State, Customer type, Call direction, Call result, Lost-sale driver, FCR outcome). Choose a value in the **Team lead** dropdown; the whole page updates. The filter appears as a chip; click its × to remove it, or **Reset filters** (top right of the Explorer) to go back to the last full month.
- **Look at another month or all the data:** in the Explorer, use the **Month** dropdown; choose **All months** for everything.
- **Drill down:** in the Explorer's analytical exploration workspace, choose a **Dimension** and a **Measure**, then click any bar.
- **See the calls behind a figure:** click **View** next to it on the Command Center or in the Explorer; the window has **Export CSV**.
- **Export calls:** in the Explorer, click **Export CSV** (top right); it downloads the call records for the current filters.
- **See the SQL and quality of an answer:** in the Assistant, click **Details** under the answer.
- **Choose Quick answer, Deep analysis or Auto:** in the Assistant, click the mode name at the top left (it shows "Auto" by default) and pick one.
- **Start, find, rename or delete a chat:** in the Assistant's left sidebar, **New chat**, **Search**, or hover a chat in the list for rename and delete.
- **Download a conversation:** in the Assistant, the download icon at the top right saves it as a PDF.
- **See how a figure is calculated:** on the Command Center, click **KPI definitions**.
- **Log out:** click the round letter at the top right, then **Log out**.
- **Run the evaluation suite:** Observability → **6. Evaluations** → choose the categories → **Run evals**.`,
  },
  {
    id: 'modes', title: 'Quick answer, Deep analysis and Auto',
    keywords: ['quick answer', 'deep analysis', 'auto', 'auto mode', 'mode', 'agent', 'how long', 'slow', 'fast'],
    text: `**Quick answer** runs one query and answers in about 20 seconds: best for "what is / which / show me" questions.
**Deep analysis** plans and runs several queries, builds charts and explains the reasons and actions: best for "why" and "what should we do" questions. It takes 1–3 minutes.
**Auto** (the default) chooses for each question: depending on the deployment, a small AI model or a word rule decides, and the reason is recorded in Observability. Prompts and Ask LensS buttons that name a mode always use it.`,
  },
  {
    id: 'observability', title: 'Observability tab',
    keywords: ['observability', 'monitoring', 'trace', 'traces', 'audit', 'quality', 'faithfulness', 'groundedness', 'latency', 'performance', 'drift', 'security', 'guardrail', 'guardrails', 'evals', 'evaluation', 'evaluations', 'responsible ai', 'cost', 'tokens', 'feedback review', 'cache'],
    text: `**Observability** shows how every answer was made, from live logs, for a chosen period (24 hours, 7 days, 30 days, all time). A headline row shows groundedness, numeric reconciliation, average latency and the personal-data guardrail. Eight areas:
1. **Pipeline traces:** every question with its path (ask, secure, cache, plan, retrieve, verify, synthesize, deliver, log), timings and SQL; filter by passed, blocked or failed, by user, or search.
2. **Answer quality & faithfulness:** quality per day, low-confidence answers, reasons for 👎, and the **feedback review** queue (mark fixed, dismiss, or add to the evaluation suite).
3. **Performance & latency:** questions and answer time per day, time per stage, the answer cache, AI usage and cost, and usage by user.
4. **Data & model drift:** data and semantic-model versions, the models in use, the quick/deep mix and evaluation pass rates.
5. **Security & guardrails:** checks that fired and recent guardrail events.
6. **Evaluations:** run the test suite (ground-truth accuracy, red-team guardrail tests, policy checks) and see results by run.
7. **Responsible AI:** purpose, the AI models and when they run, the data used, protections, how quality is measured, data handling and known limits.
8. **Databricks cost:** what this project has cost on the data platform since its first day, by service, at list price.`,
  },
  {
    id: 'trust', title: 'How answers are checked and kept safe',
    keywords: ['trust', 'accurate', 'accuracy', 'hallucinate', 'made up', 'verify', 'quality score', 'faithfulness', 'pii', 'personal data', 'privacy', 'secure', 'security', 'safe', 'governed', 'certified', 'sql', 'source'],
    text: `- **Governed data only:** the engine reads certified gold views of the telesales data, read-only, through the app's own service identity. The data holds customer IDs, not customer names or contact details, and no credit scores.
- **Guardrails** check each question (personal data is masked, abusive language and prompt-injection attempts are blocked, off-topic questions are flagged) and each answer (personal data, profanity, policy wording).
- **Quality check:** after an answer, every figure is looked up in the query results, and a judge model scores faithfulness, relevance, completeness and safety. Answers that score low carry a visible warning. **Details** under each answer shows the score, the sources and the exact SQL.
- **People in the loop:** 👎 feedback goes to a review queue and can become a permanent test case.
- Questions and answers are not used to train any model.`,
  },
  {
    id: 'navigation', title: 'Navigation and account',
    keywords: ['navigate', 'navigation', 'tabs', 'menu', 'account', 'profile', 'log out', 'logout', 'sign out', 'sign in', 'user', 'name', 'email', 'where', 'find', 'open', 'go to', 'mobile', 'phone'],
    text: `- The **top bar** has the four tabs (Command Center, Explorer, Assistant, Observability).
- The **round letter at the top right** is your account: click it to see your full name, email and **Log out**. Log out ends the LensS session in this browser; your organisation (Databricks) sign-in stays active until you sign out of the workspace or close the browser.
- Any **Ask LensS** button on the Command Center or Explorer opens the Assistant with that question; **Explore the why** on the Command Center opens the Explorer.
- The pages also work on tablets and phones.`,
  },
  {
    id: 'data', title: 'What data LensS uses',
    keywords: ['data', 'as of', 'date', 'month', 'months', 'refresh', 'updated', 'latest day', 'currency', 'dollars', 'aud', 'tables', 'views', 'definitions', 'kpi definitions', 'scenario guide', 'synthetic', 'real data'],
    text: `- **Data:** synthetic Optus telesales demo data, about 182,000 handled calls from 1 November 2025 to Tuesday 20 October 2026, with the sales made on them (Optus's five categories: Postpaid Voice and Total Home new connections, Connected Devices, Postpaid Voice and Home renewals), plan prices, consultants and team leads (real consultant names, synthetic team lead names; all figures synthetic), Elevate quality audits and FCR audits. It is shaped to Optus's sales and the Concentrix FCR and conversion slides. Amounts are in Australian dollars.
- **Latest day** ("today") means 20 October 2026, with 11 days left in the month; **this month** means October so far; **last month** means September 2026, the last full month (shown on the Command Center as a reference).
- **Conversion** is sales ÷ handled calls. **FCR** is answered calls not transferred and not repeated within 14 days.
- **Definitions** of every figure are in **KPI definitions** on the Command Center.
- The dashboards and the Assistant use the same certified views, so their figures agree.`,
  },
  {
    id: 'limits', title: 'Known limits',
    keywords: ['limit', 'limits', 'limitation', 'cannot', "can't", 'forecast', 'predict', 'target', 'cost', 'wrong', 'mistake', 'not able'],
    text: `- LensS does not forecast. The month's "pace" is a straight-line scaling, and the recovery plan is a planning estimate.
- Only the 5.4% new sales conversion target comes from Optus / Concentrix; the renewals, FCR, cross-sell and handle-time targets are assumptions to be confirmed.
- Jarvis shows eligibility only: there is no credit score. Revenue is the monthly plan price; device prices and repayments are not in the data. Some post-promo and Connected Device prices are assumed.
- There is no CSAT/NPS, queue wait time or other-channel data.
- Comparisons show observed differences (for example consultants with lower discovery scores converting less), not what a change would cause.
- AI answers can be wrong: check the quality score and the SQL under **Details** before acting on an answer.
- It answers about telesales data and this platform; it does not give personal details of customers.`,
  },
];

/**
 * Cheap first filter: does the question mention the platform at all? Only these go on
 * to the platform step, so data questions never pay for it. `strict` is used when no
 * model is available to confirm, and leaves out the words data questions also use.
 */
const STRONG = /\b(lenss|concentrix|this (app|application|platform|tool|site|dashboard|assistant)|what can you (do|answer|help)|who (built|made|created|are you)|what are you|command cent(er|re)|explorer tab|observability|kpi (dictionary|definitions)|quick answer|deep analysis|auto mode|responsible ai|log ?out|sign ?out|how (do|can) i (use|ask|filter|export|download|switch|change|log|sign|search|delete|rename|start|open|find the|go to|navigate)|which tab|what tabs|the tabs|navigate|navigation)\b/i;
const LOOSE = /\b(lens|explorer|assistant|tab|tabs|page|evals?|evaluations?|guardrails?|faithfulness|groundedness|trace|traces|cache|pdf|feature|features|help|how does (this|it) work|where (do|can|is))\b/i;
/** Words that make a question about the telesales data, not the platform ("and for NSW?"). */
export const DATA_WORDS = /\b(calls?|sales?|sold|sell(ing)?|convert(ed|s)?|conversion|targets?|pace|gap|revenue|lost|losing|jarvis|tickets?|errors?|cross-?sell|upsell|offer(ed)?|take-?up|products?|plans?|mobile|postpaid|prepaid|nbn|broadband|5g|4g|home internet|connected devices?|tablets?|renewals?|recontracts?|categor(y|ies)|states?|territor(y|ies)|nsw|vic(toria)?|qld|queensland|wa|sa|tas(mania)?|act|nt|new south wales|fcr|first (call|contact) resolution|resolved|transfer(s|red)?|retention|repeats?|callbacks?|callers?|handle time|aht|consultants?|agents?|teams?|team leads?|coach(ing)?|tenure|nesting|audits?|elevate|discovery|credit( checks?)?|port-?in|scenarios?|rates?|customers?|month|months|monthly|week|weekly|daily|yesterday|today|trend|lowest|highest|top|figures?|numbers?)\b|\$|\d/i;
/** Things on screen: a data word next to one of these ("where is the DPD filter?") is still a platform question. */
const UI_WORDS = /\b(tabs?|pages?|buttons?|filters?|drop-?downs?|menus?|click|screen|export|download|explorer|assistant|observability|dashboard|chart type|settings)\b/i;
export function platformCandidate(question: string, strict: boolean): boolean {
  if (STRONG.test(question)) return true;
  if (strict || !LOOSE.test(question)) return false;
  // A loose word alone ("where is the risk concentrated?") doesn't make a data question a platform one:
  // a small model asked to confirm can answer it from the guide anyway, with made-up steps.
  return !DATA_WORDS.test(question) || UI_WORDS.test(question);
}

/** The guide sections that best match a question (keyword overlap), for the model or for a no-model answer. */
export function relevantSections(question: string, max = 3): GuideSection[] {
  const q = question.toLowerCase();
  const has = (k: string) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(q);   // whole words: "bu" must not match "built"
  const scored = GUIDE.map((s) => ({ s, score: s.keywords.reduce((a, k) => a + (has(k) ? (k.includes(' ') ? 2 : 1) : 0), 0) }));
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.filter((x) => x.score > 0).slice(0, max).map((x) => x.s);
  return hits.length ? hits : [GUIDE[0]];
}

export const guideText = () => GUIDE.map((s) => `## ${s.title}\n${s.text}`).join('\n\n');
