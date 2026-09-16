import type { TrendPoint } from './types.ts';
import { filters } from './filters.svelte.ts';

// Mirrors legacy public/app.js loadTrends(): request-counter + area check
// so a slow response for a stale area never clobbers a newer one.
const POLL_INTERVAL_MS = 30000;

function createTrends() {
  let points = $state<TrendPoint[]>([]);
  let loadedArea = $state<string | null>(null);
  let error = $state('');
  let request = 0;

  async function load() {
    const req = ++request, requestedArea = filters.area;
    try {
      const response = await fetch(`/api/trends?area=${encodeURIComponent(requestedArea)}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Trends unavailable');
      const data: TrendPoint[] = await response.json();
      if (req !== request || requestedArea !== filters.area) return;
      points = data; loadedArea = requestedArea; error = '';
    } catch {
      if (req !== request) return;
      error = 'Kurvan kunde inte uppdateras. Vi försöker igen vid nästa uppdatering.';
    }
  }

  // $effect.root: this store lives for the app's lifetime, so the effect
  // never needs manual teardown — it re-fetches whenever the area changes.
  $effect.root(() => {
    $effect(() => { filters.area; load(); });
  });
  setInterval(() => { if (!document.hidden) load(); }, POLL_INTERVAL_MS);

  return {
    get points() { return points; },
    get ready() { return loadedArea === filters.area; },
    get error() { return error; },
  };
}

export const trends = createTrends();
