import { mkdir, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { blockResults, numeric } from './public/model.js';

// Preserve the complete source response. Never fill old regional history with newer data.
export function snapshotResults(data) { return structuredClone(data); }
function fingerprint(data) {
  return createHash('sha256').update(JSON.stringify(data, (key, value) =>
    ['senasteRapporteringstid', 'senasteUppdateringstid'].includes(key) ? undefined : value)).digest('hex');
}
function shares(data) {
  return Object.fromEntries((data?.rosterPaverkaMandat?.partiroster || []).map(p => [p.partiforkortning || p.partibeteckning, p.andelRoster]));
}
function votes(data) {
  return Object.fromEntries((data?.rosterPaverkaMandat?.partiroster || [])
    .map(p => [p.partiforkortning || p.partibeteckning, numeric(p.antalRoster)])
    .filter(([, value]) => Number.isFinite(value)));
}
function facts(data) {
  const valid = data?.rosterPaverkaMandat?.antalRoster, invalid = data?.rosterEjPaverkaMandat?.antalRoster;
  const [left, right] = blockResults(data);
  return { countedVotes: data?.totaltAntalRoster != null ? numeric(data.totaltAntalRoster) : Number.isFinite(valid) && Number.isFinite(invalid) ? valid + invalid : null,
    blockGap: left.share != null && right.share != null ? left.share - right.share : null,
    exactShares: valid > 0 ? Object.fromEntries((data.rosterPaverkaMandat.partiroster || []).map(p => [p.partiforkortning || p.partibeteckning, Number.isFinite(p.antalRoster) ? p.antalRoster / valid * 100 : null])) : null };
}
function indexRecord({ id, capturedAt, data }) {
  return { id, capturedAt, districts: data.antalValdistriktRaknade, total: data.antalValdistriktSomSkaRaknas,
    sourceUpdatedAt: data.senasteUppdateringstid, nationalShares: shares(data), nationalVotes: votes(data), nationalFacts: facts(data), regionalFacts: Object.fromEntries((data.valkretsar || []).map(region => [region.namn, facts(region)])),
    regionalShares: Object.fromEntries((data.valkretsar || []).map(region => [region.namn, shares(region)])), regionalVotes: Object.fromEntries((data.valkretsar || []).map(region => [region.namn, votes(region)])) };
}
export function createHistory(directory) {
  const entries = [];
  let lastFingerprint;
  const ready = (async () => {
    await mkdir(directory, { recursive: true });
    const names = (await readdir(directory)).filter(name => /^\d+-[a-f0-9]+\.json$/.test(name)).sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]) || a.localeCompare(b));
    for (const name of names) {
      try {
        const record = JSON.parse(await readFile(join(directory, name), 'utf8'));
        entries.push(indexRecord(record)); lastFingerprint = fingerprint(record.data);
      } catch (error) { console.error(`Cannot read history ${name}:`, error.message); }
    }
  })();
  let queue = Promise.resolve();
  async function save(data, capturedAt) {
    await ready;
    const snapshot = snapshotResults(data), hash = fingerprint(snapshot);
    if (lastFingerprint === hash) return;
    const id = `${capturedAt}-${randomBytes(4).toString('hex')}`;
    const record = { schemaVersion: 2, id, capturedAt, data: snapshot };
    const file = join(directory, `${id}.json`);
    await writeFile(`${file}.tmp`, JSON.stringify(record)); await rename(`${file}.tmp`, file);
    entries.push(indexRecord(record)); lastFingerprint = hash;
  }
  return {
    record(data, capturedAt) { const task = queue.then(() => save(data, capturedAt)); queue = task.catch(() => {}); return task; },
    async list() { await ready; return entries.map(({ nationalShares, nationalVotes, regionalShares, regionalVotes, nationalFacts, regionalFacts, ...entry }) => ({ ...entry, regions: Object.keys(regionalShares) })); },
    async trends(area = '') {
      await ready;
      return entries.map(({ id, capturedAt, districts, total, sourceUpdatedAt, nationalShares, nationalVotes, regionalShares, regionalVotes, nationalFacts, regionalFacts }) => ({ id, capturedAt, districts, total, sourceUpdatedAt, ...(area ? regionalFacts[area] || {} : nationalFacts), shares: area ? regionalShares[area] ?? null : nationalShares, votes: area ? regionalVotes[area] ?? null : nationalVotes }));
    },
    async get(id) {
      await ready;
      if (!entries.some(entry => entry.id === id)) return null;
      const record = JSON.parse(await readFile(join(directory, `${id}.json`), 'utf8'));
      return { id: record.id, capturedAt: record.capturedAt, data: record.data };
    }
  };
}
