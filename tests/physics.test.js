import test from 'node:test';
import assert from 'node:assert/strict';
import {TIME_LIMIT,newRun,canHitch,rampHeight,advanceSpeed,damage,simulateFrame,MAX_SPEED,BRAKE_SPEED,trafficMotion,releaseHitch,vehicleContact} from '../src/physics.js';
import {FORKS,routeOffset,routePose,sameRoute,laneChoice} from '../src/routes.js';
import {JOBS,updateJob} from '../src/jobs.js';
import {armGlider,deployGlider,updateGlider,GLIDE_SECONDS} from '../src/physics.js';
import {GRAVITY,jumpVelocity} from '../src/physics.js';
import {swipeDirection} from '../src/gestures.js';

test('arcade jumps clear six-metre decks with a fast bounded arc',()=>{
 for(const speed of [58,72,88,130,180])assert.ok(2*jumpVelocity(speed)/GRAVITY<1.2);
 assert.ok(jumpVelocity(130)**2/(2*GRAVITY)>6);
 assert.ok(jumpVelocity(72)**2/(2*GRAVITY)>6.5);
 assert.equal(jumpVelocity(180),jumpVelocity(130));
});
test('thumb gestures distinguish tap jitter from directional swipes',()=>{
 assert.equal(swipeDirection(12,16),null);
 assert.equal(swipeDirection(-60,10),'left');assert.equal(swipeDirection(60,10),'right');
 assert.equal(swipeDirection(10,-60),'up');assert.equal(swipeDirection(10,60),'down');
});
test('impacts slow sharply, recoil by direction, and recover without a brake speed jump',()=>{
 for(const direction of ['front','rear']){
  const p=newRun();p.hasGlider=true;p.gliding=true;
  damage(p,12,false,direction);
  assert.ok(p.speed<20);assert.equal(p.gliding,false);
  assert.equal(Math.sign(p.impactVelocity),direction==='front'?-1:1);
  let speed=p.speed;
  for(let i=0;i<60;i++)speed=advanceSpeed(speed,false,false,1/60,{recovery:3,impact:1,accelerate:true});
  assert.ok(speed<25,'impact should not instantly recover');
  for(let i=0;i<120;i++)speed=advanceSpeed(speed,false,false,1/60,{recovery:2,impact:0});
  assert.ok(speed>60&&speed<=72);
  assert.equal(advanceSpeed(20,false,false,.01,{brake:true}),20);
 }
});
test('glider requires a pickup and elevated takeoff, not a speed or hitch gate',()=>{
 const p=newRun();p.y=6;assert.equal(armGlider(p),false);
 p.hasGlider=true;p.y=0;p.speed=130;p.boost=1;assert.equal(armGlider(p),false);
 p.y=6;p.speed=58;p.boost=0;assert.equal(armGlider(p),true);
 assert.equal(deployGlider(p),false);p.grounded=false;p.vy=18;
 assert.equal(deployGlider(p),true);assert.equal(p.vy,4);
 updateGlider(p,1);assert.equal(p.glideRemaining,GLIDE_SECONDS-1);
 assert.equal(deployGlider(p),true);updateGlider(p,1);assert.equal(p.glideRemaining,GLIDE_SECONDS-1);
 assert.equal(deployGlider(p),true);updateGlider(p,2);assert.equal(p.gliding,false);assert.equal(deployGlider(p),false);
 p.grounded=true;updateGlider(p,0);assert.equal(p.flightReady,false);
 armGlider(p);p.grounded=false;damage(p);assert.equal(deployGlider(p),false);
 assert.equal(newRun().hasGlider,false);
});
test('traffic has independent slow, fast, erratic and braking profiles',()=>{
 const cruise=Array.from({length:15},(_,i)=>trafficMotion(i,0));
 assert.equal(cruise.filter(c=>c.aggressive).length,3);
 assert.ok(cruise.some(c=>c.speed<60));assert.ok(cruise.some(c=>c.speed>MAX_SPEED));
 for(let index=0;index<15;index++){
  let braked=false;
  for(let t=0;t<48;t+=.1){const m=trafficMotion(index,t);assert.ok(m.speed>=18&&m.speed<=108);braked ||= m.braking;}
  assert.ok(braked,'driver never brakes');
 }
 assert.ok(trafficMotion(2,4).erratic);
});

test('hitch measures from the rear of long vehicles',()=>{const p=newRun();assert.equal(canHitch(p,{x:0,z:60,length:15}),true);assert.equal(canHitch(p,{x:0,z:4,length:15}),false);p.y=4;assert.equal(canHitch(p,{x:0,z:20,length:15}),false);});
test('normal gas passes slower traffic while fast drivers can overtake the rider',()=>{
 let speed=72;for(let i=0;i<120;i++)speed=advanceSpeed(speed,false,false,1/60,{accelerate:true});
 assert.ok(speed<=MAX_SPEED&&speed>87);assert.equal(BRAKE_SPEED,58);
 assert.ok(trafficMotion(0,0).speed<speed);assert.ok(trafficMotion(3,0).speed>speed);
 assert.equal(advanceSpeed(72,false,false,1,{brake:true}),58);
});

test('only a charged, non-braking hitch release grants temporary overspeed',()=>{const p=newRun();p.hitch={speed:110,braking:false};p.charge=1;assert.equal(releaseHitch(p),true);assert.ok(p.speed>110);assert.equal(p.hitch,null);assert.equal(p.boost,1.6);assert.ok(advanceSpeed(p.speed,false,false,.01,{boost:1.6,launchSpeed:p.launchSpeed})>110);assert.ok(advanceSpeed(p.speed,false,false,.01,{boost:0})<=MAX_SPEED);p.hitch={speed:94,braking:true};p.boost=0;p.charge=1;assert.equal(releaseHitch(p),false);});
test('vehicle roofs require descent from above; side impacts and rising jumps hit',()=>{const car={x:0,z:10,width:3.1,length:10,height:3.5,type:'bus'};const p={x:0,z:10,y:3.45,grounded:false,vy:-3};assert.equal(vehicleContact(p,car,3.6),'land');assert.equal(vehicleContact({...p,y:1,vy:5},car,.9),'hit');assert.equal(vehicleContact({...p,y:3.45,vy:5},car,3.3),'none');assert.equal(vehicleContact({...p,x:6},car,3.6),'none');});
test('distinct traffic impacts bypass grace; persistent obstacle contact does not',()=>{const p=newRun();assert.equal(damage(p),true);assert.equal(damage(p),false);assert.equal(damage(p,16,true),true);assert.equal(p.condition,72);});
test('15 and 60 FPS produce equal travel and timer values',()=>{function run(fps){const p=newRun();for(let i=0;i<fps*4;i++)simulateFrame(1/fps,dt=>{p.speed=advanceSpeed(p.speed,false,false,dt,{accelerate:true});p.z+=p.speed*dt;p.time-=dt;});return p;}const a=run(15),b=run(60);assert.ok(Math.abs(a.z-b.z)<1e-8);assert.ok(Math.abs(a.time-(TIME_LIMIT-4))<1e-8);});
test('ramps meet roof height continuously',()=>{assert.equal(rampHeight(100,100),0);assert.equal(rampHeight(117.5,100),3);assert.equal(rampHeight(135,100),6);});
test('two and four-way branches separate, then smoothly rejoin',()=>{assert.deepEqual(FORKS.map(f=>f.offsets.length),[2,4,2]);for(const f of FORKS)for(let i=0;i<f.offsets.length;i++){assert.equal(routeOffset(f.start,i),0);assert.equal(routeOffset(f.end,i),0);assert.equal(routeOffset((f.start+f.end)/2,i),f.offsets[i]);assert.ok(Math.abs(routePose(f.start,{[f.id]:i}).yaw)<.00001);assert.ok(Math.abs(routePose(f.end,{[f.id]:i}).yaw)<.00001);}assert.equal(laneChoice(11,4),0);assert.equal(laneChoice(-11,4),3);assert.equal(sameRoute(3000,{1:1},{1:2}),false);});
test('handoffs require the sidewalk, correct branch, and pickup before drop',()=>{const p=newRun(),j=JOBS[0];p.z=j.pickup.z;p.x=0;assert.equal(updateJob(p),null);p.x=j.pickup.x;assert.equal(updateJob(p),'pickup');p.z=j.drop.z;p.x=j.drop.x;assert.equal(updateJob(p),'delivery');assert.equal(p.completed,1);p.jobIndex=3;p.jobVariant=2;p.carrying=true;p.z=3260;p.x=JOBS[3].variants[2].drop.x;p.choices={1:0};assert.equal(updateJob(p),null);p.choices={1:2};assert.equal(updateJob(p),'delivery');assert.equal(p.completed,2);});
test('missed handoffs advance jobs without granting delivery credit',()=>{const p=newRun();p.z=JOBS[0].pickup.z+25;assert.equal(updateJob(p),'missed');assert.equal(p.completed,0);assert.equal(p.jobIndex,1);});

