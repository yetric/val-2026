import type { ElectionData } from './types.ts';

// Singleton live-results store (Svelte 5 runes). Mirrors the polling logic in
// the legacy public/app.js refresh(), against the same backend API.
export const REFRESH_INTERVAL_MS = 30000;

function createLiveResults() {
  let data = $state<ElectionData | null>(null);
  let stale = $state(false);
  let busy = $state(false);
  let error = $state('');
  let nextRefresh = $state(Date.now() + REFRESH_INTERVAL_MS);

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const response = await fetch('/api/results', { cache: 'no-store', signal: AbortSignal.timeout(16000) });
      if (!response.ok) throw new Error('Feed unavailable');
      const result = await response.json();
      if (!Array.isArray(result.data?.rosterPaverkaMandat?.partiroster)) throw new Error('Invalid data');
      data = result.data;
      stale = Boolean(result.stale);
      error = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'okänt fel';
    } finally {
      busy = false;
      nextRefresh = Date.now() + REFRESH_INTERVAL_MS;
    }
  }

  refresh();
  setInterval(() => { if (!document.hidden && Date.now() >= nextRefresh) refresh(); }, 1000);

  return {
    get data() { return data; },
    get stale() { return stale; },
    get busy() { return busy; },
    get error() { return error; },
    get nextRefresh() { return nextRefresh; },
    refresh,
  };
}

export const liveResults = createLiveResults();
