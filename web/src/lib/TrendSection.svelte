<script lang="ts">
  import { trends } from './trends.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { colors, names } from './model.ts';
  import type { TrendPoint } from './types.ts';

  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const changeDecimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = new Intl.NumberFormat('sv-SE');
  const clock = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));

  let trendWindowDistricts = $state(500);

  const W = 1000, H = 290, left = 45, right = 30, top = 22, bottom = 34;

  const points = $derived(trends.points.filter((p): p is TrendPoint & { shares: Record<string, number> } => p.shares != null));
  const keys = $derived(filters.selected.length ? filters.selected : [...new Set(points.flatMap(p => Object.keys(p.shares)))]);

  const minTime = $derived(points[0]?.capturedAt ?? 0);
  const maxTime = $derived(points.at(-1)?.capturedAt ?? minTime);
  const maxShare = $derived(Math.max(10, Math.ceil(Math.max(0, ...points.flatMap(p => keys.map(key => p.shares[key] || 0))) / 5) * 5));
  const x = (time: number) => left + ((time - minTime) / (maxTime - minTime || 1)) * (W - left - right);
  const y = (share: number) => H - bottom - (share / maxShare) * (H - top - bottom);

  const ticks = $derived(Array.from({ length: 5 }, (_, i) => (maxShare * i) / 4));

  const linePaths = $derived(
    keys.map(key => {
      let path = '', penDown = false;
      for (const point of points) {
        const value = point.shares[key];
        if (value == null) { penDown = false; continue; }
        path += `${penDown ? 'L' : 'M'}${x(point.capturedAt)},${y(value)} `;
        penDown = true;
      }
      return { key, path, color: colors[key] || '#92958c', singlePoint: points.length === 1 ? points[0].shares[key] : null };
    })
  );

  const hitAreas = $derived(
    points.map((point, index) => {
      const start = index ? (x(point.capturedAt) + x(points[index - 1].capturedAt)) / 2 : left;
      const end = index === points.length - 1 ? W - right : (x(point.capturedAt) + x(points[index + 1].capturedAt)) / 2;
      const title = `${clock.format(point.capturedAt)} · ${fmt(point.districts)} distrikt i hela riket\n${keys.map(key => `${key}: ${point.shares[key] != null ? `${decimal.format(point.shares[key])} %` : '—'}`).join('\n')}`;
      return { point, x: start, width: Math.max(1, end - start), title };
    })
  );

  const currentEntry = $derived(historyStore.replayMode ? historyStore.entries[historyStore.replayIndex] : historyStore.entries.at(-1));

  const windowLatest = $derived(points.at(-1));
  const windowEarlier = $derived.by(() => {
    if (!windowLatest) return undefined;
    const target = windowLatest.districts - trendWindowDistricts;
    return [...points].reverse().find(p => p.districts <= target) || points[0];
  });
  const windowItems = $derived(
    windowLatest && windowEarlier
      ? keys.map(key => {
          const latestShare = windowLatest.shares[key], earlierShare = windowEarlier.shares[key];
          const delta = latestShare != null && earlierShare != null ? latestShare - earlierShare : null;
          return { key, delta };
        })
      : []
  );

  function jumpTo(point: TrendPoint) {
    const index = historyStore.entries.findIndex(entry => entry.id === point.id);
    if (index >= 0) { historyStore.stop(); historyStore.showSnapshot(index); }
  }
</script>

<section class="trend-section" id="trend-section">
  <div class="section-top">
    <div>
      <div class="eyebrow">FÖLJ FÖRÄNDRINGEN</div>
      <h2>Valnattens kurvor</h2>
    </div>
  </div>
  <p class="section-description">Röstandelar vid varje sparat resultat. Välj partier ovan för att fokusera. Klicka på en punkt för att spela upp därifrån.</p>

  {#if !trends.ready}
    <p class="empty-state">Hämtar områdets historik…</p>
  {:else if !points.length}
    <p class="empty-state">Det finns ännu ingen sparad kurva för detta område.</p>
  {:else}
    <div class="trend-window">
      <div class="trend-window-heading">
        <strong>Trend senaste {number.format(trendWindowDistricts)} distrikt</strong>
        <label>Visa
          <select bind:value={trendWindowDistricts}>
            <option value={100}>100 distrikt</option>
            <option value={500}>500 distrikt</option>
            <option value={1000}>1 000 distrikt</option>
            <option value={2000}>2 000 distrikt</option>
          </select>
        </label>
        {#if windowLatest && windowEarlier}
          <span class="subtle">{fmt(windowLatest.districts - windowEarlier.districts)} distrikt · {clock.format(windowEarlier.capturedAt)}–{clock.format(windowLatest.capturedAt)}</span>
        {/if}
      </div>
      <div class="trend-window-list">
        {#each windowItems as item (item.key)}
          <span class="trend-window-item" class:positive={(item.delta ?? 0) > 0} class:negative={(item.delta ?? 0) < 0}>
            <strong>{item.key}</strong>
            <span>{item.delta == null ? '—' : `${item.delta > 0 ? '+' : item.delta < 0 ? '−' : ''}${changeDecimal.format(Math.abs(item.delta))} pp`}</span>
          </span>
        {/each}
      </div>
    </div>

    <div class="trend-chart">
      <svg viewBox="0 0 {W} {H}" role="img" aria-label="Röstandel över tid. {points.length} sparade observationer. Välj en punkt för att visa resultatet.">
        {#each ticks as value}
          <line x1={left} x2={W - right} y1={y(value)} y2={y(value)} class="chart-grid" />
          <text x={left - 10} y={y(value) + 4} text-anchor="end">{decimal.format(value)} %</text>
        {/each}
        <text x={x(minTime)} y={H - 8} text-anchor="start">{clock.format(minTime)}</text>
        <text x={x(maxTime)} y={H - 8} text-anchor="end">{clock.format(maxTime)}</text>
        {#each linePaths as line (line.key)}
          <path d={line.path} fill="none" stroke={line.color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          {#if line.singlePoint != null}
            <circle cx={x(minTime)} cy={y(line.singlePoint)} r="4" fill={line.color} />
          {/if}
        {/each}
        {#if currentEntry && currentEntry.capturedAt >= minTime}
          <line x1={x(currentEntry.capturedAt)} x2={x(currentEntry.capturedAt)} y1={top} y2={H - bottom} class="chart-cursor" />
        {/if}
        {#each hitAreas as hit (hit.point.id)}
          <!-- Mouse-only hit target; keyboard users have the replay timeline/step buttons. -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <rect x={hit.x} y={top} width={hit.width} height={H - top - bottom} fill="transparent" class="chart-hit" onclick={() => jumpTo(hit.point)}>
            <title>{hit.title}</title>
          </rect>
        {/each}
      </svg>
    </div>
    <div class="trend-legend">
      {#each keys as key (key)}
        <span><i style="background: {colors[key] || '#92958c'}"></i>{names[key] || key}</span>
      {/each}
    </div>
    <p class="subtle" role="status">{points.length} observationer · tid då resultatet hämtades. {filters.area ? 'Äldre nationella inspelningar utan regionala uppgifter ingår inte.' : 'Linjerna förbinder faktiska observationer; mellanliggande resultat är inte kända.'}</p>
  {/if}
</section>

<style>
  .trend-section { padding: 24px; background: var(--panel); border: 1px solid var(--line); }
  .section-top { margin-bottom: 6px; }
  .eyebrow { font-family: var(--font-display); font-size: 12px; font-weight: 650; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }
  h2 { font-size: 22px; font-weight: 700; letter-spacing: 0.3px; margin: 4px 0 0; }
  .section-description { font-size: 12px; color: var(--muted); margin: 8px 0 16px; }
  .empty-state { padding: 24px; text-align: center; color: var(--muted); font-size: 12px; }
  .subtle { font-size: 11px; color: var(--muted); }
  .trend-window { margin: 0 0 14px; padding: 10px 12px; border: 1px solid var(--line); background: var(--bg); }
  .trend-window-heading { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-family: var(--font-display); font-size: 12px; }
  .trend-window-heading select { font-size: 11px; padding: 4px 6px; border: 1px solid var(--line); background: #000; color: var(--text); }
  .trend-window-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .trend-window-item { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: var(--line-soft); font-family: var(--font-display); font-size: 11px; }
  .trend-window-item.positive { color: var(--green-up); }
  .trend-window-item.negative { color: var(--red-bright); }
  .trend-chart svg { width: 100%; height: auto; display: block; cursor: crosshair; }
  .trend-chart text { font-family: var(--font-display); font-size: 10px; fill: var(--muted); }
  .chart-grid { stroke: var(--line-soft); stroke-width: 1; }
  .chart-cursor { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 4 4; }
  .trend-legend { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 10px; font-family: var(--font-display); font-size: 11px; color: var(--muted); }
  .trend-legend span { display: flex; align-items: center; gap: 6px; }
  .trend-legend i { width: 8px; height: 8px; }
</style>
