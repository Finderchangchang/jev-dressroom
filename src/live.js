import {liveOutfits,makeRenderPrompt} from './live-core.mjs';
import {latestTask} from './latest-task.mjs';
const $=s=>document.querySelector(s),modes={real:'真人',ink:'小黑手绘',doll:'胖头娃娃'};
const isLocal=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
let camera,renderer,renderAbort,decisionAbort,recognition,sessionTimer,imageURL,pendingRender,epoch=0,starting=false,imageBusy=false,cleanup=Promise.resolve();
let capabilities={configured:false,providers:{xmax:{configured:false},decart:{configured:false},aliyun:{configured:false}}};
let selection={outfit:'casual',effect:'none',style:'real'};
const say=(id,text,error=false)=>{$(id).textContent=text;$(id).classList.toggle('error',error);};
const provider=()=>$('#provider').value;
const videoNames={xmax:'Xmax',decart:'Decart Lucy'};
function updateSelection(){
 $('#selectionName').textContent=`${liveOutfits.find(x=>x.id===selection.outfit).name} · ${modes[selection.style]}`;
 document.querySelectorAll('[data-look]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.look===selection.outfit));
 document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.mode===selection.style));
}
function buttons(){
 $('#startRender').disabled=!camera||starting||imageBusy||!!renderer;
 $('#startRender').textContent=provider()==='aliyun'?'拍一帧，用阿里云换装 ↗':`开始 ${videoNames[provider()]} 实时变装 ↗`;
 $('#stopRender').disabled=!renderer&&!starting&&!imageBusy&&!imageURL;$('#autoImage').disabled=provider()!=='aliyun';
}
function providerInfo(){
 const p=capabilities.providers[provider()];
 const hints={xmax:`连续视频 · ${p.configured?'后台已配置':'等待配置 XMAX_API_KEY'} · 1 积分/秒，现金价格待核实`,decart:`连续视频 · ${p.configured?'后台已配置':'等待配置 DECART_API_KEY'} · 标准模式 $0.02/秒，60 秒约 $1.20`,aliyun:`单帧图片 · ${p.configured?'后台已配置':'等待配置 DASHSCOPE_API_KEY'} · ${p.model==='qwen-image-2.0'?'北京标准价 ¥0.20/张':p.model==='qwen-image-2.1-turbo'?'北京标准价 ¥0.10/张':'按后台模型计费'} · 需要等待`};
 say('#providerHint',hints[provider()]);buttons();
}
function clearImage(){if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;$('#imageOutput').removeAttribute('src');$('#imageOutput').hidden=true;}
function showResult(label){$('#cameraVideo').classList.add('pip');$('#originalTag').classList.add('pip');$('#liveTag').textContent=label;$('#liveTag').hidden=false;}
function stopRenderer(message='AI 已停止，当前显示原始摄像头画面。'){
 epoch++;decisionQueue.clear();videoQueue.clear();imageQueue.clear();decisionAbort?.abort();renderAbort?.abort();renderAbort=null;
 clearInterval(sessionTimer);const previous=renderer,pending=pendingRender;renderer=null;pendingRender=null;starting=false;imageBusy=false;
 cleanup=cleanup.catch(()=>{}).then(async()=>{await previous?.stop();if(pending){const late=await pending.catch(()=>null);await late?.stop();}}).catch(()=>say('#rendererStatus','视频资源释放未确认，请关闭页面后重试。',true));
 $('#xmaxOutput').classList.remove('ready');clearImage();$('#cameraVideo').classList.remove('pip');$('#originalTag').classList.remove('pip');$('#liveTag').hidden=true;
 $('#videoLabel').textContent=camera?'摄像头原始画面':'摄像头未开启';$('#sessionTime').textContent=camera?'仅本机预览':'只在你点击后开启';say('#rendererStatus',message);buttons();
}
function stopCamera(){
 stopRenderer('摄像头与 AI 视频传输已关闭。已提交的图片任务可能仍在云端完成。');camera?.getTracks().forEach(t=>{t.onended=null;t.stop();});camera=null;
 $('#cameraVideo').srcObject=null;$('#cameraVideo').hidden=true;$('#originalTag').hidden=true;$('#cameraPlaceholder').hidden=false;
 $('#cameraToggle').disabled=true;$('#snapshotButton').disabled=true;$('#cameraDot').classList.remove('on');$('#videoLabel').textContent='摄像头未开启';recognition?.stop();buttons();
}
async function startCamera(){
 if(camera)return;const version=++epoch;$('#startCamera').disabled=true;
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('需要通过 HTTPS 或 localhost 打开摄像头。');
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:15}}});
  if(version!==epoch){stream.getTracks().forEach(t=>t.stop());return;}
  camera=stream;$('#cameraVideo').srcObject=stream;await $('#cameraVideo').play();$('#cameraVideo').hidden=false;$('#cameraPlaceholder').hidden=true;$('#originalTag').hidden=false;
  $('#cameraToggle').disabled=false;$('#snapshotButton').disabled=false;$('#cameraDot').classList.add('on');$('#videoLabel').textContent='摄像头原始画面';$('#sessionTime').textContent='仅本机预览';
  stream.getVideoTracks().forEach(t=>t.onended=stopCamera);say('#decisionStatus','可以说“明天冷”或“明天热”，Jev 会选出对应衣服。');providerInfo();
 }catch(e){const reasons={NotAllowedError:'摄像头权限未允许。请在浏览器地址栏允许后重试。',NotFoundError:'没有找到摄像头。连接摄像头后再试。',NotReadableError:'摄像头被其他应用占用，请关闭占用后重试。'};say('#decisionStatus',reasons[e.name]||e.message,true);}
 finally{$('#startCamera').disabled=false;buttons();}
}
function cameraFrame(width=480){const v=$('#cameraVideo');if(!v.videoWidth)throw new Error('摄像头画面还没就绪。');const c=document.createElement('canvas');c.width=width;c.height=Math.round(v.videoHeight/v.videoWidth*width);c.getContext('2d').drawImage(v,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.8);}
async function responseError(response,fallback){let text=fallback;try{text=(await response.json()).error||text;}catch{}throw new Error(text);}
const videoQueue=latestTask(async(prompt,isCurrent)=>{
 const connection=renderer;if(!connection)return;
 try{await connection.update(prompt);if(isCurrent()&&connection===renderer)say('#rendererStatus',`换装指令已更新，等待 ${connection.providerName} 返回新画面。`);}
 catch{if(connection===renderer)stopRenderer('视频更新失败，请重新连接。');}
});
const imageQueue=latestTask(async(next,isCurrent)=>{
 if(!camera||provider()!=='aliyun')return;if(!capabilities.providers.aliyun.configured){setup();return;}
 const version=epoch;imageBusy=true;renderAbort=new AbortController();buttons();say('#rendererStatus','阿里云正在编辑这一帧……每次生成一张，镜头仍在本机预览。');
 try{
  const response=await fetch('./api/aliyun-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({frame:cameraFrame(640),selection:next,landscape:$('#cameraVideo').videoWidth>$('#cameraVideo').videoHeight}),signal:AbortSignal.any([renderAbort.signal,AbortSignal.timeout(155000)])});
  if(!response.ok)await responseError(response,'阿里云图片生成失败。');
  const blob=await response.blob();if(version!==epoch||!isCurrent())return;
  clearImage();imageURL=URL.createObjectURL(blob);$('#imageOutput').src=imageURL;await $('#imageOutput').decode();if(version!==epoch)return;
  $('#imageOutput').hidden=false;showResult('AI 单帧图片');$('#videoLabel').textContent='阿里云单帧换装图片';$('#sessionTime').textContent='静态结果 · 镜头保持开启';
  say('#rendererStatus',`${response.headers.get('X-Image-Model')} · 实际生成与传输 ${Number(response.headers.get('X-Elapsed-Ms'))/1000} 秒。图片不会跟随动作。`);
 }catch(e){if(version===epoch&&e.name!=='AbortError')say('#rendererStatus',e.name==='TimeoutError'?'等待超时，云端可能仍在处理。未自动重试。':e.message,true);}
 finally{if(version===epoch){imageBusy=false;renderAbort=null;buttons();}}
});
function applySelection(){if(renderer)return videoQueue.push(makeRenderPrompt(selection));if(provider()==='aliyun'&&$('#autoImage').checked)return imageQueue.push({...selection});}
const decisionQueue=latestTask(async(prompt,isCurrent)=>{
 if(!camera)return;const version=epoch;decisionAbort=new AbortController();say('#decisionStatus','Jev 正在选择衣服……');
 try{
  const body={prompt,style:selection.style,current:selection.outfit};if($('#useFrame').checked)body.frame=cameraFrame();
  const response=await fetch('./api/camera-decide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([decisionAbort.signal,AbortSignal.timeout(30000)])});
  if(!response.ok)await responseError(response,'Jev 选择失败。');
  const data=await response.json();if(version!==epoch||!camera||!isCurrent())return;makeRenderPrompt(data.selection);selection=data.selection;updateSelection();
  $('#selectionSource').textContent=`${data.model} · 判断 ${data.elapsedMs} ms`;say('#decisionStatus',`Jev 已选择${liveOutfits.find(x=>x.id===selection.outfit).name}。${renderer?'正在更新视频。':'点击下方生成按钮应用。'}`);applySelection();
 }catch(e){if(version===epoch&&isCurrent()&&e.name!=='AbortError')say('#decisionStatus',e.name==='TimeoutError'?'Jev 响应超时，请重试。':e.message,true);}
});
function decide(event){event?.preventDefault();if(!camera){say('#decisionStatus','先打开摄像头，让主角入场。',true);return;}const prompt=$('#livePrompt').value.trim();if(!prompt){say('#decisionStatus','先说说天气或想换的样子。',true);return;}decisionQueue.push(prompt);}
function setup(){$('#setupStatus').textContent=`Jev：${capabilities.configured?'已配置':'待配置'}；Xmax：${capabilities.providers.xmax.configured?'已配置':'待配置'}；Decart：${capabilities.providers.decart.configured?'已配置':'待配置'}；阿里云：${capabilities.providers.aliyun.configured?'已配置':'待配置'}。`;$('#setupDialog').showModal();}
async function startRenderer(){
 if(!camera)return;if(provider()==='aliyun')return imageQueue.push({...selection});
 const id=provider(),name=videoNames[id];if(!capabilities.providers[id].configured){setup();return;}if(renderer||starting)return;
 starting=true;buttons();const version=epoch;renderAbort=new AbortController();const signal=renderAbort.signal;
 say('#rendererStatus',`正在连接 ${name}。只有收到生成画面后才显示“实时生成”。`);$('#stopRender').disabled=false;
 let remaining=60;sessionTimer=setInterval(()=>{remaining--;$('#sessionTime').textContent=`本次剩余 ${remaining} 秒`;if(remaining<=0)stopRenderer('本次 60 秒体验结束，已发出停止请求。');},1000);
 try{
  await cleanup;if(version!==epoch)return;const {connectRenderer}=id==='decart'?await import('../dist/decart-client.js'):await import('../dist/xmax-client.js');if(version!==epoch)return;
  const attempt=connectRenderer({stream:camera,prompt:makeRenderPrompt(selection),signal,target:$('#xmaxOutput'),
   onFrame:()=>{if(version!==epoch)return;$('#xmaxOutput').classList.add('ready');showResult(`${name} 实时生成`);$('#videoLabel').textContent=`${name} 连续视频换装`;say('#rendererStatus',`已收到 ${name} 生成画面，可以连续说冷、热切换衣服。`);},
   onError:message=>{if(version===epoch)stopRenderer(message);}});pendingRender=attempt;
  const connection=await attempt;if(pendingRender===attempt)pendingRender=null;
  if(version!==epoch){await connection.stop();return;}connection.providerName=name;renderer=connection;videoQueue.push(makeRenderPrompt(selection));
 }catch(e){if(version===epoch&&e.name!=='AbortError')stopRenderer(`${name} 连接未完成：${e.message}`);}
 finally{if(version===epoch){starting=false;buttons();}}
}
$('#liveOutfits').innerHTML=liveOutfits.map(x=>`<button type="button" data-look="${x.id}" aria-pressed="${x.id===selection.outfit}"><b>${x.icon}</b>${x.name}</button>`).join('');
$('#liveOutfits').addEventListener('click',e=>{const b=e.target.closest('[data-look]');if(!b)return;decisionQueue.clear();selection.outfit=b.dataset.look;updateSelection();$('#selectionSource').textContent='手动选择';applySelection();});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{decisionQueue.clear();selection.style=b.dataset.mode;updateSelection();applySelection();}));
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{$('#livePrompt').value=b.dataset.prompt;decide();}));
$('#provider').addEventListener('change',()=>{stopRenderer('已切换生成方式。点击生成按钮开始。');$('#autoImage').checked=false;providerInfo();});
$('#startCamera').addEventListener('click',startCamera);$('#cameraToggle').addEventListener('click',stopCamera);$('#liveForm').addEventListener('submit',decide);
$('#startRender').addEventListener('click',startRenderer);$('#stopRender').addEventListener('click',()=>stopRenderer('已停止显示与视频传输。已提交的阿里云图片任务可能仍会计费。'));
$('#settingsButton').addEventListener('click',setup);$('#closeSetup').addEventListener('click',()=>$('#setupDialog').close());
$('#voiceButton').addEventListener('click',()=>{
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){say('#decisionStatus','当前浏览器不支持语音输入，可以直接打字。',true);return;}if(recognition){recognition.stop();return;}
 recognition=new Recognition();recognition.lang='zh-CN';recognition.interimResults=true;recognition.continuous=true;
 recognition.onstart=()=>{$('#voiceButton').classList.add('listening');$('#voiceButton').textContent='■ 停止聆听';};
 recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){$('#livePrompt').value=e.results[i][0].transcript.slice(0,360);decide();}};
 recognition.onerror=e=>say('#decisionStatus',e.error==='not-allowed'?'麦克风权限未允许，可以打字。':'语音识别未完成，可以打字或重试。',true);
 recognition.onend=()=>{recognition=null;$('#voiceButton').classList.remove('listening');$('#voiceButton').textContent='🎙 说一句';};recognition.start();
});
$('#snapshotButton').addEventListener('click',()=>{
 const element=imageURL?$('#imageOutput'):renderer&&$('#xmaxOutput').classList.contains('ready')?renderer.video:$('#cameraVideo');
 const width=element.videoWidth||element.naturalWidth,height=element.videoHeight||element.naturalHeight;if(!width)return;
 const c=document.createElement('canvas');c.width=width;c.height=height;const context=c.getContext('2d');context.translate(width,0);context.scale(-1,1);context.drawImage(element,0,0);
 c.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=imageURL||renderer?'Jev-AI-换装.png':'Jev-原始画面.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
});
window.addEventListener('pagehide',stopCamera);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();});
updateSelection();providerInfo();
if(isLocal)fetch('./api/status').then(r=>r.json()).then(data=>{capabilities=data;$('#backendStatus').textContent=`Jev ${data.configured?'已接通':'待配置'} · Xmax ${data.providers.xmax.configured?'已配置':'待配置'} · Decart ${data.providers.decart.configured?'已配置':'待配置'} · 阿里云 ${data.providers.aliyun.configured?'已配置':'待配置'}`;providerInfo();}).catch(()=>say('#rendererStatus','请启动本地服务。',true));
else say('#rendererStatus','公开页仅展示界面。真实换装请下载代码并启动本地服务，不在公开页填写密钥。');
