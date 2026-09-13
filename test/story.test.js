import { test } from 'node:test';
import assert from 'node:assert/strict';
import { milestones, recentChanges } from '../public/story.js';
const p = (id,districts,gap=1,share=5) => ({id:String(id),capturedAt:id,districts,total:6626,blockGap:gap,shares:{S:share},exactShares:{S:share},countedVotes:districts*100});
test('milestones detect crossed district thresholds without inventing earlier history or repeating corrections',()=>{
 const events=milestones([p(1,22),p(2,101),p(3,90),p(4,110),p(5,1100)]);
 assert.deepEqual(events.filter(e=>e.type==='district').map(e=>e.threshold),[100,500,1000]);
 assert.equal(milestones([p(1,1200)]).filter(e=>e.type==='district').length,0);
});
test('block ties preserve leader, missing observations break continuity',()=>{
 assert.equal(milestones([p(1,1,1),p(2,2,0),p(3,3,-1)]).filter(e=>e.type==='lead').length,1);
 assert.equal(milestones([p(1,1,1),p(2,2,null),p(3,3,-1)]).filter(e=>e.type==='lead').length,0);
});
test('national threshold uses exact shares and regional history suppresses 4 percent milestones',()=>{
 const points=[p(1,1,1,3.999),p(2,2,1,4),p(3,3,1,3.99)];
 assert.deepEqual(milestones(points).filter(e=>e.type==='threshold').map(e=>e.above),[true,false]);
 assert.equal(milestones(points,{regional:true}).filter(e=>e.type==='threshold').length,0);
});
test('changes keep negative corrections and unavailable regional data explicit',()=>{
 const a=p(1,10,1,5),b=p(2,9,-1,5.3),delta=recentChanges(a,b);
 assert.equal(delta.districts,-1);assert.equal(delta.votes,-100);assert.equal(delta.gap,-2);assert.ok(Math.abs(delta.parties[0].delta-.3)<1e-8);
 assert.equal(recentChanges({...a,shares:null},b),null);
});
