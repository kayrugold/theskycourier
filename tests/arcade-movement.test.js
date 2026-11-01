import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,jumpGravity,advanceSpeed,advanceRoofSpeed,vehicleContact,simulateFrame} from '../src/physics.js';
import {beginJump,stepArcadeActions} from '../src/arcade-movement.js';
import {boosterSites} from '../src/booster-sites.js';
import {activateBooster} from '../src/booster.js';

test('jump clears decks with a readable one-second arc and gentle descent',()=>{
 for(const speed of [58,72,88,130]){
  const p={...newRun(),speed};assert.ok(beginJump(p));let time=0,peak=0,apex=0;
  while(!p.grounded&&time<2){
   const oldVy=p.vy;p.vy-=jumpGravity(p)/120;p.y+=p.vy/120;time+=1/120;
   peak=Math.max(peak,p.y);if(oldVy>0&&p.vy<=0)apex=time;
   if(p.y<=0){p.y=0;p.grounded=true;}
  }
  assert.ok(peak>6.5&&peak<8.5);assert.ok(apex>.5&&apex<.65&&time>1&&time<1.2);assert.ok(time-apex<apex);
 }
});
test('short jump buffering and coyote time forgive a press just before landing or after an edge',()=>{
 const edge={...newRun(),grounded:false,coyoteTime:.08};assert.ok(beginJump(edge));assert.equal(edge.coyoteTime,0);
 const falling={...newRun(),grounded:false,y:.03,vy:-5,jumpBuffer:.12};
 stepArcadeActions(falling,1/120,false);assert.ok(falling.jumpBuffer>0);
 falling.y=0;falling.grounded=true;assert.ok(stepArcadeActions(falling,1/120,false));assert.ok(falling.vy>20);
 assert.equal(beginJump({...newRun(),grounded:false,coyoteTime:0}),false);
});
test('cars, buses and semis accept descending roof landings without shortening ascent',()=>{
 for(const type of ['car','bus','semi']){
  const c={type,x:0,z:0,width:3.1,length:15,height:type==='car'?2.3:type==='bus'?3.5:4.4,y:0};
  const p=newRun();beginJump(p);let boarded=false;
  for(let i=0;i<150;i++){
   const previous=p.y;stepArcadeActions(p,1/120,false);p.vy-=jumpGravity(p)/120;p.y+=p.vy/120;
   const contact=vehicleContact(p,c,previous);assert.notEqual(contact,'hit');
   if(contact==='land'){assert.ok(p.vy<=0);boarded=true;break;}
   if(p.vy>0)assert.equal(contact,'none');
  }
  assert.ok(boarded,type);
  assert.equal(vehicleContact(newRun(),c,0),'hit','running into a bus still collides');
  assert.notEqual(vehicleContact({...p,y:6,vy:20,jumpGrace:.2},c,6),'board','jumping above a vehicle must not snap downward');
 }
});
test('slide carries momentum with friction, lasts through a tap and exits cleanly',()=>{
 const p=newRun();let distance=0;
 for(let i=0;i<60;i++){
  stepArcadeActions(p,1/120,i===0);
  p.speed=advanceSpeed(p.speed,false,false,1/120,{sliding:p.sliding});distance+=p.speed/120;
 }
 assert.ok(p.sliding&&p.ducking);assert.ok(p.speed<72&&p.speed>65);assert.ok(distance>33);
 for(let i=0;i<30;i++)stepArcadeActions(p,1/120,false);
 assert.equal(p.sliding,false);assert.equal(p.ducking,false);
 assert.equal(advanceSpeed(0,false,false,.1,{sliding:true}),0);
});
test('slide stays low until an obstacle clears and Down never cancels a jump',()=>{
 const p=newRun();stepArcadeActions(p,.01,true);
 for(let i=0;i<180;i++)stepArcadeActions(p,1/120,false,false);
 assert.ok(p.ducking);stepArcadeActions(p,1/120,false,true);assert.equal(p.ducking,false);
 beginJump(p);const vy=p.vy;stepArcadeActions(p,1/120,true);assert.equal(p.vy,vy);assert.equal(p.fastFall,false);
 p.grounded=true;p.y=0;p.slideCooldown=0;stepArcadeActions(p,.01,true);assert.ok(p.sliding);
});
test('slide distance and friction agree at low and high display frame rates',()=>{
 const run=fps=>{const p=newRun();stepArcadeActions(p,.001,true);let z=0;
  for(let f=0;f<fps*.5;f++)simulateFrame(1/fps,dt=>{stepArcadeActions(p,dt,true);p.speed=advanceSpeed(p.speed,false,false,dt,{sliding:p.sliding});z+=p.speed*dt;});return z;};
 assert.ok(Math.abs(run(20)-run(60))<.01);
});
test('booster packs cover road and sidewalk routes and can be used during a jump',()=>{
 const sites=boosterSites([],[]);assert.ok(sites.length>50);
 assert.ok(sites.some(p=>p.z===90&&p.x===0));assert.ok(sites.some(p=>p.z===90&&p.x===-10.2));
 for(const branch of [0,1])assert.ok(sites.some(p=>p.z>700&&p.z<1200&&p.choices[0]===branch));
 const p={...newRun(),boosterTanks:1};beginJump(p);assert.ok(activateBooster(p));assert.equal(p.boosterTanks,0);
});
test('roof travel moves forward relative to stopped, slow and fast vehicles',()=>{
 for(const carrier of [0,30,70,105]){
  let speed=carrier+16,relative=0;
  for(let i=0;i<120;i++){
   speed=advanceRoofSpeed(speed,carrier,1/120);
   assert.ok(speed>=carrier+10&&speed<=carrier+16);relative+=(speed-carrier)/120;
  }
  assert.ok(relative>=11.9,'rider was locked to the vehicle');
 }
});
test('jumping from a fast roof preserves forward momentum and starts a fresh flip',()=>{
 const p={...newRun(),speed:110,ride:{speed:98}};
 assert.ok(beginJump(p));assert.ok(p.airFlip&&p.jumpSequence===1&&p.roofCarry>0);
 assert.equal(p.ride,null);
 const speed=advanceSpeed(p.speed,false,false,1/120,{roofCarry:p.roofCarry});
 assert.ok(speed>109&&speed<110,'roof exit abruptly capped forward momentum');
 p.grounded=true;stepArcadeActions(p,.01,false);assert.equal(p.airFlip,false);
 beginJump(p);assert.equal(p.jumpSequence,2);
});
