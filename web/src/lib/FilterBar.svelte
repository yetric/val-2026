<script lang="ts">
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { partiesFor, partyKey, partyName, colors, names } from './model.ts';
  import type { Party } from './types.ts';

  const available = $derived<Party[]>(
    partiesFor(currentView.data).length
      ? partiesFor(currentView.data)
      : Object.keys(names).map(key => ({ partiforkortning: key, partibeteckning: key, antalRoster: 0, andelRoster: null }))
  );
</script>

<div class="filter-panel">
  <div class="filter-top">
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
    <button type="button" onclick={() => filters.reset()}>Återställ</button>
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
  button[type='button'] { border: 1px solid #dedfd6; background: #fafbf7; padding: 8px 12px; border-radius: 6px; color: #59634e; font-size: 11px; cursor: pointer; }
  .party-filter-line { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 16px; }
  .party-chip { min-width: 38px; padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--party-color) 20%, white); border-radius: 6px; background: color-mix(in srgb, var(--party-color) 6%, white); color: var(--party-color); font-weight: 650; font-size: 11px; cursor: pointer; }
  .party-chip.selected { color: white; background: var(--party-color); box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--party-color); }
</style>
