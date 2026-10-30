'use strict';
const deck=document.getElementById('deck');
let current=0;
const modal=document.getElementById('modal');
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
slides.forEach((s,i)=>{
 const el=document.createElement('section');
 el.className='slide';el.id='slide-'+(i+1);el.setAttribute('aria-label',`${i+1}. ${s.title}`);
 const eyebrow=s.eyebrow ? '<div class="eyebrow">'+s.eyebrow+'</div>' : '';
 const source=i>4 ? '<div class="source">'+s.source+'</div>' : '';
 el.innerHTML=i===0 ? eyebrow+s.html : eyebrow+'<h2>'+s.title+'</h2>'+'<div class="slide-content">'+s.html+'</div>'+source;
 deck.appendChild(el);
});
function fit(){const rect=document.getElementById('stage').getBoundingClientRect();deck.style.transform=`scale(${Math.min(rect.width/1440,rect.height/840)})`;}

const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const slideAnimations=new Set();
function stopSlideMotion(){
 for(const animation of slideAnimations) animation.cancel();
 slideAnimations.clear();
}
reducedMotion.addEventListener('change',stopSlideMotion);
window.addEventListener('beforeprint',stopSlideMotion);
function animateSlide(slide,direction){
 stopSlideMotion();
 if(reducedMotion.matches || typeof slide.animate!=='function') return;
 // Animate individual entities; keep the deck's responsive scale untouched.
 slide.style.animation='none';
 const selectors=[
  ':scope > .eyebrow', ':scope > h2', ':scope > .intro',
  '.hero > div:first-child > *', '.hero-visual > *', '.hero-bottom',
  '.objective-statement', '.objective-item', '.data-table',
  '.table-note', '.path-stop', '.callout', '.process-item', '.document',
  '.node', '.down-arrow', '.gate', '.branch-result', '.tabs',
  '.method-view > div', '.diagram-button', '.aside-list > *',
  '.flow-row', '.screen-item', '.design-art', '.principle',
  '.metric-demo', '.metric-list > *', '.experiment', '.test-panel',
  '.usability', '.progress-list > article', '.closing-question'
 ];
 const candidates=[...slide.querySelectorAll(selectors.join(','))];
 // Avoid compounding transforms on both an entity and its children.
 const entities=candidates.filter(el=>!candidates.some(parent=>parent!==el&&parent.contains(el)));
 entities.forEach((el,i)=>{
  const base=getComputedStyle(el).transform;
  const rest=base==='none'?'':base;
  const visual=el.matches('.hero-visual > *, .screen-item, .diagram-button, .document, .design-art');
  const animation=el.animate([
   {opacity:0,transform:`translate3d(${direction*(visual?36:20)}px, ${visual?20:12}px, 0) ${rest}`},
   {opacity:1,transform:base}
  ],{duration:visual?700:540,delay:Math.min(i*45,270),easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
  slideAnimations.add(animation);
  animation.onfinish=()=>slideAnimations.delete(animation);
 });
}

let hubZoom;
const objectiveMap=deck.querySelector('.objective-map');
function setDetails(open){
 objectiveMap.classList.toggle('expanded',open);
 objectiveMap.querySelectorAll('.satellite').forEach(item=>item.setAttribute('aria-hidden',String(!open)));
}
function hubOrigin(page,button){
 const rect=page.getBoundingClientRect(), dot=button.querySelector('span').getBoundingClientRect();
 return ((dot.left+dot.width/2-rect.left)/rect.width*100)+'% '+((dot.top+dot.height/2-rect.top)/rect.height*100)+'%';
}
const hubButtons=[...deck.querySelectorAll('[data-hub]')];
function sectionFor(index){return hubButtons.filter(button=>Number(button.dataset.hub)<=index).pop();}
function crossSection(target){
 const from=sectionFor(current),to=sectionFor(target);
 if(reducedMotion.matches || !deck.animate) return go(target);
 go(4);
 const hub=from.closest('.slide');
 to.setAttribute('aria-current','step');
 hubZoom=hub.animate([{transform:'scale(4)',opacity:0},{transform:'scale(1)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:820,easing:'ease-out'});
 hub.style.transformOrigin=hubOrigin(hub,from);
 hubZoom.onfinish=()=>{
  hubZoom.cancel();hubZoom=null;
  enterHub(to,target);
 };
}
function enterHub(button,target=Number(button.dataset.hub)){
 if(hubZoom) return;
 if(reducedMotion.matches || !button.animate) return go(target);
 const page=button.closest('.slide');
 const origin=hubOrigin(page,button);
 hubZoom=page.animate([{transform:'scale(1)',transformOrigin:origin},{transform:'scale(4)',transformOrigin:origin,opacity:0}],{duration:430,easing:'ease-in',fill:'forwards'});
 hubZoom.onfinish=()=>go(target);
}
function navigate(direction){
 if(hubZoom) return;
 const buttons=[...deck.querySelectorAll('.slide.active [data-branch], .slide.active [data-method]')];
 const selected=buttons.findIndex(button=>button.getAttribute('aria-selected')==='true');
 if(selected>=0 && buttons[selected+direction]){
  buttons[selected+direction].click();
  return;
 }
 const target=current+direction;
 if(current>=5 && target>=5 && target<slides.length && sectionFor(current)!==sectionFor(target)) return crossSection(target);

 if(current===1 && objectiveMap.classList.contains('expanded')!==(direction>0)){
  setDetails(direction>0);
  document.getElementById('announcement').textContent=direction>0?'วัตถุประสงค์เฉพาะ':'วัตถุประสงค์หลัก';
  return;
 }
 if(current===4 && direction>0) return enterHub(deck.querySelector('[data-hub]'));
 go(current+direction);
}
function go(index,updateHash=true){
 if(hubZoom){hubZoom.cancel();hubZoom=null;}
 hubButtons.forEach(button=>button.removeAttribute('aria-current'));
 const previous=current;
 const firstVisit=!deck.querySelector('.slide.active');
 current=Math.max(0,Math.min(slides.length-1,index));
 if(current===6) setBranch(previous===7?'no':'yes');
 if(current===7) setMethod(previous===8?'hybrid':'bm25');
 document.querySelectorAll('.slide').forEach((s,i)=>{s.classList.toggle('active',i===current);s.setAttribute('aria-hidden',String(i!==current));s.inert=i!==current;});
 if(firstVisit || previous!==current) setDetails(current===1 && previous===2);
 if(firstVisit || previous!==current) animateSlide(document.getElementById('slide-'+(current+1)),current>=previous?1:-1);
 document.getElementById('counter').textContent=String(current+1).padStart(2,'0')+' / '+slides.length;
 document.getElementById('progress-bar').style.width=((current+1)/slides.length*100)+'%';
 document.getElementById('prev').disabled=current===0;document.getElementById('next').disabled=current===slides.length-1;
 document.getElementById('section-label').textContent=['CS301 · GROUP 7','บทที่ 1 · วัตถุประสงค์','บทที่ 2 · งานที่เกี่ยวข้อง','บทที่ 3 · วิธีดำเนินงาน'][slides[current].chapter];
 document.title=`${String(current+1).padStart(2,'0')} · ${slides[current].title} — CS301`;
 document.getElementById('announcement').textContent=slides[current].title;
 if(updateHash)history.replaceState(null,'','#'+(current+1));
}
function openModal(title,html){document.getElementById('modal-title').textContent=title;document.getElementById('modal-body').innerHTML=html;modal.showModal();document.getElementById('modal-body').scrollTop=0;}
function showOverview(){openModal('สารบัญ · เลือกหัวข้อที่ต้องการนำเสนอ',`<div class="toc-grid">${slides.map((s,i)=>`<button class="toc-item ${i===current?'active':''}" data-go="${i}"><span>${String(i+1).padStart(2,'0')}</span><b>${s.title}</b></button>`).join('')}</div>`);}
function showNotes(){const s=slides[current];openModal(`บันทึกผู้พูด · ${current+1} / ${slides.length}`,`<div class="notes"><p>${escapeHTML(s.notes)}</p><div class="source">${escapeHTML(s.source)}</div></div>`);}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{openModal('โหมดเต็มจอ','<p class="small">เบราว์เซอร์นี้ไม่อนุญาตโหมดเต็มจออัตโนมัติ ใช้คำสั่งเต็มจอจากเมนูของเบราว์เซอร์ได้</p>');}}
function setBranch(branch){document.querySelectorAll('[data-branch]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.branch===branch)));const r=document.getElementById('branch-result');r.classList.toggle('reject',branch==='no');r.innerHTML=branch==='yes'?`<div class="branch-label">เส้นทาง A · หลักฐานเพียงพอ</div><div class="pill" style="color:var(--green)">ส่งต่อไปยัง Generator</div><h3>คำถาม + ข้อความหลักฐาน<br>→ LLM API</h3><p>สร้างคำตอบภาษาไทยหนึ่งคำตอบ<br>พร้อมชื่อเอกสารและเลขหน้า</p><small>ผู้ใช้เลือกเปิดข้อความหลักฐานได้<br>คำสั่งกำหนดให้ไม่เดาเมื่อหลักฐานไม่รองรับ</small>`:`<div class="branch-label">เส้นทาง B · หลักฐานไม่เพียงพอ</div><div class="pill" style="color:var(--red)">ไม่เรียก LLM</div><h3>แจ้งไม่พบข้อมูล<br>หรือข้อมูลไม่เพียงพอ</h3><p>สิ้นสุดการตอบครั้งนี้<br>โดยไม่สร้างคำตอบจากการคาดเดา</p><small>ข้อความแจ้งผลต้องแยกจากระบบขัดข้อง<br>และประเมินว่าปฏิเสธได้เหมาะสมหรือไม่</small>`;}
const methods={bm25:{name:'BM25',lead:'ค้นจากคำสำคัญที่ปรากฏ',text:'ตัดคำภาษาไทยและปรับรหัสวิชาให้เป็นมาตรฐานก่อนสร้างดัชนีและค้นคืน',question:'“CS301 เรียนเกี่ยวกับอะไร”',rows:[['คำตรง / รหัสวิชา','คำสำคัญ'],['ความถี่และความเฉพาะของคำ','จัดอันดับ'],['ข้อความที่เกี่ยวข้อง k อันดับ','ผลค้นคืน']],note:'ต้องทดสอบเมื่อผู้ใช้ใช้ถ้อยคำต่างจากเอกสาร'},dense:{name:'Dense',lead:'ค้นจากความหมายของข้อความ',text:'แปลงคำถามและส่วนข้อความเป็นเวกเตอร์ด้วย embedding แล้วค้นหาข้อความที่มีความหมายใกล้เคียง',question:'“มีวิชาไหนเกี่ยวกับการเตรียมตัวทำโครงงาน”',rows:[['เวกเตอร์ของคำถาม','Embedding'],['ความใกล้เคียงกับข้อความ','Similarity'],['ข้อความที่เกี่ยวข้อง k อันดับ','ผลค้นคืน']],note:'ต้องตรวจว่าจำแนกรหัสวิชาที่คล้ายกันได้หรือไม่'},hybrid:{name:'Hybrid',lead:'รวมอันดับจากสองแนวทาง',text:'ค้นด้วย BM25 และ Dense แล้วรวมอันดับด้วย Reciprocal Rank Fusion (RRF) ก่อนเลือกข้อความ top-k',question:'คำถามที่มีทั้งรหัสวิชาและความหมายเชิงบริบท',rows:[['อันดับจาก BM25','รายการ A'],['อันดับจาก Dense','รายการ B'],['รวมอันดับด้วย RRF','ผลค้นคืน']],note:'เปรียบเทียบด้วยผลจริง ไม่สมมติว่า Hybrid ดีที่สุดเสมอ'}};
function setMethod(key){document.querySelectorAll('[data-method]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.method===key)));const m=methods[key];document.getElementById('method-view').innerHTML=`<div><div class="method-heading">${m.name}</div><h3>${m.lead}</h3><p class="small muted" style="margin-top:15px">${m.text}</p><p class="small red" style="margin-top:20px">${m.note}</p></div><div><p class="caption" style="margin-bottom:18px">ตัวอย่างแนวคิด: ${m.question}</p><div class="rank-list">${m.rows.map((r,i)=>`<div class="rank"><span>${i+1}</span><b>${r[0]}</b><em>${r[1]}</em></div>`).join('')}</div></div>`;}
function setRank(rank){document.querySelectorAll('[data-rank]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.rank===rank)));document.getElementById('recall-value').textContent=rank<=3?'1.00':'0.00';document.getElementById('rr-value').textContent=rank<=3?(1/rank).toFixed(2):'0.00';}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-hub'))return enterHub(b);if(b.hasAttribute('data-go')){if(modal.open)modal.close();go(+b.dataset.go);}if(b.dataset.image){openModal(b.dataset.title,`<img class="${b.classList.contains('screen-button')?'portrait':''}" src="${b.dataset.image}" alt="${escapeHTML(b.dataset.title)}">`);}if(b.dataset.branch)setBranch(b.dataset.branch);if(b.dataset.method)setMethod(b.dataset.method);if(b.dataset.rank)setRank(+b.dataset.rank);});
document.getElementById('prev').onclick=()=>navigate(-1);document.getElementById('next').onclick=()=>navigate(1);document.getElementById('overview').onclick=showOverview;document.getElementById('notes-toggle').onclick=showNotes;document.getElementById('fullscreen').onclick=fullscreen;document.getElementById('modal-close').onclick=()=>modal.close();
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
document.addEventListener('keydown',e=>{if(modal.open)return;if(e.target.closest('input,textarea,select,[contenteditable]'))return;if((e.key===' '||e.key==='Enter')&&e.target.closest('button,a'))return;const k=e.key.toLowerCase();if(['arrowright','arrowdown','pagedown',' '].includes(k)){e.preventDefault();navigate(1);}else if(['arrowleft','arrowup','pageup'].includes(k)){e.preventDefault();navigate(-1);}else if(k==='home'){e.preventDefault();go(0);}else if(k==='end'){e.preventDefault();go(slides.length-1);}else if(k==='o')showOverview();else if(k==='n')showNotes();else if(k==='f')fullscreen();});
let touchStart=null;document.getElementById('stage').addEventListener('touchstart',e=>{if(e.target.closest('button'))return;touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});document.getElementById('stage').addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)navigate(dx<0?1:-1);touchStart=null;},{passive:true});
window.addEventListener('resize',fit);window.addEventListener('hashchange',()=>go((parseInt(location.hash.slice(1),10)||1)-1,false));
setBranch('yes');setMethod('bm25');setRank(2);fit();go((parseInt(location.hash.slice(1),10)||1)-1,false);
