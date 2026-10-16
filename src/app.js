import {wardrobe,presets,getItem,offlineSelection,buildRequest,decodeResponse,validLook,MODEL} from './wardrobe.mjs';
import {portraitSvg,itemSvg,photoMarkup,photoRect,escapeXml} from './portrait.mjs';
const $=selector=>document.querySelector(selector);
const all=selector=>[...document.querySelectorAll(selector)];
const storageKey='jev-dressroom-looks-v1';
const styleNames={ink:'小黑手绘',doll:'胖头娃娃',photo:'真人造型'};
const isLocal=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let look={outfit:'mint',head:'headphones',prop:'coffee',style:'ink'};
let category='outfit',saved=[],busy=false,live=false,configured=false,browserKey='',result=null,source='demo',lastPrompt=$('#prompt').value;
try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(value))saved=value.filter(validLook).slice(0,12);}catch{}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function signature(value){return [value.outfit,value.head,value.prop,value.style].join(':');}
function renderWardrobe(){
 $('#wardrobeGrid').innerHTML=wardrobe[category].map(item=>`<button type="button" class="item" data-item="${item.id}" aria-label="换上${item.name}" aria-pressed="${look[category]===item.id}"><span class="item-art">${itemSvg(category,item.id)}</span><span class="item-name">${item.name}</span></button>`).join('');
 $('#wardrobeNote').textContent=look.style==='photo'?'真人版展示 8 套预制造型；头饰和道具的手动搭配在两种手绘版中可见。':'搭配没有标准答案，有精神状态就行。';
}
function renderLook(animate=false){
 const outfit=getItem('outfit',look.outfit);
 const stage=$('#stageArt');stage.className='stage-art'+(look.style==='photo'?' photo':'');
 stage.innerHTML=look.style==='photo'?photoMarkup(look.outfit):portraitSvg(look);
 stage.setAttribute('aria-label',`${styleNames[look.style]}：${outfit.name}、${getItem('head',look.head).name}、${getItem('prop',look.prop).name}`);
 if(look.style==='photo')stage.setAttribute('aria-label',`AI 人物预制造型：${outfit.name}`);
 $('#photoDisclosure').hidden=look.style!=='photo';
 $('#lookName').textContent=outfit.look;$('#lookTag').textContent=outfit.look;$('#lookCaption').textContent=outfit.caption;$('#sceneNote').textContent=outfit.note;
 $('#lookNumber').textContent=String(wardrobe.outfit.indexOf(outfit)+1).padStart(2,'0');
 all('[data-style]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.style===look.style));
 $('#saveButton').classList.toggle('saved',saved.some(value=>signature(value)===signature(look)));
 $('#saveButton').textContent=saved.some(value=>signature(value)===signature(look))?'♥':'♡';
 $('#saveButton').setAttribute('aria-label',saved.some(value=>signature(value)===signature(look))?'取消收藏这套':'收藏这套');
 $('#decisionSource').textContent=source==='live'?`${result.model} · 真实调用 · ${result.elapsedMs} ms`:source==='manual'?'手动搭配 · 你说了算':source==='saved'?'从我的衣橱穿回来':'离线规则试玩 · 未调用模型';
 $('#decisionSummary').textContent=look.style==='photo'?`${outfit.name} · AI 人物预制造型，点击“整套”试试不同风格。`:`${outfit.name} + ${getItem('head',look.head).name} + ${getItem('prop',look.prop).name}。`;
 renderWardrobe();
 if(animate){void stage.offsetWidth;stage.classList.add('changing');setTimeout(()=>stage.classList.remove('changing'),560);}
}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(saved));return true;}catch{toast('浏览器禁止保存；收藏仅在当前页面有效。');return false;}}
function renderSaved(){
 $('#savedCount').textContent=saved.length;
 if(!saved.length){$('#savedGrid').innerHTML='<div class="empty-closet"><span>♡</span><p>第一套收藏，等你来挂。<br><small>点试衣间的爱心，留住今天的精神状态。</small></p></div>';return;}
 $('#savedGrid').innerHTML=saved.map((item,index)=>`<article class="saved-card"><button class="saved-preview" data-restore="${index}" aria-label="穿回${getItem('outfit',item.outfit).look}">${item.style==='photo'?photoMarkup(item.outfit):portraitSvg(item)}</button><h3>${getItem('outfit',item.outfit).look}</h3><p>${styleNames[item.style]}</p><button class="saved-remove" data-remove="${index}" aria-label="删除收藏${index+1}">×</button></article>`).join('');
}
function setConnection(){const el=$('#connectionButton');el.classList.toggle('live',live);$('#connectionText').textContent=live?'Jev 1.14 · 已连接':'离线试玩 · 随时开换';$('#generateButton').firstElementChild.textContent=live?'让 Jev 给我整一身':'离线试穿这一身';}
function setStatus(message,error=false){$('#requestStatus').textContent=message;$('#requestStatus').classList.toggle('error',error);}
function showDialog(content){$('#dialogContent').innerHTML=content;$('#infoDialog').showModal();}
function connectionDialog(){
 if(!isLocal){showDialog('<p class="eyebrow">REAL DECISIONS, YOUR KEY</p><h2>带上自己的 Jev。</h2><p>这个公开页面是免费离线试玩。想让真正的 Jev 1.14 选衣服，可以运行开源项目的本地服务；网页和衣柜还是现在这一套。</p><pre class="detail-json">git clone https://github.com/Finderchangchang/jev-dressroom.git\ncd jev-dressroom\nnpm start</pre><p>安装 Node.js 20+，启动后打开 <a href="http://127.0.0.1:8894/" target="_blank" rel="noopener noreferrer">本地换装间 ↗</a>，再连接自己的 TypeSafe Key。也可以在服务端环境变量里设置 TYPESAFE_API_KEY。</p><p>Key 留在自己的电脑，请求由本地服务发送给 TypeSafe。<a href="https://github.com/Finderchangchang/jev-dressroom#本地运行" target="_blank" rel="noopener noreferrer">看完整安装说明 ↗</a></p>');return;}
 showDialog(`<p class="eyebrow">REAL DECISIONS, YOUR KEY</p><h2>接通 Jev 的衣橱</h2><p>当前：${configured?'本地服务已配置 Jev 密钥。':'当前网页可离线试玩。'}<br>真实模式固定调用 <strong>${MODEL}</strong>，一次选择整套、头饰和道具。按 TypeSafe 账户计费。</p>${configured?'<button class="generate" id="useServer">使用本地 Jev 服务 ↗</button>':''}<label for="apiKey">TypeSafe API Key（可选，只留在页面内存）</label><input id="apiKey" type="password" autocomplete="off" spellcheck="false" placeholder="经本机服务发送到 TypeSafe"><button class="generate" id="useKey">连接我的 Key ↗</button><p id="keyError" role="status"></p><p>场景文本会发送给 TypeSafe。Key 不写入收藏或浏览器存储，刷新即清除。<a href="https://console.typesafe.ai/keys" target="_blank" rel="noopener noreferrer">获取自己的 Key ↗</a></p><div class="connection-options"><button id="useDemo">继续离线试玩</button><button id="clearKey">断开并清除临时 Key</button></div>`);
 $('#useServer')?.addEventListener('click',()=>{browserKey='';live=true;setConnection();$('#infoDialog').close();toast('本地 Jev 已接通，输入场景后开始换装。');});
 $('#useKey').addEventListener('click',()=>{const value=$('#apiKey').value.trim();if(!value||value.length<8){$('#keyError').textContent='请填写完整的 TypeSafe API Key。';return;}browserKey=value;$('#apiKey').value='';live=true;setConnection();$('#infoDialog').close();toast('临时 Key 已放入内存，下次换装时调用。');});
 $('#useDemo').addEventListener('click',()=>{live=false;setConnection();$('#infoDialog').close();});
 $('#clearKey').addEventListener('click',()=>{browserKey='';live=false;setConnection();$('#infoDialog').close();toast('已断开，临时 Key 已清除。');});
}
async function requestOutfit(prompt){
 const response=await fetch('./api/decide',{
  method:'POST',headers:browserKey?{'Content-Type':'application/json','X-TypeSafe-Key':browserKey}:{'Content-Type':'application/json'},
  body:JSON.stringify({prompt}),signal:AbortSignal.timeout(28000)
 });
 if(!response.ok){let error='';try{const data=await response.json();error=data.error||'';}catch{}throw new Error(error||(response.status===401?'Key 未通过验证，请重新连接。':response.status===429?'请求太快了，稍等一分钟再试。':`Jev 连接失败（${response.status}），请检查网络或 Key。`));}
 const raw=await response.json();
 // Re-validate the proxy result with the same schema before using it in the page.
 const answers=Object.fromEntries(Object.entries(raw.details||{}).map(([name,value])=>[name,{type:'choice',...value}]));
 return {...decodeResponse({model:raw.model,answers,usage:raw.usage}),elapsedMs:raw.elapsedMs};
}
$('#outfitForm').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;const prompt=$('#prompt').value.trim();
 try{buildRequest(prompt);}catch(error){setStatus(error.message,true);$('#prompt').focus();return;}
 busy=true;$('#generateButton').disabled=true;$('#prompt').readOnly=true;all('[data-preset]').forEach(el=>el.disabled=true);setStatus(live?'Jev 正在从衣柜里挑选……':'正在把心情挂上衣架……');
 try{
  if(live){const response=await requestOutfit(prompt);result=response;look={...look,...response.selection};source='live';setStatus(`换好啦 · ${response.model} · 实际请求 ${response.elapsedMs} ms`);}
  else{look={...look,...offlineSelection(prompt)};result=null;source='demo';setStatus('已按本地场景规则搭配。这次没有调用 AI。');}
  lastPrompt=prompt;renderLook(true);
 }catch(error){setStatus(error.name==='TimeoutError'?'Jev 响应超时，当前这套还在，稍后再试。':error.name==='TypeError'?'无法连接 Jev。可用本地服务连接，或切回离线试玩。':error.message,true);}
 finally{busy=false;$('#generateButton').disabled=false;$('#prompt').readOnly=false;all('[data-preset]').forEach(el=>el.disabled=false);}
});
$('#prompt').addEventListener('input',()=>{$('#charCount').textContent=`${$('#prompt').value.length} / 360`;all('[data-preset]').forEach(el=>el.classList.remove('active'));});
all('[data-preset]').forEach(el=>el.addEventListener('click',()=>{if(busy)return;$('#prompt').value=presets[el.dataset.preset].prompt;$('#prompt').dispatchEvent(new Event('input'));el.classList.add('active');setStatus('场景填好了，点下面的按钮开始换装。');}));
all('[data-style]').forEach(el=>el.addEventListener('click',()=>{look.style=el.dataset.style;renderLook(true);}));
all('[data-category]').forEach(el=>el.addEventListener('click',()=>{category=el.dataset.category;all('[data-category]').forEach(button=>button.setAttribute('aria-pressed',button===el));renderWardrobe();}));
$('#wardrobeGrid').addEventListener('click',event=>{const button=event.target.closest('[data-item]');if(!button||busy)return;look[category]=button.dataset.item;source='manual';result=null;renderLook(true);if(look.style==='photo'&&category!=='outfit')toast('已保存选择，切到小黑或胖头版可看到这件配饰。');});
$('#shuffleButton').addEventListener('click',()=>{if(busy)return;const outfits=wardrobe.outfit.filter(item=>item.id!==look.outfit);look={...look,outfit:outfits[Math.floor(Math.random()*outfits.length)].id,head:wardrobe.head[Math.floor(Math.random()*wardrobe.head.length)].id,prop:wardrobe.prop[Math.floor(Math.random()*wardrobe.prop.length)].id};source='manual';result=null;renderLook(true);setStatus('灵感抽签完成。这次是随机搭配，没有调用模型。');});
$('#saveButton').addEventListener('click',()=>{const existing=saved.findIndex(item=>signature(item)===signature(look));if(existing>=0){saved.splice(existing,1);toast('这套已从衣橱取下。');}else{saved.unshift({...look});if(saved.length>12)saved.pop();toast('挂进衣橱了，最多保留 12 套。');}persist();renderSaved();renderLook();});
$('#savedGrid').addEventListener('click',event=>{const remove=event.target.closest('[data-remove]');if(remove){saved.splice(Number(remove.dataset.remove),1);persist();renderSaved();renderLook();return;}const restore=event.target.closest('[data-restore]');if(restore&&!busy){look={...saved[Number(restore.dataset.restore)]};source='saved';result=null;renderLook(true);toast('这身，又穿回来了。');}});
$('#connectionButton').addEventListener('click',connectionDialog);
$('#aboutButton').addEventListener('click',()=>showDialog('<p class="eyebrow">ONE SENTENCE. ONE NEW YOU.</p><h2>给今天换个皮肤。</h2><p>① 说说今天的场景，或点一个场景小标签。<br>② 点“整一身”，让 Jev 从衣柜选整套、头饰、道具。<br>③ 切换小黑、胖头和真人，收藏或者存成图片。</p><h3>Jev 负责选，画面负责演。</h3><p>真实模式由 Jev 1.14 返回三个 Choice 选择结果。文案是我们预先写的，手绘由代码绘制；真人版展示 8 套原创 AI 人物造型，不是对你的照片进行虚拟试穿。</p><p>没有 Key 也能玩：离线模式使用本地关键词规则，不伪装成模型结果。</p><p><a href="https://jevland.com/" target="_blank" rel="noopener noreferrer">去 JevLand 学着做一个 ↗</a></p>'));
$('#privacyButton').addEventListener('click',()=>showDialog('<p class="eyebrow">SMALL PRINT, PLAIN WORDS</p><h2>你的衣橱，你保管。</h2><p>收藏只保存在当前浏览器的 localStorage，最多 12 套。不上传到我们这里，也没有统计脚本。清除浏览器数据就会清空收藏。</p><p>离线模式不发送场景。连接 Jev 后，点击换装会把场景和衣柜选项发给 TypeSafe。临时 Key 只保存在当前页面的内存里；本地服务可从服务器环境变量读取 Key。</p><p>真人造型来自原创 AI 生成素材。没有上传自拍、身份识别或身体评估。图片仅为娱乐和造型示意。</p><p>这是 JevLand 的独立开源实验，与 TypeSafe 无隶属关系。<a href="https://docs.typesafe.ai/models" target="_blank" rel="noopener noreferrer">模型说明 ↗</a> · <a href="https://github.com/Finderchangchang/jev-dressroom" target="_blank" rel="noopener noreferrer">查看源代码 ↗</a></p><button class="generate" id="clearSaved">清空我的收藏</button>'));
$('#infoDialog').addEventListener('click',event=>{if(event.target=== $('#infoDialog')){const rect=$('#infoDialog').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$('#infoDialog').close();}if(event.target.id==='clearSaved'){saved=[];persist();renderSaved();renderLook();$('#infoDialog').close();toast('衣橱已清空。');}});
$('#detailsButton').addEventListener('click',()=>{
 let html='<p class="eyebrow">INSIDE THE DECISION</p><h2>这身是怎么选的？</h2>';
 if(source==='live'&&result){html+=`<p>${escapeXml(result.model)} · 实际请求耗时 ${result.elapsedMs} ms<br>整套、头饰、道具在同一次请求里并行选择。下面是返回的选项概率，不代表实际穿搭效果。</p><div class="decision-rows">`;
  for(const [cat,label] of [['outfit','整套'],['head','头饰'],['prop','道具']]){const answer=result.details[cat];const p=answer.probabilities[answer.choice];html+=`<div class="decision-row">${label}：${getItem(cat,answer.choice).name}<small>选项概率 ${(p*100).toFixed(1)}% · 返回置信度 ${(answer.confidence*100).toFixed(1)}%</small><div class="prob-bar"><span style="width:${p*100}%"></span></div></div>`;}
  html+=`</div><h3>模型原始选择</h3><pre class="detail-json">${escapeXml(JSON.stringify({model:result.model,answers:result.details,usage:result.usage},null,2))}</pre>`;
 }else html+=`<p>${source==='demo'?'这套来自本地场景关键词规则，没有调用模型，也没有编造概率。':source==='manual'?'这套由你手动或随机搭配，没有调用模型。':'这套来自浏览器里保存的收藏。'}</p><p>接通自己的 TypeSafe Key 后，Jev 1.14 会在一次请求中，从固定衣柜中分别选择整套、头饰和道具，并返回概率分布。</p><p>模型不生成图片和文案。角色由本页绘制，文案由我们预先编写，真人版使用预制 AI 素材。</p>`;
 showDialog(html);
});
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;});}
$('#exportButton').addEventListener('click',async()=>{
 const current={...look},outfit=getItem('outfit',current.outfit);$('#exportButton').disabled=true;
 try{
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=1200;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f6f7ef';ctx.fillRect(0,0,960,1200);ctx.fillStyle='#566348';ctx.font='500 25px "Microsoft YaHei",sans-serif';ctx.fillText('JevLand / 班味换装间',70,75);
  ctx.font='16px sans-serif';ctx.fillStyle='#8c967f';ctx.fillText(styleNames[current.style],70,108);
  if(current.style==='photo'){const image=await loadImage(new URL('../assets/real-looks.png',import.meta.url).href);const r=photoRect(current.outfit);const scale=Math.min(540/r.width,810/r.height);const w=r.width*scale,h=r.height*scale;ctx.drawImage(image,r.x,r.y,r.width,r.height,480-w/2,155+(810-h)/2,w,h);}
  else{const svg=portraitSvg(current);const image=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));ctx.drawImage(image,160,100,640,800);}
  ctx.fillStyle='#303b2b';ctx.textAlign='center';ctx.font='600 47px "Microsoft YaHei",sans-serif';ctx.fillText(outfit.look,480,1010);ctx.font='24px "Microsoft YaHei",sans-serif';ctx.fillStyle='#89937c';ctx.fillText(outfit.caption,480,1060);ctx.font='17px sans-serif';ctx.fillText('jevland.com  ·  '+(current.style==='photo'?'AI 人物造型示意':'给精神状态换一身'),480,1140);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('导出失败');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.download=`JevLand-${outfit.look}-${current.style}.png`;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('图片已生成，去下载里找找。');
 }catch{toast('图片暂时没存下来，请稍后重试。');}finally{$('#exportButton').disabled=false;}
});
$('#charCount').textContent=`${$('#prompt').value.length} / 360`;renderLook();renderSaved();setConnection();
// Static hosting has no /api route. Only probe on a loopback preview server.
if(isLocal)fetch('./api/status').then(response=>response.ok?response.json():null).then(data=>{configured=!!data?.configured;if(configured){live=true;setConnection();setStatus('本地 Jev 1.14 已就绪，点按钮开始真实换装。');}}).catch(()=>{});
