<script lang="ts">
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { partiesFor, filterParties, partyName, partyKey, comparison, numeric } from './model.ts';
  import type { Party } from './types.ts';
  import PartyRow from './PartyRow.svelte';

  const view = $derived(currentView.area);
  const comparable = $derived(currentView.data?.jamforbar !== false && view?.jamforbar !== false);
  const compare = (party: Party) => comparison(party, currentView.data, filters.comparisonMode, comparable);
  const validVotes = $derived(numeric(view?.rosterPaverkaMandat?.antalRoster));

  const filteredParties = $derived(
    filterParties(partiesFor(view), { selected: filters.selected, query: filters.query, threshold: filters.threshold })
  );
  const sortedParties = $derived.by(() => {
    const list = [...filteredParties];
    list.sort((a, b) =>
      filters.sort === 'name' ? partyName(a).localeCompare(partyName(b), 'sv')
      : filters.sort === 'change' ? (compare(b).delta ?? -Infinity) - (compare(a).delta ?? -Infinity)
      : b.antalRoster - a.antalRoster
    );
    return list;
  });
  const max = $derived(Math.max(35, ...partiesFor(view).flatMap(p => [p.andelRoster || 0, compare(p).share || 0])));
  const columnCount = $derived(5 + (filters.detailsExpanded ? 2 : 0));
</script>

<table class="results-table">
  <thead>
    <tr>
      <th scope="col">PARTI</th>
      <th scope="col" class="chart-heading">RÖSTANDEL <span>4 % riksdagsspärr</span></th>
      <th scope="col" class="numeric">2026</th>
      <th scope="col" class="numeric">{filters.comparisonMode === 'national' ? 'MOT RIKET' : 'FÖRÄNDRING'}</th>
      <th scope="col" class="numeric">RÖSTER</th>
      {#if filters.detailsExpanded}
        <th scope="col" class="numeric">2022 %</th>
        <th scope="col" class="numeric">RÖSTER 2022</th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#if !sortedParties.length}
      <tr><td colspan={columnCount} class="loading">{view ? 'Inga partier matchar filtren.' : 'Inget sparat resultat för detta område vid denna tidpunkt.'}</td></tr>
    {/if}
    {#each sortedParties as party (partyKey(party))}
      <PartyRow {party} baseline={compare(party)} {max} {validVotes} version={currentView.data} detailsExpanded={filters.detailsExpanded} />
    {/each}
  </tbody>
</table>

<style>
  .results-table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); }
  thead { border-bottom: 1px solid var(--line); }
  thead th { height: 34px; color: var(--muted); font-family: var(--font-display); font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; text-align: left; padding: 0 8px; }
  .chart-heading span { font-size: 9px; font-weight: 400; margin-left: 12px; color: var(--muted); text-transform: none; letter-spacing: 0; }
  .numeric { text-align: right; }
  .loading { text-align: center; padding: 30px; color: var(--muted); font-size: 12px; }
  tbody { font-size: 12px; }
</style>
