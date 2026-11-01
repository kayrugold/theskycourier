import test from 'node:test';
import assert from 'node:assert/strict';
import {newThieves,stepThief} from '../src/thieves.js';

test('thief commits to one target and stops instead of chasing',()=>{
 const thief=newThieves()[0],p={x:2,z:280,y:0,speed:72,choices:{}};
 assert.equal(stepThief(thief,p,.01),'warning');
 p.x=-8;
 for(let i=0;i<240;i++)stepThief(thief,p,1/120);
 assert.equal(thief.targetX,2);assert.equal(thief.x,2);assert.equal(thief.z,330);assert.equal(thief.phase,'spent');
 assert.equal(stepThief(thief,{...p,z:329},1),null);
});
test('tackle can be dodged or jumped and hits only once',()=>{
 const prepare=()=>Object.assign(newThieves()[0],{phase:'dive',time:.3,targetX:0,x:0});
 const p={x:0,z:330,y:0,speed:72,choices:{}};
 assert.equal(stepThief(prepare(),{...p,y:2},.01),null);
 assert.equal(stepThief(prepare(),{...p,x:-5},.01),null);
 const thief=prepare();assert.equal(stepThief(thief,p,.01),'caught');assert.equal(stepThief(thief,p,.01),null);
});

test('thieves can intercept a rider holding either sidewalk edge at varied speeds',()=>{
 for(const edge of [9.8,10.4,11.5])for(const side of [-1,1])for(const speed of [24,58,72,88,118]){
  const thief=newThieves().find(t=>Math.sign(t.homeX)===side&&!t.choices[0]);
  const p={x:side*edge,z:thief.z-85,y:0,speed,choices:thief.choices};
  let caught=0;
  for(let i=0;i<1200&&p.z<thief.z+8;i++){
   p.z+=speed/120;if(stepThief(thief,p,1/120)==='caught')caught++;
  }
  assert.equal(caught,1,JSON.stringify({edge,side,speed,target:thief.targetX,phase:thief.phase}));
 }
});
