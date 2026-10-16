// Inject the official SDK and video element to test lifecycle handling without a paid session.
export async function openDecart({sdk,stream,prompt,signal,target,onFrame,onError,request=fetch,makeVideo=()=>document.createElement('video')}){
 let connection,input,remote,video,closed=false,dialed=false,frameCallback;
 const handlers={error:()=>fail('Decart 视频发生错误，请检查网络和额度后重试。'),sessionEnded:()=>fail('Decart 视频会话已结束。')};
 function stop(){
  closed=true;
  if(connection){for(const [name,handler] of Object.entries(handlers))connection.off(name,handler);connection.disconnect();connection=null;}
  input?.getTracks().forEach(t=>t.stop());input=null;remote?.getTracks().forEach(t=>t.stop());remote=null;
  if(video){if(frameCallback!==undefined)video.cancelVideoFrameCallback?.(frameCallback);video.onplaying=null;video.pause();video.srcObject=null;video.remove();video=null;}
  signal?.removeEventListener('abort',stop);
 }
 function fail(message){if(closed)return;stop();onError(message);}
 const check=()=>{if(closed||signal?.aborted)throw new DOMException('Stopped','AbortError');};
 signal?.addEventListener('abort',stop,{once:true});
 try{
  check();const response=await request('./api/decart-token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Decart 临时凭据获取失败。');check();
  // Own only the clone: disconnect must not kill the user's local camera preview.
  input=stream.clone();video=makeVideo();video.autoplay=true;video.muted=true;video.playsInline=true;target.append(video);
  const client=sdk.createDecartClient({telemetry:false,logger:sdk.noopLogger,apiKeyProvider:()=>{
   check();if(dialed)throw new Error('请手动重新开始，不自动重连计费。');dialed=true;return data.apiKey;
  }});
  const connected=await client.realtime.connect(input,{model:sdk.models.realtime(data.model),resolution:'720p',mirror:false,retries:0,capacityRetryBudgetMs:0,
   initialState:{prompt:{text:prompt,enhance:false}},
   onConnectionChange:state=>{if(state==='disconnected'||state==='reconnecting')fail('Decart 连接中断，已停止。不会自动重连计费。');},
   onRemoteStream:output=>{
    if(closed){output.getTracks().forEach(t=>t.stop());return;}
    if(frameCallback!==undefined)video.cancelVideoFrameCallback?.(frameCallback);
    remote?.getTracks().filter(t=>!output.getTracks().includes(t)).forEach(t=>t.stop());remote=output;video.srcObject=output;
    const presented=()=>{if(!closed)onFrame(video);};
    if(video.requestVideoFrameCallback)frameCallback=video.requestVideoFrameCallback(presented);else video.onplaying=presented;
    video.play().catch(()=>fail('浏览器未能播放 Decart 返回的视频。'));
   }});
  connection=connected;if(closed||signal?.aborted){stop();check();}
  for(const [name,handler] of Object.entries(handlers))connection.on(name,handler);
  return {stop,video,sessionSeconds:data.sessionSeconds,async update(next){check();await connection.set({prompt:next,enhance:false});check();}};
 }catch(e){stop();throw e;}
}
