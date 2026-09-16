import type { ElectionData, HistoryEntry, Snapshot } from './types.ts';

// Replay engine, mirrors legacy public/app.js showSnapshot()/playbackStep().
// replayData holds a fresh object per snapshot, so it doubles as the flash
// "version" token for rows rendered while replaying (see flash.ts).
const SNAPSHOT_CACHE_LIMIT = 20;

function createHistoryStore() {
  let entries = $state<HistoryEntry[]>([]);
  let replayMode = $state(false);
  let replayIndex = $state(-1);
  let replayData = $state<ElectionData | null>(null);
  let playing = $state(false);
  let error = $state('');
  const snapshotCache = new Map<string, Snapshot>();
  let snapshotRequest = 0;
  let playbackTimer: ReturnType<typeof setTimeout> | undefined;

  async function load() {
    try {
      const response = await fetch('/api/history', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('History unavailable');
      entries = await response.json();
      error = '';
    } catch {
      error = 'Inspelningen kunde inte hämtas. Vi försöker igen vid nästa uppdatering.';
    }
  }

  function stop() { playing = false; clearTimeout(playbackTimer); }

  async function showSnapshot(index: number): Promise<boolean> {
    if (!entries[index]) return false;
    const request = ++snapshotRequest, id = entries[index].id;
    try {
      let snapshot = snapshotCache.get(id);
      if (!snapshot) {
        const response = await fetch(`/api/history/${id}`, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Snapshot unavailable');
        snapshot = await response.json();
        snapshotCache.set(id, snapshot!);
        if (snapshotCache.size > SNAPSHOT_CACHE_LIMIT) snapshotCache.delete(snapshotCache.keys().next().value!);
      }
      if (request !== snapshotRequest) return false;
      replayMode = true; replayIndex = index; replayData = snapshot!.data; error = '';
      return true;
    } catch {
      if (request !== snapshotRequest) return false;
      stop();
      error = 'Det sparade resultatet kunde inte hämtas. Försök igen.';
      return false;
    }
  }

  async function step(speedMs: number) {
    if (!playing) return;
    const index = replayIndex + 1;
    if (index >= entries.length) { stop(); return; }
    if (await showSnapshot(index) && playing) playbackTimer = setTimeout(() => step(speedMs), speedMs);
    else stop();
  }

  function play(speedMs = 2000) {
    if (playing) { stop(); return; }
    playing = true;
    if (!replayMode || replayIndex >= entries.length - 1) replayIndex = -1;
    step(speedMs);
  }

  function goLive() {
    stop(); ++snapshotRequest;
    replayMode = false; replayIndex = -1; replayData = null;
  }

  load();

  return {
    get entries() { return entries; },
    get replayMode() { return replayMode; },
    get replayIndex() { return replayIndex; },
    get replayData() { return replayData; },
    get playing() { return playing; },
    get error() { return error; },
    load, showSnapshot, play, stop, goLive,
  };
}

export const historyStore = createHistoryStore();
