<script lang="ts">
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { geography } from './geography.svelte.ts';
  import { partiesFor, partyKey, partyName, colors, names, filterParties, comparison, csvCell } from './model.ts';
  import { download } from './download.ts';
  import type { Party } from './types.ts';

  const available = $derived<Party[]>(
    partiesFor(currentView.data).length
      ? partiesFor(currentView.data)
      : Object.keys(names).map(key => ({ partiforkortning: key, partibeteckning: key, antalRoster: 0, andelRoster: null }))
  );

  const regionNames = $derived([...new Set(geography.regions.map(r => r.name))].sort((a, b) => a.localeCompare(b, 'sv')));

  function exportCsv() {
    const comparable = currentView.data?.jamforbar !== false && currentView.area?.jamforbar !== false;
    const parties = filterParties(partiesFor(currentView.area), { selected: filters.selected, query: filters.query, threshold: filters.threshold });
    const rows = [
      ['Område', 'Källans uppdateringstid', 'Läge', 'Parti', 'Röster 2026', 'Andel 2026 (%)', 'Andel 2022 (%)', 'Röster 2022', 'Jämförelse', 'Skillnad (procentenheter)'],
      ...parties.map(p => {
        const delta = comparison(p, currentView.data, filters.comparisonMode, comparable).delta;
        return [filters.area || 'Hela riket', currentView.data?.senasteUppdateringstid, historyStore.replayMode ? 'Inspelning' : 'Live', partyName(p), p.antalRoster, p.andelRoster, p.andelRosterForegaendeVal, p.antalRosterForegaendeVal, filters.comparisonMode, delta == null ? null : Math.round(delta * 10) / 10];
      }),
    ];
    download('﻿' + rows.map(row => row.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8', 'val2026-resultat.csv');
  }

  function exportJson() {
    if (!currentView.data) return;
    download(
      JSON.stringify({ source: 'https://resultat.val.se/data/resultat/val2026/RD_P.json', mode: historyStore.replayMode ? 'replay' : 'live', snapshotId: historyStore.replayMode ? historyStore.entries[historyStore.replayIndex]?.id : null, area: filters.area || 'Hela riket', data: currentView.data }, null, 2),
      'application/json',
      'val2026-ogonblicksbild.json'
    );
  }
</script>

<div class="filter-panel">
  <div class="filter-top">
    <label class="area-field">VÄLJ OMRÅDE
      <select bind:value={filters.area}>
        <option value="">Hela riket</option>
        {#each regionNames as name (name)}<option value={name}>{name}</option>{/each}
      </select>
    </label>
    <label>JÄMFÖR MED
      <select bind:value={filters.comparisonMode}>
        <option value="previous">Valet 2022</option>
        <option value="national">Hela riket 2026</option>
        <option value="none">Ingen jämförelse</option>
      </select>
    </label>
    <label>SORTERA
      <select bind:value={filters.sort}>
        <option value="votes">Flest röster</option>
        <option value="name">Namn</option>
        <option value="change">Störst förändring</option>
      </select>
    </label>
    <label>TRÖSKEL
      <select bind:value={filters.threshold}>
        <option value="all">Alla partier</option>
        <option value="above">Över 4 %</option>
        <option value="below">Under 4 %</option>
      </select>
    </label>
    <label>SÖK
      <input type="search" bind:value={filters.query} placeholder="Sök parti" />
    </label>
    <label class="check-label">
      <input type="checkbox" bind:checked={filters.detailsExpanded} /> Fler kolumner
    </label>
    <div class="filter-actions">
      <button type="button" onclick={exportCsv}>↓ CSV</button>
      <button type="button" onclick={exportJson} disabled={!currentView.data}>↓ JSON</button>
      <button type="button" onclick={() => filters.reset()}>Återställ</button>
    </div>
  </div>
  <div class="party-filter-line">
    {#each available as p (partyKey(p))}
      <button type="button" class="party-chip" class:selected={filters.selected.includes(partyKey(p))}
        style="--party-color: {colors[partyKey(p)] || '#92958c'}" title={partyName(p)}
        aria-pressed={filters.selected.includes(partyKey(p))}
        onclick={() => filters.toggleParty(partyKey(p))}>
        {partyKey(p)}
      </button>
    {/each}
  </div>
</div>

<style>
  .filter-panel { padding: 18px 20px; background: #fff; border: 1px solid #e5e6df; border-radius: 10px; margin-bottom: 20px; }
  .filter-top { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
  .filter-top label { display: flex; flex-direction: column; gap: 6px; font-size: 9px; letter-spacing: 0.8px; color: #7f8775; }
  select, input[type='search'] { font-size: 12px; padding: 8px 10px; border: 1px solid #dedfd6; border-radius: 6px; background: #fff; color: #444; }
  .check-label { flex-direction: row !important; align-items: center; gap: 6px !important; }
  .area-field select { min-width: 180px; }
  .filter-actions { display: flex; gap: 8px; margin-left: auto; }
  button[type='button']:disabled { opacity: 0.5; cursor: default; }
  button[type='button'] { border: 1px solid #dedfd6; background: #fafbf7; padding: 8px 12px; border-radius: 6px; color: #59634e; font-size: 11px; cursor: pointer; }
  .party-filter-line { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 16px; }
  .party-chip { min-width: 38px; padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--party-color) 20%, white); border-radius: 6px; background: color-mix(in srgb, var(--party-color) 6%, white); color: var(--party-color); font-weight: 650; font-size: 11px; cursor: pointer; }
  .party-chip.selected { color: white; background: var(--party-color); box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--party-color); }
</style>
