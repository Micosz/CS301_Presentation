"""Loopback-only inference runner + static workbench; never deploy this as a public API."""
import os, subprocess, sys, threading
from pathlib import Path
from urllib.parse import urlsplit
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
ROOT=Path(__file__).resolve().parents[1]
app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
app.add_middleware(TrustedHostMiddleware,allowed_hosts=['127.0.0.1','localhost'])
state={'running':False,'status':'พร้อมรันในเครื่อง','error':None};lock=threading.Lock()
class Run(BaseModel): model:str
@app.get('/')
def home(): return RedirectResponse('/retrieval-lab/')
@app.get('/retrieval-lab/api/status')
def status():
    with lock:return dict(state)
@app.post('/retrieval-lab/api/run',status_code=202)
def run(body:Run,request:Request):
    origin=request.headers.get('origin')
    if origin:
        parsed=urlsplit(origin)
        if parsed.scheme!='http' or parsed.netloc!=request.headers.get('host'):raise HTTPException(403,'same-origin requests only')
    if body.model not in ['bm25','e5','bge']:raise HTTPException(400,'unknown model')
    with lock:
        if state['running']:raise HTTPException(409,'another run is active')
        state.update(running=True,status=f'กำลังรัน {body.model} — รอบแรกอาจต้องดาวน์โหลดโมเดล',error=None)
    def work():
        try:
            result=subprocess.run([sys.executable,str(ROOT/'scripts/benchmark.py'),'--model',body.model],cwd=ROOT,env=os.environ.copy(),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=3600)
            with lock:
                state.update(running=False,status='รันเสร็จแล้ว' if result.returncode==0 else 'รันไม่สำเร็จ',error=None if result.returncode==0 else result.stdout[-2500:])
        except Exception as e:
            with lock:state.update(running=False,status='รันไม่สำเร็จ',error=str(e))
    threading.Thread(target=work,daemon=True).start()
    return {'accepted':True,'model':body.model}
app.mount('/retrieval-lab',StaticFiles(directory=ROOT,html=True),name='lab')
if __name__=='__main__':
    import uvicorn
    uvicorn.run(app,host='127.0.0.1',port=8765)
