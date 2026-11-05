import hashlib,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from benchmark import normalize,per_question,rank,evaluate
class BenchmarkTests(unittest.TestCase):
 def test_multiple_gold_and_cutoff(self):
  self.assertEqual(per_question(['a','b','c'],[3,2,1],['a','c'],1),dict(recall=.5,rr=1.,complete=0))
  self.assertEqual(per_question(['a','b','c'],[3,2,1],['c'],1)['rr'],0)
  self.assertAlmostEqual(per_question(['a','b','c'],[3,2,1],['c'],3)['rr'],1/3)
 def test_tie(self):self.assertEqual(rank(['z','a'],[1,1]),[1,0])
 def test_empty_gold(self):self.assertIsNone(per_question(['a'],[1],[],5))
 def test_alias_only_known_courses(self):
  self.assertEqual(normalize('คพ.301 CS 301 cs999',{'301'}),'cs301 cs301 cs999')
 def test_frozen_dataset(self):
  c=json.loads((ROOT/'data/corpus.json').read_text());qs=json.loads((ROOT/'data/questions.json').read_text())['questions'];b=json.loads((ROOT/'data/benchmark.json').read_text())
  ids=[u['id'] for u in c['units']];lookup={u['id']:u for u in c['units']}
  self.assertEqual(len(qs),48);self.assertEqual(sum(q['answerable'] for q in qs),44)
  self.assertEqual(len(set(q['group_id'] for q in qs if q['answerable'])),24)
  for filename,sha in b['provenance']['data_sha256'].items():self.assertEqual(hashlib.sha256((ROOT/'data'/filename).read_bytes()).hexdigest(),sha)
  for ch in c['chunks']:
   u=lookup[ch['unit_id']];self.assertEqual(ch['text'],u['title']+'\n'+u['text'][ch['start']:ch['end']])
  for q in qs:
   self.assertEqual(bool(q['gold_units']),q['answerable']);self.assertEqual(q['review_status'],'pending')
   for e in q['evidence']:
    self.assertIn(e['quote'],lookup[e['unit_id']]['text']);self.assertEqual(e['pdf_pages'],lookup[e['unit_id']]['pdf_pages'])
  for m in b['methods']:self.assertEqual(evaluate(ids,m['unit_scores'],qs),m['evaluation'])
if __name__=='__main__':unittest.main()
