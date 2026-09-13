import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.js';
import { createHistory } from '../history.js';

const fixture = (districts = 1, votes = 100) => ({ antalValdistriktRaknade: districts, antalValdistriktSomSkaRaknas: 6626, senasteUppdateringstid: '13 september 2026 21:00:20', totaltAntalRoster: String(votes), rosterPaverkaMandat: { partiroster: [{ partiforkortning: 'S', antalRoster: votes, andelRoster: 100 }] }, valkretsar: [{ large: 'unused' }] });
async function directory(t) { const dir = await mkdtemp(join(tmpdir(), 'val-test-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; }
async function app(t, options) {
  const historyDir = await directory(t);
  const server = createApp({ historyDir, background: false, cacheMs: 0, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
test('records changes, preserves corrections and reloads history after restart', async t => {
  const dir = await directory(t), history = createHistory(dir);
  await history.record(fixture(), 1000);
  await history.record({ ...fixture(), senasteUppdateringstid: 'later' }, 2000);
  await history.record(fixture(1, 101), 3000);
  await history.record(fixture(22, 2000), 4000);
  const reloaded = createHistory(dir), list = await reloaded.list();
  assert.deepEqual(list.map(x => x.districts), [1, 1, 22]);
  const record = await reloaded.get(list[1].id);
  assert.equal(record.data.rosterPaverkaMandat.partiroster[0].antalRoster, 101);
  assert.deepEqual(record.data.valkretsar, [{ large: 'unused' }]);
  assert.equal(await reloaded.get('missing'), null);
});
test('API serves recorded snapshots and retains cached results on source outage', async t => {
  let fail = false;
  const base = await app(t, { fetchResults: async () => { if (fail) throw Error('offline'); return Response.json(fixture()); } });
  const live = await (await fetch(`${base}/api/results`)).json();
  assert.equal(live.stale, false);
  assert.equal(live.data.antalValdistriktRaknade, 1);
  const history = await (await fetch(`${base}/api/history`)).json();
  assert.equal(history.length, 1);
  assert.equal((await (await fetch(`${base}/api/history/${history[0].id}`)).json()).data.antalValdistriktRaknade, 1);
  fail = true;
  const stale = await (await fetch(`${base}/api/results`)).json();
  assert.equal(stale.stale, true); assert.deepEqual(stale.data, live.data);
  assert.equal((await fetch(`${base}/api/history/123-abcdef`)).status, 404);
  assert.equal((await fetch(`${base}/unknown`)).status, 404);
  assert.equal((await fetch(`${base}/`)).status, 200);
});
test('cold source failure and malformed data return 503 without recording fake results', async t => {
  const base = await app(t, { fetchResults: async () => Response.json({ bad: true }) });
  assert.equal((await fetch(`${base}/api/results`)).status, 503);
  assert.deepEqual(await (await fetch(`${base}/api/history`)).json(), []);
});
test('concurrent visitors share one source request', async t => {
  let calls = 0;
  const base = await app(t, { cacheMs: 15000, fetchResults: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 30)); return Response.json(fixture()); } });
  const responses = await Promise.all(Array.from({ length: 8 }, () => fetch(`${base}/api/results`)));
  assert.ok(responses.every(response => response.ok)); assert.equal(calls, 1);
});
test('full regional history records region-only corrections and leaves old gaps intact', async t => {
 const dir = await directory(t), archive = createHistory(dir);
 const early = fixture(); delete early.valkretsar; await archive.record(early,1000);
 const later = fixture(2); later.valkretsar = [{namn:'Testregion',rosterPaverkaMandat:{partiroster:[{partiforkortning:'S',andelRoster:30,antalRoster:30}]}}];
 await archive.record(later,2000);
 later.valkretsar[0].rosterPaverkaMandat.partiroster[0].andelRoster = 31;
 await archive.record(later,3000);
 const restored = createHistory(dir), points = await restored.trends('Testregion');
 assert.equal(points.length,3); assert.equal(points[0].shares,null); assert.equal(points[1].shares.S,30); assert.equal(points[2].shares.S,31);
 assert.deepEqual((await restored.list())[0].regions,[]);
});
