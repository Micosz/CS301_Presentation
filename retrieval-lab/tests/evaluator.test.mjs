import assert from 'node:assert/strict';
import {rankUnits,scoreRanking,evaluate} from '../evaluator.mjs';
const units=[{id:'z'},{id:'a'},{id:'m'}];
assert.deepEqual(rankUnits([1,1,0],units).map(x=>x.id),['a','z','m']);
assert.deepEqual(scoreRanking([{id:'a'},{id:'z'},{id:'m'}],['z','m'],3),{recall:1,rr:.5,complete:1,hits:2});
assert.equal(scoreRanking([{id:'a'},{id:'z'},{id:'m'}],['z','m'],1).recall,0);
assert.equal(scoreRanking([{id:'z'}],['z','m'],1).recall,.5);
assert.equal(scoreRanking([{id:'z'}],[],1).rr,null);
assert.equal(scoreRanking([{id:'z'},{id:'z'}],['z','m'],3).hits,1);
const questions=[{id:'q1',category:'direct',gold_units:['z'],answerable:true},{id:'q2',category:'outside',gold_units:[],answerable:false}];
const methods=[{id:'test',label:'Test',unit_scores:[[3,2,1],[1,2,3]]}];
const [result]=evaluate({units},questions,methods,1);
assert.equal(result.count,1);assert.equal(result.excluded,1);assert.equal(result.recall,1);assert.equal(result.mrr,1);
assert.equal(evaluate({units},questions,methods,1,'outside')[0].recall,null);
assert.throws(()=>rankUnits([NaN,1,2],units));
assert.throws(()=>evaluate({units},[{id:'x',gold_units:['missing']}],[{unit_scores:[[1,2,3]]}],1));
console.log('PASS: metrics, cutoff, multiple gold, duplicate prevention, ties, exclusions, validation');
// Cross-language parity on the committed real run, not an implementation mirror.
import fs from 'node:fs';
const load=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name+'.json',import.meta.url)));
const corpus=load('corpus'), qs=load('questions').questions, benchmark=load('benchmark');
for(const k of [1,3,5])for(const actual of evaluate(corpus,qs,benchmark.methods,k)){
 const expected=benchmark.methods.find(m=>m.id===actual.id).evaluation[k];
 for(const [a,b] of [['recall','recall'],['mrr','rr'],['complete','complete']])assert(Math.abs(actual[a]-expected[b])<1e-12,`${actual.id} ${k} ${a}`);
 assert.equal(actual.count,expected.n);
}
console.log('PASS: browser evaluator matches Python metrics and denominators for every saved method and cutoff');
