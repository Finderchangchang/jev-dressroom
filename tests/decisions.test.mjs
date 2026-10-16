import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import {buildRequest,decodeResponse,offlineSelection,validLook,MODEL,wardrobe} from '../src/wardrobe.mjs';
import {portraitSvg,itemSvg} from '../src/portrait.mjs';

test('one request contains three fixed-choice questions and pins Jev 1.14',()=>{
 const request=buildRequest('下班了，想去海边');
 assert.equal(request.model,MODEL);
 assert.deepEqual(Object.keys(request.questions),['outfit','head','prop']);
 for(const [category,question] of Object.entries(request.questions)){
  assert.equal(question.type,'choice');
  assert.deepEqual(Object.keys(question.criteria),wardrobe[category].map(i=>i.id));
 }
 assert.equal(request.state.scene,'下班了，想去海边');
});
test('blank and oversized prompts are rejected before the provider is called',()=>{
 for(const invalid of ['', '   ', null, {}, 'a'.repeat(361)])assert.throws(()=>buildRequest(invalid));
 assert.doesNotThrow(()=>buildRequest('a'.repeat(360)));
});
function fixture(){return {model:MODEL,answers:Object.fromEntries(Object.entries(wardrobe).map(([name,items])=>[name,{type:'choice',choice:items[0].id,confidence:.9,probabilities:Object.fromEntries(items.map((item,i)=>[item.id,i===0?1:0]))}]))};}
test('real response preserves model provenance, confidence and distribution',()=>{
 const decoded=decodeResponse(fixture());assert.equal(decoded.model,MODEL);assert.equal(decoded.selection.outfit,'mint');assert.equal(decoded.details.outfit.confidence,.9);
});
test('malformed provider answers never become a successful outfit',()=>{
 for(const mutate of [r=>delete r.answers.head,r=>r.answers.outfit.choice='injected',r=>r.answers.prop.confidence=NaN,r=>r.answers.prop.probabilities.coffee=1.5,r=>r.answers.prop.probabilities.coffee=.5,r=>r.answers.outfit.type='text']){
  const r=fixture();mutate(r);assert.throws(()=>decodeResponse(r));
 }
});
test('offline rules cover very different moods and do not claim probabilities',()=>{
 assert.equal(offlineSelection('我要逃离地球').outfit,'space');
 assert.equal(offlineSelection('下雨挤地铁').outfit,'raincoat');
 assert.equal(offlineSelection('给朋友做饭').outfit,'apron');
 assert.equal(offlineSelection('第十八版改稿').outfit,'suit');
 assert.equal(offlineSelection('今晚约会').outfit,'tutu');
 assert.equal('probabilities' in offlineSelection('下班'),false);
});
test('saved data rejects unknown styles or wardrobe keys',()=>{
 assert.ok(validLook({style:'photo',outfit:'mint',head:'none',prop:'coffee'}));
 assert.ok(!validLook({style:'script',outfit:'mint',head:'none',prop:'coffee'}));
 assert.ok(!validLook({style:'ink',outfit:'<script>',head:'none',prop:'coffee'}));
});
test('all illustrated combinations have a renderable SVG',()=>{
 for(const outfit of wardrobe.outfit)for(const head of wardrobe.head)for(const prop of wardrobe.prop){
  for(const style of ['ink','doll']){
   const svg=portraitSvg({outfit:outfit.id,head:head.id,prop:prop.id,style});
   assert.ok(svg.startsWith('<svg'));assert.ok(svg.endsWith('</svg>'));assert.ok(!svg.includes('undefined'));
  }
 }
 for(const [category,items] of Object.entries(wardrobe))for(const item of items)assert.ok(itemSvg(category,item.id).startsWith('<svg'));
});
test('local server serves only public assets and rejects missing key / cross-site calls',async()=>{
 const port=19000+Math.floor(Math.random()*10000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),TYPESAFE_API_KEY:'',XMAX_API_KEY:'',DECART_API_KEY:'',DASHSCOPE_API_KEY:'',DASHSCOPE_BASE_URL:''},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('server startup timed out')),5000).unref())]);
  const base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(base)).status,200);
  const status=await (await fetch(base+'/api/status')).json();assert.equal(status.configured,false);assert.equal(status.model,MODEL);assert.equal(status.providers.xmax.configured,false);assert.equal(status.providers.aliyun.configured,false);
  for(const url of ['/server.mjs','/.env','/.git/config','/tests/decisions.test.mjs'])assert.equal((await fetch(base+url)).status,404);
  assert.equal((await fetch(base+'/api/decide',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"prompt":"你好"}'})).status,503);
  assert.equal((await fetch(base+'/api/decide',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{"prompt":"你好"}'})).status,403);
  for(const endpoint of ['/api/xmax-token','/api/xmax-stop','/api/decart-token','/api/aliyun-image']){
   assert.equal((await fetch(base+endpoint,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
   assert.equal((await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
  }
  assert.equal((await fetch(base+'/api/xmax-token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  assert.equal((await fetch(base+'/api/decart-token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  assert.equal((await fetch(base+'/api/aliyun-image',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  const rebound=await new Promise((resolve,reject)=>{http.get(base+'/api/status',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});assert.equal(rebound,403);
 }finally{child.kill();await once(child,'exit');}
});
