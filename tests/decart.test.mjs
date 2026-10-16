import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviders,providerConfig} from '../providers.mjs';
import {openDecart} from '../src/decart-session.mjs';
const reply=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const token=()=>({apiKey:'ek_fixture',expiresAt:'2026-10-16T12:00:20Z',model:'lucy-2.5',sessionSeconds:60});
test('Decart mints only scoped short-lived credentials with a server session cap',async()=>{
 const calls=[];let time=1000;
 const providers=createProviders(providerConfig({DECART_API_KEY:'permanent-test'}),{now:()=>time,request:async(url,options)=>{calls.push({url,options});return reply(token());}});
 assert.equal(providers.status().decart.configured,true);
 const result=await providers.issueDecart('http://127.0.0.1:8894');assert.equal(result.apiKey,'ek_fixture');assert.ok(!JSON.stringify(result).includes('permanent-test'));
 assert.equal(calls[0].url,'https://api.decart.ai/v1/client/tokens');assert.equal(calls[0].options.headers['X-API-KEY'],'permanent-test');
 assert.deepEqual(JSON.parse(calls[0].options.body),{expiresIn:20,allowedModels:['lucy-2.5'],allowedOrigins:['http://127.0.0.1:8894'],constraints:{realtime:{maxSessionDuration:60}}});
 await assert.rejects(providers.issueDecart('http://127.0.0.1:8894'),{status:429});time+=81000;await providers.issueDecart('http://127.0.0.1:8894');
});
test('Decart rejects missing keys, foreign origins and parallel token issuance',async()=>{
 await assert.rejects(createProviders(providerConfig({})).issueDecart('http://localhost'),{status:503});
 let resolve;const gate=new Promise(done=>resolve=done);
 const providers=createProviders(providerConfig({DECART_API_KEY:'test'}),{request:async()=>{await gate;return reply(token());}});
 for(const origin of ['https://evil.example','file://localhost','http://localhost/'])await assert.rejects(providers.issueDecart(origin),{status:400});
 const first=providers.issueDecart('http://localhost');await assert.rejects(providers.issueDecart('http://localhost'),{status:429});resolve();await first;
});
test('Decart upstream errors do not reveal raw provider messages or secrets',async()=>{
 const providers=createProviders(providerConfig({DECART_API_KEY:'permanent-test'}),{request:async()=>new Response('permanent-test secret error',{status:401})});
 await assert.rejects(providers.issueDecart('http://localhost'),error=>error.status===502&&!error.message.includes('permanent-test'));
});
function setup({pending=false,connectError=false}={}){
 const events=[],listeners=new Map();let options,clientOptions,release,present,videoRemoved=false;
 let originalStops=0,cloneStops=0,remoteStops=0;
 const input={getTracks:()=>[{stop:()=>cloneStops++}]};
 const source={getTracks:()=>[{stop:()=>originalStops++}],clone:()=>input};
 const remote={getTracks:()=>[{stop:()=>remoteStops++}]};
 const video={play:async()=>{},pause:()=>events.push('pause'),remove:()=>videoRemoved=true,requestVideoFrameCallback:callback=>{present=callback;return 1;},cancelVideoFrameCallback:()=>{present=undefined;}};
 const connection={disconnect:()=>events.push('disconnect'),on:(name,handler)=>listeners.set(name,handler),off:name=>listeners.delete(name),set:async state=>events.push(state)};
 const gate=new Promise(resolve=>release=resolve);
 const sdk={noopLogger:{},models:{realtime:model=>({name:model})},createDecartClient:config=>{clientOptions=config;return {realtime:{connect:async(stream,opts)=>{assert.equal(stream,input);options=opts;await config.apiKeyProvider();if(pending)await gate;if(connectError)throw new Error('connect failed');return connection;}}};}};
 return {sdk,source,remote,video,events,listeners,release,options:()=>options,clientOptions:()=>clientOptions,frame:()=>present?.(),counts:()=>({originalStops,cloneStops,remoteStops,videoRemoved}),request:async()=>reply(token()),makeVideo:()=>video,target:{append:()=>{}}};
}
test('Decart swaps prompts in one session, displays only after first frame and stops its own tracks',async()=>{
 const f=setup(),abort=new AbortController();let frames=0;
 const connection=await openDecart({...f,stream:f.source,prompt:'cold',signal:abort.signal,onFrame:()=>frames++,onError:()=>{}});
 assert.equal(f.clientOptions().telemetry,false);assert.equal(f.options().speed,undefined);assert.equal(f.options().retries,0);assert.equal(f.options().resolution,'720p');assert.equal(f.options().initialState.prompt.text,'cold');
 f.options().onRemoteStream(f.remote);assert.equal(frames,0);f.frame();assert.equal(frames,1);await connection.update('hot');assert.deepEqual(f.events.find(x=>x?.prompt),{prompt:'hot',enhance:false});
 assert.throws(()=>f.clientOptions().apiKeyProvider());abort.abort();connection.stop();assert.equal(f.events.filter(x=>x==='disconnect').length,1);
 assert.equal(f.counts().originalStops,0);assert.equal(f.counts().cloneStops,1);assert.equal(f.counts().remoteStops,1);assert.equal(f.counts().videoRemoved,true);assert.equal(f.listeners.size,0);
});
test('aborting before token response never starts an SDK connection',async()=>{
 const f=setup(),abort=new AbortController();let release;const gate=new Promise(resolve=>release=resolve);
 const pending=openDecart({...f,stream:f.source,prompt:'cold',signal:abort.signal,onFrame:()=>{},onError:()=>{},request:async()=>{await gate;return reply(token());}});
 abort.abort();release();await assert.rejects(pending,{name:'AbortError'});assert.equal(f.options(),undefined);assert.equal(f.counts().originalStops,0);
});
test('late Decart connect after cancellation is disconnected and cannot show stale frames',async()=>{
 const f=setup({pending:true}),abort=new AbortController();let shown=false;
 const pending=openDecart({...f,stream:f.source,prompt:'cold',signal:abort.signal,onFrame:()=>shown=true,onError:()=>{}});
 // Allow credential parsing and SDK connection setup to finish.
 await new Promise(resolve=>setImmediate(resolve));abort.abort();f.options().onRemoteStream(f.remote);f.release();
 await assert.rejects(pending,{name:'AbortError'});assert.equal(shown,false);assert.ok(f.events.includes('disconnect'));assert.equal(f.counts().originalStops,0);assert.equal(f.counts().cloneStops,1);assert.equal(f.counts().remoteStops,1);
});
test('failed Decart connect releases local clone and video view',async()=>{
 const f=setup({connectError:true});await assert.rejects(openDecart({...f,stream:f.source,prompt:'cold',onFrame:()=>{},onError:()=>{}}));
 assert.equal(f.counts().originalStops,0);assert.equal(f.counts().cloneStops,1);assert.equal(f.counts().videoRemoved,true);
});
test('a reconnect event stops Decart without minting another token',async()=>{
 const f=setup();let errors=0,requests=0;
 await openDecart({...f,stream:f.source,prompt:'cold',onFrame:()=>{},onError:()=>errors++,request:async()=>{requests++;return reply(token());}});
 f.options().onConnectionChange('reconnecting');assert.equal(errors,1);assert.equal(requests,1);assert.equal(f.events.filter(x=>x==='disconnect').length,1);
});
