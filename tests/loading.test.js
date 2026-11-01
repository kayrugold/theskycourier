import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorld} from '../src/loading.js';
function ui(){const elements=new Map();globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,{disabled:true,hidden:true,textContent:'',classList:{add(){}}});return elements.get(id);},querySelector(){return {};},body:{classList:{remove(){}}}};return elements;}
test('entry stays disabled until assets and shader preparation finish, then waits for a click',async()=>{
 const elements=ui();let resolve,entered=false,prepared=false;
 const pending=new Promise(r=>resolve=r);
 const loading=loadWorld([['Assets',pending]],async()=>{prepared=true;},()=>{entered=true;});
 assert.equal(elements.get('enter-world').disabled,true);resolve();await loading;
 assert.equal(prepared,true);assert.equal(entered,false);assert.equal(elements.get('enter-world').disabled,false);
 elements.get('enter-world').onclick();assert.equal(entered,true);delete globalThis.document;
});
test('a failed asset blocks entry and offers retry',async()=>{
 const elements=ui();const log=console.error;console.error=()=>{};
 try{await loadWorld([['Missing asset',Promise.resolve(),()=>false]],async()=>assert.fail('must not prepare'),()=>assert.fail('must not enter'));
 assert.equal(elements.get('enter-world').disabled,true);assert.equal(elements.get('loading-retry').hidden,false);assert.match(elements.get('loading-status').textContent,/Missing asset/);
 }finally{console.error=log;delete globalThis.document;}
});
