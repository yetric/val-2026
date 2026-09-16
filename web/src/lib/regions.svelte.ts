import type { ElectionData } from './types.ts';
import { notifications } from './notifications.svelte.ts';

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
  let previousEntries: RegionEntry[] | null = null;

  function isComplete(item: ElectionData | null | undefined) {
    return Boolean(item && item.antalValdistriktSomSkaRaknas > 0 &&
      item.antalValdistriktRaknade >= item.antalValdistriktSomSkaRaknas);
  }

  function notifyCompletedAreas(next: RegionEntry[]) {
    if (previousEntries) {
      const previousByName = new Map<string, ElectionData | null>();
      for (const entry of previousEntries) {
        previousByName.set(entry.name, entry.data);
        for (const municipality of entry.data?.valkretsar || []) {
          if (/kommun/i.test(municipality.namn || '')) previousByName.set(municipality.namn || '', municipality);
        }
      }
      for (const entry of next) {
        if (isComplete(entry.data) && !isComplete(previousByName.get(entry.name))) {
          notifications.add(`${entry.name} är färdigräknad.`, 'completion');
        }
        for (const municipality of entry.data?.valkretsar || []) {
          const name = municipality.namn || '';
          if (/kommun/i.test(name) && isComplete(municipality) && !isComplete(previousByName.get(name))) {
            notifications.add(`${name} är färdigräknad.`, 'completion');
          }
        }
      }
    }
    previousEntries = next;
  }

  async function load() {
    try {
      const response = await fetch('/api/regions', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Regional feeds unavailable');
      const next = await response.json() as RegionEntry[];
      notifyCompletedAreas(next);
      entries = next;
      error = '';
    } catch {
      error = 'Regionala flöden kunde inte hämtas.';
    }
  }

  load();
  setInterval(() => { if (!document.hidden) load(); }, POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) load();
  });

  return {
    get entries() { return entries; },
    get error() { return error; },
    load,
  };
}

export const regions = createRegions();
