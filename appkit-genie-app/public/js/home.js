// ---------------------------------------------------------------- Command Center
// The one-minute view of Optus telesales for a sales leader, told as one story in seven chapters,
// all on the current month to date (the last full month in small reference lines):
// where we are today, where sales are lost, what Jarvis costs, whether we ask for
// the second sale, what happens when the first call doesn't close, who needs coaching, and how the
// gap to target closes. Every figure comes from the certified views (no AI) and opens the calls
// behind it. Each panel has an "Ask LensS" link that opens the assistant with the right question.

const hEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CUR = '$';
const num = v => (v === null || v === undefined || v === '' ? null : Number(v));

/** $1.01M, $232K, $940. Amounts are in Australian dollars (AUD). */
function money(v, digits = 1) {
  const n = num(v);
  if (n === null || Number.isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return CUR + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return CUR + (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return CUR + (n / 1e3).toFixed(a >= 1e5 ? 0 : digits) + 'K';
  return CUR + Math.round(n).toLocaleString('en-AU');
}
const pct = (v, d = 1) => (num(v) === null ? '—' : (num(v) * 100).toFixed(d) + '%');
const count = v => (num(v) === null ? '—' : Math.round(num(v)).toLocaleString('en-AU'));
/** Handle time: "11.6 min" (or "45s" under a minute). */
const secs = v => (num(v) === null ? '—' : num(v) < 60 ? `${Math.round(num(v))}s` : `${(num(v) / 60).toFixed(1)} min`);
/** Points between two shares: "1.5 points". */
const pts = (a, b) => (num(a) === null || num(b) === null ? '—' : `${Math.abs((num(a) - num(b)) * 100).toFixed(1)} points`);
/** "20 October 2026" from "2026-10-20"; "October 2026" from "2026-10" or a date. */
const asOfDate = d => { const x = d ? new Date(String(d).slice(0, 10) + 'T00:00:00') : null; return x && !isNaN(x) ? x.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'; };
const monthLabel = m => { const x = m ? new Date(String(m).slice(0, 7) + '-01T00:00:00') : null; return x && !isNaN(x) ? x.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) : 'the month'; };
const monthName = m => monthLabel(m).split(' ')[0];
const shortDay = d => { const x = d ? new Date(String(d).slice(0, 10) + 'T00:00:00') : null; return x && !isNaN(x) ? x.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'; };

const ICONS = {
  cash: '<path d="M3 7h18v10H3z"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
  gap: '<path d="M4 18l6-6 4 4 6-8"/><path d="M15 8h5v5"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  transfer: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20a5 5 0 0 1 6-4.8"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11L21 7H6"/>',
  spark: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>',
};
const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const askBtn = (q, mode = 'agent', label = 'Ask LensS') =>
  `<button class="ask-link" data-ask="${hEsc(q)}" data-mode="${mode}" title="${hEsc(q)}">${icon('spark', 'ico-xs')}${label}</button>`;

/** A panel: title, a one-line "so what", its Ask LensS question, and a body. */
function panel(id, title, sub, ask, body) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="panel-head"><div><h3>${hEsc(title)}</h3>${sub ? `<div class="panel-sub">${sub}</div>` : ''}</div>${ask ? askBtn(ask.q, ask.mode) : ''}</div><div class="panel-body">${body}</div>`;
}

/** A labelled horizontal bar; `scale` is the value that fills the track; `marker` draws a reference line. */
function bar(label, value, scale, shown, t = 'brand', sub = '', marker = null, markerTitle = 'Overall', cls = '') {
  const w = Math.max(0, Math.min(100, (num(value) / scale) * 100));
  return `<div class="hbar${cls ? ' ' + cls : ''}"><div class="hbar-top"><span class="hbar-label">${label}</span><span class="hbar-val">${shown}</span></div>
    <div class="hbar-track">${marker !== null ? `<span class="hbar-marker" style="left:${Math.min(100, (marker / scale) * 100)}%" title="${hEsc(markerTitle)}"></span>` : ''}<span class="hbar-fill t-${t}" style="width:${w.toFixed(1)}%"></span></div>
    ${sub ? `<div class="hbar-sub">${sub}</div>` : ''}</div>`;
}

function skeletons() {
  document.querySelectorAll('#tab-home .panel').forEach(p => { if (!p.innerHTML.trim()) p.innerHTML = '<div class="skel skel-h"></div><div class="skel"></div><div class="skel"></div><div class="skel short"></div>'; });
  const k = document.getElementById('execKpis');
  if (!k.innerHTML.trim()) k.innerHTML = Array.from({ length: 4 }, () => '<div class="xkpi skel-card"><div class="skel"></div><div class="skel skel-h"></div></div>').join('');
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  return window.userFirstName ? `${part}, ${window.userFirstName}` : part;
}
document.addEventListener('lenss:user', () => { const g = document.getElementById('heroGreeting'); if (g) g.textContent = greeting(); });

// ---------------------------------------------------------------- KPI dictionary
// One place that says what every figure means and how it is calculated (the "KPI Dict").
const KPI_DICT = [
  ['This month', 'The Command Center\'s month.', 'The current month so far: 1 to 20 October 2026 ("today" is Tuesday 20 October, with 11 days left). Every chapter shows this month. Optus\'s sales data arrives 24 to 48 hours late; LensS shows the latest day loaded.'],
  ['Reference month', 'For comparison.', 'The last full month (September 2026), shown in small lines under the figures.'],
  ['New sales conversion', 'The headline target.', 'New-connection sales (Postpaid Voice, Total Home and Connected Device, including cross-sells) ÷ handled calls. Target 5.4% (Concentrix Sales Conversion slide).'],
  ['Renewals conversion', 'Keeping customers.', 'Postpaid Voice and Home renewals ÷ handled calls. The 3.5% target is an assumption to confirm with Optus.'],
  ['Pace', 'Where the month is heading.', 'Month-to-date new sales scaled to the whole month by calendar days, against the target conversion on the month\'s calls. A straight line, not a forecast.'],
  ['Plan revenue', 'What the sales are worth.', 'Monthly plan price of everything sold (AUD); first-year revenue is the plan revenue over its first 12 months. Device repayments are not included.'],
  ['Lost sale', 'Revenue that walked away.', 'The customer intended to buy and the sale did not close for a reason Optus could have fixed: People (discovery, ownership, transfers) or System (Jarvis, disconnects, IVR, lookups).'],
  ['Customer reason', 'Not a lost sale.', 'The customer wanted to buy but couldn\'t or chose not to: failed credit check (Jarvis shows eligibility only, no score), failed ID verification, no port-in account number, price, or wants to think about it. Shown beside lost sales, not counted in them.'],
  ['Jarvis impact', 'Optus\'s 0.6-point problem.', 'Sales a Jarvis error stopped ÷ handled calls, in points of conversion. Ticket resolution days from the incident ticket.'],
  ['Cross-sell', 'The second sale.', 'On a sale call, an opportunity is a customer without the complementary Optus service (e.g. NBN without Optus mobile). Attempt rate = offered ÷ opportunities; take-up = sold ÷ offered.'],
  ['First contact resolution (FCR)', 'Did one call do it?', 'Answered calls not transferred and with no repeat call from the customer within 14 days ÷ answered calls.'],
  ['Avoidable transfer', 'Calls we could have kept.', 'A transfer the consultant could have resolved: sent to Retention without checking other plans, a basic billing question, a plan change.'],
  ['Won back', 'Is a lost sale really lost?', 'A lost sale whose customer called again within 14 days and bought on that call.'],
  ['Coaching focus (Explorer)', 'Who to help first.', 'Consultants ranked on sale conversion over the last three months to date (August to 20 October, 150+ calls). The lowest quartile, furthest below the median, with their Elevate discovery score and cross-sell attempt rate.'],
  ['Recovery plan', 'How the gap closes.', 'Gap = target conversion × calls this month − new sales this month. Levers: new sales Jarvis blocked; missed cross-sell opportunities × observed take-up; new sales lost to people causes × 40% (an assumption). Planning estimates, not forecasts.'],
  ['Scenarios', 'The Scenario Guide.', '1 Missed mobile cross-sell on NBN sales. 2 Jarvis errors blocking sales. 3 Lost sales from unresolved first calls. 4 Avoidable transfers. 5 Customer reasons (not lost sales). Counts are for this month, with the last full month for reference.'],
];
function openKpiDict() {
  document.getElementById('kpiDictBody').innerHTML = `<p class="score-reason">Optus telesales, 1 November 2025 to 20 October 2026 (synthetic demo data shaped to Optus's sales and the Concentrix FCR and conversion slides), amounts in Australian dollars. Every figure comes from certified views; no AI computes them.</p>
    <table class="mini kpi-table"><thead><tr><th>Metric</th><th>Why it matters</th><th>How it is calculated</th></tr></thead><tbody>
    ${KPI_DICT.map(([m, w, c]) => `<tr><td><b>${hEsc(m)}</b></td><td>${hEsc(w)}</td><td>${hEsc(c)}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('kpiDict').showModal();
}
['kpiDictBtn', 'kpiDictBtn2'].forEach(id => document.getElementById(id)?.addEventListener('click', openKpiDict));
document.getElementById('kpiDictClose').addEventListener('click', () => document.getElementById('kpiDict').close());
document.getElementById('kpiDict').addEventListener('click', (e) => { if (e.target.id === 'kpiDict') e.target.close(); });
const setTake = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

/** Lets the browser paint before the next panel is built (a hidden tab doesn't paint, so it doesn't wait). */
const nextFrame = () => new Promise(r => (document.hidden ? setTimeout(r, 0) : requestAnimationFrame(() => r())));

/** A target or threshold from gold.business_rules_config (sent with the summary), with the documented default until it arrives. */
const ruleVal = (s, name, fallback) => { const v = num(((s || {}).rules || {})[name]); return v === null ? fallback : v; };

/** Small shared derivations over the overview. The Command Center's month is the current month to date. */
const sum = (rows, k) => (rows || []).reduce((a, r) => a + (num(r[k]) || 0), 0);
const cmRow = (s, rows) => (rows || []).find(r => r.Month === s.Current_Month) || {};
const lfmRow = (s, rows) => (rows || []).find(r => r.Month === s.Last_Full_Month) || {};
const lever = (o, n) => (o.recovery || []).find(r => Number(r.Lever_Order) === n) || {};
const refLever = (o, n) => (((o.ref || {}).recovery) || []).find(r => Number(r.Lever_Order) === n) || {};
const scenario = (o, n) => (o.scenarios || []).find(r => Number(r.Scenario_ID) === n) || {};
const homeXsell = o => {
  const rows = (o.xsellCats || []).filter(r => r.Sales_Category === 'Total Home - New Connection');
  const sold = sum(rows, 'Sold'), att = sum(rows, 'Attempted');
  return { sales: sum(rows, 'Sale_Calls'), opp: sum(rows, 'Opportunities'), att, notOffered: sum(rows, 'Not_Offered'), sold, takeUp: att ? sold / att : null };
};
const salesReasons = o => (o.reasons || []).filter(r => r.Intended_Category);
/** "October" and "1–20 October 2026" for the month to date; "September" for the reference month. */
const cmName = s => monthName(s.Current_Month);
const cmSpan = s => `1–${count(s.Days_Elapsed)} ${monthLabel(s.Current_Month)}`;
const lfmName = s => monthName(s.Last_Full_Month);
/** A small reference line: the last full month, for comparison. */
const refLine = html => `<span class="ref-line">${html}</span>`;

/**
 * One story, top to bottom, each chapter answering one question and leading to the next.
 * Both requests start at once; the hero is drawn from the (small) summary first, then the
 * chapters follow in page order, one per frame.
 */
async function loadHome() {
  skeletons();
  const summaryReq = fetch('/api/dashboard/summary').then(r => r.json());
  const overviewReq = fetch('/api/dashboard/overview').then(r => r.json()).catch(() => ({}));
  // One panel's problem never blanks the page.
  const run = fn => { try { fn(); } catch (err) { console.error('Command Center panel failed', err); } };
  const summary = await summaryReq;
  run(() => renderHero(summary));
  const o = (await overviewReq) || {};
  const steps = [
    () => renderExecSummary(summary, o), () => renderThisMonth(summary, o), () => renderLost(summary, o),
    () => renderJarvis(summary, o), () => renderPeople(summary, o), () => renderXsell(summary, o), () => renderFirstCall(summary, o),
    () => renderRecovery(summary, o), () => renderCoaching(summary, o),
  ];
  for (const fn of steps) { run(fn); await nextFrame(); }
  // Then the other tabs load in the background while the browser is idle, so they open
  // instantly. The Command Center always comes first; the Assistant loads its own when idle.
  (window.requestIdleCallback || (f => setTimeout(f, 1000)))(() => {
    if (window.loadExplorer) window.loadExplorer();
    if (window.loadMonitoring) window.loadMonitoring({ maxAgeMs: 60_000 });
    if (window.loadEvals) window.loadEvals();
    if (window.loadResponsibleAi) window.loadResponsibleAi();
    if (window.loadCost) window.loadCost();
  }, { timeout: 3000 });
}

/** "above", "below" or "level with" a reference rate (within a tenth of a point). */
const versus = (v, ref) => { const d = num(v) - num(ref); return Math.abs(d) < 0.001 ? 'level with' : d > 0 ? 'up from' : 'down from'; };

/** 1. Where are we today? The month so far, its pace to target, and four cards. */
function renderHero(s) {
  document.getElementById('heroGreeting').textContent = greeting();
  const target = num(s.Target_New_Conversion);
  const mtdMonth = cmName(s);
  const lfm = lfmName(s);
  document.getElementById('heroSub').innerHTML = num(s.MTD_Calls) === null
    ? 'Some figures could not be loaded. Please refresh the page.'
    : `${hEsc(mtdMonth)} so far (${count(s.Days_Elapsed)} days): new sales conversion is <b>${pct(s.MTD_New_Conversion)}</b> against a <b>${pct(target)}</b> target, ` +
      `${versus(s.MTD_New_Conversion, s.Same_Days_Last_Month_New_Conversion)} ${pct(s.Same_Days_Last_Month_New_Conversion)} on the same days of ${hEsc(lfm)}. ` +
      `On this pace ${hEsc(mtdMonth)} closes near <b>${count(s.Pace_New_Sales)}</b> new sales against about <b>${count(s.Pace_Target_New_Sales)}</b> needed: ` +
      `to hit target, the last <b>${count(s.Days_Left)} days</b> would need <b>${pct(s.Needed_Rest_Conversion)}</b> conversion.`;
  const pace = num(s.Pace_New_Sales), need = num(s.Pace_Target_New_Sales);
  document.getElementById('heroProgress').innerHTML = need ? `
    <div class="hp-track"><div class="hp-fill" style="width:${Math.min(100, 100 * pace / need).toFixed(1)}%"></div></div>
    <div class="hp-legend"><span><b>${count(s.MTD_New_Sales)}</b> new sales so far · pace <b>${count(pace)}</b> of <b>${count(need)}</b> needed</span><span>${pct(pace / need, 0)} of target pace</span></div>` : '';
  const stillNeeded = need === null ? null : Math.max(0, need - (num(s.MTD_New_Sales) || 0));
  document.getElementById('heroStats').innerHTML = [
    ['Sales this month', count(s.MTD_New_Sales), `new sales · ${count(s.MTD_Renewal_Sales)} renewals · ${money(s.MTD_Monthly_Revenue)} a month in plan revenue` +
      refLine(`${hEsc(lfm)}: ${count(s.LFM_New_Sales)} new sales, ${count(s.LFM_Renewal_Sales)} renewals`), 'cart',
      viewBtn('mtd_sales', 'View sales', '', `Sales, ${cmSpan(s)}`, true)],
    ['New sales conversion', pct(s.MTD_New_Conversion), `target <b>${pct(target)}</b> · <b>${count(stillNeeded)}</b> more new sales needed in ${count(s.Days_Left)} days (${pct(s.Needed_Rest_Conversion)})` +
      refLine(`${hEsc(lfm)}: ${pct(s.LFM_New_Conversion)}`), 'target', ''],
    ['Sales stopped by Jarvis', count(s.MTD_Jarvis_Lost_Sales), `Jarvis errors this month · ${(num(s.MTD_Jarvis_Conversion_Impact) * 100).toFixed(1)} points of conversion` +
      refLine(`${hEsc(lfm)}: ${count(s.LFM_Jarvis_Lost_Sales)}`), 'alert',
      viewBtn('jarvis_lost', 'View blocked sales', '', `Sales stopped by Jarvis, ${cmSpan(s)}`, true)],
    ['FCR this month', pct(s.MTD_FCR_Rate), `target ${pct(s.Target_FCR)} (assumed)` + refLine(`${hEsc(lfm)}: ${pct(s.LFM_FCR_Rate)}`), 'check', ''],
  ].map(([l, v, sub, ic, view]) => `<div class="hs"><div class="hs-ico">${icon(ic)}</div><div><div class="hs-l">${l}</div><div class="hs-v">${v}</div><div class="hs-s">${sub}</div>${view}</div></div>`).join('');
  // Timestamps come from the warehouse in UTC; shown in the viewer's local time.
  const when = (v) => { const d = v ? new Date(v.replace(' ', 'T') + 'Z') : null; return d && !isNaN(d) ? d.toLocaleString('en-AU') : v; };
  document.getElementById('heroNote').innerHTML =
    `<div>Data to ${hEsc(s.As_Of_Day_Name || '')} ${hEsc(asOfDate(s.as_of))}. Every chapter below is ${hEsc(cmSpan(s))}; ${hEsc(lfm)} is shown in small lines for reference.</div>` +
    `<div class="hero-refresh">${s.data_refreshed_at ? `Data refreshed on ${hEsc(when(s.data_refreshed_at))} ` : ''}<span class="synth-tag" title="Demo data shaped to Optus's sales and the Concentrix slides. No real customer records.">Synthetic data</span></div>`;
}

/** Executive summary: the chapters in plain lines, plus a bottom line. Each line jumps to its chapter. */
function renderExecSummary(s, o) {
  if (!(o.recovery || []).length) return;   // the overview hasn't arrived yet: the skeleton stays
  const cm = cmName(s);
  const gap = num(lever(o, 0).New_Sales) || 0;
  const levers = [1, 2, 3].reduce((a, n) => a + (num(lever(o, n).New_Sales) || 0), 0);
  const mobile = salesReasons(o).find(r => r.Call_Reason === 'New Mobile Plan / Port In') || {};
  const hx = homeXsell(o);
  const lostSales = sum(o.lostDrivers, 'Lost_Sales');
  const covered = gap > 0 ? levers / gap : null;
  const stillNeeded = Math.max(0, (num(s.Pace_Target_New_Sales) || 0) - (num(s.MTD_New_Sales) || 0));
  document.getElementById('execSumBottom').innerHTML = `<span class="es-bl">Bottom line</span>` + hEsc(covered !== null
    ? `${cm} needs ${count(stillNeeded)} more new sales in ${count(s.Days_Left)} days to reach ${pct(s.Target_New_Conversion)}. The sales are there: ${count(lostSales)} customers who wanted to buy were lost to Jarvis or to how the call was handled. Fixing Jarvis, the cross-sell and discovery would have added about ${count(levers)} sales so far, ${covered >= 0.95 ? 'enough to close' : `${pct(covered, 0)} of`} the ${count(gap)}-sale gap.`
    : `New sales conversion is ${pct(s.MTD_New_Conversion)} in ${cm} so far.`);
  // One line per chapter with its figure on the right; the detail and the reference month are in the chapter.
  const rows = [
    ['ch1b', 'Are we on target?', `${count(s.MTD_New_Sales)} new sales from ${count(s.MTD_Calls)} calls: ${pct(s.MTD_New_Conversion)} against a ${pct(s.Target_New_Conversion)} target, ${count(gap)} sales short so far.`,
      pct(s.MTD_New_Conversion), 'new sales conversion', 'bad'],
    ['ch2', 'Where sales are lost', `Mobile is the biggest reason customers call (${count(mobile.Calls)} calls) but closes only ${pct(mobile.Sale_Conversion)} of them.`,
      pct(mobile.Sale_Conversion), 'of mobile calls sell', 'warn'],
    ['ch3', 'Systems: Jarvis', `Jarvis errors stopped ${count(s.MTD_Jarvis_Lost_Sales)} sales customers wanted to buy.`,
      count(s.MTD_Jarvis_Lost_Sales), 'sales blocked', 'bad'],
    ['ch4', 'People: the call', `${count(hx.notOffered)} of ${count(hx.sales)} home internet sales had no mobile offered.`,
      count(hx.notOffered), 'NBN sales, no mobile offer', 'warn'],
    ['ch5', 'Closing the gap', `Fixing Jarvis, the cross-sell and discovery would have added about ${count(levers)} new sales so far, against a gap of ${count(gap)}.`,
      count(levers), 'new sales so far', 'good'],
  ];
  document.getElementById('execSumList').innerHTML = rows.map(([id, label, line, fig, figLabel, tone], i) => `
    <li><a class="es-row" href="#${id}">
      <span class="es-n">${i + 1}</span>
      <span class="es-text"><span class="es-label">${hEsc(label)}</span><span class="es-line">${hEsc(line)}</span></span>
      <span class="es-fig es-${tone}"><b>${fig}</b><small>${hEsc(figLabel)}</small></span>
    </a></li>`).join('');
}

// ---- charts (Chart.js, loaded before the app); one instance per canvas, replaced on redraw
const ccCharts = {};
function ccChart(id, cfg) {
  if (ccCharts[id]) { ccCharts[id].destroy(); delete ccCharts[id]; }
  const cv = document.getElementById(id);
  if (window.Chart && cv) ccCharts[id] = new Chart(cv, cfg);
}

/** 1 (continued). How is this month going, and which way are we heading? */
function renderThisMonth(s, o) {
  const cm = cmName(s), span = cmSpan(s), lfm = lfmName(s);
  const target = num(s.Target_New_Conversion);
  const gap = lever(o, 0);
  setTake('ch1Take', `In ${hEsc(span)} we handled <b>${count(s.MTD_Calls)}</b> calls and made <b>${count(s.MTD_New_Sales)}</b> new sales: <b>${pct(s.MTD_New_Conversion)}</b> conversion against a ${pct(target)} target, ` +
    `<b>${count(gap.New_Sales)}</b> sales short so far (about ${money(gap.Est_First_12M_Value)} of first-year plan revenue). To land the month, the last ${count(s.Days_Left)} days need ${pct(s.Needed_Rest_Conversion)}.` +
    refLine(`${hEsc(lfm)}: ${pct(s.LFM_New_Conversion)}, ${count(refLever(o, 0).New_Sales)} sales short of target.`));
  const card = (ic, label, value, sub, why, t, view = '') => `
    <div class="xkpi${t ? ' x-' + t : ''}" title="${hEsc(why)}">
      <div class="xkpi-top">${icon(ic, 'ico-sm')}<span>${label}</span></div>
      <div class="xkpi-v">${value}</div>
      <div class="xkpi-s">${sub}</div>
      <div class="xkpi-why">${hEsc(why)}</div>${view}
    </div>`;
  const below = (v, t) => num(v) < num(t);
  document.getElementById('execKpis').innerHTML = [
    card('target', 'New sales conversion', pct(s.MTD_New_Conversion), `target ${pct(target)}` + refLine(`${hEsc(lfm)}: ${pct(s.LFM_New_Conversion)}`), 'New-connection sales ÷ handled calls', below(s.MTD_New_Conversion, target) ? 'warn' : null,
      viewBtn('mtd_sales', 'View sales', '', `Sales, ${span}`, true)),
    card('repeat', 'Renewals conversion', pct(s.MTD_Renewal_Conversion), `${count(s.MTD_Renewal_Sales)} renewals · target ${pct(s.Target_Renewal_Conversion)} (assumed)` + refLine(`${hEsc(lfm)}: ${pct(s.LFM_Renewal_Conversion)}`), 'Postpaid Voice and Home renewals ÷ handled calls', below(s.MTD_Renewal_Conversion, s.Target_Renewal_Conversion) ? 'warn' : null),
    card('cash', 'Plan revenue sold', money(s.MTD_Monthly_Revenue), `a month · ${money(s.MTD_First_12M_Revenue)} over the first year` + refLine(`${hEsc(lfm)}: ${money(s.LFM_Monthly_Revenue)} a month`), 'Monthly plan price of everything sold (AUD); device repayments not included', null),
    card('check', 'First contact resolution', pct(s.MTD_FCR_Rate), `${pct(s.MTD_Transfer_Rate)} transferred · target ${pct(s.Target_FCR)} (assumed)` + refLine(`${hEsc(lfm)}: ${pct(s.LFM_FCR_Rate)}`), 'Answered calls not transferred and not repeated within 14 days', below(s.MTD_FCR_Rate, s.Target_FCR) ? 'warn' : null),
  ].join('');

  // Weekly conversion by product, as in the Concentrix slide (the last 9 weeks).
  const wk = (o.weekly || []).slice(-9);
  panel('pnlWeekly', 'New sales conversion by week', `Postpaid Voice and Home new connections, week ending Friday. Target ${pct(target)}.`,
    { q: 'Show weekly new sales conversion by product over the last 8 weeks, and what changed week to week.', mode: 'chat' },
    `<div class="trend-cv"><canvas id="ccWeekly" role="img" aria-label="Weekly new sales conversion by product"></canvas></div>
     <div class="panel-note">Bars: new sales of each product ÷ all handled calls that week (so they stack to the total). Line: the ${pct(target)} target. ${hEsc(lfm)}'s weeks are there for reference.${wk.length && String(wk[wk.length - 1].Last_Date) < String(wk[wk.length - 1].Week_Ending) ? ' The last week is partial.' : ''}</div>`);
  ccChart('ccWeekly', {
    type: 'bar',
    data: { labels: wk.map(r => r.Week_Label), datasets: [
      { label: 'Postpaid Voice', data: wk.map(r => num(r.PV_New_Conversion)), backgroundColor: '#0B6E99', stack: 's' },
      { label: 'Home (NBN, 5G, 4G)', data: wk.map(r => num(r.Home_New_Conversion)), backgroundColor: '#0E8F80', stack: 's' },
      { label: 'Connected Device', data: wk.map(r => (num(r.CD_New_Sales) || 0) / num(r.Calls)), backgroundColor: '#94A3B8', stack: 's' },
      { type: 'line', label: 'Target', data: wk.map(() => target), borderColor: '#DC2626', borderDash: [6, 4], pointRadius: 0, fill: false },
    ] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${pct(c.parsed.y)}` } } },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: v => pct(v, 0) } } } },
  });

  // Daily: the last six weeks, this month highlighted.
  const dl = o.daily || [];
  const mtd = String(s.month_start || '').slice(0, 7);
  panel('pnlDaily', 'New sales conversion by day', `The last six weeks to ${hEsc(shortDay(s.as_of))}; ${hEsc(cm)} highlighted. Weekends are quieter and convert less.`,
    { q: 'What is the daily new sales conversion this month, and how does it compare with the target?', mode: 'chat' },
    `<div class="trend-cv"><canvas id="ccDaily" role="img" aria-label="Daily new sales conversion"></canvas></div>
     <div class="panel-note">Each bar: new sales ÷ handled calls that day. Optus reports sales 24 to 48 hours late; this is the latest day loaded.</div>`);
  ccChart('ccDaily', {
    type: 'bar',
    data: { labels: dl.map(r => shortDay(r.d)), datasets: [
      { label: 'New sales conversion', data: dl.map(r => num(r.New_Conversion)), backgroundColor: dl.map(r => (String(r.Month) === mtd ? '#0B6E99' : '#9BC3D6')) },
      { type: 'line', label: 'Target', data: dl.map(() => target), borderColor: '#DC2626', borderDash: [6, 4], pointRadius: 0, fill: false },
    ] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${pct(c.parsed.y)}`, afterLabel: c => c.datasetIndex ? '' : `${count(dl[c.dataIndex].New_Sales)} new sales, ${count(dl[c.dataIndex].Calls)} calls` } } },
      scales: { x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { beginAtZero: true, ticks: { callback: v => pct(v, 0) } } } },
  });

  // What we sold, by Optus's reporting categories.
  const mix = o.salesMix || [];
  const maxS = Math.max(...mix.map(r => num(r.Sales) || 0), 1) * 1.05;
  panel('pnlMix', `What we sold, ${hEsc(span)}`, `Optus's five sales categories: ${count(sum(mix, 'Sales'))} sales worth ${money(sum(mix, 'Monthly_Revenue'))} a month in plan revenue.` +
    refLine(`${hEsc(lfm)}: ${count(num(s.LFM_New_Sales) + num(s.LFM_Renewal_Sales))} sales, ${money(s.LFM_Monthly_Revenue)} a month`),
    { q: 'Which product categories sold most this month, and what monthly revenue did they bring?', mode: 'chat' },
    `<div class="grid two flat-grid">${mix.map(r => bar(hEsc(r.Sales_Category), num(r.Sales), maxS, count(r.Sales), r.Sale_Type === 'New sale' ? 'brand' : 'good',
      `${money(r.Monthly_Revenue)} a month · ${money(r.First_12M_Revenue)} first year${num(r.Cross_Sell_Sales) ? ` · ${count(r.Cross_Sell_Sales)} from cross-sell` : ''}`)).join('')}</div>
     <div class="panel-note">Sales are order lines (a cross-sell is a second line on the same call). NBN sells strongly; mobile has the most room to grow.</div>`);
}

/** 2. Where are we losing sales? Conversion by call reason, and why customers who wanted to buy didn't. */
function renderLost(s, o) {
  const span = cmSpan(s), lfm = lfmName(s), ref = o.ref || {};
  const reasons = salesReasons(o).slice().sort((a, b) => num(b.Calls) - num(a.Calls));
  const top = reasons[0] || {};
  const best = reasons.slice().sort((a, b) => num(b.Sale_Conversion) - num(a.Sale_Conversion))[0] || {};
  const nbn = reasons.find(r => r.Call_Reason === 'New NBN Service') || {};
  const refOf = name => (ref.reasons || []).find(r => r.Call_Reason === name) || {};
  const total = sum(o.reasons, 'Calls');
  const drivers = ['People', 'System'].map(d => {
    const rows = (o.lostDrivers || []).filter(r => r.Lost_Sale_Driver === d).sort((a, b) => num(b.Lost_Sales) - num(a.Lost_Sales));
    return { d, rows, lost: sum(rows, 'Lost_Sales'), value: sum(rows, 'Value_Lost') };
  });
  const lost = drivers.reduce((a, x) => a + x.lost, 0);
  const refDrivers = ref.drivers || [];
  const refLost = sum(refDrivers, 'Lost_Sales');
  const refShare = d => { const r = refDrivers.find(x => x.Lost_Sale_Driver === d); return r && refLost ? num(r.Lost_Sales) / refLost : null; };
  const dName = d => (d === 'System' ? 'Systems' : 'People');
  const cust = o.customerReasons || [];
  const custN = sum(cust, 'Calls');
  const custLabel = r => String(r.Customer_No_Sale_Reason || '').replace('Port-in: previous provider account number unavailable', 'no port-in account number').toLowerCase();
  setTake('ch2Take', `<b>${hEsc(top.Call_Reason || '')}</b> is the biggest reason customers call (${pct(num(top.Calls) / total, 0)} of calls) but only <b>${pct(top.Sale_Conversion)}</b> of those calls sell, ` +
    `against ${pct(nbn.Sale_Conversion)} for new NBN and ${pct(best.Sale_Conversion)} for ${hEsc(String(best.Call_Reason || '').toLowerCase())}. ` +
    `<b>${count(lost)}</b> customers who wanted to buy were lost for reasons we can fix: ${drivers.slice().sort((a, b) => b.lost - a.lost).map(x => `${hEsc(dName(x.d).toLowerCase())} ${pct(x.lost / lost, 0)}`).join(', ')}. ` +
    `The next two chapters take each in turn.` +
    refLine(`${hEsc(lfm)}: mobile ${pct(refOf(top.Call_Reason).Sale_Conversion)}, ${count(refLost)} lost sales.`));
  const maxC = Math.max(...reasons.map(r => num(r.Sale_Conversion) || 0), 0.01) * 1.08;
  const avg = sum(reasons, 'Sale_Calls') / (sum(reasons, 'Calls') || 1);
  panel('pnlReasons', 'Which calls turn into sales', `${hEsc(span)}, calls with a sales reason: the share that closed a sale. The line is the average for sales calls (${pct(avg)}).`,
    { q: 'Why does mobile convert so much less than NBN, and what should we change on mobile calls?', mode: 'agent' },
    reasons.map(r => bar(hEsc(r.Call_Reason), num(r.Sale_Conversion), maxC, pct(r.Sale_Conversion),
      num(r.Sale_Conversion) < avg * 0.75 ? 'bad' : num(r.Sale_Conversion) > avg * 1.25 ? 'good' : 'brand',
      `${count(r.Calls)} calls · ${count(r.Lost_Sales)} lost sales · ${hEsc(lfm)} ${pct(refOf(r.Call_Reason).Sale_Conversion)} ` + viewBtn('call_reason_lost', 'View calls without a sale', r.Call_Reason, `${r.Call_Reason}: calls without a sale, ${span}`, true),
      avg, `Sales calls ${pct(avg)}`)).join('') +
    `<div class="panel-note">Each bar: calls with that reason that closed at least one sale ÷ calls with that reason. Service calls (billing, order status, relocation) are left out; they rarely sell.</div>`);
  const maxL = Math.max(...drivers.map(x => x.lost), 1) * 1.05;
  panel('pnlDrivers', 'Why customers who wanted to buy didn\'t', `${hEsc(span)}: ${count(lost)} lost sales worth about ${money(drivers.reduce((a, x) => a + x.value, 0))} in first-year revenue.`,
    { q: 'Break down lost sales by driver and reason this month, and which ones to fix first.', mode: 'agent' },
    drivers.map(x => bar(`<b>${hEsc(dName(x.d))}</b>`, x.lost, maxL, `${count(x.lost)} · ${pct(x.lost / lost, 0)}`, 'bad',
      x.rows.slice(0, 3).map(r => `${hEsc(r.Lost_Sale_Reason)} (${count(r.Lost_Sales)})`).join(' · ') + ` · ${hEsc(lfm)} ${pct(refShare(x.d), 0)} ` +
      viewBtn('driver', 'View', x.d, `Lost sales: ${dName(x.d).toLowerCase()} causes, ${span}`, true))).join('') +
    (custN ? `<div class="cust-reasons"><b>Not counted as lost: ${count(custN)} customer reasons.</b> The customer couldn't or chose not to buy: ${cust.slice(0, 5).map(r => `${hEsc(custLabel(r))} (${count(r.Calls)})`).join(' · ')}. ` +
      `A process to improve (for example, ask for the port-in account number up front), not a lost sale. ${viewBtn('customer_no_sale', 'View', '', `Customer reasons (not lost sales), ${span}`, true)}</div>` : '') +
    `<div class="panel-note">A lost sale: the customer intended to buy and it didn't close for a reason we could have fixed. Optus's slide split (Customer 43.3%, People 25.8%, System 30.9%) includes customer reasons; without them it is People 45%, Systems 55%.</div>`);
}

/** 3. What is Jarvis costing us? */
function renderJarvis(s, o) {
  const span = cmSpan(s), lfm = lfmName(s);
  const rows = o.jarvis || [];
  const lost = sum(rows, 'Lost_Sales'), tickets = sum(rows, 'Tickets');
  const days = tickets ? rows.reduce((a, r) => a + num(r.Avg_Resolution_Days) * num(r.Tickets), 0) / tickets : null;
  const came = sum(rows, 'Lost_Came_Back'), bought = sum(rows, 'Lost_Bought_On_Return');
  const m = cmRow(s, o.monthly);
  const top = rows[0] || {};
  setTake('ch3Take', `Jarvis errors stopped <b>${count(lost)}</b> sales in ${hEsc(span)}: <b>${(num(s.MTD_Jarvis_Conversion_Impact) * 100).toFixed(1)} points</b> of conversion, about ${money(sum(rows, 'Value_Lost'))} of first-year revenue. ` +
    `<b>${count(came)}</b> of those customers called back, and only <b>${count(bought)}</b> bought. A call with a Jarvis error takes <b>${secs(m.Avg_Handle_Seconds_Jarvis)}</b> against ${secs(m.Avg_Handle_Seconds_No_Jarvis)}. ` +
    `${hEsc(top.Jarvis_Error_Type || '')} is the error to fix first.` +
    refLine(`${hEsc(lfm)}: ${count(s.LFM_Jarvis_Lost_Sales)} sales stopped, ${(num(s.LFM_Jarvis_Conversion_Impact) * 100).toFixed(1)} points.`));
  const maxL = Math.max(...rows.map(r => num(r.Lost_Sales) || 0), 1) * 1.05;
  panel('pnlJarvis', 'Sales stopped by Jarvis, by error', `${hEsc(span)}: ${count(sum(rows, 'Error_Calls'))} calls hit an error; ${count(tickets)} tickets took ${days === null ? '—' : days.toFixed(1)} days on average to resolve.`,
    { q: 'How many sales did Jarvis errors cost this month, which errors matter most, and how long do tickets take?', mode: 'agent' },
    rows.map(r => bar(hEsc(r.Jarvis_Error_Type), num(r.Lost_Sales), maxL, `${count(r.Lost_Sales)} lost`, 'bad',
      `${count(r.Error_Calls)} calls · ${count(r.Tickets)} tickets · ${num(r.Avg_Resolution_Days) === null ? '—' : num(r.Avg_Resolution_Days).toFixed(1)} days on average, longest ${count(r.Max_Resolution_Days)} ` +
      viewBtn('jarvis_type', 'View', r.Jarvis_Error_Type, `Jarvis "${r.Jarvis_Error_Type}" calls, ${span}`, true))).join('') +
    `<div class="panel-note">Jarvis is the system consultants use to check eligibility and submit orders. A blocked sale is lost when the error stops the order on the call. Optus reported a 0.6-point impact. ${viewBtn('jarvis_lost', 'View every blocked sale', '', `Sales stopped by Jarvis, ${span}`, true)}</div>`);
  const mon = o.monthly || [];
  panel('pnlJarvisTrend', 'Jarvis month by month', `Sales stopped by Jarvis errors and the points of conversion they cost; ${hEsc(cmName(s))} is to the ${count(s.Days_Elapsed)}th.`,
    { q: 'How has the number of sales lost to Jarvis errors changed month by month?', mode: 'chat' },
    `<div class="trend-cv"><canvas id="ccJarvis" role="img" aria-label="Sales stopped by Jarvis by month"></canvas></div>
     <div class="panel-note">Bars: sales stopped (left axis). Line: points of new-and-renewal conversion lost (right axis). It hasn't gone away: every month costs about the same.</div>`);
  ccChart('ccJarvis', {
    type: 'bar',
    data: { labels: mon.map(r => monthLabel(r.Month).replace(' 20', ' ’') + (String(r.Is_Partial_Month) === '1' ? ' (to date)' : '')), datasets: [
      { label: 'Sales stopped', data: mon.map(r => num(r.Jarvis_Lost_Sales)), backgroundColor: mon.map(r => (String(r.Is_Partial_Month) === '1' ? '#DC2626' : '#F4A3A3')), yAxisID: 'y' },
      { type: 'line', label: 'Points of conversion', data: mon.map(r => num(r.Jarvis_Conversion_Impact) * 100), borderColor: '#0B6E99', pointRadius: 2, yAxisID: 'y1' },
    ] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } },
      scales: { y: { beginAtZero: true, position: 'left' }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => `${Number(v).toFixed(1)} pts` } } } },
  });
}

/** 4. People: are consultants making the most of every call? One answer for the chapter. */
function renderPeople(s, o) {
  const span = cmSpan(s), lfm = lfmName(s);
  const people = (o.lostDrivers || []).filter(r => r.Lost_Sale_Driver === 'People').sort((a, b) => num(b.Lost_Sales) - num(a.Lost_Sales));
  const hx = homeXsell(o), rx = (o.ref || {}).xsell || {};
  const fc = cmRow(s, o.firstCall), fcRef = lfmRow(s, o.firstCall);
  const tr = o.transfers || [], rt = (o.ref || {}).transfers || {};
  const avoid = sum(tr.filter(r => r.Transfer_Validity === 'Avoidable'), 'Transfers');
  const refPeople = sum(((o.ref || {}).drivers || []).filter(r => r.Lost_Sale_Driver === 'People'), 'Lost_Sales');
  const short = r => String(r.Lost_Sale_Reason).split(' - ')[0].toLowerCase();
  setTake('ch4Take', `<b>${count(sum(people, 'Lost_Sales'))}</b> sales in ${hEsc(span)} were lost to how the call was handled: ${people.slice(0, 2).map(r => `${hEsc(short(r))} (${count(r.Lost_Sales)})`).join(', ')}. ` +
    `<b>${count(hx.notOffered)}</b> of ${count(hx.sales)} home internet sales had no mobile offered, though <b>${pct(hx.takeUp, 0)}</b> say yes when asked. ` +
    `<b>${count(fc.Callbacks_Chased)}</b> of ${count(fc.Callbacks_Promised)} promised callbacks were left to the customer, and <b>${count(avoid)}</b> transfers were avoidable. ` +
    `A sale missed on the first call is rarely won later: <b>${count(fc.Lost_Bought_On_Return)}</b> of ${count(fc.Lost_Sales)} lost sales were won back.` +
    refLine(`${hEsc(lfm)}: ${count(refPeople)} lost to people causes; ${count(rx.Not_Offered)} of ${count(rx.Sale_Calls)} NBN sales without a mobile offer; ${count(fcRef.Callbacks_Chased)} of ${count(fcRef.Callbacks_Promised)} callbacks chased; ${count(rt.Avoidable)} avoidable transfers.`));
}

/** 4a. Are we asking for the second sale? */
function renderXsell(s, o) {
  const span = cmSpan(s), lfm = lfmName(s);
  const hx = homeXsell(o);
  const sc1 = scenario(o, 1);
  const target = ruleVal(s, 'target_xsell_attempt', 0.6);
  const rx = (o.ref || {}).xsell || {};
  const steps = [
    ['Home internet sales', hx.sales, 'brand', ''],
    ['Customer has no Optus mobile', hx.opp, 'brand', `${pct(hx.opp / hx.sales, 0)} of sales`],
    ['Mobile offered', hx.att, 'warn', `${pct(hx.att / hx.opp, 0)} of opportunities · target ${pct(target, 0)} (assumed) · ${hEsc(lfm)} ${pct(num(rx.Attempted) / num(rx.Opportunities), 0)}`],
    ['Mobile sold', hx.sold, 'good', `${pct(hx.takeUp, 0)} of offers · ${hEsc(lfm)} ${pct(num(rx.Sold) / num(rx.Attempted), 0)}`],
  ];
  panel('pnlXsell', 'The mobile sale on NBN calls', `${hEsc(span)}, home internet new connections.`,
    { q: 'How many NBN sales this month had no mobile cross-sell offered, and what would offering it every time be worth?', mode: 'agent' },
    steps.map(([l, v, t, sub]) => bar(hEsc(l), v, hx.sales || 1, count(v), t, sub)).join('') +
    `<div class="scen-f">Scenario 1 · ${count(sc1.Calls)} sales without a mobile offer ${viewBtn('scenario', 'View', '1', `Scenario 1: ${sc1.Scenario_Name || ''}, ${span}`, true)}</div>` +
    `<div class="panel-note">Cross-sell is new: it started in August 2026 and the team is in training. From the revised Elevate form: opportunity (no complementary Optus service), offered, and the outcome. The team has no in-call prompt today; this is where one would pay for itself.</div>`);
  const teams = (o.xsellTeams || []).slice().sort((a, b) => num(a.Attempt_Rate) - num(b.Attempt_Rate));
  const maxA = Math.max(...teams.map(r => num(r.Attempt_Rate) || 0), target) * 1.08;
  panel('pnlXsellTeams', 'Cross-sell offered, by team', `${hEsc(span)}, all sale calls with a cross-sell opportunity. The line is the ${pct(target, 0)} target (assumed).`,
    { q: 'Which teams and consultants offer the cross-sell least this month, and what do their audits say?', mode: 'agent' },
    teams.map(r => bar(hEsc(r.Team_Lead), num(r.Attempt_Rate), maxA, pct(r.Attempt_Rate, 0), num(r.Attempt_Rate) < target / 2 ? 'bad' : 'warn',
      `${count(r.Attempted)} of ${count(r.Opportunities)} offered · ${count(r.Sold)} sold ` + viewBtn('team_xsell_missed', 'View missed', r.Team_Lead, `Cross-sell not offered: ${r.Team_Lead}'s team, ${span}`, true),
      target, `Target ${pct(target, 0)}`)).join('') +
    `<div class="panel-note">Every team is well below target, so this is a training and prompt gap, not one team's problem. Team lead names are synthetic.</div>`);
}

/** 4b. What happens when the first call doesn't close? */
function renderFirstCall(s, o) {
  const span = cmSpan(s), lfm = lfmName(s);
  const fc = cmRow(s, o.firstCall), fcRef = lfmRow(s, o.firstCall);
  const m = cmRow(s, o.monthly);
  const tr = o.transfers || [];
  const rt = (o.ref || {}).transfers || {};
  const total = sum(tr, 'Transfers');
  const avoid = sum(tr.filter(r => r.Transfer_Validity === 'Avoidable'), 'Transfers');
  const fromSales = sum(tr.filter(r => r.Call_Type === 'Sales call'), 'Transfers');
  const maxF = Math.max(num(fc.Lost_Sales) || 0, 1);
  panel('pnlFirstCall', 'Lost on the first call, lost for good', `${hEsc(span)}: what happened to customers we didn't sell to.`,
    { q: 'Do customers we lose come back and buy? What should consultants do differently on the first call?', mode: 'agent' },
    bar('Lost sales', num(fc.Lost_Sales), maxF, count(fc.Lost_Sales), 'bad', viewBtn('mtd_lost', 'View', '', `Lost sales, ${span}`, true)) +
    bar('Called again within 14 days', num(fc.Lost_Came_Back), maxF, count(fc.Lost_Came_Back), 'warn', `${pct(num(fc.Lost_Came_Back) / num(fc.Lost_Sales), 0)} ` + viewBtn('lost_came_back', 'View', '', `Lost sales whose customer called again, ${span}`, true)) +
    bar('Bought when they called again', num(fc.Lost_Bought_On_Return), maxF, count(fc.Lost_Bought_On_Return), 'good', `${pct(num(fc.Lost_Bought_On_Return) / num(fc.Lost_Sales), 0)} of lost sales won back ` + viewBtn('lost_bought', 'View', '', `Lost sales won back, ${span}`, true)) +
    `<div class="hbar-sub" style="margin-top:10px">First call converts <b>${pct(fc.First_Contact_Conversion)}</b> · a repeat call <b>${pct(fc.Repeat_Contact_Conversion)}</b>` +
    refLine(`${hEsc(lfm)}: first call ${pct(fcRef.First_Contact_Conversion)}, repeat ${pct(fcRef.Repeat_Contact_Conversion)}`) + `</div>` +
    `<div class="panel-note">Conversion here is calls that closed a sale ÷ calls. A repeat call is the same customer within 14 days.</div>`);
  const maxC = Math.max(num(fc.Callbacks_Promised) || 0, num(fc.Repeats) || 0, 1);
  panel('pnlCallbacks', 'Promised callbacks and repeat calls', `${hEsc(span)}: ${pct(num(fc.Repeats_Within_1hr) / num(fc.Repeats), 0)} of repeat calls came within the hour.`,
    { q: 'Are promised callbacks being kept, and why do customers call back within the hour?', mode: 'agent' },
    bar('Callbacks promised', num(fc.Callbacks_Promised), maxC, count(fc.Callbacks_Promised), 'brand') +
    bar('Customer had to call us instead', num(fc.Callbacks_Chased), maxC, count(fc.Callbacks_Chased), 'bad', `${pct(num(fc.Callbacks_Chased) / num(fc.Callbacks_Promised), 0)} of promises · ${hEsc(lfm)} ${pct(num(fcRef.Callbacks_Chased) / num(fcRef.Callbacks_Promised), 0)} ` + viewBtn('callbacks_chased', 'View', '', `Callbacks the customer chased, ${span}`, true)) +
    bar('Repeat calls', num(fc.Repeats), maxC, count(fc.Repeats), 'warn', `${count(fc.Repeats_Within_1hr)} within the hour: something broke on that call`) +
    `<div class="panel-note">Optus flagged consultants deferring customers to a promised callback instead of taking ownership. A repeat within the hour usually means a dropped call, a Jarvis error or an unfinished order.</div>`);
  const dests = [...new Set(tr.map(r => r.Transfer_Destination))].map(d => {
    const rows = tr.filter(r => r.Transfer_Destination === d);
    return { d, n: sum(rows, 'Transfers'), a: sum(rows.filter(r => r.Transfer_Validity === 'Avoidable'), 'Transfers') };
  }).sort((a, b) => b.n - a.n);
  const reasons = [...new Set(tr.filter(r => r.Invalid_Transfer_Reason).map(r => r.Invalid_Transfer_Reason))].map(x => [x, sum(tr.filter(r => r.Invalid_Transfer_Reason === x), 'Transfers')]).sort((a, b) => b[1] - a[1]);
  const maxT = Math.max(...dests.map(x => x.n), 1);
  panel('pnlTransfers', 'Where transfers go', `${hEsc(span)}: ${count(total)} transfers, ${count(fromSales)} of them from sales calls; ${count(avoid)} avoidable (${pct(avoid / total, 0)}).` +
    refLine(`${hEsc(lfm)}: ${count(rt.Transfers)} transfers, ${count(rt.Avoidable)} avoidable`),
    { q: 'What are the top transfer destinations this month, which transfers were avoidable, and how much would fixing them lift FCR?', mode: 'agent' },
    dests.slice(0, 6).map(x => bar(hEsc(x.d), x.n, maxT, `${count(x.n)} · ${pct(x.n / total, 0)}`, x.a / x.n > 0.2 ? 'bad' : 'warn',
      `${count(x.a)} avoidable ` + viewBtn('destination', 'View', x.d, `Transfers to ${x.d}, ${span}`, true))).join('') +
    `<div class="hbar-sub" style="margin-top:8px">Avoidable: ${reasons.map(([x, n]) => `${hEsc(x.toLowerCase())} (${count(n)})`).join(' · ')} ${viewBtn('avoidable', 'View all avoidable', '', `Avoidable transfers, ${span}`, true)}</div>` +
    `<div class="panel-note">As on the Concentrix FCR slide, Retention is the top destination. Consultants sending customers to Retention before checking other plans is the biggest avoidable reason.</div>`);
}

/** Who needs coaching, and on what? Shown in Explorer (the last three months to date, so the ranking has enough calls). */
function renderCoaching(s, o) {
  const rows = o.coaching || [];
  const first = rows[0] || {};
  const tenure = o.tenure || [];
  const nest = tenure.find(r => String(r.Tenure_Band).startsWith('Nesting')) || {};
  const tenured = tenure.filter(r => !String(r.Tenure_Band).startsWith('Nesting'));
  const tenuredConv = sum(tenured, 'Calls') ? tenured.reduce((a, r) => a + num(r.Sale_Conversion) * num(r.Calls), 0) / sum(tenured, 'Calls') : null;
  const span = first.Window_Start ? `${monthName(first.Window_Start)} to ${asOfDate(s.as_of)}` : 'the last three months';
  setTake('coachTake', rows.length
    ? `Over ${hEsc(span)}, the median consultant closed a sale on <b>${pct(first.Median_Sale_Conversion)}</b> of calls. The ${count(rows.length)} furthest below it ` +
      `would have made about <b>${count(sum(rows, 'Sales_Below_Median'))}</b> more sales at the median. Most have low Elevate discovery scores: the "irrelevant plan recommendation" Optus described. ` +
      (nest.Calls ? `New starters in nesting convert <b>${pct(nest.Sale_Conversion)}</b> against ${pct(tenuredConv)} for everyone else.` : '') +
      refLine(`Three months to date, including ${hEsc(cmName(s))}, so each consultant has enough calls to rank.`)
    : 'No consultant is in the lowest conversion quartile.');
  const body = `<div class="table-scroll flat"><table class="nice">
    <thead><tr><th>Consultant</th><th>Team lead</th><th>Tenure</th><th>Calls</th><th>Sale conversion</th><th>Sales below median</th><th>Discovery (of 5)</th><th>Cross-sell offered</th><th>Focus</th><th></th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td><b>${hEsc(r.Agent_Name)}</b> <span class="muted mono">${hEsc(r.Agent_ID)}</span></td><td>${hEsc(r.Team_Lead)}</td><td>${hEsc(r.Tenure_Band)}</td>
      <td>${count(r.Calls)}</td><td><b>${pct(r.Sale_Conversion)}</b> <span class="muted">median ${pct(r.Median_Sale_Conversion)}</span></td>
      <td>${count(r.Sales_Below_Median)}</td><td>${num(r.Avg_Discovery_Score) === null ? '—' : num(r.Avg_Discovery_Score).toFixed(1)}</td>
      <td>${pct(r.Cross_Sell_Attempt_Rate, 0)}</td><td><span class="xp-tag ${String(r.Coaching_Focus).startsWith('Coach first') ? 'bad' : 'warn'}">${hEsc(r.Coaching_Focus)}</span></td>
      <td>${viewBtn('agent_lost', 'Lost sales', r.Agent_ID, `Lost sales: ${r.Agent_Name}, ${span}`, true)}</td></tr>`).join('') || '<tr><td colspan="10" class="empty-note">No consultant flagged.</td></tr>'}</tbody></table></div>`;
  panel('pnlCoaching', 'Who to coach first', `${hEsc(span)}, consultants with 150+ calls in the lowest conversion quartile, most sales below the median first.`,
    { q: 'Which consultants should we coach first, and on what: discovery, ownership or cross-sell?', mode: 'agent' },
    body + `<div class="panel-note">Sale conversion: calls that closed a sale ÷ calls. Discovery score: average of their Elevate audits (1 to 5). Consultant names are real; team lead names are synthetic; every figure is synthetic. A coaching focus is a rule on the numbers, not a judgement on the person.</div>`);
  const maxT = Math.max(...tenure.map(r => num(r.Sale_Conversion) || 0), 0.01) * 1.08;
  panel('pnlTenure', 'Conversion by tenure', `${hEsc(span)}: calls that closed a sale, by how long the consultant has been with us.`,
    { q: 'Do nesting consultants convert less than tenured ones, and what support would close the gap?', mode: 'chat' },
    `<div class="grid two flat-grid">${tenure.map(r => bar(hEsc(r.Tenure_Band), num(r.Sale_Conversion), maxT, pct(r.Sale_Conversion), String(r.Tenure_Band).startsWith('Nesting') ? 'warn' : 'brand', `${count(r.Calls)} calls · new sales ${pct(r.New_Conversion)}`)).join('')}</div>`);
}

/** 5. How do we close the gap to target? The recovery plan and the Scenario Guide, this month. */
function renderRecovery(s, o) {
  const span = cmSpan(s), lfm = lfmName(s);
  const gap = lever(o, 0);
  const levers = [1, 2, 3].map(n => lever(o, n)).filter(r => r.Lever);
  const total = levers.reduce((a, r) => a + (num(r.New_Sales) || 0), 0);
  const value = levers.reduce((a, r) => a + (num(r.Est_First_12M_Value) || 0), 0);
  const g = num(gap.New_Sales) || 0;
  const refTotal = [1, 2, 3].reduce((a, n) => a + (num(refLever(o, n).New_Sales) || 0), 0);
  setTake('ch5Take', `In ${hEsc(span)} we are <b>${count(g)}</b> new sales short of the ${pct(s.Target_New_Conversion)} target so far. Three fixes, each with an owner, would have added about <b>${count(total)}</b> ` +
    `(${money(value)} of first-year revenue)${g ? `: ${total >= g * 0.95 ? '<b>enough to close the gap</b>' : `<b>${pct(total / g, 0)}</b> of the gap`}` : ''}. ` +
    `The month still needs <b>${count(Math.max(0, (num(s.Pace_Target_New_Sales) || 0) - (num(s.MTD_New_Sales) || 0)))}</b> new sales in ${count(s.Days_Left)} days.` +
    refLine(`${hEsc(lfm)}: ${count(refLever(o, 0).New_Sales)} short; the same fixes were worth ${count(refTotal)}.`));
  const colors = ['#DC2626', '#D97706', '#0E8F80'];
  const scale = Math.max(g, total, 1);
  const stack = `<div class="stack recovery-stack" title="The three levers against the gap">${levers.map((r, i) => `<span style="width:${(100 * num(r.New_Sales) / scale).toFixed(2)}%;background:${colors[i]}" title="${hEsc(r.Lever)}: ${count(r.New_Sales)}">${count(r.New_Sales)}</span>`).join('')}</div>
    <div class="stack gap-stack"><span style="width:${(100 * g / scale).toFixed(2)}%;background:#64748B">Gap ${count(g)}</span></div>`;
  const table = `<table class="mini risk-table"><thead><tr><th>Lever</th><th>Owner</th><th>New sales so far</th><th>First-year value</th><th>How it's worked out</th><th>${hEsc(lfm)}</th></tr></thead><tbody>
    ${levers.map((r, i) => `<tr><td><span class="dot" style="background:${colors[i]}"></span><b>${hEsc(r.Lever)}</b></td><td>${hEsc(r.Owner)}</td><td>${count(r.New_Sales)}</td><td>${money(r.Est_First_12M_Value)}</td><td class="muted">${hEsc(r.Basis)}</td><td class="muted">${count(refLever(o, Number(r.Lever_Order)).New_Sales)}</td></tr>`).join('')}
    <tr class="tot"><td>Together</td><td></td><td>${count(total)}</td><td>${money(value)}</td><td class="muted">Against a gap of ${count(g)} (${hEsc(gap.Basis || '')})</td><td class="muted">${count(refTotal)} vs ${count(refLever(o, 0).New_Sales)}</td></tr></tbody></table>`;
  panel('pnlRecovery', 'The recovery plan', `${hEsc(span)}: what each fix would have added in new sales, against the gap to target so far.`,
    { q: 'How do we close the gap to the new sales conversion target this month? Rank the levers and say who owns each.', mode: 'agent' },
    stack + `<div class="table-scroll flat">${table}</div>` +
    `<div class="panel-note">Planning estimates, not forecasts. Jarvis: new sales its errors stopped (chapter 3). Cross-sell: opportunities not offered × the observed take-up (chapter 4). Coaching: new sales lost to people causes × 40%, an assumption to agree with the team leads; who to coach first is in Explorer.</div>`);
  const asks = {
    1: 'Which consultants missed the mobile cross-sell on NBN sales most often this month?',
    2: 'Which Jarvis errors blocked sales this month, and how long did their tickets take?',
    3: 'Which first calls with a sales reason didn\'t close this month and brought the customer back, and why?',
    4: 'Which transfers this month were avoidable, and which consultants made them?',
    5: 'Which customer reasons (credit check, ID, port-in account number, price) stopped customers buying this month, and what process would help?',
  };
  document.getElementById('scenarios').innerHTML = (o.scenarios || []).map(x => `<div class="card scen"><div class="scen-n">Scenario ${hEsc(x.Scenario_ID)}</div><div class="scen-t">${hEsc(x.Scenario_Name)}</div>
      <div class="scen-v">${count(x.Calls)}<small>calls</small></div>
      <div class="scen-d">${hEsc(x.Business_Question)}${num(x.Est_First_12M_Value) ? ` About ${money(x.Est_First_12M_Value)} of first-year revenue.` : ''}${refLine(`${hEsc(lfm)}: ${count(x.Last_Full_Month_Calls)} calls`)}</div>
      <div class="scen-f">${hEsc(x.Filter_Logic)}</div>
      <div class="card-btns">${viewBtn('scenario', 'View calls', String(x.Scenario_ID), `Scenario ${x.Scenario_ID}: ${x.Scenario_Name}, ${span}`)}${askBtn(asks[x.Scenario_ID] || x.Business_Question, 'chat')}</div></div>`).join('');
}

// ---------------------------------------------------------------- the calls behind a figure
// Every card can show its calls: the same rule as its number, at call level.
const LIST_RULES = {
  day_sales: 'Calls on the latest day that closed at least one sale.',
  mtd_sales: 'Calls this month so far that closed at least one sale.',
  mtd_lost: 'Calls this month so far where a customer who wanted to buy didn\'t.',
  driver: 'Lost sales this month so far with this driver.',
  customer_no_sale: 'Customers this month so far who wanted to buy but couldn\'t or chose not to (credit check, ID, port-in account number, price, wants to think). Not counted as lost sales.',
  reason: 'Lost sales this month so far with this reason.',
  call_reason_lost: 'Calls with this reason this month so far that did not close a sale (lost sales first).',
  jarvis_lost: 'Sales a Jarvis error stopped this month so far, longest ticket first.',
  jarvis_type: 'Calls with this Jarvis error this month so far (blocked sales first).',
  xsell_missed: 'Sale calls this month so far with a cross-sell opportunity that was not offered.',
  team_xsell_missed: 'Sale calls by this team this month so far with a cross-sell opportunity that was not offered.',
  lost_came_back: 'Lost sales this month so far whose customer called again within 14 days.',
  lost_bought: 'Lost sales this month so far whose customer bought when they called again.',
  callbacks_chased: 'Calls this month so far with a promised callback where the customer had to call in again.',
  avoidable: 'Avoidable transfers this month so far.',
  destination: 'Transfers to this destination this month so far (avoidable first).',
  scenario: 'Calls in this scenario this month so far, using the rules in the Scenario Guide.',
  agent_lost: 'Lost sales of this consultant over the last three months to date.',
};
const viewBtn = (list, label, value = '', title = '', sm = false) =>
  `<button class="view-btn${sm ? ' sm' : ''}" data-accounts="${list}" data-value="${hEsc(value)}" data-title="${hEsc(title)}">${hEsc(label)}</button>`;
let callRows = [];
function openCalls(list, value, title) {
  return showCallList({
    url: `/api/dashboard/calls?list=${encodeURIComponent(list)}${value ? '&value=' + encodeURIComponent(value) : ''}`,
    title, rule: LIST_RULES[list] || '', file: `lenss-optus-telesales-${list}${value ? '-' + value.replace(/\W+/g, '-').toLowerCase() : ''}`,
  });
}
const flag = v => (v === null || v === undefined || v === '' ? null : String(v) === '1' || String(v).toLowerCase() === 'true');
/** The calls window, shared by the Command Center and the Explorer (window.showAccountList). */
async function showCallList({ url, title, rule, file }) {
  const dlg = document.getElementById('acctDialog');
  document.getElementById('acctTitle').textContent = title || 'Calls';
  document.getElementById('acctRule').textContent = rule || '';
  document.getElementById('acctSum').textContent = 'Loading calls…';
  document.getElementById('acctBody').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel short"></div>';
  document.getElementById('acctCsv').disabled = true;
  if (!dlg.open) dlg.showModal();
  let d;
  try {
    const r = await fetch(url);
    d = await r.json();
    if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
  } catch (err) {
    document.getElementById('acctSum').textContent = 'These calls could not be loaded. Please try again.';
    document.getElementById('acctBody').innerHTML = '';
    return;
  }
  const t = d.totals || {};
  callRows = d.rows || [];
  document.getElementById('acctSum').innerHTML = `<b>${count(t.rows)}</b> calls · ${count(t.customers)} customers` +
    (num(t.new_sales) || num(t.renewal_sales) ? ` · <b>${count(t.new_sales)}</b> new sales, ${count(t.renewal_sales)} renewals · ${money(t.revenue)} a month` : '') +
    (num(t.lost_sales) ? ` · <b>${count(t.lost_sales)}</b> lost sales` : '') +
    (d.truncated ? ` <span class="muted">(the latest ${count(callRows.length)} are listed and exported)</span>` : '');
  const outcome = r => {
    const tags = [];
    if (r.Sales_Category) tags.push(`<span class="xp-tag ok">${hEsc(r.Sales_Category)}</span>`);
    if (r.Lost_Sale_Driver) tags.push(`<span class="xp-tag bad">${hEsc(r.Lost_Sale_Driver)}: ${hEsc(r.Lost_Sale_Reason)}</span>`);
    if (flag(r.Jarvis_Error_Flag)) tags.push(`<span class="xp-tag warn">Jarvis: ${hEsc(r.Jarvis_Error_Type)}${num(r.Jarvis_Ticket_Resolution_Days) ? `, ${count(r.Jarvis_Ticket_Resolution_Days)} days` : ''}</span>`);
    if (r.Cross_Sell_Outcome && r.Cross_Sell_Outcome !== 'N/A') tags.push(`<span class="xp-tag ${r.Cross_Sell_Outcome === 'Sold' ? 'ok' : r.Cross_Sell_Outcome === 'Not attempted' ? 'warn' : ''}">Cross-sell ${hEsc(r.Cross_Sell_Outcome.toLowerCase())}</span>`);
    if (flag(r.Callback_Promised_Flag)) tags.push('<span class="xp-tag">callback promised</span>');
    return tags.join(' ');
  };
  document.getElementById('acctBody').innerHTML = `<table class="nice"><thead><tr><th>Call</th><th>When</th><th>Consultant · team</th><th>Customer</th><th>Reason</th><th>Result</th><th>Revenue</th><th>FCR</th><th>Handle time</th></tr></thead>
    <tbody>${callRows.map(r => `<tr><td class="mono">${hEsc(r.Call_ID)}</td><td>${hEsc(String(r.Call_Start || '').slice(0, 16))}</td>
      <td class="mono">${hEsc(r.Agent_ID)} <span class="muted">· ${hEsc(r.Team_Lead)} · ${hEsc(r.Tenure_Band)}</span></td>
      <td class="mono">${hEsc(r.Customer_ID)} <span class="muted">· ${hEsc(r.State)}</span></td>
      <td>${hEsc(r.Call_Reason)}${r.Call_Direction !== 'Inbound' ? ' <span class="muted">· callback</span>' : ''}</td>
      <td><b>${hEsc(r.Call_Result)}</b> ${outcome(r)}${r.Transfer_Destination ? ` <span class="muted">→ ${hEsc(r.Transfer_Destination)}${String(r.Transfer_Valid_Flag) === '0' ? ' (avoidable)' : ''}</span>` : ''}</td>
      <td>${num(r.Monthly_Revenue) ? money(r.Monthly_Revenue) : '<span class="muted">—</span>'}</td>
      <td>${hEsc(r.FCR_Outcome)}${r.Repeat_Timeline ? ` <span class="muted">${hEsc(r.Repeat_Timeline)}</span>` : ''}</td>
      <td>${secs(r.Handle_Time_Seconds)}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('acctCsv').disabled = !callRows.length;
  document.getElementById('acctCsv').onclick = () => {
    const cols = ['Call_ID', 'Call_Start', 'Month', 'Agent_ID', 'Team_Lead', 'Tenure_Band', 'Customer_ID', 'Customer_Type', 'State', 'Call_Direction',
      'Call_Reason', 'Call_Result', 'Sales_Category', 'New_Sales', 'Renewal_Sales', 'Monthly_Revenue', 'Lost_Sale_Driver', 'Lost_Sale_Reason',
      'Jarvis_Error_Flag', 'Jarvis_Error_Type', 'Jarvis_Ticket_Resolution_Days', 'Cross_Sell_Product', 'Cross_Sell_Outcome', 'Transfer_Destination',
      'Transfer_Valid_Flag', 'FCR_Outcome', 'Repeat_Timeline', 'Callback_Promised_Flag', 'Handle_Time_Seconds'];
    const cell = v => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [`# ${title}: ${rule || ''}`, cols.join(','), ...callRows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${file || 'lenss-optus-telesales-calls'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
}
window.showAccountList = showCallList;
document.getElementById('acctClose').addEventListener('click', () => document.getElementById('acctDialog').close());
document.getElementById('acctDialog').addEventListener('click', (e) => { if (e.target.id === 'acctDialog') e.target.close(); });
document.getElementById('tab-home').addEventListener('click', (e) => {
  const b = e.target.closest('[data-accounts]');
  if (b) openCalls(b.dataset.accounts, b.dataset.value, b.dataset.title);
});

// The story bar follows the reader: the chapter in view is highlighted.
if (window.IntersectionObserver) {
  const links = [...document.querySelectorAll('.story-nav a')];
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const id = e.target.id === 'homeHero' || e.target.id === 'ch1b' ? 'ch1' : e.target.id;
    links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  ['homeHero', 'ch1b', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
}

loadHome().catch(err => {
  console.error('Command Center failed to load', err);
  document.getElementById('heroSub').textContent = 'Some figures could not be loaded. Please refresh the page.';
});
