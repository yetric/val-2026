<script lang="ts">
  import { filters } from './filters.svelte.ts';
  import { comparison } from './comparison.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { analytics } from './analytics.svelte.ts';

  let status = $state('');
  let restored = false;
  let replayRequested = false;

  function restoreFromUrl() {
    if (typeof window === 'undefined' || restored) return;
    const params = new URLSearchParams(window.location.search);
    filters.area = params.get('area') || '';
    filters.setSelected((params.get('parties') || '').split(',').filter(Boolean));
    const comparisonMode = params.get('compare');
    if (comparisonMode === 'previous' || comparisonMode === 'national' || comparisonMode === 'none') filters.comparisonMode = comparisonMode;
    const sort = params.get('sort');
    if (sort === 'votes' || sort === 'name' || sort === 'change') filters.sort = sort;
    const threshold = params.get('threshold');
    if (threshold === 'all' || threshold === 'above' || threshold === 'below') filters.threshold = threshold;
    filters.query = params.get('query') || '';
    filters.detailsExpanded = params.get('details') === '1';
    comparison.setArea(params.get('compareArea') || '');
    restored = true;
  }

  $effect(() => {
    restoreFromUrl();
    const snapshot = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('snapshot');
    if (!replayRequested && snapshot && historyStore.entries.length) {
      const index = historyStore.entries.findIndex(entry => entry.id === snapshot);
      replayRequested = true;
      if (index >= 0) historyStore.showSnapshot(index);
    }
  });

  function link() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    if (filters.area) params.set('area', filters.area);
    if (filters.selected.length) params.set('parties', filters.selected.join(','));
    if (filters.comparisonMode !== 'previous') params.set('compare', filters.comparisonMode);
    if (filters.sort !== 'votes') params.set('sort', filters.sort);
    if (filters.threshold !== 'all') params.set('threshold', filters.threshold);
    if (filters.query) params.set('query', filters.query);
    if (filters.detailsExpanded) params.set('details', '1');
    if (comparison.area) params.set('compareArea', comparison.area);
    if (historyStore.replayMode) {
      const snapshot = historyStore.entries[historyStore.replayIndex]?.id;
      if (snapshot) params.set('snapshot', snapshot);
    }
    url.search = params.toString();
    return url.toString();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      analytics.track('share');
      status = 'Länk kopierad';
    } catch {
      status = 'Kunde inte kopiera länken';
    }
    setTimeout(() => { status = ''; }, 2500);
  }
</script>

<div class="share-control">
  <button id="share-view" type="button" onclick={copy}>↗ Dela denna vy</button>
  {#if status}<span role="status">{status}</span>{/if}
</div>

<style>
  .share-control { display: flex; align-items: center; gap: 10px; margin: -8px 0 20px; }
  button { border: 1px solid var(--line); background: transparent; color: var(--text); padding: 7px 10px; cursor: pointer; font-family: var(--font-display); font-size: 12px; }
  button:hover { border-color: var(--red-bright); }
  span { color: var(--muted); font-size: 11px; }
</style>
