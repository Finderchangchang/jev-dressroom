import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCameraRequest,decodeCameraResponse,makeRenderPrompt} from '../src/live-core.mjs';
test('camera frame is included only when explicitly supplied',()=>{
 const plain=buildCameraRequest({prompt:'明天很热'});assert.equal(plain.assets,undefined);
 const withFrame=buildCameraRequest({prompt:'明天很冷',frame:'data:image/jpeg;base64,YWJj'});
 assert.equal(withFrame.assets['live-camera'].format,'jpg');assert.equal(withFrame.state.camera,'live-camera');assert.equal(withFrame.model,'jev-1.14.0');
 assert.throws(()=>buildCameraRequest({prompt:'hi',frame:'https://untrusted.invalid/photo.jpg'}));
});
test('cold and hot have distinct garment criteria, independent of the renderer',()=>{
 const q=buildCameraRequest({prompt:'cold'}).questions.outfit.criteria;
 assert.match(q.cold,/puffer/);assert.match(q.hot,/short-sleeve/);
 assert.match(makeRenderPrompt({outfit:'cold'}),/puffer/);assert.match(makeRenderPrompt({outfit:'hot'}),/short-sleeve/);
});
test('renderer receives only validated selection',()=>{
 assert.throws(()=>makeRenderPrompt({outfit:'injected'}));
 assert.match(makeRenderPrompt({outfit:'hot',style:'doll',effect:'crown'}),/large head/);
 assert.throws(()=>decodeCameraResponse({model:'jev-1.14.0',answers:{outfit:{type:'choice',choice:'injected'}}}));
});
