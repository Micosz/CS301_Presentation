import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let html=read('index.html').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+read('style.css')+'</style>');
for(const script of ['slides.js','app.js']) html=html.replace(`<script src="${script}"></script>`,()=>'<script>'+read(script)+'</script>');
for(const image of fs.readdirSync(path.join(root,'assets')).filter(x=>x.endsWith('.png'))){
 const data='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets',image)).toString('base64');
 html=html.split('assets/'+image).join(data);
}
const out=path.resolve(process.argv[2]||path.join(root,'CS301_Interactive_Slides.html'));
fs.writeFileSync(out,html);console.log(out);
