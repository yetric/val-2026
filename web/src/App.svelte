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
  import Notifications from './lib/Notifications.svelte';
  import Watchlist from './lib/Watchlist.svelte';
  import ResultsMap from './lib/ResultsMap.svelte';
  import AreaContext from './lib/AreaContext.svelte';
  import ComparisonWorkspace from './lib/ComparisonWorkspace.svelte';
  import ShareButton from './lib/ShareButton.svelte';
  import LiveUpdateSummary from './lib/LiveUpdateSummary.svelte';
  import CommandPalette from './lib/CommandPalette.svelte';
  import MobileElectionMode from './lib/MobileElectionMode.svelte';
  import ProvenancePanel from './lib/ProvenancePanel.svelte';
  import PersonalBriefing from './lib/PersonalBriefing.svelte';
  import { liveResults } from './lib/liveResults.svelte.ts';
</script>

<Header />
<CommandPalette />
<Notifications />
<LiveUpdateSummary />

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
    <Watchlist />
    <PersonalBriefing />
    <AreaContext />
    <ComparisonWorkspace />
    <ReplayControls />
    <ShareButton />
    <FullscreenPanel><ResultsTable /></FullscreenPanel>
    <NightStory />
    <FullscreenPanel><BlocksSection /></FullscreenPanel>
    <FullscreenPanel><TrendSection /></FullscreenPanel>
    <RegionsSection />
    <ResultsMap />
    <FullscreenPanel><MandatesSection /></FullscreenPanel>
    <MoreData />
    <ProvenancePanel />
    <CompletionSection />
    <DistrictFinder />
    <MobileElectionMode />
  {/if}
</main>

<div class="ticker-bar"><LiveTicker /></div>

<style>
  main { max-width: 1320px; margin: auto; padding: 32px 40px 60px; }
  .status { color: var(--muted); font-size: 13px; font-family: var(--font-display); }
  .ticker-bar { position: sticky; bottom: 0; z-index: 15; }
  @media (max-width: 700px) {
    main { padding: 22px 16px 138px; }
  }
</style>
