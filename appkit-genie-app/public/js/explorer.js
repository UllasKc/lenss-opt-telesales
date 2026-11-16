// ---------------------------------------------------------------- Explorer
// The "why" behind the Command Center. Filters (month, team, product, call reason, sales category,
// tenure, state, customer type, call direction, call result, lost-sale driver, FCR outcome) slice one
// governed view (gold.qry_calls) with the same formulas as the Command Center, so with the last full
// month and no other filter every figure reconciles to it. Layer 1 is a dimension × measure slicer
// (click a bar to drill into it), then a heatmap of any two dimensions, sales and FCR outcomes by the
// dimension, lost sales and the monthly trend of the view, then the call records behind the numbers.
// Every panel can hand its question, scoped to the current filters, to LensS. Uses the helpers in home.js.

(function setupExplorer() {
  const FILTERS = [
    ['month', 'Month', 'All months'],
    ['team', 'Team lead', 'All teams'],
    ['product', 'Product interest', 'All products'],
    ['reason', 'Call reason', 'All reasons'],
    ['category', 'Sales category', 'All'],
    ['tenure', 'Consultant tenure', 'All'],
    ['state', 'State', 'All states'],
    ['customer', 'Customer type', 'All'],
    ['direction', 'Call direction', 'All'],
    ['result', 'Call result', 'All results'],
    ['driver', 'Lost-sale driver', 'All'],
    ['fcr', 'FCR outcome', 'All'],
  ];
  const DIM_LABEL = Object.fromEntries(FILTERS.map(([k, l]) => [k, l]));
  const SLICE_DIMS = FILTERS.map(([k]) => k).filter(k => k !== 'month');
  const MEASURES = {
    new_conversion: { label: 'New sales conversion', fmt: v => pct(v), rate: true, good: true },
    sale_conversion: { label: 'Calls that closed a sale', fmt: v => pct(v), rate: true, good: true },
    renewal_conversion: { label: 'Renewals conversion', fmt: v => pct(v), rate: true, good: true },
    new_sales: { label: 'New sales', fmt: v => count(v), rate: false },
    revenue: { label: 'Plan revenue sold (a month)', fmt: v => money(v), rate: false },
    lost_rate: { label: 'Lost sales (share of calls)', fmt: v => pct(v), rate: true, good: false },
    lost_sales: { label: 'Lost sales', fmt: v => count(v), rate: false },
    jarvis_lost: { label: 'Sales stopped by Jarvis', fmt: v => count(v), rate: false },
    fcr_rate: { label: 'First contact resolution (FCR)', fmt: v => pct(v), rate: true, good: true },
    transfer_rate: { label: 'Transferred', fmt: v => pct(v), rate: true, good: false },
    repeat_rate: { label: 'Called again within 14 days', fmt: v => pct(v), rate: true, good: false },
    xsell_attempt_rate: { label: 'Cross-sell offered', fmt: v => pct(v), rate: true, good: true },
    avg_handle: { label: 'Average handle time', fmt: v => secs(v), rate: true, good: false },
    calls: { label: 'Calls', fmt: v => count(v), rate: false },
  };
  const PAGE = 12;

  const state = { filters: {}, dim: 'reason', measure: 'sale_conversion', view: 'bars', data: null, options: null,
    search: '', sort: 'recent', page: 0, seq: 0, started: false };
  try {
    const saved = JSON.parse(localStorage.getItem('lenss.optus.telesales.explorer') || '{}');
    if (saved && typeof saved === 'object') Object.assign(state, { filters: saved.filters || {}, dim: saved.dim || 'reason', measure: saved.measure || 'sale_conversion' });
  } catch { /* ignore */ }
  if (!MEASURES[state.measure]) state.measure = 'sale_conversion';
  if (!SLICE_DIMS.includes(state.dim)) state.dim = 'reason';
  const remember = () => { try { localStorage.setItem('lenss.optus.telesales.explorer', JSON.stringify({ filters: state.filters, dim: state.dim, measure: state.measure })); } catch { /* ignore */ } };

  /** "for Mobile, NSW, 2026-10": the current filters in words, for questions and notes. */
  function scopeText() {
    return FILTERS.filter(([k]) => state.filters[k]).map(([k]) => (k === 'team' ? `${state.filters[k]}'s team`
      : k === 'driver' ? `lost-sale driver "${state.filters[k]}"` : k === 'result' ? `call result "${state.filters[k]}"`
        : k === 'month' ? monthLabel(state.filters[k]) : state.filters[k])).join(', ');
  }
  const scoped = (q) => { const sc = scopeText(); return sc ? `${q.replace(/\?$/, '')} (for ${sc})?` : q; };
  const ask = (q, mode = 'agent') => ({ q: scoped(q), mode });
  const periodText = () => (state.filters.month ? monthLabel(state.filters.month) : 'all months');

  /**
   * "View" on any chart item: the calls behind it, in the same window as the Command Center.
   * `seg` is the item's own filter (e.g. { team: 'Katrina Uy' }) or a stage; the current filters still apply.
   */
  const xpView = (seg, title, label = 'View') =>
    `<button class="view-btn sm" data-xpview="${hEsc(JSON.stringify(seg))}" data-title="${hEsc(title)}">${hEsc(label)}</button>`;
  const STAGE_RULE = {
    sale: 'the call closed a sale', new_sale: 'a new sale was made', renewal: 'a renewal was made', no_sale: 'no sale',
    lost: 'a customer who wanted to buy didn\'t', jarvis: 'a Jarvis error happened', jarvis_lost: 'a Jarvis error stopped the sale',
    fcr: 'resolved first time', not_fcr: 'not resolved first time', transferred: 'the call was transferred', avoidable: 'the transfer was avoidable',
    repeat: 'the customer called again within 14 days', xsell_missed: 'a cross-sell was not offered', xsell_opportunity: 'there was a cross-sell opportunity',
  };
  document.getElementById('tab-explorer').addEventListener('click', (e) => {
    const b = e.target.closest('[data-xpview]');
    if (!b || !window.showAccountList) return;
    e.stopPropagation();
    const seg = JSON.parse(b.dataset.xpview);
    const merged = { ...state.filters, ...seg };
    const qs = Object.entries(merged).filter(([, v]) => v).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const words = [
      ...FILTERS.filter(([k]) => merged[k]).map(([k, l]) => `${l}: ${merged[k]}`),
      merged.stage ? `where ${STAGE_RULE[merged.stage] || merged.stage}` : '',
    ].filter(Boolean);
    window.showAccountList({
      url: '/api/explorer/calls' + (qs ? '?' + qs : ''), title: b.dataset.title,
      rule: words.length ? words.join(' · ') : 'Every call',
      file: 'lenss-optus-telesales-explorer-' + (Object.values(seg).join('-').replace(/\W+/g, '-').toLowerCase() || 'calls'),
    });
  });

  // ---- filters
  function buildSelects() {
    const o = state.options?.dims || {};
    document.getElementById('xpSelects').innerHTML = FILTERS.map(([k, label, all]) => `
      <div class="field"><label for="xpf-${k}">${hEsc(label)}</label>
        <select id="xpf-${k}" data-f="${k}"><option value="">${hEsc(all)}</option>
          ${(o[k] || []).map(v => `<option value="${hEsc(v)}"${state.filters[k] === v ? ' selected' : ''}>${hEsc(k === 'month' ? monthLabel(v) : v)}</option>`).join('')}
        </select></div>`).join('');
  }
  function setFilter(k, v) {
    if (v) state.filters[k] = v; else delete state.filters[k];
    state.page = 0;
    remember();
    buildSelects();
    load();
  }
  document.getElementById('tab-explorer').addEventListener('change', (e) => {
    const el = e.target.closest('[data-f]');
    if (el && el.tagName === 'SELECT') setFilter(el.dataset.f, el.value);
  });
  /** Reset keeps the current month, so the page reconciles to the Command Center. */
  const resetFilters = () => { state.filters = state.options?.latestMonth ? { month: state.options.latestMonth } : {}; };
  document.getElementById('xpReset').addEventListener('click', () => { resetFilters(); state.page = 0; state.search = ''; remember(); buildSelects(); load(); });
  document.getElementById('xpExport').addEventListener('click', exportCsv);

  function renderChips() {
    const chips = FILTERS.filter(([k]) => state.filters[k]).map(([k, l]) => [k, `${l}: ${k === 'month' ? monthLabel(state.filters[k]) : state.filters[k]}`]);
    document.getElementById('xpChips').innerHTML = chips.length
      ? chips.map(([k, t]) => `<button class="xp-chip" data-clear="${k}" title="Remove this filter">${hEsc(t)} <span aria-hidden="true">×</span></button>`).join('')
        + `<button class="ask-link" data-ask="${hEsc(scoped('Why does conversion differ here from the rest of the operation, and what should we do?'))}" data-mode="agent">${icon('spark', 'ico-xs')}Ask LensS about this view</button>`
      : '<span class="muted">No filters: every call in the data. Pick a filter, or click any bar below to drill in.</span>';
    document.querySelectorAll('#xpChips [data-clear]').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.clear, '')));
  }

  // ---- load
  async function load() {
    const my = ++state.seq;
    renderChips();
    document.getElementById('tab-explorer').classList.add('xp-loading');
    const qs = new URLSearchParams(Object.entries(state.filters).filter(([, v]) => v)).toString();
    try {
      const r = await fetch('/api/explorer/data' + (qs ? '?' + qs : ''));
      const d = await r.json();
      if (my !== state.seq) return;
      if (!r.ok) throw new Error(d.error || r.statusText);
      state.data = d;
      render();
    } catch (err) {
      if (my !== state.seq) return;
      console.error('Explorer failed to load', err);
      document.getElementById('xpMatch').textContent = 'Could not load. Please try again.';
      if (/Unknown /.test(String(err.message))) { resetFilters(); remember(); buildSelects(); }
    } finally {
      if (my === state.seq) document.getElementById('tab-explorer').classList.remove('xp-loading');
    }
  }

  function render() {
    const d = state.data;
    const t = d.totals || {};
    const b = d.book || {};
    const others = Object.keys(d.applied || {}).some(k => k !== 'month');
    document.getElementById('xpMatch').innerHTML = `${count(t.calls)} calls${others ? ` of ${count(b.calls)}` : ''} · ${hEsc(periodText())}` +
      ` · ${count(t.new_sales)} new sales (${pct(t.new_conversion)})`;
    const steps = [renderKpis, renderSlicer, renderSales, renderMix, renderLost, renderTrend, renderCallsTable];
    steps.forEach(fn => { try { fn(d); } catch (err) { console.error('Explorer panel failed', fn.name, err); } });
    loadHeat();
  }

  // ---- filtered headline measures, compared with the whole operation in the same period
  function renderKpis(d) {
    const t = d.totals || {};
    const b = d.book || {};
    const others = Object.keys(d.applied || {}).some(k => k !== 'month');
    const delta = (key, good) => {
      if (!others || num(t[key]) === null || num(b[key]) === null) return '';
      const diff = num(t[key]) - num(b[key]);
      const shown = key === 'avg_handle' ? secs(b[key]) : pct(b[key]);
      const better = good ? diff > 0 : diff < 0;
      return `<span class="xk-d ${Math.abs(diff) < 1e-9 ? '' : better ? 'up' : 'down'}">all calls ${shown}</span>`;
    };
    const share = (key) => (others && num(b[key]) ? `<span class="xk-d">${pct(num(t[key]) / num(b[key]), 1)} of all</span>` : '');
    const tiles = [
      ['Calls', count(t.calls), share('calls')],
      ['New sales', count(t.new_sales), `<span class="xk-d">${count(t.renewal_sales)} renewals</span>`],
      ['New sales conversion', pct(t.new_conversion), delta('new_conversion', true)],
      ['Calls that closed a sale', pct(t.sale_conversion), delta('sale_conversion', true)],
      ['Plan revenue sold', money(t.revenue), `<span class="xk-d">${money(t.first_year_revenue)} first year</span>`],
      ['Lost sales', count(t.lost_sales), `<span class="xk-d">${count(t.jarvis_lost)} to Jarvis</span>`],
      ['FCR', pct(t.fcr_rate), delta('fcr_rate', true)],
      ['Transferred', pct(t.transfer_rate), delta('transfer_rate', false)],
      ['Cross-sell offered', pct(t.xsell_attempt_rate), delta('xsell_attempt_rate', true)],
      ['Average handle time', secs(t.avg_handle), delta('avg_handle', false)],
    ];
    document.getElementById('xpKpis').innerHTML = tiles.map(([l, v, sub]) => `<div class="xk"><div class="xk-l">${l}</div><div class="xk-v">${v}</div>${sub || ''}</div>`).join('');
  }

  // ---- Layer 1: dimension × measure slicer
  function renderSlicer(d) {
    const el = document.getElementById('xpSlicer');
    const rows = (d.by[state.dim] || []).slice();
    const m = MEASURES[state.measure];
    const pv = (d.totals || {})[state.measure];
    const ordered = rows.some(r => r.ord !== null && r.ord !== undefined && r.ord !== 'NULL');
    if (!ordered) rows.sort((a, b) => num(b[state.measure]) - num(a[state.measure]));
    const max = Math.max(...rows.map(r => num(r[state.measure]) || 0), m.rate && num(pv) ? num(pv) : 0, 1e-9);
    const drillable = !state.filters[state.dim];
    const label = r => r.k;
    const toneOf = (v) => {
      if (!m.rate || m.good === undefined || num(pv) === null) return 'brand';
      const better = m.good ? v > num(pv) * 1.05 : v < num(pv) * 0.95;
      const worse = m.good ? v < num(pv) * 0.95 : v > num(pv) * 1.05;
      return better ? 'good' : worse ? 'bad' : 'brand';
    };
    const bars = rows.map(r => {
      const v = num(r[state.measure]) || 0;
      return `<button class="xs-row${drillable ? '' : ' static'}" ${drillable ? `data-drill="${hEsc(r.k)}" title="Filter to ${hEsc(label(r))}"` : ''}>
        <div class="xs-top"><span class="xs-name">${hEsc(label(r))}</span>
          <span class="xs-meta">${count(r.calls)} calls · ${count(r.new_sales)} new sales · ${pct(r.sale_conversion, 1)} sold · ${pct(r.fcr_rate, 0)} FCR</span>
          <b class="xs-val">${m.fmt(r[state.measure])}</b></div>
        <div class="hbar-track">${m.rate && num(pv) !== null ? `<span class="hbar-marker" style="left:${Math.min(100, (num(pv) / max) * 100).toFixed(1)}%" title="This view: ${m.fmt(pv)}"></span>` : ''}<span class="hbar-fill t-${toneOf(v)}" style="width:${Math.max(0.5, (v / max) * 100).toFixed(1)}%"></span></div>
      </button>`;
    }).join('');
    const table = `<div class="table-scroll flat"><table class="nice"><thead><tr><th>${hEsc(DIM_LABEL[state.dim])}</th><th>Calls</th><th>New sales</th><th>New conv.</th><th>Sold</th><th>Revenue</th><th>Lost</th><th>Jarvis</th><th>FCR</th><th>Transferred</th><th>Cross-sell offered</th><th>Handle time</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${hEsc(label(r))}</td><td>${count(r.calls)}</td><td>${count(r.new_sales)}</td><td>${pct(r.new_conversion)}</td><td>${pct(r.sale_conversion)}</td><td>${money(r.revenue)}</td><td>${count(r.lost_sales)}</td><td>${count(r.jarvis_lost)}</td><td>${pct(r.fcr_rate)}</td><td>${pct(r.transfer_rate)}</td><td>${pct(r.xsell_attempt_rate, 0)}</td><td>${secs(r.avg_handle)}</td><td>${xpView({ [state.dim]: r.k }, `${label(r)}: calls`)}</td></tr>`).join('')}</tbody></table></div>`;
    const best = rows.length ? rows.reduce((a, r) => (num(r[state.measure]) > num(a[state.measure]) ? r : a)) : null;
    const worst = rows.length ? rows.reduce((a, r) => (num(r[state.measure]) < num(a[state.measure]) ? r : a)) : null;
    el.innerHTML = `<div class="panel-head"><div><div class="xs-kicker">Layer 1 · dimension &amp; measure · ${hEsc(periodText())}</div><h3>Analytical exploration workspace</h3>
        <div class="panel-sub">${best && worst && rows.length > 1 ? `${hEsc(m.label)}: highest <b>${hEsc(label(best))}</b> (${m.fmt(best[state.measure])}), lowest <b>${hEsc(label(worst))}</b> (${m.fmt(worst[state.measure])})${m.rate && num(pv) !== null ? ` · this view ${m.fmt(pv)} (marker)` : ''}.` : ''}</div></div>
      <div class="xs-ctl">
        <label>Dimension <select id="xsDim">${SLICE_DIMS.map(k => `<option value="${k}"${k === state.dim ? ' selected' : ''}>${hEsc(DIM_LABEL[k])}</option>`).join('')}</select></label>
        <label>Measure <select id="xsMeasure">${Object.entries(MEASURES).map(([k, v]) => `<option value="${k}"${k === state.measure ? ' selected' : ''}>${hEsc(v.label)}</option>`).join('')}</select></label>
        <div class="seg-ctl xs-view"><button data-v="bars" class="${state.view === 'bars' ? 'on' : ''}" title="Bars">Bars</button><button data-v="table" class="${state.view === 'table' ? 'on' : ''}" title="Table">Table</button></div>
        ${askBtn(scoped(`Compare ${m.label.toLowerCase()} by ${DIM_LABEL[state.dim].toLowerCase()} and explain what drives the differences`), 'agent')}
      </div></div>
      <div class="panel-body">${rows.length ? (state.view === 'table' ? table : `<div class="xs-list">${bars}</div>`) : '<div class="empty-note">No calls match these filters.</div>'}
      ${rows.length && state.view === 'bars' ? `<div class="panel-note">${m.rate && m.good !== undefined ? 'Green: more than 5% better than this view (the marker); red: more than 5% worse. ' : ''}Conversion is over handled calls; FCR, transfers and repeats over answered calls. ${drillable && rows.length > 1 ? 'Click a bar to filter everything on this page to it.' : ''}</div>` : ''}</div>`;
    el.querySelector('#xsDim').addEventListener('change', e => { state.dim = e.target.value; remember(); renderSlicer(state.data); renderSales(state.data); renderMix(state.data); });
    el.querySelector('#xsMeasure').addEventListener('change', e => { state.measure = e.target.value; remember(); renderSlicer(state.data); });
    el.querySelectorAll('.xs-view button').forEach(b => b.addEventListener('click', () => { state.view = b.dataset.v; renderSlicer(state.data); }));
    el.querySelectorAll('[data-drill]').forEach(b => b.addEventListener('click', () => setFilter(state.dim, b.dataset.drill)));
  }

  // ---- charts (Chart.js, loaded before the app); one instance per canvas, replaced on redraw
  const charts = {};
  function chartIn(id, cfg) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    const cv = document.getElementById(id);
    if (window.Chart && cv) charts[id] = new Chart(cv, cfg);
  }
  const stacked = (fmt, max) => ({
    indexAxis: 'y', maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.x)}` } } },
    scales: { x: { stacked: true, ...(max ? { max } : {}), ticks: { callback: v => fmt(v) } }, y: { stacked: true } },
  });
  /** Rows of the slicer's dimension, in its natural order (or the most calls first). */
  const dimRows = (d) => {
    const rows = (d.by[state.dim] || []).slice();
    if (!rows.some(r => r.ord !== null && r.ord !== undefined && r.ord !== 'NULL')) rows.sort((a, b) => num(b.calls) - num(a.calls));
    return rows.slice(0, 16);
  };

  // ---- new sales and renewals, as conversion of the calls, by the slicer's dimension
  function renderSales(d) {
    const rows = dimRows(d);
    const t = d.totals || {};
    panel('xpMoney', `Sales by ${DIM_LABEL[state.dim].toLowerCase()}`,
      `${hEsc(periodText())}: ${count(t.new_sales)} new sales and ${count(t.renewal_sales)} renewals from ${count(t.calls)} calls, ${money(t.revenue)} a month in plan revenue`,
      ask(`Where do we convert best and worst, by ${DIM_LABEL[state.dim].toLowerCase()}`, 'chat'),
      rows.length ? '<div class="xp-chart"><canvas id="xpMoneyChart" role="img" aria-label="New sales and renewals conversion"></canvas></div><div class="panel-note">Each bar: new sales and renewals ÷ handled calls, stacked.</div>' : '<div class="empty-note">No calls in this view.</div>');
    chartIn('xpMoneyChart', {
      type: 'bar',
      data: { labels: rows.map(r => r.k), datasets: [
        { label: 'New sales', data: rows.map(r => num(r.new_conversion) || 0), backgroundColor: '#0B6E99' },
        { label: 'Renewals', data: rows.map(r => num(r.renewal_conversion) || 0), backgroundColor: '#0E8F80' },
      ] },
      options: stacked(v => pct(v, 1)),
    });
  }

  // ---- FCR outcomes, by the slicer's dimension: shares of answered calls (adding up to 100%), as in the Concentrix slide
  function renderMix(d) {
    const rows = dimRows(d).filter(r => num(r.answered) > 0);
    const t = d.totals || {};
    const names = [['Achieved', 'fcr_achieved', '#0E8F80'], ['Repeat', 'fcr_repeat', '#D97706'], ['Transfer', 'fcr_transfer', '#0B6E99'], ['Transfer & repeat', 'fcr_both', '#DC2626']];
    panel('xpMix', `FCR outcomes by ${DIM_LABEL[state.dim].toLowerCase()}`,
      `${hEsc(periodText())}: ${pct(t.fcr_rate)} of ${count(t.answered)} answered calls resolved first time; the four add up to 100%.`,
      ask(`Compare first contact resolution, repeats and transfers by ${DIM_LABEL[state.dim].toLowerCase()}`, 'chat'),
      rows.length ? '<div class="xp-chart"><canvas id="xpMixChart" role="img" aria-label="FCR outcomes of answered calls"></canvas></div><div class="panel-note">Calls in the last 14 days of the data are unlocked: repeats can still arrive, so their FCR will fall.</div>' : '<div class="empty-note">No answered calls in this view.</div>');
    chartIn('xpMixChart', {
      type: 'bar',
      data: { labels: rows.map(r => r.k), datasets: names.map(([l, k, c]) => ({ label: l, data: rows.map(r => num(r[k]) || 0), backgroundColor: c })) },
      options: stacked(v => pct(v, 0), 1),
    });
  }

  // ---- why: lost sales by driver in this view
  function renderLost(d) {
    const rows = (d.by.driver || []).filter(r => r.k !== 'Not a lost sale');
    const t = d.totals || {};
    const max = Math.max(...rows.map(r => num(r.calls) || 0), 1) * 1.05;
    const tone = { Customer: 'warn', People: 'bad', System: 'bad' };
    panel('xpOutcome', 'Lost sales by driver', `${hEsc(periodText())}: ${count(t.lost_sales)} customers who wanted to buy didn't (${pct(t.lost_rate)} of calls)`,
      ask('Break down lost sales by driver and reason, and which ones we can fix ourselves', 'agent'),
      rows.length ? rows.sort((a, b) => num(b.calls) - num(a.calls)).map(r => bar(hEsc(r.k), num(r.calls), max, `${count(r.calls)} · ${pct(num(r.calls) / num(t.lost_sales), 0)}`, tone[r.k] || 'brand',
        `${count(r.jarvis_lost)} with a Jarvis error ${xpView({ driver: r.k }, `Lost sales: ${r.k}`)}`)).join('') +
        '<div class="panel-note">A lost sale: the customer intended to buy and it didn\'t close for a reason we could have fixed (People or System). Customer reasons (failed credit check, ID, port-in account number, price) are not counted.</div>' : '<div class="empty-note">No lost sales in this view.</div>');
  }

  // ---- the monthly trend of this view (every filter but the month)
  function renderTrend(d) {
    const rows = d.trend || [];
    const keys = [['new_conversion', 'New conv.', v => pct(v, 1)], ['sale_conversion', 'Sold', v => pct(v, 1)], ['lost_rate', 'Lost', v => pct(v, 1)], ['fcr_rate', 'FCR', v => pct(v, 0)], ['xsell_attempt_rate', 'Cross-sell', v => pct(v, 0)]];
    const body = `<div class="table-scroll flat"><table class="mini"><thead><tr><th>Month</th><th>Calls</th><th>New sales</th>${keys.map(([, l]) => `<th>${l}</th>`).join('')}<th></th></tr></thead><tbody>
      ${rows.map(r => `<tr${state.filters.month === r.k ? ' class="hl"' : ''}><td>${hEsc(monthLabel(r.k))}${String(r.partial) === '1' ? ' <span class="muted">(to date)</span>' : ''}</td><td>${count(r.calls)}</td><td>${count(r.new_sales)}</td>${keys.map(([k, , f]) => `<td>${f(r[k])}</td>`).join('')}
        <td>${xpView({ month: r.k }, `${monthLabel(r.k)}: calls`)}</td></tr>`).join('')}</tbody></table></div>`;
    panel('xpTrend', 'Monthly trend of this view', 'Every filter except the month; the selected month is highlighted',
      ask('How have new sales conversion and lost sales changed month by month', 'chat'),
      '<div class="xp-chart short"><canvas id="xpTrendChart" role="img" aria-label="Conversion and lost sales by month"></canvas></div>' + body);
    const colors = ['#0B6E99', '#0E8F80', '#DC2626'];
    chartIn('xpTrendChart', {
      type: 'line',
      data: { labels: rows.map(r => monthLabel(r.k).replace(' 20', ' ’')), datasets: keys.slice(0, 3).map(([k, l], i) => ({ label: l, data: rows.map(r => num(r[k])), borderColor: colors[i], backgroundColor: colors[i], tension: .3, pointRadius: 2 })) },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${pct(c.parsed.y)}` } } },
        scales: { y: { min: 0, ticks: { callback: v => pct(v, 0) } } } },
    });
  }

  // ---- two dimensions at once: team by product (or any pair), coloured against this view
  const HEAT_MEASURES = {
    sale_conversion: { label: 'Calls that closed a sale', good: true, base: 'calls', unit: 'calls', band: 0.01, stage: 'sale' },
    new_conversion: { label: 'New sales conversion', good: true, base: 'calls', unit: 'calls', band: 0.005, stage: 'new_sale' },
    lost_rate: { label: 'Lost sales (share of calls)', good: false, base: 'calls', unit: 'calls', band: 0.01, stage: 'lost' },
    fcr_rate: { label: 'First contact resolution (FCR)', good: true, base: 'answered', unit: 'answered calls', band: 0.03, stage: 'not_fcr' },
    transfer_rate: { label: 'Transferred', good: false, base: 'answered', unit: 'answered calls', band: 0.03, stage: 'transferred' },
    xsell_attempt_rate: { label: 'Cross-sell offered', good: true, base: 'xsell_opportunities', unit: 'opportunities', band: 0.05, stage: 'xsell_missed' },
    revenue: { label: 'Plan revenue sold', amount: true, stage: 'sale' },
  };
  const HEAT_DIMS = [...SLICE_DIMS, 'month'];
  const heat = { rows: 'team', cols: 'product', measure: 'sale_conversion', seq: 0, data: null };
  try {
    const h = JSON.parse(localStorage.getItem('lenss.optus.telesales.heat') || '{}');
    if (HEAT_DIMS.includes(h.rows) && HEAT_DIMS.includes(h.cols) && h.rows !== h.cols) Object.assign(heat, { rows: h.rows, cols: h.cols });
    if (HEAT_MEASURES[h.measure]) heat.measure = h.measure;
  } catch { /* ignore */ }
  const rememberHeat = () => { try { localStorage.setItem('lenss.optus.telesales.heat', JSON.stringify({ rows: heat.rows, cols: heat.cols, measure: heat.measure })); } catch { /* ignore */ } };

  async function loadHeat() {
    const my = ++heat.seq;
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(state.filters).filter(([, v]) => v)), rows: heat.rows, cols: heat.cols }).toString();
    try {
      const r = await fetch('/api/explorer/grid?' + qs);
      const d = await r.json();
      if (my !== heat.seq) return;
      if (!r.ok) throw new Error(d.error || r.statusText);
      heat.data = d;
      renderHeat();
    } catch (err) {
      if (my !== heat.seq) return;
      console.error('Explorer heatmap failed', err);
      panel('xpHeat', 'Two dimensions at once', 'Could not load. Please try again.', null, '');
    }
  }

  function renderHeat() {
    const cells = heat.data?.cells || [];
    const m = HEAT_MEASURES[heat.measure];
    const overall = num((state.data?.totals || {})[heat.measure]);
    const minN = 100;   // business rule min_segment_calls: fewer calls than this are faded
    const axis = (key, ordKey) => {
      const seen = new Map();
      cells.forEach(c => { if (!seen.has(c[key])) seen.set(c[key], num(c[ordKey])); });
      return [...seen.entries()].sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0) || String(a[0]).localeCompare(String(b[0]))).map(([k]) => k);
    };
    const at = new Map(cells.map(c => [`${c.r}|${c.c}`, c]));
    const has = (c) => c && num(c[heat.measure]) !== null;
    const C0 = axis('c', 'c_ord'), R0 = axis('r', 'r_ord');
    const R = R0.filter(rk => C0.some(ck => has(at.get(`${rk}|${ck}`))));
    const C = C0.filter(ck => R.some(rk => has(at.get(`${rk}|${ck}`))));
    const label = (dim, k) => (dim === 'month' ? monthLabel(k).replace(' 20', ' ’') : k);
    const maxAmt = Math.max(...cells.map(c => num(c.revenue) || 0), 1);
    const tone = (v) => {
      if (m.amount || overall === null) return 'brand';
      const diff = v - overall;
      if (Math.abs(diff) < m.band) return 'brand';
      return (m.good ? diff > 0 : diff < 0) ? 'good' : 'bad';
    };
    const cellHtml = (rk, ck) => {
      const c = at.get(`${rk}|${ck}`);
      const v = c ? num(c[heat.measure]) : null;
      if (!c || v === null) return '<div class="heat-c empty">—<small>none</small></div>';
      const n = m.amount ? num(c.new_sales) + num(c.renewal_sales) : num(c[m.base]);
      const few = num(c.calls) < minN;
      const shown = m.amount ? money(v) : pct(v, m.band < 0.01 ? 1 : 0);
      const sub = m.amount ? `${count(n)} sales` : `${count(n)} ${m.unit}`;
      const style = m.amount ? ` style="opacity:${(0.35 + 0.65 * v / maxAmt).toFixed(2)}"` : '';
      const where = `${label(heat.rows, rk)} · ${label(heat.cols, ck)}`;
      return `<button class="heat-c t-${tone(v)}${few ? ' few' : ''}"${style} data-xpview="${hEsc(JSON.stringify({ [heat.rows]: rk, [heat.cols]: ck, stage: m.stage }))}" data-title="${hEsc(where)}"
        title="${hEsc(`${where}: ${m.label.toLowerCase()} ${shown}, ${sub}${few ? ` (fewer than ${minN} calls: read with care)` : ''}. Click to see the calls.`)}">${shown}<small>${sub}</small></button>`;
    };
    const opts = (cur, other) => HEAT_DIMS.filter(k => k !== other).map(k => `<option value="${k}"${k === cur ? ' selected' : ''}>${hEsc(DIM_LABEL[k])}</option>`).join('');
    const bandTxt = m.amount ? '' : `${(m.band * 100).toFixed(m.band < 0.01 ? 1 : 0)}`;
    const legend = m.amount ? '<span class="t-brand">Darker is more revenue</span>'
      : `<span class="t-bad">Worse than this view by ${bandTxt}+ percentage points</span><span class="t-brand">Within ${bandTxt} points of this view (${pct(overall)})</span><span class="t-good">Better by ${bandTxt}+ points</span>`;
    const body = R.length && C.length
      ? `<div class="table-scroll flat"><div class="heat xp-heat" style="--cols:${C.length};min-width:${130 + C.length * 72}px">
          <div></div>${C.map(ck => `<div class="heat-h">${hEsc(label(heat.cols, ck))}</div>`).join('')}
          ${R.map(rk => `<div class="heat-r">${hEsc(label(heat.rows, rk))}</div>${C.map(ck => cellHtml(rk, ck)).join('')}`).join('')}
        </div></div>
        <div class="heat-legend">${legend}<span class="plain">faded: fewer than ${minN} calls · click a cell to see its calls</span></div>`
      : '<div class="empty-note">No calls match these filters.</div>';
    panel('xpHeat', `${m.label} by ${DIM_LABEL[heat.rows].toLowerCase()} and ${DIM_LABEL[heat.cols].toLowerCase()}`,
      `${hEsc(periodText())}${scopeText() ? `, ${hEsc(scopeText())}` : ''}. Each cell is coloured against this view's overall figure.`,
      ask(`Where is the ${m.label.toLowerCase()} worst by ${DIM_LABEL[heat.rows].toLowerCase()} and ${DIM_LABEL[heat.cols].toLowerCase()}, and what should we do about it`, 'agent'),
      `<div class="xs-ctl xh-ctl">
         <label>Rows <select id="xhRows">${opts(heat.rows, heat.cols)}</select></label>
         <label>Columns <select id="xhCols">${opts(heat.cols, heat.rows)}</select></label>
         <label>Measure <select id="xhMeasure">${Object.entries(HEAT_MEASURES).map(([k, v]) => `<option value="${k}"${k === heat.measure ? ' selected' : ''}>${hEsc(v.label)}</option>`).join('')}</select></label>
       </div>` + body);
    const el = document.getElementById('xpHeat');
    el.querySelector('#xhRows').addEventListener('change', e => { heat.rows = e.target.value; rememberHeat(); loadHeat(); });
    el.querySelector('#xhCols').addEventListener('change', e => { heat.cols = e.target.value; rememberHeat(); loadHeat(); });
    el.querySelector('#xhMeasure').addEventListener('change', e => { heat.measure = e.target.value; rememberHeat(); renderHeat(); });
  }

  // ---- Layer 2: call records
  const SORTS = {
    recent: ['Most recent first', r => -new Date(String(r.Call_Start || '').replace(' ', 'T')).getTime()],
    revenue: ['Revenue sold', r => -(num(r.Monthly_Revenue) || 0)],
    handle: ['Handle time', r => -(num(r.Handle_Time_Seconds) || 0)],
    lost: ['Lost sales first', r => (r.Lost_Sale_Driver ? 0 : 1)],
  };
  function callRowsFiltered() {
    const q = state.search.trim().toLowerCase();
    const rows = (state.data?.calls || []).filter(r => !q || [r.Call_ID, r.Agent_ID, r.Team_Lead, r.Customer_ID, r.Call_Reason, r.Call_Result, r.Sales_Category, r.Lost_Sale_Reason, r.State]
      .some(v => String(v || '').toLowerCase().includes(q)));
    const key = SORTS[state.sort][1];
    return rows.sort((a, b) => key(a) - key(b));
  }
  function renderCallsTable(d) {
    const el = document.getElementById('xpAccounts');
    const all = callRowsFiltered();
    const pages = Math.max(1, Math.ceil(all.length / PAGE));
    state.page = Math.min(state.page, pages - 1);
    const rows = all.slice(state.page * PAGE, state.page * PAGE + PAGE);
    const total = num((d.totals || {}).calls) || 0;
    const searchHad = document.activeElement && document.activeElement.id === 'xpSearch';
    const tagFor = r => (r.Sales_Category ? `<span class="xp-tag ok">${hEsc(r.Sales_Category)}</span>`
      : r.Lost_Sale_Driver ? `<span class="xp-tag bad">${hEsc(r.Lost_Sale_Driver)}: ${hEsc(r.Lost_Sale_Reason)}</span>`
      : r.Customer_No_Sale_Reason ? `<span class="xp-tag warn">Customer reason: ${hEsc(r.Customer_No_Sale_Reason)}</span>` : '');
    el.innerHTML = `<div class="panel-head"><div><div class="xs-kicker">Layer 2 · call records</div><h3>Calls behind the numbers</h3>
        <div class="panel-sub">${all.length < (d.calls || []).length ? `${count(all.length)} of ` : ''}${count((d.calls || []).length)} calls, sales and lost sales first${total > (d.calls || []).length ? ` (of ${count(total)} in this view)` : ''}</div></div>
      <div class="xs-ctl">
        <input type="search" id="xpSearch" placeholder="Search call, consultant, customer, reason, result" value="${hEsc(state.search)}" aria-label="Search calls">
        <label>Sort <select id="xpSort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${k === state.sort ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div></div>
      <div class="panel-body"><div class="table-scroll flat"><table class="nice xp-acc">
        <thead><tr><th>Call</th><th>When</th><th>Consultant · team</th><th>Reason</th><th>Result</th><th>Revenue</th><th>FCR</th><th></th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td class="mono">${hEsc(r.Call_ID)}</td><td>${hEsc(String(r.Call_Start || '').slice(0, 16))}</td>
          <td class="mono">${hEsc(r.Agent_ID)} <span class="muted">· ${hEsc(r.Team_Lead)}</span></td>
          <td>${hEsc(r.Call_Reason)}</td><td><b>${hEsc(r.Call_Result)}</b> ${tagFor(r)}${String(r.Jarvis_Error_Flag) === '1' ? ' <span class="xp-tag warn">Jarvis</span>' : ''}</td>
          <td>${num(r.Monthly_Revenue) ? money(r.Monthly_Revenue) : '<span class="muted">—</span>'}</td><td>${hEsc(r.FCR_Outcome)}</td>
          <td><button class="ask-link" data-ask="${hEsc(`Tell me about call ${r.Call_ID}: what the customer wanted, how it went, and what the consultant could have done differently.`)}" data-mode="chat">${icon('spark', 'ico-xs')}Ask LensS</button></td></tr>`).join('')
          || '<tr><td colspan="8" class="empty-note">No calls match.</td></tr>'}</tbody></table></div>
        <div class="xp-pager"><span>Showing ${all.length ? state.page * PAGE + 1 : 0} to ${Math.min(all.length, (state.page + 1) * PAGE)} of ${count(all.length)}</span>
          <span><button class="btn ghost" id="xpPrev" ${state.page ? '' : 'disabled'} aria-label="Previous page">‹</button> Page ${state.page + 1} of ${pages} <button class="btn ghost" id="xpNext" ${state.page < pages - 1 ? '' : 'disabled'} aria-label="Next page">›</button></span></div>
      </div>`;
    const s = el.querySelector('#xpSearch');
    s.addEventListener('input', () => { state.search = s.value; state.page = 0; renderCallsTable(state.data); });
    if (searchHad) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    el.querySelector('#xpSort').addEventListener('change', e => { state.sort = e.target.value; state.page = 0; renderCallsTable(state.data); });
    el.querySelector('#xpPrev').addEventListener('click', () => { state.page--; renderCallsTable(state.data); });
    el.querySelector('#xpNext').addEventListener('click', () => { state.page++; renderCallsTable(state.data); });
  }

  function exportCsv() {
    const rows = callRowsFiltered();
    if (!rows.length) return;
    const cols = ['Call_ID', 'Call_Start', 'Month', 'Agent_ID', 'Team_Lead', 'Tenure_Band', 'Customer_ID', 'Customer_Type', 'State', 'Call_Direction',
      'Call_Reason', 'Call_Result', 'Sales_Category', 'New_Sales', 'Renewal_Sales', 'Monthly_Revenue', 'Lost_Sale_Driver', 'Lost_Sale_Reason', 'Customer_No_Sale_Reason',
      'Jarvis_Error_Flag', 'Jarvis_Error_Type', 'Cross_Sell_Outcome', 'Transfer_Destination', 'Transfer_Valid_Flag', 'FCR_Outcome', 'Handle_Time_Seconds'];
    const cell = v => { const x = String(v ?? ''); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
    const sc = scopeText();
    const csv = [`# LensS Telesales Explorer for Optus, ${periodText()}${sc ? `, filters: ${sc}` : ''}`, cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `lenss-optus-telesales-explorer-calls${state.filters.month ? '-' + state.filters.month.replace(/\W+/g, '-').toLowerCase() : ''}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---- first open
  window.loadExplorer = async function loadExplorer() {
    if (state.started) return;
    state.started = true;
    document.querySelectorAll('#tab-explorer .panel').forEach(p => { if (!p.innerHTML.trim()) p.innerHTML = '<div class="skel skel-h"></div><div class="skel"></div><div class="skel"></div><div class="skel short"></div>'; });
    try {
      const r = await fetch('/api/explorer/options');
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      state.options = await r.json();
      for (const k of Object.keys(state.filters)) {
        if (!DIM_LABEL[k] || !(state.options.dims[k] || []).includes(state.filters[k])) delete state.filters[k];
      }
      // First visit: the current month to date, so the Explorer opens on the same figures as the Command Center.
      let firstVisit = true;
      try { firstVisit = !localStorage.getItem('lenss.optus.telesales.explorer'); } catch { /* storage blocked: treat as a first visit */ }
      if (firstVisit && state.options.latestMonth) state.filters.month = state.options.latestMonth;
    } catch (err) {
      console.error('Explorer options failed', err);
      document.getElementById('xpMatch').textContent = 'The Explorer view is not available yet. Run the deploy\'s transform step.';
      state.started = false;
      return;
    }
    buildSelects();
    load();
  };
  /** Open the Explorer filtered to one value (used by the Command Center). */
  window.exploreBy = (k, v) => { state.filters = v ? { [k]: v } : {}; remember(); if (state.started) { buildSelects(); load(); } window.showTab && window.showTab('explorer'); };
})();
