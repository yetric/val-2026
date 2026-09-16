<script lang="ts">
  import Header from './lib/Header.svelte';
  import FilterBar from './lib/FilterBar.svelte';
  import ReplayControls from './lib/ReplayControls.svelte';
  import ResultsTable from './lib/ResultsTable.svelte';
  import BattlegroundBar from './lib/BattlegroundBar.svelte';
  import BlocksSection from './lib/BlocksSection.svelte';
  import MandatesSection from './lib/MandatesSection.svelte';
  import RegionsSection from './lib/RegionsSection.svelte';
  import CompletionSection from './lib/CompletionSection.svelte';
  import NightStory from './lib/NightStory.svelte';
  import TrendSection from './lib/TrendSection.svelte';
  import DistrictFinder from './lib/DistrictFinder.svelte';
  import StatsCards from './lib/StatsCards.svelte';
  import Insights from './lib/Insights.svelte';
  import MoreData from './lib/MoreData.svelte';
  import FullscreenPanel from './lib/FullscreenPanel.svelte';
  import LiveTicker from './lib/LiveTicker.svelte';
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
    <FullscreenPanel>
      <StatsCards />
      <BattlegroundBar />
    </FullscreenPanel>
    <Insights />
    <FilterBar />
    {#if filters.area}
      <p class="scope-banner">Visar <strong>{filters.area}</strong> · <button type="button" onclick={() => (filters.area = '')}>Visa hela riket</button></p>
    {/if}
    <ReplayControls />
    <FullscreenPanel><ResultsTable /></FullscreenPanel>
    <NightStory />
    <FullscreenPanel><BlocksSection /></FullscreenPanel>
    <FullscreenPanel><TrendSection /></FullscreenPanel>
    <RegionsSection />
    <FullscreenPanel><MandatesSection /></FullscreenPanel>
    <MoreData />
    <CompletionSection />
    <DistrictFinder />
  {/if}
</main>

<div class="ticker-bar"><LiveTicker /></div>

<style>
  main { max-width: 1320px; margin: auto; padding: 32px 40px 60px; }
  .status { color: var(--muted); font-size: 13px; font-family: var(--font-display); }
  .scope-banner { font-family: var(--font-display); font-size: 13px; color: var(--text); background: transparent; border-left: 3px solid var(--red); padding: 8px 14px; margin: -12px 0 20px; }
  .scope-banner button { border: 0; background: none; color: var(--red-bright); text-decoration: underline; cursor: pointer; font: inherit; padding: 0; margin-left: 4px; }
  .ticker-bar { position: sticky; bottom: 0; z-index: 15; }
</style>
