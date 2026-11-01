import {jumpGravity,jumpVelocity} from '../src/physics.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newBirds,stepBird,predictBirdTarget,BIRD_WARNING,BIRD_DIVE} from '../src/birds.js';
import {routePose} from '../src/routes.js';
const player=()=>({x:0,z:180,y:0,vy:0,speed:72,grounded:true,choices:{}});
function move(p,dt){p.z+=p.speed*dt/routePose(p.z,p.choices).pace;if(!p.grounded){p.vy-=(p.gliding?9:jumpGravity(p))*dt;if(p.gliding)p.vy=Math.max(-6,p.vy);p.y+=p.vy*dt;if(p.y<=0){p.y=0;p.vy=0;p.grounded=true;p.gliding=false;}}}
test('bird tracks the wind-up, then commits to a dodgeable dive and leaves',()=>{
 const b=newBirds(()=>.5)[0],p=player();assert.equal(stepBird(b,p,.01),'warning');p.x=3;
 while(b.phase==='warning'){move(p,1/120);stepBird(b,p,1/120);}
 assert.equal(b.targetX,3);while(b.time<.33){move(p,1/120);stepBird(b,p,1/120);}const target=[b.targetX,b.targetY,b.targetZ];p.x=-8;
 for(let i=0;i<240;i++){move(p,1/120);stepBird(b,p,1/120);}
 assert.deepEqual([b.targetX,b.targetY,b.targetZ],target);assert.equal(b.phase,'spent');assert.equal(b.hit,false);
});
test('birds intercept actual ground movement and descending gliders on straight and curved roads',()=>{
 for(const curved of [false,true])for(const air of [false,true])for(const speed of [58,72,88]){
  const b=newBirds(()=>.5).find(b=>b.homeZ===(curved?650:260)&&(!curved||b.choices[0]===0));
  const p={...player(),z:b.homeZ-70,speed,choices:b.choices,y:air?12:0,vy:air?4:0,grounded:!air,gliding:air,glideRemaining:2.5};
  assert.equal(stepBird(b,p,.001),'warning');let hits=0;
  for(let i=0;i<240;i++){move(p,1/120);if(stepBird(b,p,1/120)==='hit')hits++;}
  assert.equal(hits,1,`curved=${curved} air=${air} speed=${speed}`);
 }
});
test('late steering, a ground jump, or ducking still avoids the committed strike',()=>{
 for(const dodge of ['steer','jump','duck']){
  const b=newBirds(()=>.5)[0],p=player();stepBird(b,p,.001);let hits=0,jumped=false;
  for(let i=0;i<240;i++){
   if(b.phase==='dive'&&b.time>=.33){if(dodge==='steer')p.x=Math.min(5,p.x+23/120);if(dodge==='duck')p.ducking=true;if(dodge==='jump'&&!jumped){p.grounded=false;p.vy=jumpVelocity(p.speed);jumped=true;}}
   move(p,1/120);if(stepBird(b,p,1/120)==='hit')hits++;
  }
  assert.equal(hits,0,dodge);
 }
});
test('birds respect routes, protected handoffs, and the global attack gate',()=>{
 const b=newBirds(()=>.5).find(b=>b.homeZ===650&&b.choices[0]===0),p={...player(),z:580,choices:{0:1}};
 assert.equal(stepBird(b,p,.1),null);p.choices[0]=0;
 assert.equal(stepBird(b,p,.1,false),null);p.handoff=.5;assert.equal(stepBird(b,p,.1),null);
 p.handoff=0;assert.equal(stepBird(b,p,.1),'warning');p.caught=1;stepBird(b,p,.1);assert.equal(b.phase,'spent');
 assert.ok(BIRD_WARNING+BIRD_DIVE>=1);
});




