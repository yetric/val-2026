<script lang="ts">
  import { comparison } from './comparison.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { regions } from './regions.svelte.ts';
  import { allocateSeats, areaMetrics, colors, partiesFor, partyKey } from './model.ts';
  import type { ElectionData, Party } from './types.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null | undefined) => value == null ? '—' : `${decimal.format(value)} %`;
  const fmt = (value: number | null | undefined) => value == null ? '—' : number.format(value);

  function findArea(data: ElectionData | null, name: string): ElectionData | null {
    if (!data || !name) return null;
    const direct = data.valkretsar?.find(item => item.namn === name);
    if (direct) return direct;
    for (const parent of data.valkretsar || []) {
      const nested = parent.valkretsar?.find(item => item.namn === name);
      if (nested) return nested;
    }
    return null;
  }

  const availableAreas = $derived.by(() => {
    const names = new Set<string>();
    for (const item of currentView.data?.valkretsar || []) {
      if (item.namn) names.add(item.namn);
      for (const nested of item.valkretsar || []) if (nested.namn) names.add(nested.namn);
    }
    for (const entry of regions.entries) {
      if (entry.name) names.add(entry.name);
      for (const nested of entry.data?.valkretsar || []) if (nested.namn) names.add(nested.namn);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'sv'));
  });

  const left = $derived(findArea(currentView.data, filters.area));
  const right = $derived(findArea(currentView.data, comparison.area));
  const leftLabel = $derived(filters.area || 'Hela riket');
  const rightLabel = $derived(comparison.area || 'Välj område');
  const leftMetrics = $derived(areaMetrics(left || currentView.data, Boolean(left)));
  const rightMetrics = $derived(areaMetrics(right, true));
  const leftSeats = $derived(allocateSeats(left || currentView.data, filters.area ? 29 : 349));
  const rightSeats = $derived(allocateSeats(right, 29));

  function leader(area: ElectionData | null): Party | null {
    return [...partiesFor(area)].sort((a, b) => b.antalRoster - a.antalRoster)[0] || null;
  }
  function progress(metrics: ReturnType<typeof areaMetrics>) {
    return metrics.total && metrics.districts != null ? Math.min(100, metrics.districts / metrics.total * 100) : null;
  }
  function complete(metrics: ReturnType<typeof areaMetrics>) {
    return metrics.total != null && metrics.districts != null && metrics.districts >= metrics.total;
  }
  function topParties(area: ElectionData | null) {
    return [...partiesFor(area)].sort((a, b) => (b.andelRoster ?? -Infinity) - (a.andelRoster ?? -Infinity)).slice(0, 3);
  }
</script>

<section class="comparison" aria-labelledby="comparison-heading">
  <div class="section-top">
    <div>
      <h2 id="comparison-heading">Jämför områden</h2>
      <p>Se skillnaderna mellan två liveuppdaterade områden.</p>
    </div>
    {#if comparison.area}<button type="button" class="clear" onclick={comparison.clear}>Rensa jämförelse</button>{/if}
  </div>
  <div class="selectors">
    <label>OMRÅDE A
      <select bind:value={filters.area}>
        <option value="">Hela riket</option>
        {#each availableAreas as name (name)}<option value={name}>{name}</option>{/each}
      </select>
    </label>
    <span class="versus" aria-hidden="true">VS</span>
    <label>OMRÅDE B
      <select value={comparison.area} onchange={(event) => comparison.setArea(event.currentTarget.value)}>
        <option value="">Välj område</option>
        {#each availableAreas as name (name)}<option value={name} disabled={name === filters.area}>{name}</option>{/each}
      </select>
    </label>
  </div>

  {#if !comparison.area}
    <p class="empty">Välj ett andra område för att öppna jämförelsen.</p>
  {:else if !right}
    <p class="empty">Område B saknas i den aktuella ögonblicksbilden.</p>
  {:else}
    <div class="compare-grid">
      {#each [{ label: leftLabel, data: left || currentView.data, metrics: leftMetrics, seats: leftSeats }, { label: rightLabel, data: right, metrics: rightMetrics, seats: rightSeats }] as item, index (index)}
        {@const itemLeader = leader(item.data)}
        {@const itemProgress = progress(item.metrics)}
        <article class="area-card">
          <div class="area-heading">
            <span>Område {index === 0 ? 'A' : 'B'}</span>
            <strong>{item.label}</strong>
            {#if complete(item.metrics)}<b>✓ Klar</b>{/if}
          </div>
          <div class="progress-label"><span>Räknat</span><strong>{itemProgress == null ? '—' : `${decimal.format(itemProgress)} %`}</strong></div>
          <div class="progress-track"><i style="width: {itemProgress || 0}%"></i></div>
          <dl>
            <div><dt>Distrikt</dt><dd>{fmt(item.metrics.districts)} / {fmt(item.metrics.total)}</dd></div>
            <div><dt>Valdeltagande</dt><dd>{pct(item.metrics.turnout)}</dd></div>
            <div><dt>Ledande parti</dt><dd>{itemLeader ? `${partyKey(itemLeader)} · ${pct(itemLeader.andelRoster)}` : '—'}</dd></div>
            <div><dt>Mandat, uppskattning</dt><dd>{item.seats ? `${item.seats.parties.reduce((sum, party) => sum + party.seats, 0)} / ${item.seats.seats}` : '—'}</dd></div>
          </dl>
          <div class="party-list">
            {#each topParties(item.data) as party (partyKey(party))}
              <div><span><i style="background: {colors[partyKey(party)] || '#92958c'}"></i>{partyKey(party)}</span><strong>{pct(party.andelRoster)}</strong></div>
            {/each}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .comparison { margin: 0 0 44px; }
  .section-top { display: flex; justify-content: space-between; align-items: start; gap: 16px; margin-bottom: 14px; }
  h2 { font-size: 22px; margin: 0 0 4px; }
  p { color: var(--muted); font-size: 12px; margin: 0; }
  .clear { border: 1px solid var(--line); background: transparent; color: var(--muted); padding: 7px 10px; cursor: pointer; font: inherit; font-size: 11px; }
  .clear:hover { border-color: var(--red-bright); color: var(--text); }
  .selectors { display: flex; align-items: end; gap: 12px; margin-bottom: 12px; padding: 14px; background: var(--panel); border: 1px solid var(--line); }
  label { display: flex; flex: 1; flex-direction: column; gap: 6px; color: var(--muted); font-family: var(--font-display); font-size: 10px; letter-spacing: 1.4px; }
  select { min-width: 0; padding: 8px 10px; border: 1px solid var(--line); background: #000; color: var(--text); font: inherit; font-size: 12px; }
  .versus { padding-bottom: 9px; color: var(--red-bright); font-family: var(--font-display); font-size: 11px; font-weight: 700; }
  .empty { padding: 22px; border: 1px dashed var(--line); text-align: center; }
  .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .area-card { padding: 18px; background: var(--panel); }
  .area-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .area-heading span { color: var(--muted); font-family: var(--font-display); font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; }
  .area-heading strong { flex: 1; font-family: var(--font-display); font-size: 18px; }
  .area-heading b { color: var(--green-up); font-size: 11px; }
  .progress-label { display: flex; justify-content: space-between; color: var(--muted); font-size: 11px; }
  .progress-label strong { color: var(--text); font-family: var(--font-display); }
  .progress-track { height: 4px; margin: 7px 0 14px; background: var(--line-soft); }
  .progress-track i { display: block; height: 100%; background: var(--red-bright); }
  dl { margin: 0; }
  dl div { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--line-soft); font-size: 11px; }
  dt { color: var(--muted); } dd { margin: 0; text-align: right; font-family: var(--font-display); }
  .party-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 14px; }
  .party-list div { display: flex; justify-content: space-between; gap: 6px; padding: 7px; background: #000; font-family: var(--font-display); font-size: 11px; }
  .party-list span { display: flex; align-items: center; gap: 5px; }
  .party-list i { width: 7px; height: 7px; }
  @media (max-width: 700px) {
    .selectors, .compare-grid { grid-template-columns: 1fr; }
    .selectors { display: grid; }
    .versus { display: none; }
    .party-list { grid-template-columns: 1fr; }
  }
</style>
