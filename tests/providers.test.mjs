import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviders,providerConfig} from '../providers.mjs';
import {latestTask} from '../src/latest-task.mjs';
import {openXmax} from '../src/xmax-session.mjs';
const reply=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const config=()=>providerConfig({XMAX_API_KEY:'permanent-test',DASHSCOPE_API_KEY:'ali-test'});
const frame='data:image/jpeg;base64,YWJj';
test('regional endpoints and image path stay independent of compatible-mode path',()=>{
 assert.equal(providerConfig({XMAX_REGION:'global'}).xmaxBase,'https://api.xmax.ai/open/api/v1');
 assert.equal(providerConfig({DASHSCOPE_BASE_URL:'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'}).aliBase,'https://workspace.cn-beijing.maas.aliyuncs.com');
 assert.throws(()=>providerConfig({DASHSCOPE_BASE_URL:'https://attacker.test'}));
});
test('Xmax issues capped temporary credentials, locks a single session, revokes on timer',async()=>{
 const calls=[];let expiry;
 const providers=createProviders(config(),{schedule:fn=>{expiry=fn;return 0;},request:async(url,options)=>{calls.push({url,options});return reply({success:true,data:{temporaryApiKey:'tk-test'}});}});
 const token=await providers.issue();assert.equal(token.apiKey,'tk-test');assert.ok(!JSON.stringify(token).includes('permanent-test'));
 assert.deepEqual(JSON.parse(calls[0].options.body),{expireSeconds:90,pointsLimit:60});
 await assert.rejects(providers.issue(),{status:409});await expiry();
 // Timer dispatch is async; revocation has started before another key is issued.
 await providers.revoke(token.id);assert.ok(calls.some(x=>x.url.endsWith('/tk-test/inactive')&&x.options.method==='PUT'));
});
test('failed revocation keeps the session locked until natural expiration',async()=>{
 let time=1000,fail=false;
 const providers=createProviders(config(),{now:()=>time,schedule:()=>0,request:async()=>{if(fail)throw new Error('network');return reply({success:true,data:{temporaryApiKey:'tk-test'}});}});
 const token=await providers.issue();fail=true;await assert.rejects(providers.revoke(token.id));await assert.rejects(providers.issue(),{status:409});
 time+=91000;fail=false;await providers.issue();
});
test('Aliyun uses one base64 frame, fixed choices and one output; keys stay server-side',async()=>{
 const calls=[];let time=10000;
 const providers=createProviders(config(),{now:()=>time,request:async(url,options)=>{calls.push({url:String(url),options});return calls.length===1?reply({output:{choices:[{message:{content:[{image:'https://bucket.oss-cn-beijing.aliyuncs.com/result.png'}]}}]}}):new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}});}});
 const result=await providers.image({frame,selection:{outfit:'cold'}});assert.equal(result.bytes.length,3);
 const body=JSON.parse(calls[0].options.body);assert.equal(body.parameters.n,1);assert.equal(body.parameters.size,'768*1024');assert.equal(body.input.messages[0].content[0].image,frame);assert.match(body.input.messages[0].content[1].text,/puffer/);
 assert.equal(calls[1].options.headers,undefined);assert.equal(calls[1].options.redirect,'error');
 await assert.rejects(providers.image({frame,selection:{outfit:'hot'}}),{status:429});
});
test('Aliyun refuses arbitrary remote frames, unknown choices, untrusted result hosts and concurrent generation',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let calls=0;
 const providers=createProviders(config(),{request:async()=>{calls++;await gate;return reply({output:{choices:[{message:{content:[{image:'https://evil.test/photo.png'}]}}]}});}});
 await assert.rejects(providers.image({frame:'https://evil.test/x',selection:{outfit:'hot'}}));
 await assert.rejects(providers.image({frame,selection:{outfit:'injected'}}));assert.equal(calls,0);
 const first=providers.image({frame,selection:{outfit:'hot'}});await assert.rejects(providers.image({frame,selection:{outfit:'cold'}}),{status:409});release();await assert.rejects(first,/地址不受支持/);assert.equal(calls,1);
});
test('voice queue drops stale output and retains only the latest pending command',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),seen=[],applied=[];
 const queue=latestTask(async(value,current)=>{seen.push(value);if(value==='cold')await gate;if(current())applied.push(value);});
 const done=queue.push('cold');queue.push('rain');queue.push('hot');release();await done;
 assert.deepEqual(seen,['cold','hot']);assert.deepEqual(applied,['hot']);
});
test('clearing a queue invalidates in-flight output and pending camera commands',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),applied=[];
 const queue=latestTask(async(value,current)=>{await gate;if(current())applied.push(value);});
 const done=queue.push('cold');queue.push('hot');queue.clear();release();await done;assert.deepEqual(applied,[]);
});
function fakeSdk({failGeneration=false}={}){
 const events=[],video={};let frame;
 const manager={setStateListener:async()=>{},createExternalVideoStream:async options=>{events.push(options);return {};},connect:async()=>({videoTrack:{}}),startGeneration:async options=>{events.push(options);if(failGeneration)throw new Error('generation failed');},close:async()=>events.push('close')};
 const sdk={XmaxConfiguration:class{constructor(options){events.push(options);}},XmaxClient:class{createRealtimeManager(){return manager;}createMediaService(){return {resolveModelInputSize:()=>({width:928,height:704})};}},RealtimeConfiguration:class{},RealtimeVideoFormat:class{constructor(options){Object.assign(this,options);}},RealtimeContext:class{constructor(options){Object.assign(this,options);}},VideoContentMode:{fit:'fit'},XmaxVideoView:class{videoElement=video;set frameDisplayHandler(value){frame=value;}attach(){}detach(){events.push('detach');}}};
 return {sdk,events,frame:()=>frame?.()};
}
test('Xmax updates a running session and releases SDK tracks, view and key on abort',async()=>{
 const fake=fakeSdk(),controller=new AbortController(),calls=[];let shown=false;
 const connection=await openXmax({sdk:fake.sdk,stream:{getVideoTracks:()=>[{}]},prompt:'cold',signal:controller.signal,target:{},onFrame:()=>shown=true,onError:()=>{},request:async(url,options)=>{calls.push({url,options});return reply({id:'one',apiKey:'tk-test',region:'china',model:'x2.0',sessionSeconds:60});}});
 assert.equal(shown,false);fake.frame();assert.equal(shown,true);await connection.update('hot');
 const generations=fake.events.filter(x=>x?.context);assert.deepEqual(generations.map(x=>x.context.prompt),['cold','hot']);assert.ok(generations.every(x=>x.record===false));
 controller.abort();await connection.stop();assert.ok(fake.events.includes('close'));assert.ok(fake.events.includes('detach'));assert.equal(calls.filter(x=>x.url.endsWith('stop')).length,1);
});
test('generation failure still closes SDK and revokes the temporary key',async()=>{
 const fake=fakeSdk({failGeneration:true}),calls=[];
 await assert.rejects(openXmax({sdk:fake.sdk,stream:{getVideoTracks:()=>[{}]},prompt:'cold',target:{},onFrame:()=>{},onError:()=>{},request:async url=>{calls.push(url);return reply({id:'one',apiKey:'tk-test',region:'china',model:'x2.0'});}}));
 assert.ok(fake.events.includes('close'));assert.ok(calls.includes('./api/xmax-stop'));
});
