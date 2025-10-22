(function () {
  const DEFAULT_TOL_MINUTES = 180; // internal heuristic window

  const form = document.getElementById('osint-form');
  const resultsInfo = document.getElementById('resultsInfo');
  const results = document.getElementById('results');

  // Simplified inputs
  const reportedTimeInput = document.getElementById('reportedTime');
  const advancedMode = document.getElementById('advancedMode');
  const observedWrap = document.getElementById('observedWrap');
  const observedInput = document.getElementById('observed');
  const useNowBtn = document.getElementById('useNow');

  // Visual clock elements
  const clockPicker = document.getElementById('clockPicker');
  const clockCanvas = document.getElementById('clockCanvas');
  const clockReadout = document.getElementById('clockReadout');
  const clockToolbar = clockPicker ? clockPicker.querySelector('.clock-toolbar') : null;
  let clockMode = 'minute'; // 'minute' or 'hour'
  let timeH = null;
  let timeM = null;

  function pad(n) { return String(n).padStart(2, '0'); }

  function setReported(h, m) {
    timeH = ((h % 24) + 24) % 24;
    timeM = ((m % 60) + 60) % 60;
    if (reportedTimeInput) reportedTimeInput.value = `${pad(timeH)}:${pad(timeM)}`;
    if (clockReadout) clockReadout.textContent = `${pad(timeH)}:${pad(timeM)}`;
    drawClock();
  }

  function syncFromInput() {
    if (!reportedTimeInput) return;
    const v = reportedTimeInput.value;
    if (!v) {
      const now = new Date();
      setReported(now.getHours(), now.getMinutes());
      return;
    }
    const [hh, mm] = v.split(':').map(s => parseInt(s, 10));
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) setReported(hh, mm);
  }

  function drawClock() {
    if (!clockCanvas) return;
    const ctx = clockCanvas.getContext('2d');
    const w = clockCanvas.width;
    const h = clockCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, w, h);

    // Face
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = '#0e1626';
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Minute ticks (60)
    for (let i = 0; i < 60; i++) {
      const angleDeg = i * 6; // from top
      const rad = (angleDeg - 90) * Math.PI / 180;
      const r1 = R - 8;
      const r2 = i % 5 === 0 ? R - 16 : R - 12;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(rad), cy + r1 * Math.sin(rad));
      ctx.lineTo(cx + r2 * Math.cos(rad), cy + r2 * Math.sin(rad));
      ctx.strokeStyle = i % 5 === 0 ? '#7dd3fc' : '#334155';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // Hour ticks (24)
    for (let i = 0; i < 24; i++) {
      const angleDeg = i * 15;
      const rad = (angleDeg - 90) * Math.PI / 180;
      const r1 = R - 20;
      const r2 = R - 30;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(rad), cy + r1 * Math.sin(rad));
      ctx.lineTo(cx + r2 * Math.cos(rad), cy + r2 * Math.sin(rad));
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Hands
    const minDeg = timeM * 6;
    const hrDeg = timeH * 15 + (timeM / 60) * 15; // 24-hour

    // Minute hand
    let rad = (minDeg - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (R - 32) * Math.cos(rad), cy + (R - 32) * Math.sin(rad));
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hour hand
    rad = (hrDeg - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (R - 60) * Math.cos(rad), cy + (R - 60) * Math.sin(rad));
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }

  function setFromPointerEvent(e) {
    if (!clockCanvas) return;
    const rect = clockCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = clockCanvas.width / 2;
    const cy = clockCanvas.height / 2;
    let deg = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    if (clockMode === 'minute') {
      const m = Math.round(deg / 6) % 60;
      setReported(timeH ?? 0, m);
    } else {
      const h = Math.round(deg / 15) % 24;
      setReported(h, timeM ?? 0);
    }
  }

  if (clockToolbar) {
    clockToolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      for (const b of clockToolbar.querySelectorAll('.chip')) b.classList.remove('selected');
      btn.classList.add('selected');
      clockMode = btn.dataset.mode === 'hour' ? 'hour' : 'minute';
    });
  }

  if (clockCanvas) {
    let dragging = false;
    clockCanvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      clockCanvas.setPointerCapture(e.pointerId);
      setFromPointerEvent(e);
    });
    clockCanvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setFromPointerEvent(e);
    });
    clockCanvas.addEventListener('pointerup', () => {
      dragging = false;
    });
    // Initialize from input or now
    syncFromInput();
    reportedTimeInput.addEventListener('input', syncFromInput);
  }


  // Context chips
  const chipsWrap = document.getElementById('contextChips');
  const customTimeWrap = document.getElementById('customTimeWrap');
  const customTimeInput = document.getElementById('customTime');
  let selectedContext = 'none';

  // Results filters
  const filterText = document.getElementById('filterText');
  const onlyExact = document.getElementById('onlyExact');

  // Results pagination
  const resultsPager = document.getElementById('resultsPager');
  const RESULTS_PAGE_SIZE = 10;
  let resultsPage = 1;
  let resultsData = [];

  // All timezones panel
  const tzFilter = document.getElementById('tzFilter');
  const allTz = document.getElementById('allTz');
  const ALL_ZONES = moment.tz.names().filter((z) => !z.startsWith('Etc/') && z !== 'Factory');
  const tzPager = document.getElementById('tzPager');
  const TZ_PAGE_SIZE = 10;
  let tzPage = 1;
  let tzZones = ALL_ZONES.slice();

  // UI wiring
  function setAdvancedUI() {
    const isAdvanced = advancedMode.checked;
    observedWrap.classList.toggle('hidden', !isAdvanced);
    observedInput.required = isAdvanced;
  }
  setAdvancedUI();
  advancedMode.addEventListener('change', setAdvancedUI);

  chipsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    for (const b of chipsWrap.querySelectorAll('.chip')) b.classList.remove('selected');
    btn.classList.add('selected');
    selectedContext = btn.dataset.value;
    customTimeWrap.classList.toggle('hidden', selectedContext !== 'custom');
  });

  useNowBtn.addEventListener('click', () => {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const hh = pad2(now.getHours());
    const min = pad2(now.getMinutes());
    reportedTimeInput.value = `${hh}:${min}`;
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    observedInput.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    // Keep clock in sync
    syncFromInput();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    analyze();
  });

  // Re-render results when filters change
  filterText.addEventListener('input', () => { analyze(); });
  onlyExact.addEventListener('change', () => { analyze(); });

  function analyze() {
    results.innerHTML = '';

    let usedDefLabel = '';
    let contextDef = null;

    // Build input definition
    let defFromInput = null;
    const rt = reportedTimeInput.value;
    if (!rt) { alert('Please enter the reported time (HH:MM).'); return; }
    const [rh, rm] = rt.split(':').map((s) => parseInt(s, 10));
    if (Number.isNaN(rh) || Number.isNaN(rm)) { alert('Invalid reported time.'); return; }
    defFromInput = { type: 'fixed', target: rh * 60 + rm, label: `Reported time now (${rt})` };
    usedDefLabel = defFromInput.label;

    let observedUtc = moment.utc(moment());

    if (advancedMode.checked) {
      const observedStr = observedInput.value;
      if (!observedStr) { alert('Please provide an observed datetime.'); return; }
      const localObserved = moment(observedStr.replace('T', ' '));
      observedUtc = moment.utc(localObserved);
      usedDefLabel += ` • Observed (local): ${localObserved.format('YYYY-MM-DD HH:mm')}`;
    }

    // Determine context
    contextDef = getContextDefinition(selectedContext, customTimeInput.value) || defFromInput;

    const scored = ALL_ZONES.map((zone) => {
      const local = moment(observedUtc).tz(zone);
      const localMinutes = local.hours() * 60 + local.minutes();
      const score = scoreForContext(contextDef, localMinutes, DEFAULT_TOL_MINUTES);
      const offset = local.format('Z');
      return {
        zone,
        localTime: local.format('YYYY-MM-DD HH:mm'),
        offset,
        score: Math.round(score),
        exact: Math.round(score) === 100,
      };
    }).filter(r => r.score > 0);

    // Apply simple filters
    const q = (filterText.value || '').trim().toLowerCase();
    let filtered = scored;
    if (q) {
      filtered = filtered.filter(r => r.zone.toLowerCase().includes(q) || prettifyZone(r.zone).toLowerCase().includes(q));
    }
    if (onlyExact.checked) filtered = filtered.filter(r => r.exact);

    filtered.sort((a, b) => b.score - a.score);
    resultsData = filtered;
    resultsPage = 1;

    resultsInfo.textContent = `${usedDefLabel} • Context: ${contextDef.label}`;
    drawResults();
  }

  function renderResultItem(item) {
    const wrap = document.createElement('div');
    wrap.className = 'result-item';

    const zoneEl = document.createElement('div');
    zoneEl.className = 'zone';
    zoneEl.textContent = prettifyZone(item.zone);

    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.textContent = `${item.localTime} (UTC${item.offset})${item.exact ? ' • Exact match' : ''}`;

    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress-wrap';

    const bar = document.createElement('div');
    bar.className = 'progress-bar';

    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.width = `${item.score}%`;

    const pct = document.createElement('div');
    pct.className = 'percent';
    pct.textContent = `${item.score}%`;

    bar.appendChild(fill);
    progressWrap.appendChild(bar);
    progressWrap.appendChild(pct);

    wrap.appendChild(zoneEl);
    wrap.appendChild(metaEl);
    wrap.appendChild(progressWrap);

    results.appendChild(wrap);
  }

  // Paginated results rendering
  function drawResults() {
    results.innerHTML = '';
    const total = resultsData.length;
    if (total === 0) {
      const el = document.createElement('div');
      el.className = 'muted';
      el.textContent = 'No matches found within the analysis window.';
      results.appendChild(el);
      renderResultsPager(total);
      return;
    }
    const maxPage = Math.ceil(total / RESULTS_PAGE_SIZE);
    resultsPage = Math.min(Math.max(1, resultsPage), maxPage);
    const start = (resultsPage - 1) * RESULTS_PAGE_SIZE;
    const end = Math.min(start + RESULTS_PAGE_SIZE, total);
    for (let i = start; i < end; i++) renderResultItem(resultsData[i]);
    renderResultsPager(total);
  }

  function renderResultsPager(total) {
    if (!resultsPager) return;
    resultsPager.innerHTML = '';
    if (total <= RESULTS_PAGE_SIZE) return;
    const maxPage = Math.ceil(total / RESULTS_PAGE_SIZE);
    const info = document.createElement('div');
    info.className = 'pager-info';
    info.textContent = `Page ${resultsPage} of ${maxPage}`;
    const prev = document.createElement('button');
    prev.className = `btn ${resultsPage <= 1 ? 'disabled' : ''}`;
    prev.textContent = 'Prev';
    prev.dataset.action = 'prev';
    const next = document.createElement('button');
    next.className = `btn ${resultsPage >= maxPage ? 'disabled' : ''}`;
    next.textContent = 'Next';
    next.dataset.action = 'next';
    resultsPager.appendChild(info);
    resultsPager.appendChild(prev);
    resultsPager.appendChild(next);
  }

  if (resultsPager) {
    resultsPager.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const maxPage = Math.ceil((resultsData.length || 0) / RESULTS_PAGE_SIZE);
      if (action === 'prev' && resultsPage > 1) {
        resultsPage -= 1;
        drawResults();
      } else if (action === 'next' && resultsPage < maxPage) {
        resultsPage += 1;
        drawResults();
      }
    });
  }

  function prettifyZone(zone) {
    const parts = zone.split('/');
    const area = parts[0];
    const city = parts.slice(1).join(' / ');
    const cleanCity = city.replace(/_/g, ' ');
    const cleanArea = area.replace(/_/g, ' ');
    if (!cleanCity) return cleanArea;
    return `${cleanCity}, ${cleanArea}`;
  }

  function getContextDefinition(ctx, custom) {
    switch (ctx) {
      case 'none':
        return null; // fall back to input definition
      case '9am':
        return { type: 'fixed', target: 9 * 60, label: 'Around 9 AM' };
      case 'noon':
        return { type: 'fixed', target: 12 * 60, label: 'Around Noon (12 PM)' };
      case '9pm':
        return { type: 'fixed', target: 21 * 60, label: 'Around 9 PM' };
      case 'sleep':
        return { type: 'range', start: 22 * 60, end: 24 * 60 + 30, center: 23 * 60 + 15, label: 'About to Sleep (10 PM–12:30 AM)' };
      case 'custom': {
        if (!custom) return null;
        const [hh, mm] = custom.split(':').map((s) => parseInt(s, 10));
        if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
        return { type: 'fixed', target: hh * 60 + mm, label: `Custom (${custom})` };
      }
      default:
        return null;
    }
  }

  function scoreForContext(def, localMinutes, tolerance) {
    localMinutes = ((localMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);

    if (!def) return 0;

    if (def.type === 'fixed') {
      const diff = Math.min(
        Math.abs(localMinutes - def.target),
        Math.abs(localMinutes + 24 * 60 - def.target),
        Math.abs(def.target + 24 * 60 - localMinutes)
      );
      if (diff >= tolerance) return 0;
      const score = ((tolerance - diff) / tolerance) * 100;
      return Math.max(0, Math.min(100, score));
    }

    if (def.type === 'range') {
      const inRange = inRangeWrap(localMinutes, def.start, def.end);
      if (!inRange) {
        const nearestEdge = nearestEdgeWrap(localMinutes, def.start, def.end);
        const diffToEdge = wrapDiff(localMinutes, nearestEdge);
        if (diffToEdge >= tolerance) return 0;
        return ((tolerance - diffToEdge) / tolerance) * 100;
      }
      const diffCenter = wrapDiff(localMinutes, def.center);
      const halfTol = Math.max(30, Math.min(tolerance, 120));
      const score = ((halfTol - Math.min(diffCenter, halfTol)) / halfTol) * 100;
      return Math.max(0, Math.min(100, score));
    }

    return 0;
  }

  function inRangeWrap(x, start, end) {
    if (end >= 24 * 60) {
      return x >= start || x <= (end - 24 * 60);
    }
    return x >= start && x <= end;
  }

  function nearestEdgeWrap(x, start, end) {
    const e = end % (24 * 60);
    const dStart = wrapDiff(x, start);
    const dEnd = wrapDiff(x, e);
    return dStart <= dEnd ? start : e;
  }

  function wrapDiff(a, b) {
    const M = 24 * 60;
    const diff = Math.abs(a - b);
    return Math.min(diff, M - diff);
  }

  // All Timezones rendering
  function renderAllTimezones() {
    const q = (tzFilter.value || '').trim().toLowerCase();
    tzZones = !q ? ALL_ZONES : ALL_ZONES.filter(z => z.toLowerCase().includes(q));
    tzPage = 1;
    drawAllTimezones();
  }

  function drawAllTimezones() {
    allTz.innerHTML = '';
    const total = tzZones.length;
    const maxPage = Math.ceil(total / TZ_PAGE_SIZE) || 1;
    tzPage = Math.min(Math.max(1, tzPage), maxPage);
    const start = (tzPage - 1) * TZ_PAGE_SIZE;
    const end = Math.min(start + TZ_PAGE_SIZE, total);
    for (let i = start; i < end; i++) {
      const tz = tzZones[i];
      const nowLocal = moment().tz(tz);
      const card = document.createElement('div');
      card.className = 'tz-item';
      const name = document.createElement('div');
      name.className = 'tz-name';
      name.textContent = prettifyZone(tz);
      const time = document.createElement('div');
      time.className = 'tz-time';
      time.textContent = `${nowLocal.format('YYYY-MM-DD HH:mm')} (UTC${nowLocal.format('Z')})`;
      card.appendChild(name);
      card.appendChild(time);
      allTz.appendChild(card);
    }
    renderTzPager(total);
  }

  function renderTzPager(total) {
    if (!tzPager) return;
    tzPager.innerHTML = '';
    if (total <= TZ_PAGE_SIZE) return;
    const maxPage = Math.ceil(total / TZ_PAGE_SIZE);
    const info = document.createElement('div');
    info.className = 'pager-info';
    info.textContent = `Page ${tzPage} of ${maxPage}`;
    const prev = document.createElement('button');
    prev.className = `btn ${tzPage <= 1 ? 'disabled' : ''}`;
    prev.textContent = 'Prev';
    prev.dataset.action = 'prev';
    const next = document.createElement('button');
    next.className = `btn ${tzPage >= maxPage ? 'disabled' : ''}`;
    next.textContent = 'Next';
    next.dataset.action = 'next';
    tzPager.appendChild(info);
    tzPager.appendChild(prev);
    tzPager.appendChild(next);
  }

  function refreshAllTimezonesTimes() {
    const total = tzZones.length;
    const start = (tzPage - 1) * TZ_PAGE_SIZE;
    const end = Math.min(start + TZ_PAGE_SIZE, total);
    const children = allTz.children;
    for (let i = start, j = 0; i < end && j < children.length; i++, j++) {
      const tz = tzZones[i];
      const nowLocal = moment().tz(tz);
      const timeEl = children[j].querySelector('.tz-time');
      if (timeEl) timeEl.textContent = `${nowLocal.format('YYYY-MM-DD HH:mm')} (UTC${nowLocal.format('Z')})`;
    }
  }

  tzFilter.addEventListener('input', () => {
    tzPage = 1;
    renderAllTimezones();
  });

  if (tzPager) {
    tzPager.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const maxPage = Math.ceil((tzZones.length || 0) / TZ_PAGE_SIZE);
      if (action === 'prev' && tzPage > 1) {
        tzPage -= 1;
        drawAllTimezones();
      } else if (action === 'next' && tzPage < maxPage) {
        tzPage += 1;
        drawAllTimezones();
      }
    });
  }

  renderAllTimezones();
  setInterval(refreshAllTimezonesTimes, 60000);
})();