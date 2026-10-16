// SDK injected so lifecycle failures can be tested without paid camera sessions.
export async function openXmax({sdk,stream,prompt,signal,target,onFrame,onError,request=fetch}){
 let manager,view,token,closed=false,closing,connected=false;
 async function revoke(){if(token){const id=token.id;token=null;await request('./api/xmax-stop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id}),keepalive:true}).catch(()=>{});}}
 const stop=()=>{
  closed=true;
  if(!closing)closing=(async()=>{try{if(view){view.frameDisplayHandler=undefined;view.track=undefined;view.detach();}await manager?.close();}finally{await revoke();signal?.removeEventListener('abort',stop);}})();
  return closing;
 };
 const check=()=>{if(closed||signal?.aborted)throw new DOMException('Stopped','AbortError');};
 signal?.addEventListener('abort',stop,{once:true});
 try{
  check();const r=await request('./api/xmax-token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Xmax 临时凭据获取失败。');token=data;check();
  const client=new sdk.XmaxClient(new sdk.XmaxConfiguration({apiKey:data.apiKey,environment:data.region,loggerOptions:0}));
  manager=client.createRealtimeManager(new sdk.RealtimeConfiguration({model:data.model,isFrameInterpolationEnabled:false}));
  await manager.setStateListener(state=>{
   if(closed)return;
   if(['Connected','Generating'].includes(state.connectionState))connected=true;
   if(state.reason?.kind==='failure'||connected&&['Ready','Idle'].includes(state.connectionState))onError('Xmax 视频连接中断，请检查网络与额度后重试。');
  });check();
  const size=client.createMediaService(data.model).resolveModelInputSize({width:640,height:480});
  const local=await manager.createExternalVideoStream({videoTrack:stream.getVideoTracks()[0],videoFormat:new sdk.RealtimeVideoFormat({...size,fps:15})});check();
  const remote=await manager.connect(local);check();
  view=new sdk.XmaxVideoView({videoContentMode:sdk.VideoContentMode.fit,isInteractionEnabled:false});
  view.isMirrored=true;view.frameDisplayHandler=()=>{if(!closed)onFrame(view.videoElement);};view.attach(target);view.track=remote.videoTrack;
  await manager.startGeneration({localStream:local,context:new sdk.RealtimeContext({prompt}),record:false});check();
  return {stop,video:view.videoElement,sessionSeconds:data.sessionSeconds,
   async update(next){check();await manager.startGeneration({localStream:local,context:new sdk.RealtimeContext({prompt:next}),record:false});check();}};
 }catch(e){await stop();await revoke();throw e;}
}
