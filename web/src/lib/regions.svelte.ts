import type { ElectionData } from './types.ts';

export interface RegionEntry {
  name: string;
  code: string;
  data: ElectionData | null;
  ok: boolean;
}

const POLL_INTERVAL_MS = 30000;

function createRegions() {
  let entries = $state<RegionEntry[]>([]);
  let error = $state('');

  async function load() {
    try {
      const response = await fetch('/api/regions', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Regional feeds unavailable');
      entries = await response.json();
      error = '';
    } catch {
      error = 'Regionala flöden kunde inte hämtas.';
    }
  }

  load();
  setInterval(() => { if (!document.hidden) load(); }, POLL_INTERVAL_MS);

  return {
    get entries() { return entries; },
    get error() { return error; },
    load,
  };
}

export const regions = createRegions();
