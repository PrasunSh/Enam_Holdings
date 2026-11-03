import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classify, selectEvents, change, compareGuidance, searchEvidence } from '../lib/finn.ts';
const facts = JSON.parse(readFileSync(new URL('../data/facts.json', import.meta.url), 'utf8'));
const target = { symbol:'INFY', metric:'Revenue growth', basis:'Constant currency', unit:'percent', targetPeriod:'FY25', lower:4.5, upper:5, statementDate:'2025-01-16' };
const outcome = { ...target, value:4.2, publishedOn:'2025-04-17' };
test('notices are not results; governance overrides routine; unknowns stay visible', () => {
 assert.equal(classify({category:'results', title:'Board meeting notice', summary:''}).priority, 'routine');
 assert.equal(classify({category:'routine', title:'Auditor resignation', summary:''}).priority, 'review');
 assert.equal(classify({category:'unclassified', title:'New disclosure', summary:''}).priority, 'track');
});
test('historical date filtering, portfolio selection, review hiding and deduplication', () => {
 const opts = {symbols:['INFY'], from:'2025-04-17', to:'2025-04-17', category:'all', reviewed:[], hideReviewed:false};
 const result = selectEvents([...facts.events, facts.events[0]], opts);
 assert.equal(result.length, 5);
 assert.equal(new Set(result.map(e=>e.sourceId)).size, 1);
 assert.equal(classify(result.at(-1)).priority, 'routine');
 assert.equal(selectEvents(facts.events, {...opts, reviewed:[result[0].id], hideReviewed:true}).length, 4);
 assert.equal(selectEvents(facts.events, {...opts, symbols:[]}).length, 0);
 assert.equal(selectEvents(facts.events, {...opts, from:'2026-10-28', to:'2026-10-28'}).length, 0);
});
test('growth preserves missing and non-positive bases', () => {
 assert.equal(change(40925,41764), '-2.0% calculated');
 assert.equal(change(null,5), 'Unavailable');
 assert.equal(change(5,undefined), 'Unavailable');
 assert.match(change(5,-2), /Loss to profit/);
 assert.doesNotMatch(change(5,0), /%/);
});
test('guidance validates dimensions, dates and inclusive range boundaries', () => {
 assert.equal(compareGuidance(target,outcome,'2025-04-17'), 'Below range · 0.3 pp below lower bound');
 assert.equal(compareGuidance(target,outcome,'2025-04-16'), 'No outcome in selected corpus');
 assert.equal(compareGuidance(target,outcome,'2025-01-15'), 'Not yet stated');
 for (const dimension of ['symbol','metric','basis','unit','targetPeriod']) assert.equal(compareGuidance(target,{...outcome,[dimension]:'different'},'2025-04-17'), 'Not comparable');
 assert.equal(compareGuidance(target,{...outcome,value:4.5},'2025-04-17'), 'Within range');
 assert.equal(compareGuidance(target,{...outcome,value:5},'2025-04-17'), 'Within range');
 assert.equal(compareGuidance(target,null,'2026-10-28'), 'No outcome in selected corpus');
});
test('search cannot leak other companies, future evidence or push documents', () => {
 assert.equal(searchEvidence(facts.sources,' infy ','','2025-04-17').length,2);
 assert.equal(searchEvidence(facts.sources,'INFY','','2025-01-16').length,1);
 assert.equal(searchEvidence(facts.sources,'POLYCAB','','2026-10-28').length,0);
 assert.equal(searchEvidence(facts.sources,'INFY','nonexistent','2026-10-28').length,0);
 assert.equal(searchEvidence(facts.sources,'INFY','constant currency','2025-04-17').length,2);
});
test('fixture evidence links and pages resolve', () => {
 for (const e of facts.events) { const s=facts.sources.find(s=>s.id===e.sourceId); assert.ok(s); assert.ok(e.page>=1 && e.page<=s.pages); }
 for (const g of facts.guidance) { assert.ok(facts.sources.find(s=>s.id===g.sourceId)?.pullEligible); if(g.actualSourceId) assert.ok(facts.sources.find(s=>s.id===g.actualSourceId)?.pullEligible); }
});
