"""Extract a scoped pilot corpus from the supplied 2566 curriculum; no OCR guesses."""
import argparse, hashlib, json, re, unicodedata
from pathlib import Path
from pypdf import PdfReader
ROOT = Path(__file__).resolve().parents[1]
PUA = dict(zip(map(chr,[0xf701,0xf702,0xf703,0xf705,0xf706,0xf709,0xf70a,0xf70b,0xf70e,0xf710,0xf712]),'ิีึ่้์่้์ั็'))
def clean(s):
    s = s.translate(str.maketrans(PUA)).replace('\uf052','[เลือก]').replace('\uf06f','[ไม่เลือก]')
    s = re.sub(r'(?<=[ก-๙])\n\s*(?=[ก-๙])','',s)
    return re.sub(r'\s+',' ',unicodedata.normalize('NFC',s)).strip()
def build(pdf):
    reader=PdfReader(pdf)
    pages={i+1: re.sub(r'^\s*\d+\s*\n','',p.extract_text() or '') for i,p in enumerate(reader.pages)}
    units=[]
    policy={15:'ระบบและระยะเวลาการศึกษา',16:'โครงสร้างและหน่วยกิตหลักสูตร',17:'ความหมายของรหัสวิชา',24:'วิชาเลือกเสรีและวิชาโท',107:'เกณฑ์การสำเร็จการศึกษา'}
    for n,title in policy.items():
        units.append(dict(id=f'policy-{n}',title=title,text=clean(pages[n]),pdf_pages=[n],printed_pages=[str(n)],kind='policy'))
    # Course boundaries are structural, fixed before authoring questions.
    lines=[]
    for n in range(44,85):
        for line in pages[n].splitlines(): lines.append((n,line))
    current=None
    for n,line in lines:
        m=re.match(r'^\s*คพ\.\s*(\d{3})\s+',line)
        other=re.match(r'^\s*สษ\.\s*\d{3}',line)
        if m or other:
            if current: units.append(current)
            current=None
            if m: current=dict(id='cs-'+m[1],title='คพ.'+m[1],text='',pdf_pages=[],printed_pages=[],kind='course')
        if current and line.strip():
            current['text']+=line+'\n'
            if n not in current['pdf_pages']: current['pdf_pages'].append(n);current['printed_pages'].append(str(n))
    if current: units.append(current)
    for u in units:
        u['text']=clean(u['text'])
        if u['kind']=='course':
            u['title']=u['text'].split('CS ')[0][:160].strip()
        assert not re.search('[\uf700-\uf71f]',u['text']),u['id']
    assert len({u['id'] for u in units})==len(units)
    chunks=[]
    # Bounded common chunks, with overlap and parent metadata. Rank evidence units
    # by max chunk score for ALL methods; report unit recall, never chunk recall.
    for u in units:
        start=0; part=0
        while start<len(u['text']):
            end=min(start+600,len(u['text']))
            if end<len(u['text']):
                space=u['text'].rfind(' ',start+400,end)
                if space>start: end=space
            chunks.append(dict(id=f"{u['id']}:{part}",unit_id=u['id'],text=u['title']+'\n'+u['text'][start:end],start=start,end=end))
            if end==len(u['text']): break
            start=end-70;part+=1
    source=dict(filename=Path(pdf).name,sha256=hashlib.sha256(Path(pdf).read_bytes()).hexdigest(),page_count=len(reader.pages),scope='นโยบายหน้า 15,16,17,24,107 และคำอธิบายรายวิชา คพ. หน้า 44–83; ไม่รวมตารางแผนเรียน ภาคผนวกเปรียบเทียบหลักสูตรเก่า และประวัติบุคลากร',extraction='pypdf; explicit Thai PUA map; whitespace normalization; no OCR',label_status='AI-authored pilot; requires independent human review',visual_checks=[16,60,107])
    data=dict(schema_version=1,source=source,units=units,chunks=chunks)
    (ROOT/'data/corpus.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
    print('units',len(units),'chunks',len(chunks),'source',source['sha256'])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('pdf');build(p.parse_args().pdf)
