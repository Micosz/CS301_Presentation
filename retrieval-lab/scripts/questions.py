"""Versioned, AI-authored development questions; all gold labels await human review."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
units={u['id']:u for u in json.loads((ROOT/'data/corpus.json').read_text())['units']}
# Each paired formulation belongs to ONE intent group. No held-out claims.
items=[
('cs-100','คพ.100 สอนเทคโนโลยีอะไรในการพัฒนาเว็บบ้าง','ถ้าอยากเริ่มทำเว็บไซต์ด้วย HTML CSS และ JavaScript ในวิชาพื้นฐาน หลักสูตรอธิบายเนื้อหาไว้อย่างไร','paraphrase','แนวคิดพื้นฐานในการพัฒนาเว็บ','แนวคิดเว็บ สถาปัตยกรรมเว็บ HTML/CSS Git JavaScript ฟอร์ม การตรวจข้อมูล responsive และ deployment'),
('cs-101','คพ.101 มีหัวข้ออะไรบ้าง','Discrete Structures เรียนเรื่อง logic, sets และ graphs หรือไม่','mixed','ตรรกศาสตร์เบื้องต้น','ตรรกศาสตร์ วิธีพิสูจน์ เซต ฟังก์ชัน ความสัมพันธ์ พีชคณิตบูลีน การนับ และกราฟ'),
('cs-111','วิชาบังคับก่อนของ คพ.111 คืออะไร','ก่อนเรียน Object-Oriented Concepts ต้องเคยเรียนวิชาไหน','mixed','เคยศึกษา คพ.102 หรือ เคยศึกษา คพ.103','เคยศึกษา คพ.102 หรือ คพ.103; ไม่เปลี่ยนคำว่าเคยศึกษาเป็นสอบผ่าน'),
('cs-213','คพ.213 กำหนดวิชาบังคับก่อนอะไร','ก่อนลงโครงสร้างข้อมูล หลักสูตรระบุว่าต้องเคยเรียนตัวไหน','paraphrase','เคยศึกษา คพ.111','เคยศึกษา คพ.111'),
('cs-217','คพ.217 สอนเทคนิคออกแบบขั้นตอนวิธีใดบ้าง','Design and Analysis of Algorithms มี greedy กับ dynamic programming ไหม','mixed','วิธีการแบ่งแยกเอาชนะ','แบ่งแยกเอาชนะ ละโมบ กำหนดการพลวัต แวะผ่านกราฟ ย้อนรอย และ branch and bound'),
('cs-232','คพ.232 มีเงื่อนไขวิชาบังคับก่อนอย่างไร','วิชาเทคโนโลยีกลุ่มเมฆเบื้องต้น ต้องเรียนระบบปฏิบัติการจบก่อน หรือเรียนพร้อมกันได้','paraphrase','เคยศึกษา หรือ ศึกษาพร้อมกับ คพ.222 หรือ เคยศึกษา คพ.233','เคยศึกษาหรือศึกษาพร้อม คพ.222 หรือเคยศึกษา คพ.233; ไม่ใช่คำยืนยันสิทธิลงทะเบียนทั้งหมด'),
('cs-240','คพ.240 ครอบคลุมหัวข้อใดบ้าง','Principles of Data Science มี data manipulation และ visualization หรือไม่','mixed','การจัดการข้อมูล','การจัดการข้อมูล การวิเคราะห์เชิงสถิติและการเรียนรู้ของเครื่อง การนำเสนอข้อมูล และข้อมูลขนาดใหญ่'),
('cs-251','คพ.251 มีวิชาบังคับก่อนอะไร','ก่อนเรียน Database Systems 1 ต้องเคยเรียน Data Structures หรือ Data Structures and Algorithms ใช่ไหม','mixed','เคยศึกษา คพ.213 หรือ เคยศึกษา คพ.216','เคยศึกษา คพ.213 หรือ คพ.216'),
('cs-261','วิชาบังคับก่อนของ คพ.261 คืออะไร','จะเริ่มวิศวกรรมซอฟต์แวร์เบื้องต้น ต้องเคยเรียนวิชาไหนมาก่อน','paraphrase','เคยศึกษา คพ.111','เคยศึกษา คพ.111'),
('cs-271','คพ.271 มีเนื้อหาเรื่องอะไรบ้าง','Artificial Intelligence Fundamentals มี constraint satisfaction และ adversarial search หรือไม่','mixed','ปัญหาการทําตามเงื่อนไข','การแทนความรู้ การค้นหาแบบไม่มีและมีข้อมูล เงื่อนไข ตรรกศาสตร์ การให้เหตุผล การค้นหาเชิงปฏิปักษ์ และการเรียนรู้ของเครื่องเบื้องต้น'),
('cs-301','คพ.301 ต้องเคยศึกษาวิชาใดก่อน','วิชาเตรียมความพร้อมสำหรับโครงงานและสหกิจ ต้องเคยเรียนฐานข้อมูลตัวไหน','paraphrase','เคยศึกษา คพ.251','เคยศึกษา คพ.251'),
('cs-303','คพ.303 มีกี่หน่วยกิต และกำหนดวิชาบังคับก่อนอะไร','Special Projects 1 กี่ credits และต้องผ่าน CS301 ไหม','mixed','สอบได้ คพ.301','2 หน่วยกิต และสอบได้ คพ.301'),
('cs-304','คพ.304 ให้นักศึกษาทำอะไร และส่งผลงานอย่างไร','สหกิจศึกษา 1 ต้องทำงานกับสถานประกอบการและส่งรายงานหรือเปล่า','paraphrase','การปฏิบัติงานที่ได้รับมอบหมาย','ปฏิบัติงานกับสถานประกอบการที่ได้รับความเห็นชอบ ประยุกต์ความรู้ภายใต้การกำกับ และส่งรายงานตามสาขากำหนด'),
('cs-361','คพ.361 ครอบคลุมการออกแบบซอฟต์แวร์บนคลาวด์เรื่องใด','Cloud-Based Software Architecting มี high availability และ infrastructure as code ไหม','mixed','โครงสร้างพื้นฐานแบบโค้ด','ออกแบบตามความต้องการธุรกิจ บริการคลาวด์ ความพร้อมใช้งาน ความทนทาน ความน่าเชื่อถือ การปรับขนาด และ infrastructure as code'),
('cs-373','คพ.373 สอนวิธีค้นหาขั้นสูงใดบ้าง','Advanced Search Strategies มี simulated annealing และ evolutionary algorithms หรือไม่','mixed','ขั้นตอนวิธีการจําลองการอบเหนียว','การค้นหาแบบฮิวริสติก แบบสุ่ม simulated annealing evolutionary algorithms และปัญหา local optimum'),
('policy-16','หลักสูตรมีหน่วยกิตรวมเท่าไร และวิชาศึกษาทั่วไปกี่หน่วยกิต','จะเรียนให้ครบหลักสูตรต้องสะสมอย่างน้อยเท่าไร ในนี้เป็นศึกษาทั่วไปเท่าไร','paraphrase','จำนวนหน่วยกิตรวมตลอดหลักสูตร 123 หน่วยกิต','รวมไม่น้อยกว่า 123 หน่วยกิต ศึกษาทั่วไป 30 หน่วยกิต'),
('policy-15','หนึ่งภาคการศึกษาปกติและภาคฤดูร้อนมีระยะเวลาอย่างน้อยกี่สัปดาห์','เทอมปกติกับซัมเมอร์ต้องเรียนขั้นต่ำกี่สัปดาห์ตามเล่มหลักสูตร','paraphrase','15 สัปดาห์','ภาคปกติไม่น้อยกว่า 15 สัปดาห์ ฤดูร้อนไม่น้อยกว่า 6 สัปดาห์ โดยชั่วโมงรายวิชาเท่าภาคปกติ'),
('policy-24','วิชาเลือกเสรีต้องเรียนอย่างน้อยกี่หน่วยกิต และมีข้อยกเว้นอะไร','เอาวิชา GE รหัสระดับ 100 มานับเป็น free elective ได้ไหม ต้องเก็บกี่ credits','mixed','ไม่น้อยกว่า 6 หน่วยกิต','ไม่น้อยกว่า 6 หน่วยกิต; วิชาศึกษาทั่วไประดับ 100 นับเป็นเลือกเสรีไม่ได้'),
('policy-107','เกณฑ์จบกำหนดเกรดเฉลี่ยสะสมและเกรด คพ.101 คพ.102 คพ.111 เท่าไร','ถ้าจะจบ GPAX ต้องถึงเท่าไร และสามวิชา 101 102 111 ต้องได้อย่างน้อยอะไร','paraphrase','ไม่ต่ำกว่า C','GPAX ไม่น้อยกว่า 2.00 และ คพ.101,102,111 ไม่ต่ำกว่า C; ยังมีเงื่อนไขอื่นตามเล่ม'),
('policy-17','รหัสวิชา คพ. และ CS หมายถึงอะไร','ในเล่มใช้ CS กับ คพ. แทนสาขาเดียวกันหรือไม่','paraphrase','อักษรย่อ คพ./ CS','ทั้ง คพ. และ CS เป็นอักษรย่อสาขาวิชาวิทยาการคอมพิวเตอร์'),
]
questions=[]
def evidence(key,needle):
 u=units[key];i=u['text'].find(needle)
 assert i>=0,(key,needle)
 return dict(unit_id=key,quote=u['text'][max(0,i-65):min(len(u['text']),i+len(needle)+180)],pdf_pages=u['pdf_pages'])
for i,(key,direct,variant,cat,needle,answer) in enumerate(items,1):
 for j,(q,category) in enumerate([(direct,'direct'),(variant,cat)],1):
  questions.append(dict(id=f'Q{len(questions)+1:02}',group_id=f'G{i:02}',category=category,question=q,gold_units=[key],expected_answer=answer,evidence=[evidence(key,needle)],answerable=True,review_status='pending'))
multis=[
(['cs-301','cs-303'],'เงื่อนไขก่อนเรียน คพ.301 กับ คพ.303 ต่างกันอย่างไร',['เคยศึกษา คพ.251','สอบได้ คพ.301'],'คพ.301 ต้องเคยศึกษา คพ.251; คพ.303 ต้องสอบได้ คพ.301'),
(['cs-232','cs-361'],'คพ.232 กับ คพ.361 ต้องมีพื้นฐานรายวิชาใดก่อน',['เคยศึกษา หรือ ศึกษาพร้อมกับ คพ.222','เคยศึกษา คพ.232'],'คพ.232 เคยศึกษาหรือศึกษาพร้อม คพ.222 หรือเคยศึกษา คพ.233; คพ.361 เคยศึกษา คพ.232'),
(['cs-213','cs-217'],'เปรียบเทียบเงื่อนไขก่อนเรียน คพ.213 และ คพ.217',['เคยศึกษา คพ.111','เคยศึกษา คพ.213'],'คพ.213 เคยศึกษา คพ.111; คพ.217 เคยศึกษา คพ.213'),
(['cs-303','cs-304'],'โครงงานพิเศษ 1 กับสหกิจศึกษา 1 ให้ทำงานลักษณะใดต่างกัน',['โครงงานการศึกษา','สถานประกอบการ'],'คพ.303 ศึกษาหัวข้อที่สาขากำหนดหรืออนุมัติ เขียนและเสนอรายงาน; คพ.304 ปฏิบัติงานในสถานประกอบการที่เห็นชอบและส่งรายงาน'),
]
for i,(keys,q,needles,answer) in enumerate(multis,21):
 questions.append(dict(id=f'Q{len(questions)+1:02}',group_id=f'G{i:02}',category='multi_evidence',question=q,gold_units=keys,expected_answer=answer,evidence=[evidence(k,n) for k,n in zip(keys,needles)],answerable=True,review_status='pending'))
for i,q in enumerate(['เทอมนี้ CS301 เปิดวันไหน ห้องไหน และยังเหลือกี่ที่นั่ง','ตอนนี้อาจารย์ผู้สอน CS361 คือใครและนัดพบได้กี่โมง','จากเกรดและตารางเรียนส่วนตัวของฉัน เทอมหน้าลงวิชาไหนดีที่สุด','ค่าเทอมที่ต้องชำระจริงของฉันในภาคเรียนนี้เท่าไร'],25):
 questions.append(dict(id=f'Q{len(questions)+1:02}',group_id=f'G{i:02}',category='out_of_scope',question=q,gold_units=[],expected_answer='ข้อมูลใน corpus นำร่องไม่พอสำหรับตอบ ไม่อนุมานข้อมูลปัจจุบันหรือข้อมูลส่วนบุคคล',evidence=[],answerable=False,review_status='pending'))
(ROOT/'data/questions.json').write_text(json.dumps(dict(schema_version=1,status='provisional',split='development_only',notes='AI-authored, source-grounded labels. No independent human validation. Paired questions share intent groups; no held-out test has been used.',questions=questions),ensure_ascii=False,indent=2))
print(len(questions),'questions',len({q['group_id'] for q in questions}),'groups')
