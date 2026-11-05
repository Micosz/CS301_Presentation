import fs from 'node:fs';
import assert from 'node:assert/strict';
import {evaluate} from '../evaluator.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const c=read('corpus.json'),q=read('questions.json').questions,b=read('benchmark.json');
for(const k of [1,3,5])for(const r of evaluate(c,q,b.methods,k)){
 const expected=b.methods.find(m=>m.id===r.id).evaluation[String(k)];
 for(const [js,py] of [['recall','recall'],['mrr','rr'],['complete','complete']])assert(Math.abs(r[js]-expected[py])<1e-12,`${r.id} @${k} ${js}`);
 assert.equal(r.count,44);assert.equal(r.excluded,4);
}
console.log('PASS: real exported scores match Python metrics for all methods and k=1,3,5');
