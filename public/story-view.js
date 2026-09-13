import { recentChanges, milestones } from './story.js';
import { names } from './model.js';
const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('sv-SE');
const dec = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });
const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${dec.format(Math.abs(value))}`;
const whole = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number.format(Math.abs(value))}`;
function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text != null) el.textContent = text; return el; }
function svgNode(tag, attrs = {}) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); return el; }
let context, initialVisitId, eventLimit = 8, raceSelection;
try { initialVisitId = localStorage.getItem('val2026-last-observation'); } catch {}
const title = area => area || 'Hela riket';
function jump(id) { const index = context.history.findIndex(point => point.id === id); if (index >= 0) { context.stopPlayback(); context.showSnapshot(index); } }
export function renderStories(value) {
  context = value;
  if (context.trendsArea !== context.area) {
    $('changes-cards').replaceChildren(); $('race-chart').replaceChildren(); $('milestone-list').replaceChildren();
    $('changes-context').textContent = 'Hämtar områdets inspelning…'; $('changes-note').textContent = '';
    $('race-note').textContent = 'Hämtar områdets inspelning…'; $('race-value').textContent = '';
    $('race-jump').disabled = true; $('race-position').disabled = true; $('more-milestones').hidden = true; return;
  }
  const { trends, history, replayIndex, replayMode } = context;
  const currentId = history[replayMode ? replayIndex : history.length - 1]?.id;
  const currentIndex = trends.findIndex(point => point.id === currentId);
  renderChanges(currentIndex); renderRace(currentId); renderMilestones(currentIndex);
  if (!replayMode && currentId) { try { localStorage.setItem('val2026-last-observation', currentId); } catch {} }
}
function renderChanges(currentIndex) {
  const { trends, area, replayMode } = context, after = trends[currentIndex];
  const visitIndex = trends.findIndex(point => point.id === initialVisitId);
  const baseline = $('changes-baseline').value === 'visit' ? visitIndex : currentIndex - 1;
  const before = baseline >= 0 && baseline <= currentIndex ? trends[baseline] : null;
  $('changes-cards').replaceChildren();
  const changes = recentChanges(before, after);
  $('changes-context').textContent = changes ? `${title(area)} · ${clock.format(before.capturedAt)} → ${clock.format(after.capturedAt)} · ${replayMode ? 'fram till vald replay-tidpunkt' : 'senaste sparade resultat'}` : $('changes-baseline').value === 'visit' ? 'Det finns inget tidigare besök att jämföra med före den valda tidpunkten.' : 'Två på varandra följande observationer för området behövs för en jämförelse.';
  $('changes-note').textContent = 'Räknade distrikt gäller hela riket. Röster och partier gäller valt område. Förändringen beskriver sparade resultat, inte en prognos.';
  if (!changes) return;
  const party = changes.parties[0];
  const cards = [
    ['RÄKNADE DISTRIKT', whole(changes.districts), 'Förändring i hela riket'],
    ['RÄKNADE RÖSTER', changes.votes == null ? '—' : whole(changes.votes), `Inklusive ogiltiga · ${title(area)}`],
    ['STÖRSTA PARTIFÖRÄNDRING', party ? `${party.key} ${signed(party.delta)} pp` : '—', party ? names[party.key] || party.key : 'Uppgift saknas'],
    ['BLOCKENS FÖRSPRÅNG', changes.gap == null ? '—' : `${signed(changes.gap)} pp`, changes.gap == null ? 'Fullständiga blockuppgifter saknas' : Math.abs(changes.gap) < 1e-8 ? 'Oförändrad skillnad' : changes.gap > 0 ? 'Förskjutning mot vänster' : 'Förskjutning mot höger']
  ];
  for (const [label, value, note] of cards) { const card = node('article', 'change-card'); card.append(node('span', '', label), node('strong', '', value), node('p', '', note)); $('changes-cards').append(card); }
}
function renderRace(currentId) {
  const { trends, area } = context, points = trends.filter(point => Number.isFinite(point.blockGap));
  if (!$('race-scale')) { const select = document.createElement('select'); select.id = 'race-scale'; select.setAttribute('aria-label', 'Skala för blockgapgrafen'); select.append(new Option('Zooma variation', 'zoom'), new Option('Visa från noll', 'full')); select.addEventListener('change', () => renderStories(context)); $('race-scope').before(select); }
  $('race-scope').textContent = title(area); $('race-chart').replaceChildren();
  $('race-position').disabled = points.length < 2; $('race-jump').disabled = !points.length;
  if (!points.length) { $('race-chart').append(node('p', 'empty-state', 'Blockkurvan behöver fullständiga röster för alla åtta partier.')); $('race-value').textContent = ''; $('race-note').textContent = 'Historik för detta område saknas ännu.'; return; }
  const W = matchMedia('(max-width:700px)').matches ? 420 : 1000, H = 260, left = 54, right = 22, top = 25, bottom = 33;
  const first = points[0], last = points.at(-1), values = points.map(p => p.blockGap), observedMin = Math.min(...values), observedMax = Math.max(...values), spread = Math.max(0.8, observedMax - observedMin), pad = Math.max(0.4, spread * .18), zoomed = $('race-scale').value === 'zoom', minimum = zoomed ? observedMin - pad : Math.min(0, observedMin - pad), maximumValue = zoomed ? observedMax + pad : Math.max(0, observedMax + pad), maximum = Math.max(2, Math.max(Math.abs(minimum), Math.abs(maximumValue)));
  const x = time => points.length === 1 ? (W + left - right) / 2 : left + (time - first.capturedAt) / (last.capturedAt - first.capturedAt || 1) * (W - left - right);
  const y = gap => zoomed ? top + (maximumValue - gap) / (maximumValue - minimum) * (H - top - bottom) : top + (maximum - gap) / (2 * maximum) * (H - top - bottom);
  const svg = svgNode('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Blockens försprång i ${title(area)}. Positivt betyder större vänsterblock. Negativt betyder större högerblock. Använd reglaget för exakta observationer.` });
  const zeroY = Math.max(top, Math.min(H - bottom, y(0)));
  svg.append(svgNode('rect', { x: left, y: top, width: W - left - right, height: zeroY - top, fill: '#fcf0ed' }), svgNode('rect', { x: left, y: zeroY, width: W - left - right, height: H - bottom - zeroY, fill: '#eff5fa' }));
  const ticks = zoomed ? [minimum, minimum + (maximumValue-minimum)/4, minimum + (maximumValue-minimum)/2, minimum + (maximumValue-minimum)*.75, maximumValue] : [-maximum, -maximum / 2, 0, maximum / 2, maximum];
  for (const gap of ticks) {
    svg.append(svgNode('line', { x1: left, x2: W - right, y1: y(gap), y2: y(gap), class: Math.abs(gap) < 1e-8 ? 'race-zero' : 'chart-grid' }));
    const label = svgNode('text', { x: left - 8, y: y(gap) + 4, 'text-anchor': 'end' }); label.textContent = signed(gap); svg.append(label);
  }
  let path = '', down = false;
  for (const point of trends) { if (!Number.isFinite(point.blockGap)) { down = false; continue; } path += `${down ? 'L' : 'M'}${x(point.capturedAt)},${y(point.blockGap)} `; down = true; }
  svg.append(svgNode('path', { d: path, fill: 'none', stroke: '#647753', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
  for (const [point, anchor] of [[first, 'start'], [last, 'end']]) { if (points.length === 1 && anchor === 'end') continue; const label = svgNode('text', { x: x(point.capturedAt), y: H - 8, 'text-anchor': points.length === 1 ? 'middle' : anchor }); label.textContent = clock.format(point.capturedAt); svg.append(label); }
  for (const event of milestones(trends, { regional: Boolean(area) }).filter(event => event.type === 'lead')) {
    const dot = svgNode('circle', { cx: x(event.point.capturedAt), cy: y(event.point.blockGap), r: 4, fill: '#ec7146' }); const caption = svgNode('title'); caption.textContent = `${clock.format(event.point.capturedAt)}: ${event.leader} tar ledningen i inspelningen`; dot.append(caption); svg.append(dot);
  }
  const current = points.find(point => point.id === currentId);
  if (context.replayMode && current) svg.append(svgNode('line', { x1: x(current.capturedAt), x2: x(current.capturedAt), y1: top, y2: H - bottom, class: 'race-replay' }));
  const marker = svgNode('circle', { r: 5, fill: '#647753', stroke: 'white', 'stroke-width': 2 }); svg.append(marker); $('race-chart').append(svg);
  $('race-position').max = points.length - 1;
  let index = points.findIndex(point => point.id === (raceSelection?.area === area ? raceSelection.id : currentId)); if (index < 0) index = points.length - 1;
  $('race-position').value = index;
  const select = () => { const point = points[Number($('race-position').value)]; marker.setAttribute('cx', x(point.capturedAt)); marker.setAttribute('cy', y(point.blockGap)); $('race-value').textContent = `${clock.format(point.capturedAt)} · ${Math.abs(point.blockGap) < 1e-8 ? 'Lika' : `${point.blockGap > 0 ? 'Vänster' : 'Höger'} +${dec.format(Math.abs(point.blockGap))} pp`}`; $('race-position').setAttribute('aria-valuetext', $('race-value').textContent); };
  $('race-position').oninput = () => { raceSelection = { area, id: points[Number($('race-position').value)].id }; select(); };
  $('race-jump').onclick = () => jump(points[Number($('race-position').value)].id);
  svg.onclick = event => { const rect = svg.getBoundingClientRect(), cursor = (event.clientX - rect.left) / rect.width * W; const index = points.reduce((best, point, i) => Math.abs(x(point.capturedAt) - cursor) < Math.abs(x(points[best].capturedAt) - cursor) ? i : best, 0); $('race-position').value = index; $('race-position').oninput(); };
  select(); $('race-note').textContent = `${points.length} observationer · S + V + MP + C mot M + KD + SD + L. Beräknat från röstantal, inte avrundade andelar. Orange punkter visar observerade ledningsbyten. Luckor lämnas öppna; mellanliggande resultat är okända.`;
}
function eventTitle(event) {
  if (event.type === 'start') return 'Här börjar inspelningen';
  if (event.type === 'district') return `Minst ${number.format(event.threshold)} distrikt räknade`;
  if (event.type === 'lead') return `${event.leader} tar ledningen i inspelningen`;
  return `${event.key} ${event.above ? 'når minst' : 'går under'} 4 % i räkningen`;
}
function renderMilestones(currentIndex) {
  const { trends, area, replayMode } = context;
  const available = currentIndex < 0 ? [] : trends.slice(0, currentIndex + 1);
  const events = milestones(available, { regional: Boolean(area) }).filter(event => $('milestone-filter').value === 'all' || event.type === $('milestone-filter').value).reverse();
  $('milestone-context').textContent = `${replayMode ? 'Händelser fram till vald replay-tidpunkt.' : 'Händelser i den sparade inspelningen.'} ${area ? `Blockbyten gäller ${area}; distriktsmilstolpar gäller hela riket. Passager vid 4 % visas endast för hela riket.` : 'Passager vid 4 % är observerade röstandelar, inte besked om mandat.'} Tidpunkter avser när vi hämtade resultatet.`;
  $('milestone-list').replaceChildren(...events.slice(0, eventLimit).map(event => {
    const button = node('button', 'milestone-event'); button.type = 'button'; button.dataset.snapshot = event.snapshotId;
    const text = node('span'); text.append(node('strong', '', eventTitle(event)), node('small', '', `${clock.format(event.point.capturedAt)} · ${number.format(event.point.districts)} distrikt i hela riket · Visa tidpunkten ↗`));
    button.append(node('span', '', event.type === 'lead' ? '⇄' : event.type === 'threshold' ? '↕' : event.type === 'start' ? '◷' : '✓'), text); button.onclick = () => jump(event.snapshotId); return button;
  }));
  if (!events.length) $('milestone-list').append(node('p', 'empty-state', 'Inga sådana händelser har observerats i denna del av inspelningen.'));
  $('more-milestones').hidden = events.length <= eventLimit;
}
$('changes-baseline').addEventListener('change', () => { if (context) renderStories(context); });
$('milestone-filter').addEventListener('change', () => { eventLimit = 8; if (context) renderStories(context); });
$('more-milestones').addEventListener('click', () => { eventLimit += 12; if (context) renderStories(context); });
matchMedia('(max-width:700px)').addEventListener('change', () => { if (context) renderStories(context); });
