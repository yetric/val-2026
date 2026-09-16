<script lang="ts">
  import { trends } from './trends.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { recentChanges, milestones } from './story.ts';
  import { names } from './model.ts';
  import type { MilestoneEvent, TrendPoint } from './types.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const dec = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const clock = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });
  const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${dec.format(Math.abs(value))}`;
  const whole = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number.format(Math.abs(value))}`;
  const title = (area: string) => area || 'Hela riket';

  let initialVisitId: string | null = null;
  try { initialVisitId = localStorage.getItem('val2026-last-observation'); } catch { /* private mode */ }

  let changesBaseline = $state<'previous' | 'visit'>('previous');
  let raceScale = $state<'zoom' | 'full'>('zoom');
  let raceIndex = $state<number | null>(null);
  let milestoneFilter = $state<'all' | 'district' | 'threshold' | 'lead'>('all');
  let eventLimit = $state(8);

  const currentId = $derived(historyStore.replayMode ? historyStore.entries[historyStore.replayIndex]?.id : historyStore.entries.at(-1)?.id);
  const currentIndex = $derived(trends.points.findIndex(point => point.id === currentId));

  $effect(() => {
    if (!historyStore.replayMode && currentId) { try { localStorage.setItem('val2026-last-observation', currentId); } catch { /* private mode */ } }
  });

  // --- Recent changes cards ---
  const visitIndex = $derived(trends.points.findIndex(point => point.id === initialVisitId));
  const baselineIndex = $derived(changesBaseline === 'visit' ? visitIndex : currentIndex - 1);
  const beforePoint = $derived(baselineIndex >= 0 && baselineIndex <= currentIndex ? trends.points[baselineIndex] : null);
  const afterPoint = $derived(currentIndex >= 0 ? trends.points[currentIndex] : null);
  const changes = $derived(recentChanges(beforePoint, afterPoint));
  const changesContext = $derived(
    changes && beforePoint && afterPoint
      ? `${title(filters.area)} · ${clock.format(beforePoint.capturedAt)} → ${clock.format(afterPoint.capturedAt)} · ${historyStore.replayMode ? 'fram till vald replay-tidpunkt' : 'senaste sparade resultat'}`
      : changesBaseline === 'visit'
        ? 'Det finns inget tidigare besök att jämföra med före den valda tidpunkten.'
        : 'Två på varandra följande observationer för området behövs för en jämförelse.'
  );
  const changeCards = $derived.by(() => {
    if (!changes) return [];
    const party = changes.parties[0];
    return [
      { label: 'RÄKNADE DISTRIKT', value: whole(changes.districts), note: 'Förändring i hela riket' },
      { label: 'RÄKNADE RÖSTER', value: changes.votes == null ? '—' : whole(changes.votes), note: `Inklusive ogiltiga · ${title(filters.area)}` },
      { label: 'STÖRSTA PARTIFÖRÄNDRING', value: party ? `${party.key} ${signed(party.delta)} pp` : '—', note: party ? names[party.key] || party.key : 'Uppgift saknas' },
      { label: 'BLOCKENS FÖRSPRÅNG', value: changes.gap == null ? '—' : `${signed(changes.gap)} pp`, note: changes.gap == null ? 'Fullständiga blockuppgifter saknas' : Math.abs(changes.gap) < 1e-8 ? 'Oförändrad skillnad' : changes.gap > 0 ? 'Förskjutning mot vänster' : 'Förskjutning mot höger' },
    ];
  });

  // --- Race chart (block gap over time) ---
  const racePoints = $derived(trends.points.filter((p): p is TrendPoint & { blockGap: number } => Number.isFinite(p.blockGap)));
  const RW = 1000, RH = 260, rLeft = 54, rRight = 22, rTop = 25, rBottom = 33;
  const raceFirst = $derived(racePoints[0]);
  const raceLast = $derived(racePoints.at(-1));
  const raceBounds = $derived.by(() => {
    if (!racePoints.length) return null;
    const values = racePoints.map(p => p.blockGap);
    const observedMin = Math.min(...values), observedMax = Math.max(...values);
    const spread = Math.max(0.8, observedMax - observedMin), pad = Math.max(0.4, spread * 0.18);
    const zoomed = raceScale === 'zoom';
    const minimum = zoomed ? observedMin - pad : Math.min(0, observedMin - pad);
    const maximumValue = zoomed ? observedMax + pad : Math.max(0, observedMax + pad);
    const maximum = Math.max(2, Math.max(Math.abs(minimum), Math.abs(maximumValue)));
    return { zoomed, minimum, maximumValue, maximum };
  });
  function raceX(time: number): number {
    if (!raceFirst || !raceLast) return rLeft;
    return racePoints.length === 1 ? (RW + rLeft - rRight) / 2 : rLeft + ((time - raceFirst.capturedAt) / (raceLast.capturedAt - raceFirst.capturedAt || 1)) * (RW - rLeft - rRight);
  }
  function raceY(gap: number): number {
    if (!raceBounds) return rTop;
    const { zoomed, minimum, maximumValue, maximum } = raceBounds;
    return zoomed ? rTop + ((maximumValue - gap) / (maximumValue - minimum)) * (RH - rTop - rBottom) : rTop + ((maximum - gap) / (2 * maximum)) * (RH - rTop - rBottom);
  }
  const raceZeroY = $derived(raceBounds ? Math.max(rTop, Math.min(RH - rBottom, raceY(0))) : rTop);
  const raceTicks = $derived.by(() => {
    if (!raceBounds) return [];
    const { zoomed, minimum, maximumValue, maximum } = raceBounds;
    return zoomed ? [minimum, minimum + (maximumValue - minimum) / 4, minimum + (maximumValue - minimum) / 2, minimum + (maximumValue - minimum) * 0.75, maximumValue] : [-maximum, -maximum / 2, 0, maximum / 2, maximum];
  });
  const racePath = $derived.by(() => {
    let path = '', down = false;
    for (const point of trends.points) {
      if (!Number.isFinite(point.blockGap)) { down = false; continue; }
      path += `${down ? 'L' : 'M'}${raceX(point.capturedAt)},${raceY(point.blockGap as number)} `;
      down = true;
    }
    return path;
  });
  const leadEvents = $derived(milestones(trends.points, { regional: Boolean(filters.area) }).filter((event): event is Extract<MilestoneEvent, { type: 'lead' }> => event.type === 'lead'));
  const raceCurrentPoint = $derived(racePoints.find(point => point.id === currentId));
  const raceSelectedIndex = $derived(raceIndex != null && raceIndex >= 0 && raceIndex < racePoints.length ? raceIndex : racePoints.length - 1);
  const raceSelectedPoint = $derived(racePoints[raceSelectedIndex]);
  const raceValueLabel = $derived(
    raceSelectedPoint ? `${clock.format(raceSelectedPoint.capturedAt)} · ${Math.abs(raceSelectedPoint.blockGap) < 1e-8 ? 'Lika' : `${raceSelectedPoint.blockGap > 0 ? 'Vänster' : 'Höger'} +${dec.format(Math.abs(raceSelectedPoint.blockGap))} pp`}` : ''
  );

  // --- Milestones ---
  const availablePoints = $derived(currentIndex < 0 ? [] : trends.points.slice(0, currentIndex + 1));
  const milestoneEvents = $derived(milestones(availablePoints, { regional: Boolean(filters.area) }).filter(event => milestoneFilter === 'all' || event.type === milestoneFilter).reverse());
  const visibleMilestones = $derived(milestoneEvents.slice(0, eventLimit));

  function eventTitle(event: MilestoneEvent): string {
    if (event.type === 'start') return 'Här börjar inspelningen';
    if (event.type === 'district') return `Minst ${number.format(event.threshold)} distrikt räknade`;
    if (event.type === 'lead') return `${event.leader} tar ledningen i inspelningen`;
    return `${event.key} ${event.above ? 'når minst' : 'går under'} 4 % i räkningen`;
  }
  function jump(id: string) {
    const index = historyStore.entries.findIndex(entry => entry.id === id);
    if (index >= 0) { historyStore.stop(); historyStore.showSnapshot(index); }
  }
</script>

<section class="night-story" id="night-story">
  <div class="section-top">
    <div><div class="eyebrow">VALNATTEN BERÄTTAR</div><h2>Vad har hänt?</h2></div>
    <label class="sort-label">Jämför
      <select bind:value={changesBaseline}>
        <option value="previous">Med föregående observation</option>
        <option value="visit">Sedan förra besöket</option>
      </select>
    </label>
  </div>
  {#if !trends.ready}
    <p class="subtle">Hämtar områdets inspelning…</p>
  {:else}
    <p class="subtle">{changesContext}</p>
    <div class="changes-cards">
      {#each changeCards as card (card.label)}
        <article class="change-card">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.note}</p>
        </article>
      {/each}
    </div>
    <p class="subtle">Räknade distrikt gäller hela riket. Röster och partier gäller valt område. Förändringen beskriver sparade resultat, inte en prognos.</p>
  {/if}
</section>

<section class="night-race">
  <div class="section-top">
    <div><div class="eyebrow">BLOCKENS FÖRSPRÅNG</div><h2>Vänster mot höger</h2></div>
    <span class="subtle">{title(filters.area)}</span>
    <select bind:value={raceScale} aria-label="Skala för blockgapgrafen">
      <option value="zoom">Zooma variation</option>
      <option value="full">Visa från noll</option>
    </select>
  </div>
  {#if !trends.ready}
    <p class="subtle">Hämtar områdets inspelning…</p>
  {:else if !racePoints.length}
    <p class="empty-state">Blockkurvan behöver fullständiga röster för alla åtta partier.</p>
  {:else}
    <div class="race-chart">
      <svg viewBox="0 0 {RW} {RH}" role="img" aria-label="Blockens försprång i {title(filters.area)}. Positivt betyder större vänsterblock. Negativt betyder större högerblock.">
        <rect x={rLeft} y={rTop} width={RW - rLeft - rRight} height={raceZeroY - rTop} fill="#fcf0ed" />
        <rect x={rLeft} y={raceZeroY} width={RW - rLeft - rRight} height={RH - rBottom - raceZeroY} fill="#eff5fa" />
        {#each raceTicks as gap}
          <line x1={rLeft} x2={RW - rRight} y1={raceY(gap)} y2={raceY(gap)} class={Math.abs(gap) < 1e-8 ? 'race-zero' : 'chart-grid'} />
          <text x={rLeft - 8} y={raceY(gap) + 4} text-anchor="end">{signed(gap)}</text>
        {/each}
        <path d={racePath} fill="none" stroke="#647753" stroke-width="2.5" stroke-linejoin="round" />
        {#if raceFirst}<text x={raceX(raceFirst.capturedAt)} y={RH - 8} text-anchor={racePoints.length === 1 ? 'middle' : 'start'}>{clock.format(raceFirst.capturedAt)}</text>{/if}
        {#if raceLast && racePoints.length > 1}<text x={raceX(raceLast.capturedAt)} y={RH - 8} text-anchor="end">{clock.format(raceLast.capturedAt)}</text>{/if}
        {#each leadEvents as event (event.id)}
          <circle cx={raceX(event.point.capturedAt)} cy={raceY(event.point.blockGap ?? 0)} r="4" fill="#ec7146"><title>{clock.format(event.point.capturedAt)}: {event.leader} tar ledningen i inspelningen</title></circle>
        {/each}
        {#if historyStore.replayMode && raceCurrentPoint}
          <line x1={raceX(raceCurrentPoint.capturedAt)} x2={raceX(raceCurrentPoint.capturedAt)} y1={rTop} y2={RH - rBottom} class="race-replay" />
        {/if}
        {#if raceSelectedPoint}
          <circle cx={raceX(raceSelectedPoint.capturedAt)} cy={raceY(raceSelectedPoint.blockGap)} r="5" fill="#647753" stroke="white" stroke-width="2" />
        {/if}
      </svg>
    </div>
    <div class="race-controls">
      <input type="range" min="0" max={racePoints.length - 1} value={raceSelectedIndex} disabled={racePoints.length < 2}
        oninput={(event: Event) => { raceIndex = Number((event.target as HTMLInputElement).value); }}
        aria-label="Välj observation" aria-valuetext={raceValueLabel} />
      <output>{raceValueLabel}</output>
      <button type="button" disabled={!racePoints.length} onclick={() => raceSelectedPoint && jump(raceSelectedPoint.id)}>Visa denna tidpunkt ↗</button>
    </div>
    <p class="subtle">{racePoints.length} observationer · S + V + MP + C mot M + KD + SD + L. Beräknat från röstantal, inte avrundade andelar. Orange punkter visar observerade ledningsbyten. Luckor lämnas öppna; mellanliggande resultat är okända.</p>
  {/if}
</section>

<section class="night-milestones">
  <div class="section-top">
    <div><div class="eyebrow">MILSTOLPAR</div><h2>Vägen hit</h2></div>
    <label class="sort-label">Visa
      <select bind:value={milestoneFilter} onchange={() => (eventLimit = 8)}>
        <option value="all">Alla händelser</option>
        <option value="district">Distriktströsklar</option>
        <option value="threshold">4 %-passager</option>
        <option value="lead">Ledningsbyten</option>
      </select>
    </label>
  </div>
  <p class="subtle">{historyStore.replayMode ? 'Händelser fram till vald replay-tidpunkt.' : 'Händelser i den sparade inspelningen.'} {filters.area ? `Blockbyten gäller ${filters.area}; distriktsmilstolpar gäller hela riket. Passager vid 4 % visas endast för hela riket.` : 'Passager vid 4 % är observerade röstandelar, inte besked om mandat.'} Tidpunkter avser när vi hämtade resultatet.</p>
  <div class="milestone-list">
    {#if !visibleMilestones.length}
      <p class="empty-state">Inga sådana händelser har observerats i denna del av inspelningen.</p>
    {/if}
    {#each visibleMilestones as event (event.id)}
      <button type="button" class="milestone-event" onclick={() => jump(event.snapshotId)}>
        <span class="icon">{event.type === 'lead' ? '⇄' : event.type === 'threshold' ? '↕' : event.type === 'start' ? '◷' : '✓'}</span>
        <span class="text">
          <strong>{eventTitle(event)}</strong>
          <small>{clock.format(event.point.capturedAt)} · {number.format(event.point.districts)} distrikt i hela riket · Visa tidpunkten ↗</small>
        </span>
      </button>
    {/each}
  </div>
  {#if milestoneEvents.length > eventLimit}
    <button type="button" class="more" onclick={() => (eventLimit += 12)}>Visa fler händelser</button>
  {/if}
</section>

<style>
  .night-story, .night-race, .night-milestones { background: #fff; border: 1px solid #e5e6df; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; }
  .night-story { background: #f0f2e9; }
  .section-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  .eyebrow { font-size: 9px; font-weight: 650; letter-spacing: 1.4px; color: #8a8e83; }
  h2 { font-family: Manrope, sans-serif; font-size: 19px; font-weight: 650; margin: 4px 0 0; }
  .sort-label { display: flex; align-items: center; gap: 8px; font-size: 10px; color: #7c8571; }
  .subtle { font-size: 10px; color: #8b9085; }
  .empty-state { padding: 20px; text-align: center; color: #859275; font-size: 12px; }
  .changes-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0 10px; }
  .change-card { background: #fff; border: 1px solid #e3e8d8; padding: 14px; border-radius: 7px; }
  .change-card span { display: block; color: #839074; font-size: 9px; }
  .change-card strong { display: block; font: 650 22px Manrope, sans-serif; margin-top: 8px; }
  .change-card p { font-size: 10px; color: #8c987e; margin: 6px 0 0; }
  .race-chart svg { width: 100%; height: auto; display: block; cursor: crosshair; }
  .race-chart text { font-size: 10px; fill: #7f8c73; }
  .chart-grid { stroke: #ecefe6; stroke-width: 1; }
  .race-zero { stroke: #a7b399; stroke-dasharray: 5 4; }
  .race-replay { stroke: #87937b; stroke-dasharray: 2 3; }
  .race-controls { display: flex; align-items: center; gap: 14px; margin: 12px 0; flex-wrap: wrap; }
  .race-controls input { flex: 1; min-width: 90px; accent-color: #859873; }
  .race-controls output { font-size: 11px; color: #61724e; }
  .race-controls button { border: 1px solid #dbe1d0; padding: 8px 12px; border-radius: 6px; background: #fafbf7; color: #657551; font-size: 11px; cursor: pointer; }
  .race-controls button:disabled { opacity: 0.5; cursor: default; }
  .milestone-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .milestone-event { display: flex; align-items: flex-start; gap: 10px; text-align: left; border: 1px solid #e5e9df; background: #fafbf7; border-radius: 7px; padding: 12px; cursor: pointer; color: #536147; font-family: inherit; }
  .milestone-event:hover { background: #f1f5e9; border-color: #c5d1b5; }
  .milestone-event .icon { display: grid; place-items: center; width: 24px; height: 24px; flex-shrink: 0; background: #e9edde; border-radius: 6px; font-size: 13px; }
  .milestone-event strong { display: block; font-size: 11px; font-weight: 550; }
  .milestone-event small { display: block; font-size: 9px; color: #8e9982; margin-top: 4px; }
  .more { margin-top: 12px; border: 1px solid #dbe1d0; padding: 9px 13px; border-radius: 6px; background: #fafbf7; color: #657551; font-size: 11px; cursor: pointer; }
</style>
