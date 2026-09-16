import { renderStories } from './story-view.js';
import { names, colors, partyKey, partyName, numeric, selectedArea, partiesFor, comparison, filterParties, areaMetrics, selectionTotal, csvCell, blockResults, allocateSeats, mandateMargins, seatUncertainty } from './model.js';

const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('sv-SE');
const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const changeDecimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const exactPartyDecimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const clock = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });
const fmt = value => value == null || (typeof value === 'number' && !Number.isFinite(value)) ? '—' : typeof value === 'number' ? number.format(value) : value;
const pct = value => value == null ? '—' : `${decimal.format(value)} %`;
const deltaText = value => value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${decimal.format(Math.abs(value))}`;
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; }
// Flashing is only armed around renders triggered by genuinely new data (a live
// refresh or a replay step), never by view-only re-renders (area/sort/filter changes),
// so switching context never falsely flashes numbers that merely differ by context.
let flashEnabled = false;
const previousValues = new Map();
function flash(node) { if (!node) return; node.classList.remove('value-flash'); void node.offsetWidth; node.classList.add('value-flash'); }
function flashed(key, value) { const previous = previousValues.get(key); previousValues.set(key, value); return flashEnabled && previous != null && previous !== value; }
function withFlash(fn) { flashEnabled = true; try { fn(); } finally { flashEnabled = false; } }
const FLASH_IDS = new Set(['header-districts', 'header-total', 'header-progress-pct', 'header-gap', 'districts', 'district-total', 'votes', 'turnout', 'eligible', 'blank', 'unregistered', 'other-invalid', 'invalid-total', 'valid-votes', 'invalid-previous', 'turnout-previous', 'counted-eligible', 'block-gap', 'block-other', 'region-count', 'completion-count', 'leader', 'mover', 'selection-share']);
function set(id, value) {
  const node = $(id);
  // A partially loaded/older document should not abort the live refresh.
  // Optional widgets can be absent while the core result table still works.
  if (!node) return;
  if (flashEnabled && FLASH_IDS.has(id) && node.dataset.flashSeen && node.textContent !== value) flash(node);
  node.textContent = value;
  node.dataset.flashSeen = '1';
}
function badge(p) { const node = element('span', 'party-badge', partyKey(p)); node.style.setProperty('--party-color', colors[partyKey(p)] || '#92958c'); return node; }
const initial = new URLSearchParams(location.search);
let area = initial.get('area') || '', selected = (initial.get('parties') || '').split(',').filter(Boolean);
const REFRESH_INTERVAL_MS = 30000, COUNTDOWN_RING_CIRCUMFERENCE = 2 * Math.PI * 9;
let data, liveData, busy = false, nextRefresh = Date.now() + REFRESH_INTERVAL_MS, liveOK = false;
let history = [], replayIndex = -1, replayMode = false, playbackTimer, snapshotRequest = 0, playing = false;
let geography = [], regionsLive = [], trends = [], trendsArea = null, trendRequest = 0;
let trendWindowDistricts = 500;
let initialSnapshot = initial.get('snapshot'), restoringSnapshot = false;
const snapshotCache = new Map();
const expandedParties = new Set();
const partyHistorySelections = new Map();
const view = () => selectedArea(data, area);
const scopeName = () => area || 'Hela riket';
function currentParties() { return filterParties(partiesFor(view()), { selected, query: $('party-search').value, threshold: $('threshold-filter').value }); }
function compare(p) { return comparison(p, data, $('comparison').value, data?.jamforbar !== false && view()?.jamforbar !== false); }
function saveURL() {
  const params = new URLSearchParams();
  if (area) params.set('area', area);
  if (selected.length) params.set('parties', selected.join(','));
  if ($('comparison').value !== 'previous') params.set('compare', $('comparison').value);
  if ($('sort').value !== 'votes') params.set('sort', $('sort').value);
  if ($('party-search').value) params.set('q', $('party-search').value);
  if ($('threshold-filter').value !== 'all') params.set('threshold', $('threshold-filter').value);
  if ($('details-toggle').checked) params.set('details', '1');
  if (replayMode && history[replayIndex]) params.set('snapshot', history[replayIndex].id);
  window.history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
}
function renderFilters() {
  const regions = [...new Set([...geography.map(r => r.name), ...(liveData?.valkretsar || []).map(r => r.namn), ...(data?.valkretsar || []).map(r => r.namn), ...history.flatMap(h => h.regions || []), ...(area ? [area] : [])])].sort((a, b) => a.localeCompare(b, 'sv'));
  const options = [new Option('Hela riket', ''), ...regions.map(name => new Option(name, name))];
  $('area').replaceChildren(...options); $('area').value = area;
  const available = partiesFor(data).length ? partiesFor(data) : Object.keys(names).map(key => ({ partiforkortning: key }));
  const filterKey = JSON.stringify(available.map(p => [partyKey(p), partyName(p)]));
  if ($('party-filters').dataset.key !== filterKey) {
    $('party-filters').dataset.key = filterKey;
    $('party-filters').replaceChildren(...available.map(p => {
      const key = partyKey(p), button = element('button', 'party-chip', key);
      button.type = 'button'; button.dataset.party = key; button.title = partyName(p); button.setAttribute('aria-label', partyName(p)); button.style.setProperty('--party-color', colors[key] || '#92958c');
      button.addEventListener('click', () => { selected = selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]; render(); saveURL(); });
      return button;
    }));
    const previous = $('region-party').value;
    $('region-party').replaceChildren(new Option('Största parti', ''), ...available.map(p => new Option(partyName(p), partyKey(p))));
    $('region-party').value = previous;
  }
  for (const button of $('party-filters').children) { const active = selected.includes(button.dataset.party); button.setAttribute('aria-pressed', String(active)); button.classList.toggle('selected', active); }
  set('filter-summary', `${selected.length ? selected.join(' + ') : 'Alla partier'} · ${scopeName()}`);
  set('scope-label', scopeName().toLocaleUpperCase('sv-SE')); set('result-scope', scopeName().toLocaleUpperCase('sv-SE')); set('trend-scope', scopeName());
  const code = geography.find(region => region.name === area)?.code;
  $('area-source').href = `https://resultat.val.se/val2026/RD${code ? `/${code}` : ''}?r=P`;
  $('area-source').hidden = Boolean(area && !code);
}
function renderParties() {
  const current = view(), parties = currentParties();
  const headerRow = document.querySelector('#results-table thead tr');
  if (headerRow) {
    // Keep the table schema in sync with the row cells. The static HTML has
    // legacy comparison columns, so normalize their order once before rows
    // are rendered: current share, change vs baseline, change since update,
    // current votes, then the optional 2022 details.
    if (headerRow.dataset.schema !== 'v2') {
      const partyHeading = element('th'); partyHeading.scope = 'col'; partyHeading.textContent = 'PARTI';
      const chartHeading = element('th', 'chart-heading'); chartHeading.scope = 'col'; chartHeading.append(document.createTextNode('RÖSTANDEL ')); chartHeading.append(element('span', '', '4 % riksdagsspärr'));
      const currentHeading = element('th', 'numeric', '2026'); currentHeading.scope = 'col';
      const changeHeading = element('th', 'numeric'); changeHeading.id = 'delta-heading'; changeHeading.scope = 'col'; changeHeading.textContent = 'FÖRÄNDRING';
      const updateHeading = element('th', 'numeric update-column', 'SEDAN SENAST'); updateHeading.id = 'update-heading'; updateHeading.scope = 'col';
      const votesHeading = element('th', 'numeric vote-column', 'RÖSTER'); votesHeading.scope = 'col';
      const previousShareHeading = element('th', 'numeric extra-column', '2022 %'); previousShareHeading.scope = 'col';
      const previousVotesHeading = element('th', 'numeric extra-column', 'RÖSTER 2022'); previousVotesHeading.scope = 'col';
      headerRow.replaceChildren(partyHeading, chartHeading, currentHeading, changeHeading, updateHeading, votesHeading, previousShareHeading, previousVotesHeading);
      headerRow.dataset.schema = 'v2';
    }
  }
  const currentId = history[replayMode ? replayIndex : history.length - 1]?.id, currentTrendIndex = trends.findIndex(point => point.id === currentId), previousTrend = currentTrendIndex > 0 ? trends[currentTrendIndex - 1] : null, currentTrend = currentTrendIndex >= 0 ? trends[currentTrendIndex] : null;
  parties.sort((a, b) => $('sort').value === 'name' ? partyName(a).localeCompare(partyName(b), 'sv') : $('sort').value === 'change' ? (compare(b).delta ?? -Infinity) - (compare(a).delta ?? -Infinity) : b.antalRoster - a.antalRoster);
  const validVotes = numeric(current?.rosterPaverkaMandat?.antalRoster);
  const max = Math.max(35, ...partiesFor(current).flatMap(p => [p.andelRoster || 0, compare(p).share || 0]));
  const mode = $('comparison').value;
  $('baseline-legend').hidden = mode === 'none'; set('baseline-label', mode === 'national' ? 'Hela riket 2026' : 'Valet 2022');
  set('comparison-note', mode === 'none' ? 'Röstandel av områdets giltiga röster' : `Skillnad i procentenheter mot ${mode === 'national' ? 'hela riket vid samma tidpunkt' : 'valet 2022'}`);
  set('delta-heading', mode === 'national' ? 'MOT RIKET' : 'FÖRÄNDRING');
  set('threshold-caption', area ? '4 % referens' : '4 % riksdagsspärr');
  $('results-table').classList.toggle('expanded-table', $('details-toggle').checked);
  set('result-count', `${parties.length} av ${partiesFor(current).length} partier`);
  $('parties').replaceChildren(...parties.flatMap(p => {
    const row = element('tr', 'party-row'); row.dataset.party = partyKey(p); row.style.setProperty('--party-color', colors[partyKey(p)] || '#92958c');
    const nameCell = element('th'); nameCell.scope = 'row'; nameCell.setAttribute('aria-label', partyName(p));
    const key = partyKey(p), expanded = expandedParties.has(key), panelId = `party-history-${encodeURIComponent(key)}`;
    const toggle = element('button', 'party-expand'); toggle.type = 'button'; toggle.dataset.party = key;
    toggle.setAttribute('aria-expanded', String(expanded)); toggle.setAttribute('aria-label', `${expanded ? 'Dölj' : 'Visa'} kvällens utveckling för ${partyName(p)}`);
    if (expanded) toggle.setAttribute('aria-controls', panelId);
    const chevron = element('span', 'party-chevron', expanded ? '−' : '+'); chevron.setAttribute('aria-hidden', 'true');
    toggle.append(badge(p), element('span', 'party-name', partyName(p)), chevron); nameCell.append(toggle);
    const toggleExpanded = () => {
      if (expandedParties.has(key)) expandedParties.delete(key); else expandedParties.add(key);
      renderParties();
      [...$('parties').querySelectorAll('.party-expand')].find(button => button.dataset.party === key)?.focus({ preventScroll: true });
    };
    toggle.addEventListener('click', toggleExpanded);
    row.addEventListener('click', event => { if (!event.target.closest('button')) toggleExpanded(); });
    const baseline = compare(p), chart = element('td', 'bar-cell');
    chart.setAttribute('aria-label', `${mode === 'national' ? 'Hela riket' : '2022'}: ${pct(baseline.share)}`);
    const track = element('div', 'bar-track');
    for (const [className, value] of [['bar-previous', baseline.share], ['bar-current', p.andelRoster]]) {
      const bar = element('div', className); bar.style.width = `${Math.max(0, value || 0) / max * 100}%`; track.append(bar);
    }
    const threshold = element('span', 'threshold'); threshold.style.left = `${4 / max * 100}%`; track.append(threshold); chart.append(track);
    const shareText = pct(p.andelRoster);
    const share = element('td', `numeric share${flashed(`party:${key}:share`, shareText) ? ' value-flash' : ''}`, shareText);
    const change = element('td', 'numeric'), delta = baseline.delta;
    const changeText = `${delta > 0 ? '↗ ' : delta < 0 ? '↘ ' : ''}${deltaText(delta)}`;
    change.append(element('span', `change ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}${flashed(`party:${key}:change`, changeText) ? ' value-flash' : ''}`, changeText));
    const updateDelta = currentTrend && previousTrend && currentTrend.shares?.[key] != null && previousTrend.shares?.[key] != null ? currentTrend.shares[key] - previousTrend.shares[key] : null;
    const voteDelta = currentTrend && previousTrend && currentTrend.votes?.[key] != null && previousTrend.votes?.[key] != null ? currentTrend.votes[key] - previousTrend.votes[key] : null;
    const updateText = voteDelta == null ? '—' : `${voteDelta > 0 ? '↗ +' : voteDelta < 0 ? '↘ −' : '→ '}${fmt(Math.abs(voteDelta))}`;
    const updateCell = element('td', 'numeric update-column'); updateCell.append(element('span', `change ${voteDelta > 0 ? 'positive' : voteDelta < 0 ? 'negative' : 'neutral'}${flashed(`party:${key}:update`, updateText) ? ' value-flash' : ''}`, updateText));
    const partyVotes = numeric(p.antalRoster);
    const exactShare = validVotes > 0 && Number.isFinite(partyVotes) ? partyVotes / validVotes * 100 : null;
    const votesText = fmt(p.antalRoster);
    const voteCell = element('td', 'numeric vote-column'); voteCell.append(element('span', flashed(`party:${key}:votes`, votesText) ? 'value-flash' : '', votesText), element('small', 'exact-party-share', exactShare == null ? '—' : `${exactPartyDecimal.format(exactShare)} %`));
    row.append(nameCell, chart, share, change, updateCell, voteCell, element('td', 'numeric extra-column', pct(p.andelRosterForegaendeVal)), element('td', 'numeric extra-column', fmt(p.antalRosterForegaendeVal)));
    if (!expanded) return [row];
    const detailRow = element('tr', 'party-history-row'), cell = element('td'); cell.colSpan = 8;
    const panel = element('section', 'party-history-panel'); panel.id = panelId; panel.dataset.party = key; panel.setAttribute('aria-label', `${partyName(p)} under valnatten`);
    renderPartyHistory(panel, p); cell.append(panel); detailRow.append(cell); return [row, detailRow];
  }));
  if (!parties.length) { const row = element('tr'), cell = element('td', 'loading', !current ? 'Det finns inget sparat resultat för detta område vid den här tidpunkten.' : 'Inga partier matchar filtren. Prova att ändra ditt urval.'); cell.colSpan = 8; row.append(cell); $('parties').append(row); }
  $('export-csv').disabled = !parties.length;
}
function refreshPartyHistories(failed = false) {
  for (const panel of $('parties').querySelectorAll('.party-history-panel')) {
    const party = partiesFor(view()).find(p => partyKey(p) === panel.dataset.party);
    if (party) renderPartyHistory(panel, party, failed);
  }
}
function renderPartyHistory(panel, party, failed = false) {
  const key = partyKey(party), currentEntry = history[replayMode ? replayIndex : history.length - 1];
  panel.replaceChildren();
  const heading = element('div', 'party-history-heading');
  const title = element('div'); title.append(element('h3', '', `${partyName(party)} under valnatten`), element('p', 'subtle', `${scopeName()} · röstandel av giltiga röster`));
  heading.append(title, element('span', 'tag', replayMode ? 'Inspelning' : 'Live')); panel.append(heading);
  if (trendsArea !== area) { panel.append(element('p', 'empty-state', failed ? 'Historiken kunde inte hämtas. Försök igen med Uppdatera nu.' : 'Hämtar kvällens historik…')); return; }
  if (failed) panel.append(element('p', 'subtle', 'Historiken kunde inte uppdateras. Senast hämtade observationer visas.'));
  const points = trends.filter(point => Number.isFinite(point.shares?.[key]));
  if (!points.length) { panel.append(element('p', 'empty-state', 'Inga sparade observationer för partiet i detta område ännu.')); return; }
  const first = points[0], last = points.at(-1);
  const summary = element('div', 'party-history-summary');
  for (const [label, value] of [['Första sparade', pct(first.shares[key])], ['Senaste sparade', pct(last.shares[key])], ['Förändring ikväll', `${deltaText(last.shares[key] - first.shares[key])} pp`]]) {
    const stat = element('div'); stat.append(element('span', '', label), element('strong', '', value)); summary.append(stat);
  }
  panel.append(summary);
  const W = matchMedia('(max-width: 700px)').matches ? 420 : 900, H = 215, left = 53, right = 25, top = 16, bottom = 30;
  const maximum = Math.max(5, Math.ceil(Math.max(...points.map(point => point.shares[key])) / 5) * 5);
  const x = time => points.length === 1 ? (W + left - right) / 2 : left + (time - first.capturedAt) / (last.capturedAt - first.capturedAt || 1) * (W - left - right);
  const y = share => H - bottom - share / maximum * (H - top - bottom);
  const svg = svgNode('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${partyName(party)}: ${pct(first.shares[key])} vid första sparade resultatet, ${pct(last.shares[key])} vid senaste. Välj observation med reglaget nedanför.` });
  for (let tick = 0; tick <= 4; tick++) {
    const value = maximum * tick / 4;
    svg.append(svgNode('line', { x1: left, x2: W - right, y1: y(value), y2: y(value), class: 'chart-grid' }));
    const label = svgNode('text', { x: left - 8, y: y(value) + 4, 'text-anchor': 'end' }); label.textContent = pct(value); svg.append(label);
  }
  let path = '', penDown = false;
  for (const point of trends) {
    const value = point.shares?.[key]; if (!Number.isFinite(value)) { penDown = false; continue; }
    path += `${penDown ? 'L' : 'M'}${x(point.capturedAt)},${y(value)} `; penDown = true;
  }
  const color = colors[key] || '#92958c';
  svg.append(svgNode('path', { d: path, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  for (const [point, anchor] of [[first, 'start'], [last, 'end']]) {
    if (points.length === 1 && anchor === 'end') continue;
    const label = svgNode('text', { x: x(point.capturedAt), y: H - 7, 'text-anchor': points.length === 1 ? 'middle' : anchor }); label.textContent = clock.format(point.capturedAt); svg.append(label);
  }
  if (replayMode && currentEntry && currentEntry.capturedAt >= first.capturedAt && currentEntry.capturedAt <= last.capturedAt) {
    svg.append(svgNode('line', { x1: x(currentEntry.capturedAt), x2: x(currentEntry.capturedAt), y1: top, y2: H - bottom, class: 'chart-cursor' }));
  }
  const selectedLine = svgNode('line', { y1: top, y2: H - bottom, stroke: color, 'stroke-opacity': .3 });
  const selectedDot = svgNode('circle', { r: 5, fill: color, stroke: 'white', 'stroke-width': 2 }); svg.append(selectedLine, selectedDot);
  const chart = element('div', 'party-history-chart'); chart.append(svg); panel.append(chart);
  const controls = element('div', 'party-history-controls'), input = element('input'); input.type = 'range'; input.min = 0; input.max = points.length - 1;
  input.setAttribute('aria-label', `${partyName(party)}: välj sparat resultat`); input.style.accentColor = color; input.disabled = points.length < 2;
  const selectionKey = `${area}:${key}`, savedId = partyHistorySelections.get(selectionKey);
  const selectedIndex = points.findIndex(point => point.id === (savedId || currentEntry?.id));
  input.value = selectedIndex >= 0 ? selectedIndex : points.length - 1;
  const output = element('output', 'party-history-point'); output.setAttribute('aria-live', 'polite');
  const jump = element('button', 'party-history-jump', 'Visa denna tidpunkt ↗'); jump.type = 'button';
  const selectPoint = () => {
    const point = points[Number(input.value)];
    output.textContent = `${clock.format(point.capturedAt)} · ${pct(point.shares[key])} · ${fmt(point.districts)} distrikt i hela riket`;
    input.setAttribute('aria-valuetext', output.textContent);
    selectedLine.setAttribute('x1', x(point.capturedAt)); selectedLine.setAttribute('x2', x(point.capturedAt));
    selectedDot.setAttribute('cx', x(point.capturedAt)); selectedDot.setAttribute('cy', y(point.shares[key]));
  };
  input.addEventListener('input', () => { partyHistorySelections.set(selectionKey, points[Number(input.value)].id); selectPoint(); });
  svg.addEventListener('click', event => {
    const rect = svg.getBoundingClientRect(), chartX = (event.clientX - rect.left) / rect.width * W;
    const nearest = points.reduce((best, point, index) => Math.abs(x(point.capturedAt) - chartX) < Math.abs(x(points[best].capturedAt) - chartX) ? index : best, 0);
    input.value = nearest; partyHistorySelections.set(selectionKey, points[nearest].id); selectPoint();
  });
  jump.addEventListener('click', () => { const index = history.findIndex(entry => entry.id === points[Number(input.value)].id); if (index >= 0) { stopPlayback(); showSnapshot(index); } });
  controls.append(input, output, jump); panel.append(controls); selectPoint();
  panel.append(element('p', 'subtle', `${points.length} sparade observationer. ${points.length === 1 ? 'Fler punkter visas när nya resultat sparas. ' : ''}Hela inspelningen visas; den streckade linjen markerar replay-tidpunkten. Förändringen avser första till senaste sparade röstandel ikväll, inte valet 2022. ${area ? 'Regional historik finns endast från inspelningsstart för området.' : 'Tid före inspelningsstart saknas.'}`));
}
function renderStats() {
  const current = view(), metrics = areaMetrics(current, Boolean(area));
  const progress = metrics.total ? metrics.districts / metrics.total * 100 : null;
  set('districts', fmt(metrics.districts)); set('district-total', `/ ${fmt(metrics.total)}`);
  set('header-districts', fmt(data?.antalValdistriktRaknade)); set('header-total', fmt(data?.antalValdistriktSomSkaRaknas));
  const headerTotal = numeric(data?.antalValdistriktSomSkaRaknas), headerCounted = numeric(data?.antalValdistriktRaknade);
  const headerProgress = headerTotal ? headerCounted / headerTotal * 100 : null;
  $('header-progress-fill').style.width = `${Math.min(100, headerProgress || 0)}%`;
  $('header-progress').setAttribute('aria-valuenow', String(Math.round(headerProgress || 0)));
  $('header-progress').title = headerProgress == null ? 'Andel distrikt räknade saknas' : `${decimal.format(headerProgress)} % av distrikten räknade`;
  set('header-progress-pct', headerProgress == null ? '—' : `${decimal.format(headerProgress)} %`);
  $('progress').style.width = `${Math.min(100, progress || 0)}%`;
  set('progress-label', progress == null ? 'Saknas i områdets sammanställning' : `${decimal.format(progress)} % av distrikten har rapporterat`);
  set('votes', fmt(metrics.votes)); set('turnout', pct(metrics.turnout)); set('eligible', fmt(metrics.eligible)); set('eligible-note', area ? 'I valt område · om källan redovisar det' : 'Totalt i hela riket');
  set('updated', `Källan uppdaterad: ${data?.senasteUppdateringstid || 'tid saknas'}`);
  $('area-notice').hidden = !area;
  set('area-notice', !current ? `Historik för ${area} saknas vid den här tidpunkten. Välj ett senare steg eller gå till live.` : `${area}: partiernas och de ogiltiga rösterna kommer från den sparade regionala sammanställningen. Distriktsantal och valdeltagande visas bara om de finns i källan. Tidslinjens distriktsantal gäller hela riket.`);
  const invalid = current?.rosterEjPaverkaMandat;
  set('blank', fmt(invalid?.blankaRoster?.antalRoster)); set('unregistered', fmt(invalid?.rosterEjAnmaltDeltagande?.antalRoster)); set('other-invalid', fmt(invalid?.ovrigaOgiltiga?.antalRoster));
  set('invalid-total', invalid ? `${fmt(invalid.antalRoster)} (${pct(invalid.andelRosterAvTotaltAntalRoster)})` : '—');
  set('valid-votes', fmt(current?.rosterPaverkaMandat?.antalRoster));
  set('invalid-previous', invalid ? `${fmt(invalid.antalRosterForegaendeVal)} (${pct(invalid.andelRosterAvTotaltAntalRosterForegaendeVal)})` : '—');
  set('counted-eligible', area && !(numeric(current?.antalRostberattigadeIRaknadeValdistrikt) > 0) ? 'Saknas i sammanställningen' : fmt(current?.antalRostberattigadeIRaknadeValdistrikt));
  set('turnout-previous', current?.valdeltagandeForegaendeVal || 'Saknas i sammanställningen');
  const messages = [data?.test ? 'Källan markerar detta som testdata.' : '', current?.meddelandetext, current?.meddelandetextValomrade, data?.jamforbar === false ? 'Källan markerar resultatet som ej jämförbart med föregående val.' : ''].filter(Boolean);
  set('source-message', messages.join(' ') || 'Inga ytterligare meddelanden i resultatet.');
  const mandates = current?.partiMandat || current?.mandatfordelning;
  set('mandate-status', mandates ? 'Källan innehåller mandatdata. Hämta hela ögonblicksbilden för att se uppgifterna.' : 'Ingen mandatfördelning har publicerats i detta resultat. Röstandelar är inte en mandatprognos.');
  $('export-json').disabled = !data;
}
function renderInsights() {
  const current = view(), parties = partiesFor(current), leader = [...parties].filter(p => p.antalRoster > 0).sort((a, b) => b.antalRoster - a.antalRoster)[0];
  set('leader', leader ? `${partyKey(leader)} · ${pct(leader.andelRoster)}` : 'Inväntar röster');
  set('leader-note', leader ? `${partyName(leader)} · ${fmt(leader.antalRoster)} röster i ${scopeName()}` : 'Inga redovisade röster vid denna tidpunkt.');
  const currentId = history[replayMode ? replayIndex : history.length - 1]?.id;
  const trendIndex = trends.findIndex(point => point.id === currentId);
  const previousTrend = trendIndex > 0 ? trends[trendIndex - 1] : null;
  const currentTrend = trendIndex >= 0 ? trends[trendIndex] : null;
  const changes = parties.map(p => {
    const key = partyKey(p);
    return { p, delta: currentTrend && previousTrend && currentTrend.shares?.[key] != null && previousTrend.shares?.[key] != null ? currentTrend.shares[key] - previousTrend.shares[key] : null };
  }).filter(item => item.delta != null);
  const gain = changes.slice().sort((a, b) => b.delta - a.delta)[0];
  const loss = changes.slice().sort((a, b) => a.delta - b.delta)[0];
  set('mover-label', 'STÖRST PARTIFÖRÄNDRING');
  set('mover', gain || loss ? `${gain ? `${partyKey(gain.p)} +${changeDecimal.format(gain.delta)}` : '—'} / ${loss ? `${partyKey(loss.p)} −${changeDecimal.format(Math.abs(loss.delta))}` : '—'} pp` : 'Inväntar uppdatering');
  set('mover-note', gain || loss ? `${gain ? `Störst upp: ${partyName(gain.p)}` : ''}${gain && loss ? ' · ' : ''}${loss ? `Störst ner: ${partyName(loss.p)}` : ''} · sedan senaste uppdateringen` : 'Förändring visas när två sparade observationer finns.');
  const chosen = filterParties(parties, { selected });
  set('selection-share', selected.length ? pct(selectionTotal(chosen, current?.rosterPaverkaMandat?.antalRoster)) : 'Alla partier');
  set('selection-note', selected.length ? `${selected.join(' + ')} · ${fmt(chosen.reduce((sum, p) => sum + (p.antalRoster || 0), 0))} röster. Andel av områdets giltiga röster, inte en mandatberäkning.` : 'Välj partier ovan för att summera deras röstandelar.');
}
function renderRegions() {
  const regionParty = $('region-party').value, search = $('region-search').value.trim().toLocaleLowerCase('sv-SE');
  const sourceRegions = regionsLive.filter(item => item.data).map(item => item.data);
  let regions = (sourceRegions.length ? sourceRegions : (data?.valkretsar || [])).filter(region => region.namn.toLocaleLowerCase('sv-SE').includes(search)).map(region => {
    const parties = partiesFor(region), party = regionParty ? parties.find(p => partyKey(p) === regionParty) : [...parties].sort((a, b) => b.antalRoster - a.antalRoster)[0];
    return { region, party: region.rosterPaverkaMandat?.antalRoster > 0 ? party : null };
  });
  regions.sort((a, b) => $('region-sort').value === 'share' ? (b.party?.andelRoster ?? -Infinity) - (a.party?.andelRoster ?? -Infinity) : $('region-sort').value === 'change' ? (b.party?.forandringAndelRoster ?? -Infinity) - (a.party?.forandringAndelRoster ?? -Infinity) : $('region-sort').value === 'votes' ? (b.region.rosterPaverkaMandat?.antalRoster || 0) - (a.region.rosterPaverkaMandat?.antalRoster || 0) : a.region.namn.localeCompare(b.region.namn, 'sv'));
  set('region-count', `${regions.length} valkretsar`);
  $('region-grid').replaceChildren(...regions.map(({ region, party }) => {
    const button = element('button', `region-card ${region.namn === area ? 'active-region' : ''}`); button.type = 'button';
    button.append(element('span', 'region-name', region.namn), element('span', 'region-arrow', '↗'));
    const result = element('span', 'region-result');
    if (party) { const shareText = pct(party.andelRoster); result.append(badge(party), element('strong', flashed(`region:${region.namn}:share`, shareText) ? 'value-flash' : '', shareText), element('span', `change ${(party.forandringAndelRoster || 0) >= 0 ? 'positive' : 'negative'}`, `${deltaText(party.forandringAndelRoster)} pp`)); }
    else result.append(element('span', 'subtle', 'Inväntar röster'));
    const counted = Number(region.antalValdistriktRaknade), total = Number(region.antalValdistriktSomSkaRaknas);
    button.append(result, element('span', 'region-caption', `${party ? `${partyName(party)} · ` : ''}${fmt(region.rosterPaverkaMandat?.antalRoster)} giltiga röster`));
    if (total > 0) { const percent = Math.min(100,counted/total*100), meter=element('span','region-progress'); meter.setAttribute('role','progressbar'); meter.setAttribute('aria-valuenow',String(Math.round(percent))); meter.setAttribute('aria-valuemin','0'); meter.setAttribute('aria-valuemax','100'); meter.setAttribute('aria-label',`${Math.round(percent)} procent av distrikten räknade`); meter.title=`${Math.round(percent)} % räknat · ${counted} av ${total} distrikt`; const fill=element('i'); fill.style.width=`${percent}%`; meter.append(fill); button.append(meter); }
    button.addEventListener('click', () => { changeArea(region.namn); $('results-section').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); });
    return button;
  }));
  if (!regions.length) $('region-grid').append(element('p', 'empty-state', data?.valkretsar?.length ? 'Inga valkretsar matchar din sökning.' : 'Regionala resultat saknas i denna äldre inspelning. Välj en senare tidpunkt eller följ live.'));
}
function renderCompletion() {
  const complete = list => list.filter(item => Number(item.antalValdistriktSomSkaRaknas) > 0 && Number(item.antalValdistriktRaknade) >= Number(item.antalValdistriktSomSkaRaknas));
  const counties = complete(regionsLive.filter(item => item.data).map(item => item.data));
  const municipalities = complete(regionsLive.filter(item => item.data).flatMap(item => item.data.valkretsar || []).filter(item => /kommun/i.test(item.namn)));
  const render = (id, list) => $(id).replaceChildren(...list.sort((a,b)=>a.namn.localeCompare(b.namn,'sv')).map(item => { const row=element('button','completion-row');row.type='button';row.append(element('strong','',item.namn),element('span','',`${fmt(item.antalValdistriktRaknade)} / ${fmt(item.antalValdistriktSomSkaRaknas)} · ${item.valdeltagande || '—'}`));row.onclick=()=>changeArea(item.namn);return row; }));
  render('completed-counties',counties); render('completed-municipalities',municipalities);
  if (!counties.length) $('completed-counties').append(element('p','empty-state','Inga län är färdigräknade ännu.'));
  if (!municipalities.length) $('completed-municipalities').append(element('p','empty-state','Inga kommuner är färdigräknade ännu.'));
  set('completion-count',`${counties.length} län · ${municipalities.length} kommuner`); set('completion-note',`Progressen baseras på varje områdes egen nämnare. Uppdaterad från ${regionsLive.filter(item=>item.ok).length} av ${regionsLive.length || 29} länsflöden.`);
}
function svgNode(tag, attributes = {}) { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value); return node; }
function renderTrend() {
  $('trend-chart').replaceChildren(); $('trend-legend').replaceChildren();
  $('trend-window-list').replaceChildren(); set('trend-window-note', '');
  if (trendsArea !== area) { $('trend-chart').append(element('p', 'empty-state', 'Hämtar områdets historik…')); return; }
  const points = trends.filter(point => point.shares != null);
  if (!points.length) { $('trend-chart').append(element('p', 'empty-state', 'Det finns ännu ingen sparad kurva för detta område.')); return; }
  const keys = selected.length ? selected : [...new Set(points.flatMap(point => Object.keys(point.shares)))];
  const latest = points.at(-1), targetDistricts = latest.districts - trendWindowDistricts;
  const earlier = points.filter(point => point.districts <= targetDistricts).at(-1) || points[0];
  const districtSpan = latest.districts - earlier.districts;
  set('trend-window-title', `Trend senaste ${number.format(trendWindowDistricts)} distrikt`);
  set('trend-window-note', `${fmt(districtSpan)} distrikt · ${clock.format(earlier.capturedAt)}–${clock.format(latest.capturedAt)}`);
  $('trend-window-list').replaceChildren(...keys.map(key => {
    const delta = latest.shares?.[key] != null && earlier.shares?.[key] != null ? latest.shares[key] - earlier.shares[key] : null;
    const item = element('span', `trend-window-item ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}`);
    item.append(element('strong', '', key), element('span', '', delta == null ? '—' : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${changeDecimal.format(Math.abs(delta))} pp`));
    return item;
  }));
  const W = 1000, H = 290, left = 45, right = 30, top = 22, bottom = 34;
  const minTime = points[0].capturedAt, maxTime = points.at(-1).capturedAt;
  const maxShare = Math.max(10, Math.ceil(Math.max(...points.flatMap(point => keys.map(key => point.shares[key] || 0))) / 5) * 5);
  const x = time => left + (time - minTime) / (maxTime - minTime || 1) * (W - left - right);
  const y = share => H - bottom - share / maxShare * (H - top - bottom);
  const svg = svgNode('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Röstandel över tid för ${scopeName()}. ${points.length} sparade observationer. Välj en punkt för att visa resultatet.` });
  for (let tick = 0; tick <= 4; tick++) {
    const value = maxShare * tick / 4, line = svgNode('line', { x1: left, x2: W - right, y1: y(value), y2: y(value), class: 'chart-grid' });
    const label = svgNode('text', { x: left - 10, y: y(value) + 4, 'text-anchor': 'end' }); label.textContent = `${decimal.format(value)} %`; svg.append(line, label);
  }
  for (const [time, anchor] of [[minTime, 'start'], [maxTime, 'end']]) { const label = svgNode('text', { x: x(time), y: H - 8, 'text-anchor': anchor }); label.textContent = clock.format(time); svg.append(label); }
  for (const key of keys) {
    let path = '', penDown = false;
    for (const point of trends) {
      const value = point.shares?.[key];
      if (value == null) { penDown = false; continue; }
      path += `${penDown ? 'L' : 'M'}${x(point.capturedAt)},${y(value)} `; penDown = true;
    }
    svg.append(svgNode('path', { d: path, fill: 'none', stroke: colors[key] || '#92958c', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (points.length === 1 && points[0].shares[key] != null) svg.append(svgNode('circle', { cx: x(minTime), cy: y(points[0].shares[key]), r: 4, fill: colors[key] || '#92958c' }));
    const legend = element('span'); const dot = element('i'); dot.style.background = colors[key] || '#92958c'; legend.append(dot, document.createTextNode(names[key] || key)); $('trend-legend').append(legend);
  }
  const currentEntry = history[replayMode ? replayIndex : history.length - 1];
  if (currentEntry && currentEntry.capturedAt >= minTime) svg.append(svgNode('line', { x1: x(currentEntry.capturedAt), x2: x(currentEntry.capturedAt), y1: top, y2: H - bottom, class: 'chart-cursor' }));
  // One mouse target per observation. Keyboard users have the range slider and step buttons.
  points.forEach((point, index) => {
    const start = index ? (x(point.capturedAt) + x(points[index - 1].capturedAt)) / 2 : left;
    const end = index === points.length - 1 ? W - right : (x(point.capturedAt) + x(points[index + 1].capturedAt)) / 2;
    const hit = svgNode('rect', { x: start, y: top, width: Math.max(1, end - start), height: H - top - bottom, fill: 'transparent', class: 'chart-hit' });
    const title = svgNode('title'); title.textContent = `${clock.format(point.capturedAt)} · ${fmt(point.districts)} distrikt i hela riket\n${keys.map(key => `${key}: ${pct(point.shares[key])}`).join('\n')}`; hit.append(title);
    hit.addEventListener('click', () => { const index = history.findIndex(entry => entry.id === point.id); if (index >= 0) { stopPlayback(); showSnapshot(index); } }); svg.append(hit);
  });
  $('trend-chart').append(svg);
  set('trend-note', `${points.length} observationer · ${scopeName()} · tid då resultatet hämtades. ${area ? 'Äldre nationella inspelningar utan regionala uppgifter ingår inte.' : 'Linjerna förbinder faktiska observationer; mellanliggande resultat är inte kända.'}`);
}
function renderBlocks() {
  const current = view(), result = blockResults(current);
  set('block-scope', scopeName());
  $('block-cards').replaceChildren(...result.map(block => {
    const card = element('article', `block-card block-${block.key}`);
    const title = element('div', 'block-card-heading'); title.append(element('h3', '', block.label), element('span', '', block.parties.join(' + ')));
    const shareText = pct(block.share);
    const metric = element('div', 'block-metric'); metric.append(element('strong', flashed(`block:${block.key}:share`, shareText) ? 'value-flash' : '', shareText), element('span', 'subtle', `${fmt(block.votes)} röster`));
    const members = element('div', 'block-members');
    block.parties.forEach((key, index) => { const member = element('span'); member.append(badge({ partiforkortning: key }), document.createTextNode(pct(block.members[index]?.andelRoster))); members.append(member); });
    card.append(title, metric, members, element('p', 'subtle', block.delta == null || data?.jamforbar === false ? 'Jämförelse med 2022 saknas' : `${deltaText(block.delta)} procentenheter mot 2022`));
    return card;
  }));
  const [left, right] = result;
  $('block-bar').replaceChildren();
  if (left.share != null && right.share != null) {
    const other = Math.max(0, 100 - left.share - right.share);
    for (const [className, value, label] of [['balance-left', left.share, 'Vänster'], ['balance-other', other, 'Övriga'], ['balance-right', right.share, 'Höger']]) {
      const segment = element('span', className); segment.style.width = `${value}%`; segment.title = `${label}: ${pct(value)}`; $('block-bar').append(segment);
    }
    $('block-bar').setAttribute('aria-label', `Vänster ${pct(left.share)}, övriga ${pct(other)}, höger ${pct(right.share)}`);
    const gap = left.share - right.share;
    set('header-gap', `${gap > 0 ? 'Vänster' : gap < 0 ? 'Höger' : 'Lika'} ${gap === 0 ? 'block' : `${decimal.format(Math.abs(gap))} pp`}`);
    set('block-gap', Math.abs(gap) < 0.000001 ? 'Blocken har lika många röster' : `${gap > 0 ? 'Vänster' : 'Höger'} är ${decimal.format(Math.abs(gap))} procentenheter större`);
    set('block-other', `Övriga partier: ${pct(other)}`);
  } else { $('block-bar').setAttribute('aria-label', 'Blockresultat saknas vid denna tidpunkt'); set('block-gap', 'Inväntar fullständiga partiuppgifter'); set('block-other', 'Övriga partier: —'); set('header-gap', 'Blockskillnad —'); }
}
function renderMandates() {
  const current = view(), estimate = allocateSeats(current, area ? 29 : 349), range = seatUncertainty(current, area ? 29 : 349), official = current?.partiMandat || current?.mandatfordelning;
  set('mandates-scope', scopeName());
  if (official) { set('mandate-mode', 'Officiell mandatfördelning från Valmyndigheten'); set('mandate-note', 'Mandatfördelningen är publicerad av Valmyndigheten.'); }
  else { set('mandate-mode', area ? 'Rikstäckande metod · illustrativ regional uppskattning' : 'Beräknad uppskattning · modifierad Sainte-Laguë'); set('mandate-note', area ? 'Regionala mandat uppskattas proportionellt för att jämföra områdets styrkeförhållande. Det är inte en officiell valkretsfördelning.' : 'Mandatfördelningen är en uppskattning från röstandelarna. Valmyndighetens officiella mandat räknas separat när de publiceras.'); }
  if (!estimate) { $('mandate-summary').replaceChildren(element('span', 'empty-state', 'Mandat kan visas när tillräckliga partier och giltiga röster har publicerats.')); $('mandate-party-list').replaceChildren(); $('mandate-margins').replaceChildren(); return; }
  const [left, right] = blockResults(current), leftSeats = estimate.parties.filter(p => ['S','V','MP','C'].includes(p.key)).reduce((sum,p)=>sum+p.seats,0), rightSeats = estimate.parties.filter(p => ['M','KD','SD','L'].includes(p.key)).reduce((sum,p)=>sum+p.seats,0);
  $('mandate-summary').replaceChildren(...[['Vänster',leftSeats,'block-left'],['Höger',rightSeats,'block-right'],['Övriga / under 4 %',Math.max(0,estimate.seats-leftSeats-rightSeats),'block-other']].map(([label,seats,kind])=>{const card=element('article','mandate-card '+kind);card.append(element('span','',label),element('strong',flashed(`mandate-summary:${kind}`,String(seats))?'value-flash':'',String(seats)),element('small','',`av ${estimate.seats} platser`));return card;}));
  const margins = mandateMargins(current, area ? 29 : 349);
  $('mandate-margins').replaceChildren(
    element('span', 'mandate-margin-title', 'Närmast mandatgränsen'),
    element('span', '', `Vinner nästa: ${margins.gain.name} (${margins.gain.key})`),
    element('span', '', `Mest utsatt: ${margins.lose.name} (${margins.lose.key})`)
  );
  $('mandate-party-list').replaceChildren(...estimate.parties.map(p=>{const rp=range?.parties.find(item=>item.key===p.key) || p;const row=element('div','mandate-party');row.append(element('span','mandate-party-name',p.key+' '+p.name),element('span','mandate-share',`${pct(p.share)} · ${rp.low}–${rp.high}`),element('strong',flashed(`mandate-party:${p.key}:seats`,String(p.seats))?'value-flash':'',String(p.seats)));const track=element('div','mandate-seat-track');const band=element('i','mandate-seat-band');band.style.left=`${rp.low/estimate.seats*100}%`;band.style.width=`${Math.max(0,(rp.high-rp.low)/estimate.seats*100)}%`;band.style.background=colors[p.key]||'#92958c';const marker=element('b','mandate-seat-marker');marker.style.left=`${p.seats/estimate.seats*100}%`;marker.style.borderColor=colors[p.key]||'#92958c';track.append(band,marker);row.append(track);return row;}));
  set('mandate-note', `${area ? 'Regional uppskattning med 29 platser som skala.' : 'Uppskattning med 349 platser och modifierad Sainte-Laguë.'} Intervallet (lågt–högt) visar hur platserna kan variera med en försiktig osäkerhetsmarginal baserad på hur stor del av distrikten som är räknad (${range ? decimal.format(range.margin) : '—'} procentenheter). Detta är inte en prognos; officiella mandat ersätter uppskattningen när Valmyndigheten publicerar dem.`);
}
function renderNightStory() { renderStories({ trends, trendsArea, area, history, replayIndex, replayMode, showSnapshot, stopPlayback }); }
function render() { renderBlocks(); renderMandates(); renderFilters(); renderStats(); renderInsights(); renderParties(); renderRegions(); renderCompletion(); renderTrend(); try { renderNightStory(); } catch (error) { console.error('Story widgets failed:', error); } }
document.getElementById('blocks-section')?.after(document.getElementById('mandates-section'));
document.getElementById('regions-section')?.before(document.getElementById('completion-section'));
let districtTimer;
async function searchDistricts() {
  const query = $('district-search').value.trim(), region = $('district-region-filter').value;
  if (query.length < 2 && !region) { $('district-results').replaceChildren(element('p','empty-state','Börja skriva för att hitta ett valdistrikt.')); set('district-result-count','Sök i namn, kommun eller län'); return; }
  const response = await fetch(`/api/districts?q=${encodeURIComponent(query)}&region=${encodeURIComponent(region)}`); const payload = await response.json();
  set('district-result-count', `${payload.total} träffar${payload.total === 80 ? ' · visa de första 80' : ''}`);
  $('district-results').replaceChildren(...payload.results.map(item => { const button=element('button','district-result');button.type='button';button.append(element('strong','',item.name),element('span','',`${item.municipality} · ${item.region}`));button.onclick=()=>loadDistrict(item);return button; }));
  if (!payload.results.length) $('district-results').append(element('p','empty-state','Inga valdistrikt matchade din sökning.'));
}
async function loadDistrict(item) {
  const detail=$('district-detail');detail.hidden=false;detail.replaceChildren(element('p','subtle','Hämtar senaste distriktsresultat…'));
  try { const response=await fetch(`/api/districts/${item.code}`);if(!response.ok)throw Error();const result=await response.json(), d=result.data, parties=partiesFor(d).slice().sort((a,b)=>b.antalRoster-a.antalRoster).slice(0,5); const panel=element('div');panel.append(element('div','district-detail-heading',`${d.namn} · ${item.municipality}`),element('p','subtle',`${d.antalValdistriktRaknade} av ${d.antalValdistriktSomSkaRaknas} distrikt · ${d.valdeltagande || 'valdeltagande saknas'} · källa uppdaterad ${d.senasteUppdateringstid || '—'}`)); const list=element('div','district-party-list');parties.forEach(p=>{const row=element('div');row.append(element('strong','',partyKey(p)),element('span','',pct(p.andelRoster)),element('small','',`${fmt(p.antalRoster)} röster · ${p.forandringAndelRoster == null ? 'jämförelse saknas' : `${deltaText(p.forandringAndelRoster)} pp mot 2022`}`));list.append(row)});panel.append(list,element('a','district-source','Öppna originalresultatet ↗'));panel.lastChild.href=`https://resultat.val.se/val2026/RD/${item.regionCode}/${item.municipalityCode}/${item.code}?r=P`;panel.lastChild.target='_blank';detail.replaceChildren(panel); }
  catch { detail.replaceChildren(element('p','error','Distriktsresultatet kunde inte hämtas just nu.')); }
}
$('district-search').addEventListener('input',()=>{clearTimeout(districtTimer);districtTimer=setTimeout(searchDistricts,220)});$('district-region-filter').addEventListener('change',searchDistricts);
fetch('/geography.json').then(r=>r.json()).then(regions=>{ $('district-region-filter').append(...regions.map(r=>new Option(r.name,r.name))); }).catch(()=>{});
function connection(ok, message = '') {
  liveOK = ok; $('connection').className = `connection ${replayMode ? 'replay-connection' : ok ? '' : 'offline'}`;
  $('connection').replaceChildren(element('i'), document.createTextNode(replayMode ? ' INSPELNING' : ok ? ' LIVE' : ' ANSLUTNINGSPROBLEM'));
  $('error').hidden = ok; set('error', message);
}
async function loadTrends() {
  const request = ++trendRequest, requestedArea = area;
  try {
    const response = await fetch(`/api/trends?area=${encodeURIComponent(requestedArea)}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Trends unavailable');
    const points = await response.json();
    if (request !== trendRequest || requestedArea !== area) return;
    trends = points; trendsArea = requestedArea; renderTrend(); refreshPartyHistories(); renderParties(); renderNightStory();
  } catch (error) {
    console.error('Live render/update failed:', error);
    if (request !== trendRequest) return;
    set('trend-note', 'Kurvan kunde inte uppdateras. Vi försöker igen vid nästa uppdatering.');
    refreshPartyHistories(true);
    if (trendsArea !== area) $('trend-chart').replaceChildren(element('p', 'empty-state', 'Kunde inte hämta områdets historik.'));
  }
}
async function loadRegions() {
  try {
    const response = await fetch('/api/regions', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Regional feeds unavailable');
    regionsLive = await response.json();
    withFlash(() => { renderRegions(); renderCompletion(); });
  } catch { set('region-count', 'Regionala flöden kunde inte hämtas'); }
}
async function refresh() {
  if (busy) return;
  busy = true; $('refresh').disabled = true;
  try {
    const response = await fetch('/api/results', { cache: 'no-store', signal: AbortSignal.timeout(16000) });
    if (!response.ok) throw new Error('Feed unavailable');
    const result = await response.json();
    if (!Array.isArray(result.data?.rosterPaverkaMandat?.partiroster)) throw new Error('Invalid data');
    liveData = result.data;
    if (!replayMode) { data = liveData; withFlash(render); }
    connection(!result.stale, 'Källan kunde inte nås. Senast hämtade resultat visas. Vi försöker automatiskt igen.');
    await loadHistory();
    loadRegions();
    if (result.archiveError) { $('history-error').hidden = false; set('history-error', 'Resultatet visas, men kunde inte sparas. Kontrollera serverns lagring.'); }
  } catch (error) {
    console.error('Live results failed:', error);
    console.error(error);
    connection(false, data ? `Liveflödet kunde inte nås (${error?.message || 'okänt fel'}). Senast visade resultat ligger kvar.` : `Resultatet kunde inte hämtas (${error?.message || 'okänt fel'}).`);
    await loadHistory(); // The saved archive remains useful even when the live feed is offline.
  } finally { busy = false; $('refresh').disabled = false; nextRefresh = Date.now() + REFRESH_INTERVAL_MS; }
}
function stopPlayback() { playing = false; clearTimeout(playbackTimer); set('play', '▶ Spela upp'); }
function updateTimeline() {
  $('timeline').max = Math.max(0, history.length - 1); $('timeline').disabled = history.length < 2;
  $('timeline').value = replayMode ? Math.max(0, replayIndex) : Math.max(0, history.length - 1);
  $('play').disabled = history.length < 2; $('previous').disabled = history.length < 2 || (replayMode && replayIndex <= 0); $('next').disabled = !replayMode || replayIndex >= history.length - 1;
  $('go-live').classList.toggle('active', !replayMode);
  const entry = history[replayMode ? replayIndex : history.length - 1];
  set('replay-position', entry ? `${replayMode ? 'Inspelning' : 'Senast sparat'} · ${fmt(entry.districts)} av ${fmt(entry.total)} distrikt i hela riket · ${entry.sourceUpdatedAt || clock.format(entry.capturedAt)}` : 'Inväntar sparade resultat');
  if (entry) $('timeline').setAttribute('aria-valuetext', `${entry.districts} av ${entry.total} räknade distrikt i hela riket, ${entry.sourceUpdatedAt}`);
  set('history-count', `${fmt(history.length)} sparade resultat`);
  if (history.length) set('history-note', `Nationell inspelning från ${fmt(history[0].districts)} distrikt. ${history[0].districts > 1 ? 'Tidigare resultat saknas. ' : ''}Varje steg visar ett faktiskt sparat resultat; flera distrikt kan rapporteras mellan stegen. ${area ? 'Områdesfiltret följer med under uppspelningen.' : ''}`);
}
async function loadHistory() {
  try {
    const response = await fetch('/api/history', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('History unavailable');
    history = await response.json(); updateTimeline(); renderFilters(); $('history-error').hidden = true;
    if (initialSnapshot) {
      const index = history.findIndex(entry => entry.id === initialSnapshot); initialSnapshot = null;
      if (index >= 0) { restoringSnapshot = true; await showSnapshot(index); restoringSnapshot = false; }
      else { $('history-error').hidden = false; set('history-error', 'Den delade inspelningen finns inte på denna server. Livevyn visas.'); }
    }
    await loadTrends();
  } catch { $('history-error').hidden = false; set('history-error', 'Inspelningen kunde inte hämtas. Vi försöker igen vid nästa uppdatering.'); }
}
async function showSnapshot(index) {
  if (!history[index]) return false;
  const request = ++snapshotRequest, id = history[index].id;
  try {
    let snapshot = snapshotCache.get(id);
    if (!snapshot) {
      const response = await fetch(`/api/history/${id}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Snapshot unavailable');
      snapshot = await response.json(); snapshotCache.set(id, snapshot);
      if (snapshotCache.size > 20) snapshotCache.delete(snapshotCache.keys().next().value);
    }
    if (request !== snapshotRequest) return false;
    replayMode = true; replayIndex = index; data = snapshot.data; withFlash(render); updateTimeline(); saveURL();
    connection(liveOK, $('error').textContent); return true;
  } catch {
    if (request !== snapshotRequest) return false;
    stopPlayback(); $('history-error').hidden = false; set('history-error', 'Det sparade resultatet kunde inte hämtas. Försök igen.'); return false;
  }
}
async function playbackStep() {
  if (!playing) return;
  const index = replayIndex + 1;
  if (index >= history.length) { stopPlayback(); return; }
  if (await showSnapshot(index) && playing) playbackTimer = setTimeout(playbackStep, Number($('speed').value)); else stopPlayback();
}
function changeArea(value) { area = value; render(); updateTimeline(); saveURL(); loadTrends(); }
function download(body, type, filename) { const url = URL.createObjectURL(new Blob([body], { type })); const link = element('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$('play').addEventListener('click', async () => { if (playing) { stopPlayback(); return; } playing = true; set('play', 'Ⅱ Pausa'); if (!replayMode || replayIndex >= history.length - 1) replayIndex = -1; await playbackStep(); });
$('timeline').addEventListener('input', () => { stopPlayback(); showSnapshot(Number($('timeline').value)); });
$('previous').addEventListener('click', () => { stopPlayback(); showSnapshot(replayMode ? replayIndex - 1 : history.length - 2); });
$('next').addEventListener('click', () => { stopPlayback(); showSnapshot(replayIndex + 1); });
$('go-live').addEventListener('click', () => { stopPlayback(); ++snapshotRequest; replayMode = false; if (liveData) { data = liveData; withFlash(render); } updateTimeline(); connection(liveOK, $('error').textContent); saveURL(); refresh(); });
$('area').addEventListener('change', () => changeArea($('area').value));
for (const id of ['comparison', 'sort', 'threshold-filter', 'details-toggle']) $(id).addEventListener('change', () => { render(); saveURL(); });
$('party-search').addEventListener('input', () => { renderParties(); saveURL(); });
$('region-search').addEventListener('input', renderRegions);
for (const id of ['region-party', 'region-sort']) $(id).addEventListener('change', renderRegions);
$('reset-filters').addEventListener('click', () => { selected = []; $('party-search').value = ''; $('threshold-filter').value = 'all'; $('comparison').value = 'previous'; $('sort').value = 'votes'; $('details-toggle').checked = false; $('region-search').value = ''; $('region-party').value = ''; $('region-sort').value = 'name'; changeArea(''); });
$('share-view').addEventListener('click', async () => { saveURL(); try { await navigator.clipboard.writeText(location.href); set('share-status', 'Länken till denna vy är kopierad.'); } catch { set('share-status', `Kopiera länken från adressfältet: ${location.href}`); } });
$('export-csv').addEventListener('click', () => {
  const rows = [['Område', 'Källans uppdateringstid', 'Läge', 'Parti', 'Röster 2026', 'Andel 2026 (%)', 'Andel 2022 (%)', 'Röster 2022', 'Jämförelse', 'Skillnad (procentenheter)'], ...currentParties().map(p => [scopeName(), data.senasteUppdateringstid, replayMode ? 'Inspelning' : 'Live', partyName(p), p.antalRoster, p.andelRoster, p.andelRosterForegaendeVal, p.antalRosterForegaendeVal, $('comparison').value, compare(p).delta == null ? null : Math.round(compare(p).delta * 10) / 10])];
  download('\ufeff' + rows.map(row => row.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8', 'val2026-resultat.csv');
});
$('export-json').addEventListener('click', () => download(JSON.stringify({ source: 'https://resultat.val.se/data/resultat/val2026/RD_P.json', mode: replayMode ? 'replay' : 'live', snapshotId: replayMode ? history[replayIndex]?.id : null, area: scopeName(), data }, null, 2), 'application/json', 'val2026-ogonblicksbild.json'));
$('refresh').addEventListener('click', refresh);
$('trend-window-size').addEventListener('change', () => { trendWindowDistricts = Number($('trend-window-size').value); renderTrend(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); }); window.addEventListener('online', refresh);
for (const [id, param] of [['comparison', 'compare'], ['sort', 'sort'], ['threshold-filter', 'threshold']]) { const value = initial.get(param); if (value && [...$(id).options].some(option => option.value === value)) $(id).value = value; }
$('party-search').value = initial.get('q') || ''; $('details-toggle').checked = initial.get('details') === '1';
fetch('/geography.json').then(response => response.json()).then(value => { geography = value; renderFilters(); }).catch(() => {});
$('countdown-ring-fill').style.strokeDasharray = `${COUNTDOWN_RING_CIRCUMFERENCE} ${COUNTDOWN_RING_CIRCUMFERENCE}`;
setInterval(() => {
  if (document.hidden) return;
  const seconds = Math.max(0, Math.ceil((nextRefresh - Date.now()) / 1000));
  const label = busy ? 'Hämtar senaste resultat…' : `Nästa uppdatering om ${seconds} s`;
  $('countdown').classList.toggle('busy', busy);
  $('countdown').title = label;
  set('countdown-text', label);
  if (!busy) $('countdown-ring-fill').style.strokeDashoffset = String(COUNTDOWN_RING_CIRCUMFERENCE * (1 - seconds / (REFRESH_INTERVAL_MS / 1000)));
  if (seconds === 0) refresh();
}, 1000);
matchMedia('(max-width: 700px)').addEventListener('change', () => refreshPartyHistories());
renderFilters(); refresh();
loadRegions();
