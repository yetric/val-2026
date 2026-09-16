import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHistory, snapshotResults } from './history.ts';
import type { ElectionData } from '../../web/src/lib/types.ts';

export const SOURCE = 'https://resultat.val.se/data/resultat/val2026/RD_P.json';
export const REGION_SOURCE = (code: string) => `https://resultat.val.se/data/resultat/val2026/RD_${code}_P.json`;

interface District {
  name: string;
  code: string;
  region: string;
  regionCode: string;
  municipality: string;
  municipalityCode: string;
}

interface GeographyRegion {
  name: string;
  code: string;
}

interface ResultsResponse {
  data: ElectionData;
  fetchedAt: number;
  stale: boolean;
  archiveError: boolean;
}

interface RegionEntry {
  name: string;
  code: string;
  data: ElectionData | null;
  ok: boolean;
}

interface AppOptions {
  fetchResults?: () => Promise<Response>;
  cacheMs?: number;
  historyDir?: string;
  publicDir?: string;
  background?: boolean;
}

export function createApp({
  fetchResults = () => fetch(SOURCE, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } }),
  cacheMs = 15000,
  historyDir = process.env.HISTORY_DIR || fileURLToPath(new URL('../../data/history-v2', import.meta.url)),
  publicDir = process.env.PUBLIC_DIR || fileURLToPath(new URL('../../public', import.meta.url)),
  background = true,
}: AppOptions = {}) {
  const history = createHistory(historyDir);
  let archiveError = false;
  let cached: ElectionData | undefined, fetchedAt: number | undefined, pending: Promise<ResultsResponse> | undefined;
  let regionCache: RegionEntry[] | undefined, regionFetchedAt: number | undefined, regionPending: Promise<RegionEntry[]> | undefined;
  let districtIndex: District[] | undefined;

  async function loadDistrictIndex(): Promise<District[]> {
    if (!districtIndex) districtIndex = JSON.parse(await readFile(`${publicDir}/districts.json`, 'utf8'));
    return districtIndex!;
  }

  async function districtResults(code: string) {
    const index = await loadDistrictIndex();
    const district = index.find(item => item.code === code);
    if (!district) return null;
    const response = await fetch(`https://resultat.val.se/data/resultat/val2026/RD_${district.regionCode}_${district.municipalityCode}_${district.code}_P.json`, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`District HTTP ${response.status}`);
    return { ...district, data: snapshotResults(await response.json() as ElectionData) };
  }

  async function results(): Promise<ResultsResponse> {
    if (cached && fetchedAt != null && Date.now() - fetchedAt < cacheMs) return { data: cached, fetchedAt, stale: false, archiveError };
    if (!pending) pending = (async (): Promise<ResultsResponse> => {
      try {
        const response = await fetchResults();
        if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
        const data = await response.json() as ElectionData;
        if (!Array.isArray(data?.rosterPaverkaMandat?.partiroster) || !Number.isFinite(data.antalValdistriktRaknade) || !Number.isFinite(data.antalValdistriktSomSkaRaknas)) throw new Error('Invalid source data');
        cached = snapshotResults(data); fetchedAt = Date.now();
        try { await history.record(cached, fetchedAt); archiveError = false; }
        catch (error) { archiveError = true; console.error('History recording failed:', (error as Error).message); }
        return { data: cached, fetchedAt, stale: false, archiveError };
      } catch (error) {
        console.error('Election feed:', (error as Error).message);
        if (cached && fetchedAt != null) return { data: cached, fetchedAt, stale: true, archiveError };
        throw error;
      } finally { pending = undefined; }
    })();
    return pending;
  }

  async function regions(): Promise<RegionEntry[]> {
    if (regionCache && regionFetchedAt != null && Date.now() - regionFetchedAt < 30000) return regionCache;
    if (!regionPending) regionPending = (async () => {
      const geo: GeographyRegion[] = JSON.parse(await readFile(`${publicDir}/geography.json`, 'utf8'));
      const list = await Promise.all(geo.map(async (region): Promise<RegionEntry> => {
        try {
          const response = await fetch(REGION_SOURCE(region.code), { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json() as ElectionData;
          return { name: region.name, code: region.code, data: snapshotResults(data), ok: true };
        } catch (error) {
          console.error(`Region feed ${region.code}:`, (error as Error).message);
          return { name: region.name, code: region.code, data: null, ok: false };
        }
      }));
      regionCache = list; regionFetchedAt = Date.now();
      return list;
    })().finally(() => { regionPending = undefined; });
    return regionPending;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }

    if (path === '/api/trends') {
      try {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(await history.trends(url.searchParams.get('area') || '')));
      } catch { res.writeHead(503); res.end(); }
      return;
    }
    if (path === '/api/regions') {
      try {
        const value = await regions();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(value));
      } catch { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Regionala resultat kunde inte hämtas.' })); }
      return;
    }
    if (path === '/api/districts') {
      try {
        const index = await loadDistrictIndex();
        const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('sv-SE');
        const region = url.searchParams.get('region') || '';
        const list = index.filter(item => (!region || item.region === region) && (!query || `${item.name} ${item.municipality} ${item.region}`.toLocaleLowerCase('sv-SE').includes(query))).slice(0, 80);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ total: list.length, results: list }));
      } catch { res.writeHead(503); res.end(JSON.stringify({ error: 'Distriktsregistret kunde inte läsas.' })); }
      return;
    }
    if (/^\/api\/districts\/[0-9]+$/.test(path)) {
      try {
        const result = await districtResults(path.split('/').at(-1)!);
        res.writeHead(result ? 200 : 404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(result || { error: 'District not found' }));
      } catch { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Distriktsresultatet kunde inte hämtas.' })); }
      return;
    }
    if (path === '/api/history' || /^\/api\/history\/[0-9]+-[a-f0-9]+$/.test(path)) {
      try {
        const value = path === '/api/history' ? await history.list() : await history.get(path.split('/').at(-1)!);
        res.writeHead(value ? 200 : 404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(value || { error: 'Snapshot not found' }));
      } catch { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'History unavailable' })); }
      return;
    }
    if (path === '/api/results') {
      try {
        const result = await results();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(result));
      } catch { res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: 'Resultaten kunde inte hämtas från Valmyndigheten.' })); }
      return;
    }
    const files: Record<string, string> = { '/geography.json': 'geography.json', '/districts.json': 'districts.json' };
    if (!files[path]) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const body = await readFile(`${publicDir}/${files[path]}`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    } catch { res.writeHead(500); res.end('Server error'); }
  });

  let timer: ReturnType<typeof setInterval> | undefined;
  server.once('listening', () => {
    if (!background) return;
    results().catch(() => {});
    timer = setInterval(() => results().catch(() => {}), 30000);
    timer.unref();
  });
  server.once('close', () => clearInterval(timer));
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, '0.0.0.0', () => console.log(`Val2026 standalone backend running on http://localhost:${port}`));
}
