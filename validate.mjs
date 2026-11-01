import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'slides.js'),'utf8')+';this.deckData=slides;',ctx);
const slides=ctx.deckData;
assert.equal(slides.length,15,'Expected fifteen slides');
assert.deepEqual(Array.from(slides,s=>s.chapter),[0,1,2,3,3,3,3,3,3,3,3,3,3,3,3]);
const texts=[fs.readFileSync(path.join(root,'index.html'),'utf8'),...slides.map(s=>s.html)];
const ids=new Set();let checkedAssets=0;
for(const text of texts){
 for(const m of text.matchAll(/\bid="([^"]+)"/g)){assert(!ids.has(m[1]),'Duplicate ID '+m[1]);ids.add(m[1]);}
 for(const m of text.matchAll(/<image\b[^>]*\bhref="([^"]+)"/g)){
  assert(fs.existsSync(path.join(root,m[1])),'Missing SVG image '+m[1]);checkedAssets++;
 }
 for(const m of text.matchAll(/\b(?:src|data-image)="([^"]+)"/g)){
  assert(!m[1].startsWith('http'),'Assets should be local');
  assert(fs.existsSync(path.join(root,m[1])),'Missing asset '+m[1]);checkedAssets++;
 }
 for(const m of text.matchAll(/data-go="(\d+)"/g)) assert(+m[1]<slides.length,'Invalid navigation target');
}
for(const s of slides){assert(s.notes.length>60,'Missing speaker notes');if(s.chapter)assert(s.source.includes('รายงาน')||s.source.includes('โครงสร้าง'),'Missing source');}
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
for(const m of app.matchAll(/getElementById\('([^']+)'\)/g)) assert(ids.has(m[1]),'Missing DOM target '+m[1]);
// Evaluate the shipped metric function against independent expected values.
const metricIds={'recall-value':{},'rr-value':{}};
const buttons=[1,2,3,4].map(rank=>({dataset:{rank:String(rank)},setAttribute(k,v){this[k]=v;}}));
const metricContext={document:{querySelectorAll:()=>buttons,getElementById:id=>metricIds[id]}};
vm.createContext(metricContext);
const fn=app.slice(app.indexOf('function setRank('),app.indexOf("document.addEventListener('click'"));
vm.runInContext(fn,metricContext);
for(const [rank,recall,rr] of [[1,'1.00','1.00'],[2,'1.00','0.50'],[3,'1.00','0.33'],[4,'0.00','0.00']]){
 metricContext.setRank(rank);
 assert.equal(metricIds['recall-value'].textContent,recall);
 assert.equal(metricIds['rr-value'].textContent,rr);
 assert.equal(buttons.filter(b=>b['aria-pressed']==='true').length,1);
}
console.log(`PASS: ${slides.length} slides, speaker notes, navigation targets, ${checkedAssets} asset references, unique IDs, all DOM targets and four metric cases.`);
console.log('Browser layout and end-to-end interactions require a browser check.');
