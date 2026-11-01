import test from 'node:test';
import assert from 'node:assert/strict';
import {installGestures} from '../src/gestures.js';

test('touch swipes do not also tap; hold cancellation releases acceleration',async()=>{
 const previousWindow=globalThis.window;globalThis.window=new EventTarget();
 const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
 const events=[];const clear=installGestures(canvas,{active:()=>true,gas:v=>events.push(['gas',v]),swipe:d=>events.push(['swipe',d]),tap:()=>events.push(['tap'])});
 const send=(type,x=100,y=100)=>{const event=new Event(type);Object.assign(event,{pointerType:'touch',pointerId:1,clientX:x,clientY:y});canvas.dispatchEvent(event);};
 try{
  send('pointerdown');send('pointermove',40);send('pointerup',40);
  assert.deepEqual(events.filter(e=>e[0]==='swipe'),[['swipe','left']]);assert.equal(events.filter(e=>e[0]==='tap').length,0);
  send('pointerdown');send('pointerup');assert.equal(events.filter(e=>e[0]==='tap').length,1);
  send('pointerdown');await new Promise(resolve=>setTimeout(resolve,270));assert.deepEqual(events.at(-1),['gas',true]);
  send('pointermove',100,30);assert.deepEqual(events.at(-1),['swipe','up']);
  send('pointercancel');assert.deepEqual(events.at(-1),['gas',false]);
  send('pointerdown');clear();await new Promise(resolve=>setTimeout(resolve,270));assert.deepEqual(events.at(-1),['gas',false]);
 }finally{clear();globalThis.window=previousWindow;}
});
