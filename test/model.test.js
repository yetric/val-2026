import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaMetrics, selectedArea, filterParties, comparison, selectionTotal, blockResults, allocateSeats, mandateMargins } from '../public/model.js';
const parties = ['S','V','MP','C','M','KD','SD','L','ÖVR'].map((key,i) => ({ partiforkortning:key, antalRoster:i === 8 ? 200 : 100, andelRoster:i === 8 ? 20 : 10, antalRosterForegaendeVal:i === 8 ? 400 : 200, andelRosterForegaendeVal:10, forandringAndelRoster:0 }));
const data = { rosterPaverkaMandat: { antalRoster:1000, antalRosterForegaendeVal:2000, partiroster:parties } };
test('blocks use vote counts, preserve other parties and compare the same denominator', () => {
 const [left,right] = blockResults(data); assert.equal(left.share,40); assert.equal(right.share,40); assert.equal(left.votes,400); assert.equal(left.delta,0);
 assert.deepEqual(left.parties,['S','V','MP','C']); assert.deepEqual(right.parties,['M','KD','SD','L']);
 assert.equal(blockResults(null)[0].share,null);
 assert.equal(blockResults({rosterPaverkaMandat:{antalRoster:100,partiroster:parties.slice(0,3)}})[0].share,null);
});
test('regional missing statistics are not rendered as zero and old history stays missing', () => {
 const region = {namn:'Example',antalValdistriktRaknade:0,antalValdistriktSomSkaRaknas:0,antalRostberattigade:'0',rosterPaverkaMandat:{antalRoster:90},rosterEjPaverkaMandat:{antalRoster:10}};
 assert.deepEqual(areaMetrics(region,true),{districts:null,total:null,votes:100,eligible:null,turnout:null});
 assert.equal(selectedArea(data,'Example'),null);
});
test('filters do not rebase percentages and national comparison uses the selected snapshot', () => {
 assert.equal(filterParties(parties,{selected:['S','C']}).length,2);
 assert.equal(selectionTotal(filterParties(parties,{selected:['S','C']}),1000),20);
 assert.equal(filterParties(parties,{query:'social'}).length,1);
 assert.equal(filterParties(parties,{threshold:'below'}).length,0);
 assert.equal(comparison({...parties[0],andelRoster:15},data,'national').delta,5);
 assert.equal(comparison(parties[0],data,'previous',false).delta,null);
});
test('mandate margins identify the next winner and weakest current mandate', () => {
 const data = { rosterPaverkaMandat: { antalRoster: 1000, partiroster: [
  { partiforkortning:'S', antalRoster:470, andelRoster:47 },
  { partiforkortning:'M', antalRoster:330, andelRoster:33 },
  { partiforkortning:'C', antalRoster:200, andelRoster:20 }
 ] } };
 const allocation = allocateSeats(data, 5), margins = mandateMargins(data, 5);
 assert.equal(allocation.parties.reduce((sum, party) => sum + party.seats, 0), 5);
 assert.equal(margins.gain.key, 'S');
 assert.equal(margins.lose.key, 'M');
});
