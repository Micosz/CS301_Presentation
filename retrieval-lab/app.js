import {evaluate} from './evaluator.mjs';
const $=id=>document.getElementById(id);
const names={direct:'คำตรง',paraphrase:'เปลี่ยนถ้อยคำ',mixed:'ไทยปนอังกฤษ',multi:'หลายหลักฐาน',outside:'นอกขอบเขต',out_of_scope:'นอกขอบเขต',multi_evidence:'หลายหลักฐาน'};
let corpus,questions=[],benchmark,results=[],reviews={},reviewKey='',category='all',k=3,localAvailable=false,polling=false;
const dataHashes={};
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function error(message){$('error').textContent=message;$('error').hidden=!message;}
function pct(v){return v===null?'—':(v*100).toFixed(1)+'%';}
function decimal(v){return v===null?'—':v.toFixed(3);}
async function getJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`โหลด ${url} ไม่สำเร็จ (${r.status})`);const raw=await r.text();if(url.startsWith('data/')&&crypto.subtle){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));dataHashes[url.slice(5)]=Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('');}return JSON.parse(raw);}
function reviewSave(){try{localStorage.setItem(reviewKey,JSON.stringify(reviews));}catch{error('เบราว์เซอร์บันทึกการตรวจทานไม่ได้ กรุณาส่งออกบันทึกก่อนปิดหน้านี้');}renderReviewCount();}
function renderReviewCount(){const n=questions.filter(q=>reviews[q.id]?.status==='checked').length;$('review-count').textContent=`บันทึกว่าตรวจแล้วในเครื่องนี้ ${n} / ${questions.length} ข้อ`;}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderResults(){
  const target=$('results');target.replaceChildren();
  for(const r of results){
    const method=benchmark.methods.find(m=>m.id===r.id), card=el('article',undefined,'result-card');
    card.append(el('h3',r.label),el('div',method.model_id||'คำสำคัญ · newmm','model'),el('div',pct(r.recall),'large-number'),el('span',`Evidence-unit Recall@${k}`,'metric-name'));
    const bar=el('div',undefined,'bar'),fill=el('span');fill.style.width=`${(r.recall||0)*100}%`;bar.append(fill);card.append(bar);
    for(const [label,value] of [[`MRR@${k}`,decimal(r.mrr)],['ครบทุกหลักฐาน',pct(r.complete)],['คำถามที่คำนวณ',`${r.count} ข้อ`],['นอกขอบเขต / ไม่นับ',`${r.excluded} ข้อ`]]){const row=el('div',undefined,'metric-pair');row.append(el('span',label),el('b',value));card.append(row);}
    const timing=method.timing;
    if(timing){const details=el('details',undefined,'timing-details');details.append(el('summary','เวลาและทรัพยากรจาก Python'));for(const [label,key,unit] of [['สร้างดัชนี','index_seconds','s'],['ค้น p50','query_p50_ms','ms'],['ค้น p95','query_p95_ms','ms'],['Peak process RSS','peak_process_rss_mb','MB']]){const item=el('div',undefined,'metric-pair');item.append(el('span',label),el('b',Number.isFinite(timing[key])?timing[key].toFixed(2)+' '+unit:'—'));details.append(item);}details.append(el('p','เวลาจากเครื่องที่รัน Python ไม่ใช่เวลาคำนวณในเบราว์เซอร์ · RSS รวม Python/ไลบรารีด้วย','metric-note'),el('p','รุ่น: '+(method.revision||'ไม่ได้ระบุ'),'model'));card.append(details);}
    target.append(card);
  }
  if(!results.length)target.append(el('p','ยังไม่มีผลรันที่พร้อมแสดง','empty'));
}
function run(){
  if(!benchmark)return;
  try{
    k=Number($('k').value);category=$('category').value;
    results=evaluate(corpus,questions,benchmark.methods,k,category);
    renderResults();renderQuestions();$('run-state').textContent=`คำนวณแล้ว · ${benchmark.methods.length}/3 วิธี · Top ${k}`;
    $('download-json').disabled=false;$('download-md').disabled=false;error('');
  }catch(e){error(e.message);$('run-state').textContent='คำนวณไม่สำเร็จ';}
}
function renderQuestions(){
  const methodId=$('method').value, result=results.find(r=>r.id===methodId), query=$('search').value.trim().toLocaleLowerCase('th');
  const filtered=questions.filter(q=>(category==='all'||q.category===category)&&(!query||`${q.id} ${q.question}`.toLocaleLowerCase('th').includes(query)));
  const target=$('question-list');target.replaceChildren();
  for(const q of filtered){
    const row=result?.rows.find(r=>r.question_id===q.id), card=el('details',undefined,'question-card'), summary=el('summary');
    const badge=q.answerable===false?'นอกขอบเขต':row?`${row.hits}/${new Set(q.gold_units).size} หลักฐาน`:'รอผลค้น';
    summary.append(el('span',q.id,'q-id'),el('span',q.question,'q-title'),el('span',badge,'q-badge'+(row?.complete===1?' good':'')));card.append(summary);
    const body=el('div',undefined,'q-body');body.append(el('p',`${names[q.category]||q.category} · กลุ่ม ${q.group_id} · เฉลยชุดนำร่อง รอตรวจทาน`,'q-category'));
    const layout=el('div',undefined,'evidence-layout'),gold=el('div'),retrieved=el('div');gold.append(el('h4','คำตอบที่คาดหวังและหลักฐานเฉลย'),el('p',q.expected_answer,'expected'));
    for(const e of q.evidence||[]){const unit=corpus.units.find(u=>u.id===e.unit_id),box=el('div',undefined,'gold');box.append(el('p',`${unit?.title||e.unit_id} · PDF หน้า ${(e.pdf_pages||unit?.pdf_pages||[]).join(', ')}`),el('blockquote',e.quote));gold.append(box);}
    if(!q.gold_units.length)gold.append(el('p','ไม่มีหลักฐานเฉลยในขอบเขตนี้ ไม่คำนวณ Recall/MRR และยังไม่ได้ทดสอบการปฏิเสธคำถาม','metric-note'));
    retrieved.append(el('h4',`ผลค้นคืน ${row?row.ranking.length:0} อันดับ`));
    if(row){row.ranking.forEach((hit,i)=>{const unit=corpus.units[hit.index],d=el('details',undefined,'retrieved'),s=el('summary'),isGold=q.gold_units.includes(hit.id);s.append(el('span',String(i+1)),el('strong',unit.title),el('span',isGold?'ตรงเฉลย':'',isGold?'found':''));d.append(s,el('p',`คะแนน ${hit.score.toFixed(5)} · PDF หน้า ${unit.pdf_pages.join(', ')} · เลขหน้าในเล่ม ${unit.printed_pages.join(', ')}`),el('p',unit.text));retrieved.append(d);});}
    else retrieved.append(el('p','กดคำนวณผล หรือรัน Python เพื่อสร้างข้อมูลทดลอง','metric-note'));
    layout.append(gold,retrieved);body.append(layout);
    const form=el('div',undefined,'review-form'),label=el('label','บันทึกการตรวจในเครื่องนี้'),select=el('select');
    for(const [v,t] of [['pending','ยังไม่ได้ตรวจ'],['checked','ตรวจแล้วในเครื่องนี้'],['revise','ต้องแก้ไข']]){const o=el('option',t);o.value=v;select.append(o);}select.value=reviews[q.id]?.status||'pending';select.setAttribute('aria-label',`สถานะตรวจ ${q.id}`);label.append(select);
    const noteLabel=el('label','หมายเหตุ / ข้อเสนอแก้เฉลย'),input=el('input');input.type='text';input.value=reviews[q.id]?.note||'';input.placeholder='บันทึกสิ่งที่ตรวจพบ';input.setAttribute('aria-label',`หมายเหตุ ${q.id}`);noteLabel.append(input);
    const save=()=>{reviews[q.id]={status:select.value,note:input.value,updated_at:new Date().toISOString()};reviewSave();};select.addEventListener('change',save);input.addEventListener('change',save);form.append(label,noteLabel);body.append(form);card.append(body);    target.append(card);
  }
  if(!filtered.length)target.append(el('p','ไม่พบคำถามที่ตรงกับตัวกรอง','empty'));renderReviewCount();
}
function exportObject(){return {exported_at:new Date().toISOString(),mode:'reranked_saved_python_scores',label_status:'provisional_not_independently_reviewed',source_sha256:corpus.source.sha256,k,category,provenance:benchmark.provenance,methods:benchmark.methods.map(({id,model_id,revision,configuration,timing,completed_at})=>({id,model_id,revision,configuration,timing,completed_at})),results};}
function markdown(){
  const lines=['# ผลคำนวณการค้นคืนจากเว็บ','',`เวลาส่งออก: ${new Date().toISOString()}`,`ตัวกรอง: ${category} | k = ${k}`,'','**ชุดพัฒนานำร่อง เฉลยจาก AI รอตรวจทาน ไม่ใช่ผลทดสอบสุดท้าย**','','คำนวณอันดับและตัวชี้วัดใหม่จากคะแนนที่ Python บันทึกไว้ ไม่ได้รัน embedding ใหม่ในเบราว์เซอร์',`SHA-256 ของ PDF: ${corpus.source.sha256}`,'','| วิธี | จำนวนข้อที่มีเฉลย | Recall@'+k+' | MRR@'+k+' | พบหลักฐานครบ |','|---|---:|---:|---:|---:|'];
  for(const r of results)lines.push(`| ${r.label} | ${r.count} | ${decimal(r.recall)} | ${decimal(r.mrr)} | ${decimal(r.complete)} |`);
  lines.push('','## เวลาและทรัพยากรจาก Python','','เวลาที่บันทึกจากเครื่องรัน ไม่ใช่เวลาคำนวณคะแนนในเบราว์เซอร์; Peak RSS รวม Python และไลบรารีด้วย','','| วิธี | สร้างดัชนี (s) | ค้น p50 (ms) | ค้น p95 (ms) | Peak RSS (MB) |','|---|---:|---:|---:|---:|');
  for(const m of benchmark.methods){const t=m.timing||{},n=key=>Number.isFinite(t[key])?t[key].toFixed(2):'—';lines.push(`| ${m.label} | ${n('index_seconds')} | ${n('query_p50_ms')} | ${n('query_p95_ms')} | ${n('peak_process_rss_mb')} |`);}
  lines.push('','## นิยามและข้อจำกัด','','- Recall วัดหน่วยหลักฐานรายวิชา/นโยบาย ไม่ใช่จำนวน chunks','- MRR ตัดอันดับที่ k; ไม่พบใน top-k ให้ 0','- คำถามนอกขอบเขตไม่มี gold จึงไม่รวมใน Recall/MRR','- การค้นเจอข้อความไม่ยืนยันว่าตอบได้ และยังไม่วัด Evidence Gate หรือ LLM','- คำถามเปลี่ยนถ้อยคำในกลุ่มเดียวกันไม่ใช่ตัวอย่างอิสระทั้งหมด','- คะแนนต่างกันเพียงเล็กน้อยยังไม่ยืนยันว่าโมเดลหนึ่งดีกว่า','', '## ผลรายข้อ','');
  for(const r of results){lines.push(`### ${r.label}`,'','| ข้อ | Recall | RR | อันดับหลักฐาน |','|---|---:|---:|---|');for(const q of r.rows)lines.push(`| ${q.question_id} | ${decimal(q.recall)} | ${decimal(q.rr)} | ${q.ranking.map(x=>x.id).join(', ')} |`);lines.push('');}return lines.join('\n');
}
async function loadBenchmark(){
  benchmark=await getJSON('data/benchmark.json');
  if(!benchmark.methods?.length)throw new Error('ยังไม่มีวิธีค้นคืนที่รันสำเร็จ');
  if(benchmark.provenance?.source_sha256&&benchmark.provenance.source_sha256!==corpus.source.sha256)throw new Error('ผลรันอ้างถึง PDF คนละฉบับ กรุณารันใหม่');
  for(const [name,hash] of Object.entries(benchmark.provenance?.data_sha256||{})){if(dataHashes[name]&&dataHashes[name]!==hash)throw new Error('ชุดข้อมูลเปลี่ยนจากรอบที่รัน: '+name+' กรุณารัน Python ใหม่');}
  const missing=['bm25','e5','bge'].filter(id=>!benchmark.methods.some(m=>m.id===id));
  $('availability').textContent=missing.length?'แสดงเฉพาะวิธีที่มีผลรันสำเร็จ ขณะนี้ยังไม่มีผล: '+missing.join(', '):'มีผลรันจริงครบ 3 วิธี · ไม่มีการเติมคะแนนให้วิธีที่ยังไม่รัน';
  const previous=$('method').value;$('method').replaceChildren();
  for(const method of benchmark.methods){const o=el('option',method.label);o.value=method.id;$('method').append(o);}
  if(benchmark.methods.some(m=>m.id===previous))$('method').value=previous;
  $('provenance').textContent=JSON.stringify(benchmark.provenance,null,2);$('run').disabled=false;run();
}
async function localStatus(initial=false){
  try{
    const r=await fetch('api/status',{cache:'no-store'});if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw new Error('ไม่มีตัวรัน');const s=await r.json();
    localAvailable=true;$('local-run').disabled=Boolean(s.running);$('local-model').disabled=Boolean(s.running);
    $('local-status').textContent=s.error?`รันไม่สำเร็จ: ${s.error}`:s.status||(s.running?'กำลังประมวลผล…':'ตัวรัน Python พร้อม');
    $('local-help').textContent='เชื่อมกับตัวรันในเครื่องนี้แล้ว การรันครั้งแรกอาจต้องดาวน์โหลดโมเดลและใช้เวลาหลายนาที ผลจะบันทึกในโฟลเดอร์ data ของ checkout นี้ ไม่เผยแพร่ขึ้น GitHub อัตโนมัติ';
    if(s.running){polling=true;setTimeout(()=>localStatus(),2500);}else if(polling){polling=false;await loadBenchmark();}
  }catch(e){
    localAvailable=false;$('local-run').disabled=true;$('local-status').textContent=initial?'หน้าออนไลน์: ใช้คะแนนจากการรันที่เผยแพร่ไว้':'ติดต่อ Python ไม่ได้ กรุณาตรวจ terminal ของตัวรัน';
    if(polling){polling=false;error('การเชื่อมต่อตัวรันขาดหาย ผลที่แสดงยังเป็นรอบก่อนหน้า');}
  }
}
$('run').addEventListener('click',run);$('k').addEventListener('change',run);$('category').addEventListener('change',run);$('method').addEventListener('change',renderQuestions);$('search').addEventListener('input',renderQuestions);
$('download-json').addEventListener('click',()=>download('retrieval-results.json',JSON.stringify(exportObject(),null,2),'application/json'));
$('download-md').addEventListener('click',()=>download('retrieval-results.md',markdown(),'text/markdown;charset=utf-8'));
$('export-review').addEventListener('click',()=>download('question-review.json',JSON.stringify({source_sha256:corpus?.source.sha256,questions_sha256:dataHashes['questions.json'],exported_at:new Date().toISOString(),status:'local_review_notes_not_published_gold',reviews},null,2),'application/json'));
$('local-run').addEventListener('click',async()=>{if(!localAvailable)return;$('local-run').disabled=true;try{const r=await fetch('api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:$('local-model').value})});if(!r.ok)throw new Error(await r.text());polling=true;await localStatus();}catch(e){$('local-run').disabled=false;error(`เริ่มรันไม่ได้: ${e.message}`);}});
async function init(){
  try{
    const [c,q]=await Promise.all([getJSON('data/corpus.json'),getJSON('data/questions.json')]);corpus=c;questions=q.questions;
    reviewKey='cs301-review-'+corpus.source.sha256+'-'+dataHashes['questions.json'];try{reviews=JSON.parse(localStorage.getItem(reviewKey)||'{}');}catch{reviews={};}
    $('dataset-stats').textContent=`${questions.length} คำถาม · ${new Set(questions.map(x=>x.group_id)).size} กลุ่ม · ${corpus.units.length} หน่วยหลักฐาน`;
    $('scope').textContent=corpus.source.scope+' · PDF SHA-256: '+corpus.source.sha256;
    for(const cat of [...new Set(questions.map(x=>x.category))]){const o=el('option',names[cat]||cat);o.value=cat;$('category').append(o);}
    renderQuestions();try{await loadBenchmark();}catch(e){error(e.message+' — รัน Python เพื่อสร้างผล หรือรอเผยแพร่ผลที่รันแล้ว');$('run-state').textContent='ยังไม่มีผลรัน';}
  }catch(e){error(e.message);$('run-state').textContent='โหลดไม่สำเร็จ';}
  await localStatus(true);
}
init();
