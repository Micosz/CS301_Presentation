"""Real, reproducible CPU inference; exports complete unit score matrices for browser replay."""
import argparse, hashlib, importlib.metadata, json, os, platform, re, threading, time
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import psutil
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('PYTHAINLP_DATA',str(ROOT/'.cache/pythainlp'))
MODELS={
 'e5':('intfloat/multilingual-e5-small','614241f622f53c4eeff9890bdc4f31cfecc418b3'),
 'bge':('BAAI/bge-m3','5617a9f61b028005a4858fdac845db406aefb181')}
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def normalize(text, codes):
    def sub(m):
        code=m.group(1)
        return 'cs'+code if code in codes else m.group(0).lower()
    return re.sub(r'(?:\bCS\s*\.?\s*|คพ\s*\.?\s*)(\d{3})(?!\d)',sub,text,flags=re.I).lower()
def rank(ids,scores): return sorted(range(len(ids)),key=lambda i:(-float(scores[i]),ids[i]))
def per_question(ids,scores,gold,k):
    if not gold: return None
    top=[ids[i] for i in rank(ids,scores)[:k]]; relevant=set(gold)
    hits=len(relevant.intersection(top))
    rr=next((1/(i+1) for i,u in enumerate(top) if u in relevant),0)
    return dict(recall=hits/len(relevant),rr=rr,complete=int(hits==len(relevant)))
def evaluate(ids,matrix,questions):
    result={}
    for k in [1,3,5]:
        rows=[per_question(ids,s,q['gold_units'],k) for s,q in zip(matrix,questions) if q['answerable']]
        result[str(k)]={key:float(np.mean([r[key] for r in rows])) for key in ['recall','rr','complete']}
        result[str(k)]['n']=len(rows)
    return result
class Memory:
    def __init__(self): self.peak=0;self.done=threading.Event()
    def __enter__(self):
        def monitor():
            p=psutil.Process()
            while not self.done.is_set():
                self.peak=max(self.peak,p.memory_info().rss);self.done.wait(.05)
        self.t=threading.Thread(target=monitor,daemon=True);self.t.start();return self
    def __exit__(self,*args): self.done.set();self.t.join()
def aggregate(chunk_scores, chunks, ids):
    out=np.full(len(ids),-np.inf); lookup={u:i for i,u in enumerate(ids)}
    for s,c in zip(chunk_scores,chunks): out[lookup[c['unit_id']]]=max(out[lookup[c['unit_id']]],float(s))
    assert np.isfinite(out).all()
    return out.tolist()
def execute(key,corpus,questions):
    ids=[u['id'] for u in corpus['units']];chunks=corpus['chunks']
    codes={u[3:] for u in ids if u.startswith('cs-')}
    docs=[normalize(c['text'],codes) for c in chunks]
    queries=[normalize(q['question'],codes) for q in questions]
    t0=time.perf_counter();timings=[];scores=[];meta={}
    with Memory() as memory:
        if key=='bm25':
            from pythainlp.tokenize import word_tokenize
            from rank_bm25 import BM25Okapi
            def tokenize(s):
                tokens=[]
                for part in re.split(r'(cs\d{3})',s):
                    tokens.extend([part] if re.fullmatch(r'cs\d{3}',part) else word_tokenize(part,engine='newmm',keep_whitespace=False))
                return [x for x in tokens if any(c.isalnum() for c in x)]
            setup=time.perf_counter()-t0;start=time.perf_counter()
            bm=BM25Okapi([tokenize(d) for d in docs],k1=1.5,b=.75,epsilon=.25)
            build=time.perf_counter()-start
            def search(q): return aggregate(bm.get_scores(tokenize(q)),chunks,ids)
            label='BM25 · newmm';model_id='rank_bm25.BM25Okapi';revision='0.2.2'
            meta={'k1':1.5,'b':.75,'epsilon':.25,'tokenizer':'PyThaiNLP newmm'}
        else:
            import torch
            from sentence_transformers import SentenceTransformer
            torch.set_num_threads(4);torch.manual_seed(0)
            model_id,revision=MODELS[key]
            model=SentenceTransformer(model_id,revision=revision,device='cpu',local_files_only=os.getenv('HF_HUB_OFFLINE')=='1')
            model.max_seq_length=512
            dp='passage: ' if key=='e5' else '';qp='query: ' if key=='e5' else ''
            doc_inputs=[dp+d for d in docs];query_inputs=[qp+q for q in queries]
            lengths=[len(model.tokenizer(s,add_special_tokens=True)['input_ids']) for s in doc_inputs+query_inputs]
            if max(lengths)>512: raise ValueError(f'Input truncation would occur: max={max(lengths)}; revise COMMON corpus before evaluation')
            model.encode([query_inputs[0]],normalize_embeddings=True,show_progress_bar=False)
            setup=time.perf_counter()-t0;start=time.perf_counter()
            vectors=model.encode(doc_inputs,batch_size=8,normalize_embeddings=True,show_progress_bar=True)
            build=time.perf_counter()-start
            def search(q):
                v=model.encode([qp+q],normalize_embeddings=True,show_progress_bar=False)[0]
                return aggregate(vectors@v,chunks,ids)
            label='BGE-M3 · Dense' if key=='bge' else 'Multilingual E5-small · Dense'
            meta={'max_seq_length':512,'max_observed_tokens':max(lengths),'truncated_inputs':0,'query_prefix':qp,'passage_prefix':dp,'normalize_embeddings':True,'device':'cpu','threads':4,'batch_size':8,'pooling':str(model[1])}
        print('Index ready:',key,'seconds',round(build,3),flush=True)
        # First round supplies scores; all 3 sequential rounds measure warm query latency.
        for repeat in range(3):
            for qi,q in enumerate(queries):
                start=time.perf_counter();row=search(q);rank(ids,row)
                timings.append((time.perf_counter()-start)*1000)
                if repeat==0:scores.append(row)
            print('Query round',repeat+1,key,flush=True)
    return dict(id=key,label=label,kind='lexical' if key=='bm25' else 'dense',model_id=model_id,revision=revision,configuration=meta,unit_scores=scores,evaluation=evaluate(ids,scores,questions),timing=dict(setup_seconds=setup,index_seconds=build,query_p50_ms=float(np.median(timings)),query_p95_ms=float(np.percentile(timings,95)),query_repeats=3,query_measurements=len(timings),peak_process_rss_mb=memory.peak/1024**2,scope='Warm query: preprocessing/encoding + exact chunk scores + max-unit aggregation + sorting. Index excludes model loading; RSS includes interpreter/imports/model; no GPU.'),completed_at=datetime.now(timezone.utc).isoformat())
def bootstrap_pair(methods,questions,ids):
    if 'bge' not in methods or 'e5' not in methods:return None
    groups={}
    for i,q in enumerate(questions):
        if not q['answerable']:continue
        a=per_question(ids,methods['bge']['unit_scores'][i],q['gold_units'],3)['recall']
        b=per_question(ids,methods['e5']['unit_scores'][i],q['gold_units'],3)['recall']
        groups.setdefault(q['group_id'],[]).append(a-b)
    vals=np.array([np.mean(v) for v in groups.values()]);rng=np.random.default_rng(301)
    means=np.mean(rng.choice(vals,size=(2000,len(vals)),replace=True),axis=1)
    return dict(metric='Evidence-unit Recall@3',difference='BGE minus E5; equal weight per intent group',group_count=len(vals),mean=float(vals.mean()),ci95=np.percentile(means,[2.5,97.5]).tolist(),resamples=2000,seed=301)
def report(data,corpus,questions):
    lines=['# ผลทดลองนำร่องสำหรับเลือก Embedding model','',f"วันที่รันล่าสุด: {data['provenance']['updated_at']}",'','**สถานะ: ผลรันจริงบนชุดพัฒนา แต่คำถามและเฉลยจัดทำโดย AI และยังรอการตรวจทานจากคน ไม่ใช่ผลทดสอบสุดท้ายหรือหลักฐานว่าโมเดลหนึ่งดีที่สุดโดยทั่วไป**','', '## ข้อมูลและวิธีทดลอง','',f"- PDF SHA-256: `{corpus['source']['sha256']}`",f"- ขอบเขต: {corpus['source']['scope']}",f"- Corpus: {len(corpus['units'])} หน่วยหลักฐาน แบ่งเป็น {len(corpus['chunks'])} ข้อความย่อย",f"- คำถาม {len(questions)} ข้อ: ตอบได้ 44 ข้อ (24 กลุ่มเจตนา) และนอกขอบเขต 4 ข้อ",'- ทั้งหมดเป็นชุดพัฒนา คำถามเปลี่ยนถ้อยคำอยู่กลุ่มเดียวกับต้นฉบับ ยังไม่ได้สร้างหรือใช้ชุดทดสอบที่กันไว้','- ใช้ข้อความเดียวกันทุกวิธี ปรับ CS/คพ เฉพาะรหัสที่มีใน corpus; ใช้ prefix ตามคู่มือ E5; BGE ใช้ Dense เท่านั้น','- ข้อความย่อยยาวไม่เกิน 600 อักขระก่อนเติมชื่อหน่วยหลักฐาน overlap 70 อักขระ; ตรวจ tokenizer ว่าไม่มีการตัดเกิน 512 tokens','- ค้นแบบ exact score แล้วรวมคะแนนสูงสุดของแต่ละหน่วยหลักฐานเหมือนกันทุกวิธี; k หมายถึงจำนวนหน่วยหลักฐานไม่ซ้ำ','- หน่วยหลักฐานคือคำอธิบายรายวิชาหนึ่งวิชา หรือหน้านโยบายหนึ่งหน้า; คะแนนจึงเป็น **Evidence-unit Recall ไม่ใช่ Gold Chunk Recall**','- Recall@k = จำนวนหน่วย gold ที่พบ / จำนวนหน่วย gold; MRR@k ดูอันดับ gold แรกภายใน k; Complete@k ต้องพบครบทุก gold','- คำถามนอกขอบเขตไม่เข้าเฉลี่ย Recall/MRR และไม่อ้างว่าผ่านการปฏิเสธ เพราะยังไม่มี Evidence Gate/LLM','', '## ผลรวม (macro เฉลี่ยต่อคำถามที่ตอบได้)','', '| วิธี | Recall@1 | Recall@3 | Recall@5 | MRR@5 | Complete@3 |','|---|---:|---:|---:|---:|---:|']
    for m in data['methods']:
        e=m['evaluation'];lines.append(f"| {m['label']} | {e['1']['recall']:.4f} | {e['3']['recall']:.4f} | {e['5']['recall']:.4f} | {e['5']['rr']:.4f} | {e['3']['complete']:.4f} |")
    lines+=['','## เวลาและหน่วยความจำ','', '| วิธี | สร้างดัชนี (s) | คำถาม p50 (ms) | คำถาม p95 (ms) | Peak process RSS (MB) |','|---|---:|---:|---:|---:|']
    for m in data['methods']:
        t=m['timing'];lines.append(f"| {m['label']} | {t['index_seconds']:.2f} | {t['query_p50_ms']:.2f} | {t['query_p95_ms']:.2f} | {t['peak_process_rss_mb']:.1f} |")
    lines+=['','เวลาเป็นผลจากเครื่องนี้เท่านั้น รัน CPU ต่อเนื่อง 3 รอบต่อคำถามหลัง warm-up; รวม encoding/ตัดคำ การค้นและเรียงอันดับ ไม่รวมการโหลดโมเดลและการดาวน์โหลด Peak RSS รวม Python และไลบรารีด้วย ไม่ใช่ขนาดโมเดลอย่างเดียว',f"เครื่อง: `{data['provenance']['environment']}`",'','## ผลแยกประเภท','', '| วิธี | ประเภท | จำนวน | Recall@3 | MRR@5 |','|---|---|---:|---:|---:|']
    ids=[u['id'] for u in corpus['units']]
    for m in data['methods']:
        for cat in ['direct','paraphrase','mixed','multi_evidence']:
            inds=[i for i,q in enumerate(questions) if q['category']==cat]
            rec=[per_question(ids,m['unit_scores'][i],questions[i]['gold_units'],3)['recall'] for i in inds]
            rr=[per_question(ids,m['unit_scores'][i],questions[i]['gold_units'],5)['rr'] for i in inds]
            lines.append(f"| {m['label']} | {cat} | {len(inds)} | {np.mean(rec):.4f} | {np.mean(rr):.4f} |")
    lines+=['','## ความไม่แน่นอนและการตัดสินใจ','']
    pair=data.get('paired_bootstrap')
    if pair:
        lo,hi=pair['ci95'];lines += [f"BGE ลบ E5: Recall@3 เฉลี่ยต่อกลุ่มเจตนาต่างกัน {pair['mean']:.4f}; bootstrap 95% interval [{lo:.4f}, {hi:.4f}] จาก 24 กลุ่ม สุ่ม 2,000 รอบ seed 301",'']
        lines += ['ช่วงประมาณคร่อมศูนย์หรือแตะศูนย์ จึงยังไม่มีหลักฐานนำร่องที่ชัดว่าตัวหนึ่งเหนือกว่าอีกตัวด้าน Recall@3' if lo<=0<=hi else 'ช่วงประมาณไม่คร่อมศูนย์ แต่ยังเป็นผลชุดพัฒนาขนาดเล็กที่เฉลยรอตรวจ ไม่ใช่ข้อสรุปทั่วไป','']
    lines+=['ยังไม่เลือกผู้ชนะอัตโนมัติจากคะแนนรวม ต้องตรวจเฉลยและข้อผิดพลาดก่อน หากคุณภาพใกล้กันให้ใช้เวลาและหน่วยความจำประกอบการเลือก แล้วล็อกโมเดลก่อนประเมินบนชุดทดสอบใหม่','', '## ตัวอย่างข้อที่ค้นหลักฐานไม่ครบใน top-3','']
    for m in data['methods']:
        lines.append('### '+m['label']);lines.append('')
        misses=[]
        for i,q in enumerate(questions):
            if q['answerable'] and per_question(ids,m['unit_scores'][i],q['gold_units'],3)['complete']==0:
                top=[ids[j] for j in rank(ids,m['unit_scores'][i])[:3]]
                misses.append(f"- {q['id']}: {q['question']} — gold: {', '.join(q['gold_units'])}; top-3: {', '.join(top)}")
        lines+=misses or ['ไม่พบข้อที่ตก gold ใน top-3 บนชุดนำร่องนี้ ซึ่งไม่รับประกันว่าชุดคำถามใหม่จะได้ผลเท่ากัน'];lines.append('')
    lines+=['## ข้อจำกัด','', '- Corpus นำร่องเลือกเฉพาะส่วนและไม่รวมตารางรายวิชา/ภาคผนวก จึงยังไม่พิสูจน์การค้นทั้งเล่มหรือแยกฉบับหลักสูตรเก่า','- คำถามจำนวนหนึ่งระบุรหัสวิชา ทำให้ค้นง่าย; ต้องเพิ่มคำถามจริงจากนักศึกษาและตรวจ gold ทางเลือกที่ถูกต้อง','- การรวมด้วยคะแนนสูงสุดอาจเอื้อหน่วยที่มีข้อความย่อยมากกว่า ต้องศึกษา chunking เพิ่มเมื่อพัฒนาระบบเต็ม','- หลักฐานระดับรายวิชาอาจค้นเจอวิชาถูกแต่ข้อความย่อยที่ใช้ตอบยังไม่ครบ ต้องประเมิน passage-level และคำตอบภายหลัง','- ไม่ได้ทดสอบว่า context 8,192 tokens ดีกว่า เพราะทุกโมเดลรอบนี้ใช้ข้อความไม่เกิน 512 tokens','- ไม่ได้เปรียบเทียบ Typhoon/GPT ไม่ได้วัดคำตอบ LLM หรือปรับ Evidence Gate','', '## การทำซ้ำและแหล่งข้อมูล','', '- `data/benchmark.json` เก็บคะแนนทุกคู่คำถาม–หน่วยหลักฐาน รุ่นโมเดล hash ข้อมูลและการตั้งค่า','- `data/questions.json` เก็บคำถาม เฉลย กลุ่มเจตนา ข้อความอ้างอิง และสถานะรอตรวจ','- ดูคำสั่งรันใน [README](../README.md)','- [BGE-M3](https://huggingface.co/BAAI/bge-m3)','- [Multilingual E5-small](https://huggingface.co/intfloat/multilingual-e5-small)','- [rank_bm25](https://github.com/dorianbrown/rank_bm25)','- [PyThaiNLP](https://pythainlp.org/)', '']
    (ROOT/'reports/benchmark-report.md').write_text('\n'.join(lines))
def main():
    p=argparse.ArgumentParser();p.add_argument('--model',choices=['bm25','e5','bge','all'],default='all');args=p.parse_args()
    corpus=json.loads((ROOT/'data/corpus.json').read_text());questions=json.loads((ROOT/'data/questions.json').read_text())['questions']
    fingerprint={x:digest(ROOT/'data'/x) for x in ['corpus.json','questions.json']}
    target=ROOT/'data/benchmark.json';existing=json.loads(target.read_text()) if target.exists() else {}
    methods={m['id']:m for m in existing.get('methods',[])} if existing.get('provenance',{}).get('data_sha256')==fingerprint else {}
    for key in (['bm25','e5','bge'] if args.model=='all' else [args.model]):
        methods[key]=execute(key,corpus,questions)
        packages={p:importlib.metadata.version(p) for p in ['numpy','pypdf','pythainlp','rank-bm25','sentence-transformers','torch','transformers']}
        data=dict(schema_version=1,provenance=dict(updated_at=datetime.now(timezone.utc).isoformat(),data_sha256=fingerprint,source_sha256=corpus['source']['sha256'],label_status='provisional; AI-authored; pending human review',split='development_only',environment=f'{platform.system()} {platform.release()} {platform.machine()}; Python {platform.python_version()}; CPU',packages=packages,score_scope='full exact chunk scores aggregated by max per evidence unit; not new embedding inference in browser'),methods=[methods[k] for k in ['bm25','e5','bge'] if k in methods],evaluation={'status':'pilot_only'})
        data['paired_bootstrap']=bootstrap_pair(methods,questions,[u['id'] for u in corpus['units']])
        tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False));tmp.replace(target)
        report(data,corpus,questions)
        print('Saved',key,methods[key]['evaluation'],flush=True)
if __name__=='__main__':main()
