<script lang="ts">
  import Header from './lib/Header.svelte';
  import FilterBar from './lib/FilterBar.svelte';
  import ReplayControls from './lib/ReplayControls.svelte';
  import ResultsTable from './lib/ResultsTable.svelte';
  import BlocksSection from './lib/BlocksSection.svelte';
  import MandatesSection from './lib/MandatesSection.svelte';
  import RegionsSection from './lib/RegionsSection.svelte';
  import CompletionSection from './lib/CompletionSection.svelte';
  import { liveResults } from './lib/liveResults.svelte.ts';
  import { filters } from './lib/filters.svelte.ts';
</script>

<Header />

<main>
  {#if !liveResults.data}
    <p class="status">
      {liveResults.error ? `Kunde inte hämta valresultatet (${liveResults.error}).` : 'Hämtar valresultatet…'}
    </p>
  {:else}
    <FilterBar />
    {#if filters.area}
      <p class="scope-banner">Visar <strong>{filters.area}</strong> · <button type="button" onclick={() => (filters.area = '')}>Visa hela riket</button></p>
    {/if}
    <ReplayControls />
    <ResultsTable />
    <BlocksSection />
    <MandatesSection />
    <RegionsSection />
    <CompletionSection />
  {/if}
</main>

<style>
  main { max-width: 1320px; margin: auto; padding: 32px 48px 60px; }
  .status { color: #68725e; font-size: 13px; }
  .scope-banner { font-size: 12px; color: #69755a; background: #f0f2e9; border-left: 3px solid #c7d1b5; padding: 10px 14px; margin: -8px 0 16px; border-radius: 0 6px 6px 0; }
  .scope-banner button { border: 0; background: none; color: #b0703f; text-decoration: underline; cursor: pointer; font: inherit; padding: 0; margin-left: 4px; }
</style>
