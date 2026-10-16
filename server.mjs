import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildRequest,decodeResponse,MODEL} from './src/wardrobe.mjs';
import {buildCameraRequest,decodeCameraResponse} from './src/live-core.mjs';
import {createProviders,providerConfig} from './providers.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const key=process.env.TYPESAFE_API_KEY?.trim();
const providers=createProviders(providerConfig());
const port=Number(process.env.PORT||8894);
const host=process.env.HOST||'127.0.0.1';
const windows=new Map();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
function allowedOrigin(req){const origin=req.headers.origin;return !origin||origin===`http://${req.headers.host}`||origin===`https://${req.headers.host}`;}
export const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 try{
  if(!['127.0.0.1','localhost','[::1]'].includes(new URL(`http://${req.headers.host}`).hostname))return json(res,403,{error:'服务仅供本机访问。'});
  if(url.pathname==='/api/status'&&req.method==='GET') return json(res,200,{configured:!!key,model:MODEL,providers:providers.status()});
  if(['/api/xmax-token','/api/xmax-stop','/api/aliyun-image'].includes(url.pathname)){
   if(req.method!=='POST')return json(res,405,{error:'请使用 POST。'});
   if(!allowedOrigin(req))return json(res,403,{error:'不接受跨站请求。'});
   if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'需要 JSON 请求。'});
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1900000)return json(res,413,{error:'画面过大。'});}
   let payload;try{payload=JSON.parse(body);}catch{return json(res,400,{error:'输入格式不正确。'});}
   try{
    if(url.pathname==='/api/xmax-token')return json(res,200,await providers.issue());
    if(url.pathname==='/api/xmax-stop'){await providers.revoke(payload.id);return json(res,200,{stopped:true});}
    const image=await providers.image(payload);
    res.writeHead(200,{'Content-Type':image.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Image-Model':image.model,'X-Elapsed-Ms':String(image.elapsedMs)});return res.end(image.bytes);
   }catch(e){return json(res,e.status||502,{error:e.status?e.message:'渲染请求没有完成。'});}
  }
  if(['/api/decide','/api/camera-decide'].includes(url.pathname)){
   const cameraMode=url.pathname==='/api/camera-decide';
   if(req.method!=='POST') return json(res,405,{error:'请使用 POST。'});
   if(!allowedOrigin(req)) return json(res,403,{error:'不接受跨站请求。'});
   if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'需要 JSON 请求。'});
   const addr=req.socket.remoteAddress;const now=Date.now();let limit=windows.get(addr);
   if(!limit||now-limit.start>60000){limit={start:now,count:0};windows.set(addr,limit);}
   if(++limit.count>20)return json(res,429,{error:'换装太快啦，稍等一分钟再试。'});
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>(cameraMode?260000:4096))return json(res,413,{error:'输入太长了。'});}
   let payload;try{payload=JSON.parse(body);}catch{return json(res,400,{error:'输入格式不正确。'});}
   const activeKey=String(req.headers['x-typesafe-key']||key||'').trim();
   if(!activeKey)return json(res,503,{error:'还没有连接 TypeSafe Key。可继续离线试玩。'});
   if(activeKey.length>1024)return json(res,400,{error:'Key 格式不正确。'});
   let request;try{request=cameraMode?buildCameraRequest(payload):buildRequest(payload.prompt);}catch(e){return json(res,400,{error:e.message});}
   const start=performance.now();let upstream;
   try{upstream=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Authorization':`Bearer ${activeKey}`,'Content-Type':'application/json',...(request.assets?{'TypeSafe-Danger-Zone-Images':'true'}:{})},body:JSON.stringify(request),signal:AbortSignal.timeout(25000)});}catch{return json(res,504,{error:'Jev 连接超时，请稍后重试。'});}
   if(!upstream.ok){const status=upstream.status;return json(res,status===429?429:502,{error:status===401?'Jev 密钥未通过验证。':status===429?'Jev 请求频率受限，请稍后再试。':`Jev 暂时没有完成选择（${status}）。`});}
   const raw=await upstream.json();const decoded=cameraMode?decodeCameraResponse(raw):decodeResponse(raw);
   return json(res,200,{...decoded,elapsedMs:Math.round(performance.now()-start)});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed'});
  let file;try{file=decodeURIComponent(url.pathname);}catch{return json(res,400,{error:'Bad path'});}
  if(file==='/')file='/index.html';
  // Only public assets are served. Environment files, backend source and tests stay inaccessible.
  if(!(['/index.html','/camera.html','/demo.html','/assets/favicon.svg','/assets/real-looks.png'].includes(file)||/^\/dist\/[\w.-]+\.js$/.test(file)||/^\/src\/(app\.js|styles\.css|wardrobe\.mjs|portrait\.mjs|live\.js|live\.css|live-core\.mjs|latest-task\.mjs)$/.test(file)))return json(res,404,{error:'Not found'});
  const absolute=path.resolve(root,'.'+file);if(!absolute.startsWith(root))return json(res,403,{error:'Forbidden'});
  const data=await readFile(absolute);const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)];
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){if(e.code==='ENOENT')return json(res,404,{error:'Not found'});return json(res,502,{error:'这次换装没完成，请重试。'});}
});
server.listen(port,host,()=>console.log(`Jev Dressroom: http://${host}:${port} · ${key?'Jev 1.14 ready':'offline demo (set TYPESAFE_API_KEY for live mode)'}`));
