import type { ElectionData } from './types.ts';
import type { SeatAllocation } from './model.ts';
import { allocateSeats } from './model.ts';
import { notifications } from './notifications.svelte.ts';

// Singleton live-results store (Svelte 5 runes). Mirrors the polling logic in
// the legacy public/app.js refresh(), against the same backend API.
export const REFRESH_INTERVAL_MS = 30000;

function createLiveResults() {
  let data = $state<ElectionData | null>(null);
  let stale = $state(false);
  let busy = $state(false);
  let error = $state('');
  let fetchedAt = $state<number | null>(null);
  let mandateTransition = $state<{ before: SeatAllocation; after: SeatAllocation } | null>(null);
  let mandateVersion = $state(0);
  let updateSummary = $state<{ districts: number; votes: number; parties: { key: string; delta: number }[] } | null>(null);
  let nextRefresh = $state(Date.now() + REFRESH_INTERVAL_MS);
  let previousLiveData: ElectionData | null = null;

  function notifyMandateChanges(next: ElectionData) {
    if (!previousLiveData) {
      previousLiveData = next;
      return;
    }
    const before = allocateSeats(previousLiveData);
    const after = allocateSeats(next);
    const beforeVotes = previousLiveData.rosterPaverkaMandat?.antalRoster || 0;
    const afterVotes = next.rosterPaverkaMandat?.antalRoster || 0;
    const partyBefore = new Map((previousLiveData.rosterPaverkaMandat?.partiroster || []).map(party => [party.partiforkortning || party.partibeteckning, party.andelRoster || 0]));
    const partyChanges = (next.rosterPaverkaMandat?.partiroster || [])
      .map(party => ({ key: party.partiforkortning || party.partibeteckning, delta: (party.andelRoster || 0) - (partyBefore.get(party.partiforkortning || party.partibeteckning) || 0) }))
      .filter(item => Math.abs(item.delta) >= 0.01)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
    updateSummary = {
      districts: next.antalValdistriktRaknade - previousLiveData.antalValdistriktRaknade,
      votes: afterVotes - beforeVotes,
      parties: partyChanges,
    };
    if (before && after) {
      mandateTransition = { before, after };
      mandateVersion++;
      const beforeByParty = new Map(before.parties.map(party => [party.key, party.seats]));
      for (const party of after.parties) {
        const oldSeats = beforeByParty.get(party.key) ?? 0;
        if (oldSeats !== party.seats) {
          const delta = party.seats - oldSeats;
          notifications.add(`Mandatförändring: ${party.key} ${oldSeats} → ${party.seats} (${delta > 0 ? '+' : ''}${delta}).`, 'mandate');
        }
      }
      for (const party of before.parties) {
        if (!after.parties.some(item => item.key === party.key)) {
          if (party.seats > 0) notifications.add(`Mandatförändring: ${party.key} ${party.seats} → 0.`, 'mandate');
        }
      }
    } else {
      mandateTransition = null;
    }
    previousLiveData = next;
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    const startedAt = typeof performance !== 'undefined' ? performance.now() : 0;
    try {
      const response = await fetch('/api/results', { cache: 'no-store', signal: AbortSignal.timeout(16000) });
      if (!response.ok) throw new Error('Feed unavailable');
      const result = await response.json();
      if (!Array.isArray(result.data?.rosterPaverkaMandat?.partiroster)) throw new Error('Invalid data');
      notifyMandateChanges(result.data);
      data = result.data;
      fetchedAt = typeof result.fetchedAt === 'number' ? result.fetchedAt : Date.now();
      stale = Boolean(result.stale);
      error = '';
      if (typeof performance !== 'undefined') {
        performance.measure('val2026-results-refresh', { start: startedAt, end: performance.now() });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'okänt fel';
    } finally {
      busy = false;
      nextRefresh = Date.now() + REFRESH_INTERVAL_MS;
    }
  }

  refresh();
  setInterval(() => { if (!document.hidden && Date.now() >= nextRefresh) refresh(); }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() >= nextRefresh) refresh();
  });

  return {
    get data() { return data; },
    get stale() { return stale; },
    get busy() { return busy; },
    get error() { return error; },
    get fetchedAt() { return fetchedAt; },
    get mandateTransition() { return mandateTransition; },
    get mandateVersion() { return mandateVersion; },
    get updateSummary() { return updateSummary; },
    get nextRefresh() { return nextRefresh; },
    refresh,
  };
}

export const liveResults = createLiveResults();
