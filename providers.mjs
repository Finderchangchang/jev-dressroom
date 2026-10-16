import {randomUUID} from 'node:crypto';
import {makeRenderPrompt} from './src/live-core.mjs';

export function providerConfig(env=process.env){
 const region=env.XMAX_REGION==='global'?'global':'china';
 // Reuse an existing workspace host, but never use the OpenAI-compatible API path for image editing.
 const configuredBase=env.DASHSCOPE_BASE_URL||'https://dashscope.aliyuncs.com';
 const base=new URL(configuredBase);
 if(base.protocol!=='https:'||!/(^|\.)(aliyuncs\.com)$/.test(base.hostname))throw new Error('DASHSCOPE_BASE_URL 必须是阿里云 HTTPS 地址。');
 return {decartKey:env.DECART_API_KEY?.trim(),xmaxKey:env.XMAX_API_KEY?.trim(),region,xmaxBase:region==='global'?'https://api.xmax.ai/open/api/v1':'https://api.xmaxai.com/open/api/v1',
  aliKey:env.DASHSCOPE_API_KEY?.trim(),aliBase:base.origin,aliModel:env.ALI_IMAGE_MODEL||'qwen-image-2.1-turbo',sessionSeconds:60};
}
function failure(message,status=502){return Object.assign(new Error(message),{status});}
export function createProviders(config,{request=fetch,now=Date.now,schedule=setTimeout}={}){
 let session=null,starting=false,aliBusy=false,lastAli=0,decartStarting=false,decartNext=0;
 const status=()=>({xmax:{configured:!!config.xmaxKey,mode:'video',model:'x2.0',region:config.region,sessionSeconds:config.sessionSeconds},
  decart:{configured:!!config.decartKey,mode:'video',model:'lucy-2.5',sessionSeconds:config.sessionSeconds},
  aliyun:{configured:!!config.aliKey,mode:'image',model:config.aliModel}});
 async function issueDecart(origin){
  if(!config.decartKey)throw failure('Decart 尚未配置。请在后台设置 DECART_API_KEY。',503);
  let url;try{url=new URL(origin);}catch{throw failure('需要有效的本机来源。',400);}
  if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.origin!==origin)throw failure('需要有效的本机来源。',400);
  if(decartStarting||now()<decartNext)throw failure('上一份 Decart 凭据尚在保护窗口内，请稍等再开始。',429);
  decartStarting=true;
  try{
   const response=await request('https://api.decart.ai/v1/client/tokens',{method:'POST',headers:{'X-API-KEY':config.decartKey,'Content-Type':'application/json'},
    body:JSON.stringify({expiresIn:20,allowedModels:['lucy-2.5'],allowedOrigins:[origin],constraints:{realtime:{maxSessionDuration:config.sessionSeconds}}}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw failure(response.status===401?'Decart 密钥未通过验证。':'Decart 临时凭据获取失败，请检查额度与配置。');
   const data=await response.json();if(typeof data.apiKey!=='string'||!data.apiKey.startsWith('ek_')||!Number.isFinite(Date.parse(data.expiresAt)))throw failure('Decart 没有返回有效临时凭据。');
   // Signed Decart tokens cannot be revoked. Cover their 20s dial window plus the 60s server session cap.
   decartNext=now()+80000;
   return {apiKey:data.apiKey,expiresAt:data.expiresAt,model:'lucy-2.5',sessionSeconds:config.sessionSeconds};
  }finally{decartStarting=false;}
 }
 async function xmax(path,method,body){
  const r=await request(config.xmaxBase+path,{method,headers:{'X-Api-Key':config.xmaxKey,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const data=await r.json();
  if(!r.ok||!data.success)throw failure(r.status===401?'Xmax 密钥未通过验证。':'Xmax 未完成请求，请检查区域、额度和后台配置。');
  return data.data;
 }
 async function revoke(id){
  if(!session||session.id!==id)return;
  const active=session;
  // Only release the single-session lock after successful revocation or natural expiry.
  try{await xmax(`/temporary-api-key/${encodeURIComponent(active.key)}/inactive`,'PUT');clearTimeout(active.timer);if(session===active)session=null;}
  catch{if(now()>=active.expiresAt){clearTimeout(active.timer);if(session===active)session=null;}else throw failure('Xmax 断开请求未确认；临时额度与到期限制仍生效。');}
 }
 async function issue(){
  if(!config.xmaxKey)throw failure('Xmax 尚未配置。请在后台设置 XMAX_API_KEY。',503);
  if(session&&now()>=session.expiresAt){clearTimeout(session.timer);session=null;}
  if(starting||session)throw failure('已有 Xmax 会话，请先停止，或等待临时凭据到期。',409);
  starting=true;
  try{
   const data=await xmax('/temporary-api-key','POST',{expireSeconds:90,pointsLimit:60});
   if(typeof data?.temporaryApiKey!=='string'||!data.temporaryApiKey.startsWith('tk-'))throw failure('Xmax 没有返回有效临时凭据。');
   const active={id:randomUUID(),key:data.temporaryApiKey,expiresAt:now()+90000};
   session=active;active.timer=schedule(()=>{revoke(active.id).catch(()=>{});},config.sessionSeconds*1000);active.timer?.unref?.();
   return {id:active.id,apiKey:active.key,region:config.region,model:'x2.0',sessionSeconds:config.sessionSeconds};
  }finally{starting=false;}
 }
 async function image({frame,selection,landscape=false}={}){
  if(!config.aliKey)throw failure('阿里云尚未配置。请在后台设置 DASHSCOPE_API_KEY。',503);
  const prompt=makeRenderPrompt(selection);
  if(typeof frame!=='string'||frame.length>1800000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame))throw failure('需要有效的摄像头 JPEG 帧。',400);
  if(aliBusy)throw failure('上一张图片仍在生成，请等它完成。',409);
  if(lastAli&&now()-lastAli<10000)throw failure('每 10 秒最多生成一张，请稍等。',429);
  aliBusy=true;lastAli=now();const start=now();
  try{
   const response=await request(config.aliBase+'/api/v1/services/aigc/multimodal-generation/generation',{
    method:'POST',headers:{Authorization:`Bearer ${config.aliKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:config.aliModel,input:{messages:[{role:'user',content:[{image:frame},{text:prompt}]}]},parameters:{n:1,size:landscape===true?'1024*768':'768*1024',prompt_extend:false,watermark:true}}),signal:AbortSignal.timeout(120000)});
   const data=await response.json();
   if(!response.ok||data.code)throw failure(response.status===401?'阿里云密钥未通过验证。':`阿里云生成未完成（${String(data.code||response.status).replace(/[^\w.-]/g,'').slice(0,80)}）。`);
   const imageUrl=data.output?.choices?.[0]?.message?.content?.find(x=>x.image)?.image;
   let url;try{url=new URL(imageUrl);}catch{throw failure('阿里云没有返回有效图片。');}
   // Fetch only a result from Alibaba OSS, never a caller-supplied URL or redirect target.
   if(url.protocol!=='https:'||!url.hostname.endsWith('.aliyuncs.com'))throw failure('阿里云返回的图片地址不受支持。');
   const result=await request(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
   if(!result.ok||!result.headers.get('content-type')?.startsWith('image/'))throw failure('图片生成成功，但读取结果失败。');
   const chunks=[];let size=0;
   for await(const chunk of result.body){size+=chunk.length;if(size>12*1024*1024)throw failure('返回图片超过大小限制。');chunks.push(chunk);}
   return {bytes:Buffer.concat(chunks),type:result.headers.get('content-type'),model:config.aliModel,elapsedMs:now()-start};
  }catch(e){if(e.status)throw e;throw failure(e.name==='TimeoutError'?'阿里云等待超时，任务可能仍在云端完成；未自动重试。':'阿里云连接失败；未自动重试。');}
  finally{aliBusy=false;}
 }
 return {status,issue,issueDecart,revoke,image};
}
