# CS301 Retrieval Lab

เว็บทดลองเลือกวิธีค้นคืนและ embedding จากหลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ ฉบับปรับปรุง พ.ศ. 2566

แยกทุกไฟล์ไว้ใน `retrieval-lab/` ไม่เปลี่ยน root `index.html`, `app.js`, `slides.js`, `style.css` หรือเส้นทางสไลด์เดิม

## เปิดใช้งาน

- เว็บ: `https://cs301presentation.vercel.app/retrieval-lab/`
- รายงานผล: [benchmark-report.md](reports/benchmark-report.md)
- คำถาม/เฉลย: [questions.json](data/questions.json)
- ผลจริงและรุ่นโมเดล: [benchmark.json](data/benchmark.json)

### บนเว็บที่เผยแพร่

กด **คำนวณอันดับและคะแนนใหม่** เพื่อเรียงคะแนนที่ได้จาก inference จริงและคำนวณ metric ใหม่ เลือก k=1/3/5 และประเภทคำถาม เปิดดูคำตอบคาดหวัง หลักฐาน/เลขหน้า ผลค้นแต่ละวิธี และส่งออก JSON/Markdown ได้

ปุ่มนี้ใช้ **เมทริกซ์คะแนนที่ Python รันไว้** ไม่ดาวน์โหลดโมเดล ไม่สร้าง embedding ใหม่ และไม่เรียก LLM การทบทวนคำถามบันทึกในเบราว์เซอร์เครื่องนั้นและส่งออกเป็นไฟล์ได้ ยังไม่เปลี่ยนเฉลยใน repository หรือคะแนนเดิม

### รันโมเดลใหม่ผ่านเว็บในเครื่อง

ต้องมี Python 3.12 และพื้นที่สำหรับโมเดลหลาย GB ครั้งแรกต้องเชื่อมอินเทอร์เน็ตเพื่อดาวน์โหลดน้ำหนักจาก Hugging Face

```bash
cd retrieval-lab
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/server.py
```

เปิด `http://127.0.0.1:8765/retrieval-lab/` เลือกโมเดลแล้วกด **รันโมเดลในเครื่อง** ตัวรันจะสร้างดัชนีใหม่ คำนวณคำถามจริง อัปเดตผลและรายงานในเครื่อง หลังรันเสร็จเว็บโหลดผลใหม่

ตัวรันรับเฉพาะโมเดลที่กำหนด รันได้ทีละงาน และ bind เฉพาะ loopback ไม่ควรนำ Python API นี้เปิดสาธารณะ ไม่มี API key หรือ GitHub token ในหน้าเว็บ

หากกดจากเว็บ Vercel ส่วนนี้จะไม่เปิดใช้งาน การเผยแพร่ผลที่รันใหม่ต้องตรวจไฟล์และ commit/push แยกต่างหาก เว็บไม่เขียน GitHub อัตโนมัติ

### รันจากคำสั่ง

```bash
python scripts/benchmark.py --model bm25
python scripts/benchmark.py --model e5
python scripts/benchmark.py --model bge
```

หรือ `python scripts/benchmark.py --model all` ต้องรันใน process เดียวตามลำดับเพื่อให้เวลา/หน่วยความจำอ่านอย่างเหมาะสม: สำหรับการเปรียบเทียบ peak RSS แนะนำคำสั่งแยกสาม process ด้านบน เพราะตัวจัดสรรหน่วยความจำอาจคงพื้นที่จากโมเดลก่อนหน้าเมื่อใช้ `all`

ผลที่แนบมารันแยก process ใช้ CPU 4 threads สำหรับ Dense; ดาวน์โหลดโมเดลล่วงหน้า ไม่รวมดาวน์โหลดในเวลาค้น รายละเอียดแพ็กเกจและ SHA ของโมเดลอยู่ใน benchmark.json; dependencies.lock.txt เป็น snapshot ทั้ง environment ที่ใช้รอบนี้

## ขอบเขตข้อมูลและเฉลย

- PDF ต้นฉบับ 162 หน้า SHA-256: `eba2a6996894d3d6fe2bb2aba4178d379cdf068d38bfcdbb68c466e197f5a074`
- ใช้เฉพาะคำอธิบายรายวิชา คพ. และนโยบายหลักสูตรบางหน้า ตาม scope ใน corpus.json
- ไม่รวมตารางแผนเรียน ภาคผนวกหลักสูตรเก่า หรือประวัติบุคลากร; ไม่ได้อ้างว่าครอบคลุมทั้งเล่ม
- 90 หน่วยหลักฐาน แบ่งเป็น 155 ข้อความย่อยด้วยกฎก่อนรันโมเดล เก็บเนื้อหาไทย/อังกฤษจากต้นฉบับ
- 48 คำถาม: ตอบได้ 44 ข้อใน 24 กลุ่มเจตนา และนอกขอบเขต 4 ข้อ รวม 28 กลุ่ม
- **คำถามและ gold จัดทำโดย AI และรอตรวจทานจากคน** ทุกข้อมีสถานะ `pending`; ไม่ใช่เฉลยที่อาจารย์รับรอง
- ทุกข้อเป็นชุดพัฒนา ไม่ใช่ held-out test; ห้ามนำคู่คำถามเปลี่ยนถ้อยคำไปแยกเป็นชุดทดสอบแล้วอ้างว่าเป็นคำถามใหม่
- ไม่มีการสร้างคำตอบด้วย LLM หรือ Evidence Gate ในงานทดลองนี้

## การเตรียมข้อมูลซ้ำ

ใช้ไฟล์ PDF ที่ผู้ใช้มีในเครื่อง ไม่ต้องนำทั้งเล่มขึ้น repository

```bash
python scripts/prepare.py "/absolute/path/หลักสูตรวิทยาศาสตร์บัณฑิต.pdf"
python scripts/questions.py
```

ตัวสกัดใช้ pypdf และตารางแก้ Thai PUA ที่ตรวจจากไฟล์นี้ เก็บเลขหน้า PDF แบบเริ่มที่ 1 แยกจาก label เลขหน้าพิมพ์ (เล่มนี้ตรงกันในหน้าที่ใช้) ไม่มี OCR เดาเนื้อหา ตรวจภาพหน้า 16,60,107 เทียบข้อความแล้ว; การตรวจทั้ง corpus โดยคนยังต้องทำ

คำถามเก็บใน `scripts/questions.py` เพื่อทำซ้ำได้ หากแก้เฉลยต้องตรวจหลักฐานในเล่มและ regenerate questions.json จากนั้นรัน benchmark ใหม่ Hash ของ corpus/questions ป้องกันหน้าเว็บนำผลเก่ามาจับคู่กับข้อมูลใหม่

## วิธีประเมิน

แต่ละวิธีค้นข้อความย่อยทั้งหมดแล้วรวมคะแนนสูงสุดตามหน่วยหลักฐาน (รายวิชาหนึ่งวิชาหรือหน้านโยบายหนึ่งหน้า) ก่อนเลือก top-k หน่วยไม่ซ้ำ ดังนั้นค่าที่รายงานคือ **Evidence-unit Recall@k** ไม่ใช่ Gold Chunk Recall@k

- Recall: จำนวนหน่วย gold ที่พบ / จำนวนหน่วย gold ทั้งหมดของคำถาม
- MRR@k: reciprocal rank ของ gold แรกภายใน k; ถ้าไม่พบให้ 0
- Complete@k: 1 เมื่อพบ gold ครบทุกหน่วย ไม่เช่นนั้น 0
- เฉลี่ยต่อคำถามที่ตอบได้; นอกขอบเขตไม่เข้า denominator และไม่อ้างผลการปฏิเสธ
- ใช้ E5 `query: `/`passage: ` ตามคู่มือ; BGE ใช้ Dense, pooling ตาม config ของรุ่นที่ pin ไว้
- ทุกวิธีใช้ corpus เดียวกัน ไม่มี input truncation เกิน 512 tokens ในรอบที่แนบ
- Bootstrap เปรียบเทียบ BGE/E5 ที่ Recall@3 สุ่มเป็นกลุ่มเจตนา 2,000 รอบ seed301 ไม่ถือคู่ paraphrase เป็นตัวอย่างอิสระ

ผลรายข้อ ข้อเสียของการรวม max-score และข้อจำกัดการเลือกโมเดลดูรายงาน ห้ามใช้คะแนน similarity เป็นความมั่นใจว่าตอบได้ หรือใช้คะแนนระหว่างโมเดลแทน probability

## ตรวจโปรแกรม

จากโฟลเดอร์ repository:

```bash
node --test retrieval-lab/tests/evaluator.test.mjs
python -m unittest discover -s retrieval-lab/tests -p 'test_*.py'
node retrieval-lab/tests/parity.mjs
node validate.mjs
```

การทดสอบไม่ดาวน์โหลดโมเดล ใช้ผลจริงที่บันทึกไว้ตรวจคะแนน JavaScript/Python ให้ตรงกัน และตรวจว่า root deck เดิมยังผ่าน validation

## แหล่งข้อมูลเครื่องมือ

- [BGE-M3](https://huggingface.co/BAAI/bge-m3)
- [Multilingual E5-small](https://huggingface.co/intfloat/multilingual-e5-small)
- [rank_bm25](https://github.com/dorianbrown/rank_bm25)
- [PyThaiNLP newmm](https://github.com/PyThaiNLP/pythainlp/wiki/newmm-tokenization)
- [Sentence Transformers evaluation](https://sbert.net/docs/package_reference/sentence_transformer/evaluation.html)
