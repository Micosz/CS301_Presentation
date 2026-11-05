// Pure evaluator: scores originate from the Python run, not from this browser.
export function rankUnits(scores, units) {
  if (!Array.isArray(scores) || scores.length !== units.length || scores.some(v => !Number.isFinite(v))) throw new Error('ขนาดหรือค่าของผลคะแนนไม่ถูกต้อง');
  return units.map((u,i)=>({id:u.id,score:scores[i],index:i})).sort((a,b)=>b.score-a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
export function scoreRanking(ranked, gold, k) {
  if (![1,3,5].includes(k)) throw new Error('k ต้องเป็น 1, 3 หรือ 5');
  const g=new Set(gold);
  if (!g.size) return {recall:null,rr:null,complete:null,hits:0};
  const top=ranked.slice(0,k), hits=new Set(top.filter(x=>g.has(x.id)).map(x=>x.id)).size;
  const first=top.findIndex(x=>g.has(x.id));
  return {recall:hits/g.size,rr:first<0?0:1/(first+1),complete:hits===g.size?1:0,hits};
}
export function evaluate(corpus, questions, methods, k=5, category='all') {
  const unitIds=new Set(corpus.units.map(u=>u.id));
  if (unitIds.size!==corpus.units.length) throw new Error('รหัสหลักฐานซ้ำ');
  return methods.map(method=>{
    if (!Array.isArray(method.unit_scores) || method.unit_scores.length!==questions.length) throw new Error('จำนวนผลคะแนนไม่ตรงกับคำถาม');
    const rows=[];
    questions.forEach((q,i)=>{
      if (category!=='all' && q.category!==category) return;
      if ((q.gold_units||[]).some(id=>!unitIds.has(id))) throw new Error('เฉลยอ้างถึงหลักฐานที่ไม่มีในชุดข้อมูล');
      if(q.answerable===false && q.gold_units.length) throw new Error('คำถามนอกขอบเขตมีเฉลยหลักฐาน');
      const ranking=rankUnits(method.unit_scores[i],corpus.units);
      rows.push({question_id:q.id,category:q.category,ranking:ranking.slice(0,k),...scoreRanking(ranking,q.gold_units,k)});
    });
    const eligible=rows.filter(r=>r.recall!==null), count=eligible.length;
    const mean=key=>count?eligible.reduce((s,r)=>s+r[key],0)/count:null;
    return {id:method.id,label:method.label,k,count,excluded:rows.length-count,recall:mean('recall'),mrr:mean('rr'),complete:mean('complete'),rows};
  });
}
