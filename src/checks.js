import * as THREE from 'three';
import {BIRD_SITES,BIRD_DIVE} from './birds.js';
import {worldPoint,coursePoint,routeOptions,forkAt} from './routes.js';
import {trafficMotion,newRun} from './physics.js';
// Development-only integration checks drive the same update loop as normal play.
export async function runChecks(api) {
 window.courierChecks=api;
 const results=[];
 const check=(name,fn)=>{try{fn();results.push('PASS · '+name);}catch(error){results.push('FAIL · '+name+' · '+error.message);}};
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 check('Coin chimes climb across pickups and restart after a missed coin',()=>{
  const coins=api.pickups.filter(p=>!p.kind&&p.z<100&&p.y<2).sort((a,b)=>a.z-b.z).slice(0,4);
  assert(coins.length===4,'coin sequence missing');
  const saved=coins.map(p=>p.collected),play=api.sound.playCoin,heard=[];
  api.sound.playCoin=streak=>heard.push(streak);
  try{
   coins.forEach(p=>p.collected=false);api.reset({});
   const collect=p=>{Object.assign(api.state(),{x:p.x,z:p.z,y:0,grounded:true});api.step(.001);};
   collect(coins[0]);collect(coins[1]);
   Object.assign(api.state(),{x:11,z:coins[2].z+1.6,y:0,grounded:true});api.step(.01);
   assert(api.state().coinStreak===0,'miss did not reset the chain');
   collect(coins[3]);assert(heard.join(',')==='1,2,1','unexpected coin chimes: '+heard);
  }finally{api.sound.playCoin=play;coins.forEach((p,i)=>p.collected=saved[i]);api.reset({});}
 });
 check('NPC pickup and delivery through the live update loop',()=>{
  api.reset({x:-10.2,z:209});api.step(.01);assert(api.state().carrying,'pickup not collected');
  Object.assign(api.state(),{x:10.2,z:389,handoff:0});api.step(.01);assert(api.state().completed===1,'handoff not completed');
 });
 check('Powered jump reaches a rooftop; ordinary jump returns within 90 metres',()=>{
  api.reset({speed:130,boost:1.6,launchSpeed:130});api.jump();for(let i=0;i<65;i++)api.step(1/120);assert(api.state().y>6,'powered jump too low');
  api.reset({speed:88});api.jump();for(let i=0;i<150;i++)api.step(1/120);assert(api.state().grounded&&api.state().z<100,'ordinary jump too long');
 });
 check('A normal jump clears the deck with a readable one-second arc',()=>{
  api.reset({x:0,z:0,speed:72});api.jump();let peak=0,airtime=0;
  for(let i=0;i<150;i++){api.step(1/120);peak=Math.max(peak,api.state().y);if(!api.state().grounded)airtime+=1/120;}
  assert(peak>6.5&&airtime>1&&airtime<1.2,'jump height or airtime outside the tuning target: '+peak+', '+airtime);
 });
 check('Descending jumps can land on cars, buses and semis without damage',()=>{
  for(const index of [4,1,6]){
   api.birdArt.reset();
   const c=api.cars[index];api.reset({x:c.homeX,z:index===4?148:130-c.length/2-1,speed:72});
   if(index===6){api.time(2);c.speed=trafficMotion(index,2).speed;c.profileBraking=false;}
   Object.assign(c,{x:c.homeX,z:130,y:0,slope:0,choices:{}});api.jump();
   for(let i=0;i<150&&!api.state().ride;i++)api.step(1/120);
   assert(api.state().ride===c&&api.state().condition===100,'ground jump failed to board '+c.type+' '+JSON.stringify({player:{x:api.state().x,z:api.state().z,y:api.state().y,vy:api.state().vy,condition:api.state().condition,ride:api.state().ride?.index},car:{x:c.x,z:c.z,y:c.y,speed:c.speed,blocked:c.blockedBy}}));
  }
 });
 check('Landing on a stopped bus keeps most speed and rolls naturally off the front',()=>{
  const bin=api.obstacles.find(o=>o.type==='bin');
  api.reset({x:bin.x,z:bin.z-10,y:3.52,vy:-5,grounded:false,speed:88});const bus=api.cars[1],home=bus.homeX;
  Object.assign(bus,{x:bin.x,homeX:bin.x,z:bin.z-1.2-bus.length/2-1,speed:0,y:0,slope:0,choices:{}});
  const start=api.state().z;let exited=false;
  try{
   api.step(1/120);assert(api.state().ride===bus&&api.state().speed>82,'landing removed too much momentum');
   for(let i=0;i<55;i++){api.step(1/120);exited ||= !api.state().ride;}
   assert(bus.speed<.1,'test bus did not stay stopped at its obstacle');
   assert(api.state().speed>72&&api.state().z>start+30&&exited&&api.state().condition===100,'roof roll lost momentum or got stuck');
  }finally{bus.homeX=home;}
 });
 check('Down during a clear-road jump never snaps the rider back to the ground',()=>{
  api.reset({x:0,z:20,speed:72});api.jump();for(let i=0;i<12;i++)api.step(1/120);
  const vy=api.state().vy,y=api.state().y;api.controls.brake=true;api.step(1/120);
  assert(api.state().vy>0&&api.state().vy>vy-1&&api.state().y>y&&!api.state().grounded,'Down cancelled the jump');
  api.controls.brake=false;
 });
 check('A lane-changing semi carries its roof rider sideways',()=>{
  api.reset({x:-5.7,z:1000,y:4.4,speed:96,choices:{0:0}});api.time(3.98);
  const c=api.cars[2];Object.assign(c,{x:-5.7,z:1000,y:0,slope:0,choices:{0:0}});api.state().ride=c;
  const start=c.x;for(let i=0;i<18;i++)api.step(1/120);
  assert(Math.abs(c.x-start)>.2&&api.state().ride===c&&Math.abs(api.state().x-c.x)<.05,'lane change dropped rider off roof');
 });
 check('Crossing the semi trailer-to-cab step falls smoothly instead of snapping down',()=>{
  api.reset({x:0,z:152.7,y:4.4,speed:77});const c=api.cars[6];Object.assign(c,{x:0,z:150,y:0,slope:0,choices:{},speed:65});api.state().ride=c;
  for(let i=0;i<5;i++)api.step(1/120);
  assert(api.state().y>4.2&&api.state().y<4.4&&!api.state().grounded&&api.state().condition===100,'cab height step snapped the rider down');
 });
 check('A tapped slide carries momentum and recovers after its minimum duration',()=>{
  api.reset({x:0,z:20,speed:88});api.controls.duck=true;api.step(1/120);api.controls.duck=false;
  for(let i=0;i<45;i++)api.step(1/120);
  assert(api.state().sliding&&api.state().ducking&&api.state().speed>82&&api.state().speed<88,'slide did not carry momentum with friction');
  for(let i=0;i<45;i++)api.step(1/120);
  assert(!api.state().sliding&&!api.state().ducking,'slide did not recover');
 });
 check('Visible booster packs can be collected and spent for a short NOS burst',()=>{
  const pack=api.pickups.find(p=>p.kind==='booster'&&p.z===90&&p.x===0);assert(pack?.bottles&&pack.sign,'recognizable booster pack missing');
  pack.collected=false;api.reset({x:pack.x,z:pack.z-.5});api.step(.01);
  assert(api.state().boosterTanks===1&&pack.collected,'booster pickup failed');
  api.state().z=150;api.boostBoard();for(let i=0;i<30;i++)api.step(1/120);
  assert(api.state().boosterTanks===0&&api.state().tankBoost>0&&api.state().speed>110,'NOS burst failed');
 });
 check('Both white divider lines encounter visible ground hazards',()=>{
  for(const x of [-3.2,3.2]){
   const hazards=api.obstacles.filter(o=>Math.abs(o.x-x)<1);
   assert(hazards.length>=20,'divider has no obstacle coverage');
   const o=hazards[2];o.hit=false;api.reset({x,z:o.z-.5});api.step(1/120);
   assert(api.state().condition<100,'rider passed through divider obstacle');
  }
 });
 check('Glider pickup, elevated takeoff, deployment and reset work in the game',()=>{
  api.reset({z:114});api.step(.01);assert(api.state().hasGlider,'wing not collected');
  api.jump();api.jump();assert(!api.state().gliding,'ordinary jump incorrectly enabled flight');
  api.reset({hasGlider:true,y:6,speed:58});api.jump();api.jump();assert(api.state().gliding,'elevated jump did not enable flight');
  api.reset({});assert(!api.state().hasGlider,'pickup leaked into a new run');
 });
 check('Rear and front vehicle impacts use different recoil and significant slowdown',()=>{
  for(const direction of ['front','rear']){
   api.reset({z:1000,x:0,choices:{0:0}});api.cars[0].z=direction==='rear'?999:1001;
   api.step(1/120);assert(api.state().impactDirection===direction,'wrong impact direction');
   assert(api.state().speed<25,'impact did not slow the rider');
  }
 });
 check('Continuous ramp stays rideable; jumping or exiting enables gliding',()=>{
  const r=api.roof;api.reset({x:r.x,z:r.start,hasGlider:true,choices:r.choices});
  for(let i=0;i<85;i++)api.step(1/120);
  assert(api.state().grounded&&Math.abs(api.state().y-r.height)<.01,'continuous ramp launched or lost its deck');
  api.jump();api.jump();assert(api.state().gliding,'roof jump did not deploy');
  const y=api.state().y;api.step(.02);assert(!api.state().grounded&&api.state().y>y,'glider snapped to roof');
  api.reset({x:r.x,z:r.end-.1,y:r.height,hasGlider:true,choices:r.choices});
  for(let i=0;i<75;i++)api.step(1/120);
  assert(api.state().grounded&&api.state().y===0,'down ramp did not return rider smoothly to the street');
 });
 check('Traffic uses the raised road and returns to street level',()=>{
  const r=api.roof;api.reset({x:10.8,z:r.start+60,choices:r.choices,time:999});
  const c=api.cars[0];Object.assign(c,{x:r.x,homeX:r.x,z:r.start-12,choices:r.choices,y:0});
  let up=false,deck=false,down=false;
  for(let i=0;i<480;i++){
   api.step(1/120);
   up ||= c.pitch<-.1;deck ||= c.y>=r.height-.01;down ||= c.pitch>.1;
   if(c.z>r.end+45)break;
  }
  assert(up&&deck&&down&&Math.abs(c.y)<.01,'traffic did not complete up/deck/down route');
  c.homeX=0;
 });
 check('Launch ramp enables the collected glider at ordinary speed',()=>{
  const r=api.roofs.find(r=>r.isTrainRamp);api.reset({x:r.x,z:r.start,hasGlider:true,choices:r.choices});
  for(let i=0;i<65;i++)api.step(1/120);
  assert(!api.state().grounded&&api.state().flightReady,'launch ramp did not arm glider');api.jump();assert(api.state().gliding,'launch ramp glider did not open');
 });
 check('Raised construction barrier hits standing riders but clears ducking riders',()=>{
  const b=api.obstacles.find(o=>o.type==='barrier');
  for(const duck of [false,true]){
   b.hit=false;api.reset({x:b.x,z:b.z-.5});api.controls.duck=duck;api.step(.01);
   assert(api.state().condition===(duck?100:90),'incorrect barrier duck collision');
  }
  api.controls.duck=false;
 });
 check('Descending rider lands on an actual roof',()=>{api.reset({x:api.roof.x,z:api.roof.start+70,y:6.01,vy:-2,grounded:false});api.step(.02);assert(api.state().grounded&&api.state().y===6,'roof landing failed');});
 check('Descending rider can land on a moving bus at street and deck height',()=>{
  for(const choice of [0,1]){
   const y=choice===1?9.52:3.52;
   api.reset({x:5.7,z:1000,y,vy:-5,grounded:false,choices:{0:choice}});
   const bus=api.cars[1];bus.z=1000;bus.choices={0:choice};api.step(1/120);
   assert(api.state().ride===bus,'bus landing failed at height '+y);
  }
 });
 check('Descending rider can land on a semi trailer',()=>{api.reset({x:-5.7,z:995,y:4.42,vy:-5,grounded:false,choices:{0:0}});const truck=api.cars[2];truck.z=1000;api.step(1/120);assert(api.state().ride===truck,'trailer landing failed');});
 check('Ordinary bus braking keeps its rider aboard without damage',()=>{api.reset({x:5.7,z:1000,y:3.5,invulnerable:1});const bus=api.cars[1];bus.z=1000;api.state().ride=bus;api.time(14.899);api.step(1/120);assert(bus.braking&&api.state().condition===100&&api.state().ride===bus,'ordinary braking punished rider');});
 check('Only an angry driver brake-checks a hitched rider',()=>{api.reset({x:0,z:1000,invulnerable:1,choices:{0:0}});const car=api.cars[3];car.z=1020;car.choices={0:0};api.state().hitch=car;api.time(8.699);api.step(1/120);assert(car.braking&&api.state().condition===84&&!api.state().hitch,'angry braking did not release hitch');});
 check('A vehicle collision is not suppressed by obstacle grace',()=>{api.reset({x:0,z:1000,invulnerable:1,choices:{0:0}});api.cars[0].z=1000;api.step(1/120);assert(api.state().condition===90,'collision was suppressed');});
 check('Rider can split two ordinary cars in the live game',()=>{api.reset({x:2.85,z:1000,choices:{0:0}});for(const [index,x]of [[0,0],[4,5.7]]){Object.assign(api.cars[index],{x,z:1000,choices:{0:0}});}api.step(1/120);assert(api.state().condition===100&&!api.state().impact,'lane splitting caused collision');});
 check('Traffic keeps its own speed while the rider slows or recovers',()=>{
  for(const speed of [0,24,58,88]){
   api.reset({x:0,z:100,speed,impact:1,recovery:3});
   const car=api.cars[0];car.x=0;car.z=80;car.choices={};
   api.step(1/120);
   assert(Math.abs(car.speed-trafficMotion(car.index,1/120).speed)<.001,'vehicle speed follows the rider');
  }
 });
 check('Obstacle colliders exist only at visible road-branch placements',()=>{
  const bodies=new Set([...api.solidWorld.buckets.values()].flat());let checked=0;
  for(const body of bodies){
   const o=body.obstacle;if(!o)continue;
   const fork=forkAt(o.z);
   const visible=routeOptions(o.z).map(branch=>worldPoint(o.x,o.z,fork?{[fork.id]:branch}:{}));
   const distance=Math.min(...visible.map(p=>Math.hypot(p.x-body.x,p.z-body.z)));
   assert(distance<4,'ghost collider for '+o.type+' at course '+o.z+' (offset '+distance+')');checked++;
  }
  assert(checked>100,'obstacle collider audit did not inspect the full course');
 });
 check('Bridge posts and sidewalk planters physically stop the rider',()=>{
  assert(api.solidWorld.count>100,'world solids were not registered');
  for(const [x,z,limit] of [[9.2,187.5,188.65],[10.15,302.5,303.55]]){
   api.reset({x,z,speed:88});api.step(.03);
   assert(api.state().condition===90&&api.state().z<limit,'scenery was passable at '+x+','+z);
  }
 });
 check('Bins remain solid after impact instead of allowing a drive-through',()=>{
  const bin=api.obstacles.find(o=>o.type==='bin');
  api.reset({x:bin.x,z:bin.z-3,speed:88});bin.hit=false;api.step(.04);
  assert(api.state().condition===90&&api.state().z<bin.z-1.45,'bin failed to block the rider');
 });
 check('Passing through clear space beside a bin causes no invisible impact',()=>{
  const bin=api.obstacles.find(o=>o.type==='bin');
  api.reset({x:bin.x+1.8,z:bin.z-3,speed:88});bin.hit=false;
  for(let i=0;i<10;i++)api.step(1/120);
  assert(api.state().condition===100&&api.state().z>bin.z+3,'old proximity hitbox reached into the clear gap');
 });
 check('Railway bridge has an open train-sized underpass and a continuous rideable deck',()=>{
  const r=api.roofs.find(r=>r.railBridges?.length);assert(r,'railway bridge is missing');
  const gap=r.railBridges[0];
  const trainHit=api.solidWorld.sweep({x:r.x-r.width,z:gap.z,y:0},{x:r.x+r.width,z:gap.z,y:0},gap.height);
  assert(!trainHit,'train envelope intersects '+trainHit?.body.name);
  const wallHit=api.solidWorld.sweep({x:r.x-r.width,z:gap.start-3,y:0},{x:r.x,z:gap.start-3,y:0},gap.height);
  assert(wallHit,'abutments outside the railway opening lost collision');
  api.reset({x:r.x,z:gap.start-2,y:r.height,choices:r.choices});
  for(let i=0;i<35;i++)api.step(1/120);
  assert(api.state().z>gap.end&&api.state().condition===100&&api.state().grounded&&Math.abs(api.state().y-r.height)<.01,'bridge deck has a gap or obstruction');
 });
 check('Cars stop and queue for the moving tram, then resume after it clears',()=>{
  api.reset({x:10.5,z:330,speed:0,handoff:10,jobIndex:99,time:999});api.time(2);
  const c=api.cars[0],bus=api.cars[1],home=c.homeX;
  Object.assign(c,{x:5.7,homeX:5.7,z:380,speed:30,choices:{},y:0,slope:0});
  Object.assign(bus,{x:5.7,z:350,speed:30,choices:{},y:0,slope:0});
  let stopped=false;
  try{
   for(let i=0;i<600;i++){
    api.step(1/120);
    if(i<300){assert(c.z+c.length/2<405.3,'car entered an active train crossing');stopped ||= c.speed<.1;}
    assert(c.z-bus.z>(c.length+bus.length)/2+6.9,'queued bus overlapped the car');
   }
   assert(stopped&&c.z>420&&bus.z>410&&c.speed>10,'traffic did not stop and restart');
  }finally{c.homeX=home;}
 });
 await api.worldArt.ready;
 check('Vehicles knock movable roadwork aside with no leftover collision',()=>{
  for(const type of ['cone','barrier']){
   const source=api.obstacles.find(o=>o.type===type),instance=source.instances[0];
   api.reset({x:-10.5,z:source.z-50,speed:0,handoff:5,jobIndex:99,time:999,choices:instance.choices});
   const c=api.cars[0],home=c.homeX;
   Object.assign(c,{x:source.x,homeX:source.x,z:source.z-8,speed:60,choices:instance.choices,y:0,slope:0});
   try{
    for(let i=0;i<50;i++)api.step(1/120);
    assert(instance.knocked&&instance.mesh.rotation.x>.1&&c.z>source.z,'car failed to knock over '+type+' '+JSON.stringify({x:c.x,z:c.z,speed:c.speed,blocked:c.blockedBy,knocked:instance.knocked,rotation:instance.mesh.rotation.x,sourceZ:source.z}));
    const p=worldPoint(source.x,source.z,instance.choices);
    const hit=api.solidWorld.sweep({...p,z:p.z-1,y:0},{...p,z:p.z+1,y:0},1.4);
    assert(!hit||hit.body.obstacleInstance!==instance,'knocked roadwork left an invisible hitbox');
   }finally{c.homeX=home;}
  }
 });
 check('Players topple road barriers, trip over settled debris, and can jump clear',()=>{
  const source=api.obstacles.find(o=>o.type==='barrier'),i=source.instances[0];api.birdArt.reset();
  api.reset({x:source.x,z:source.z-.5,choices:i.choices,jobIndex:99,time:999});api.step(.01);
  assert(i.knocked&&api.state().condition===90,'player did not topple the upright barrier');
  api.movableObstacles.step(1.15);assert(i.fallenBody&&i.fallenBody.top<1,'fallen collision does not match a low barrier');
  const p=coursePoint(i.fallenBody,i.choices);
  Object.assign(api.state(),newRun(),{x:p.x,z:p.z-3,choices:i.choices,jobIndex:99,time:999});api.movableObstacles.contacts.clear();api.birdArt.reset();
  for(let n=0;n<20;n++)api.step(1/120);
  assert(api.state().tripping>0&&api.state().condition===94,'fallen barrier did not trip rider once');
  for(let n=0;n<80;n++)api.step(1/120);
  assert(api.state().tripping===0&&api.state().condition===94,'trip failed to recover or repeated damage');
  Object.assign(api.state(),newRun(),{x:p.x,z:p.z-5,choices:i.choices,jobIndex:99,time:999});api.movableObstacles.contacts.clear();api.birdArt.reset();api.jump();
  for(let n=0;n<20;n++)api.step(1/120);
  assert(api.state().condition===100&&!api.state().tripping,'jump did not clear fallen roadwork');
 });
 check('Vehicles stop before a trash can instead of driving through it',()=>{
  const bin=api.obstacles.find(o=>o.type==='bin');
  api.reset({x:10.5,z:bin.z-40,speed:0,handoff:10,jobIndex:99,time:999});
  const c=api.cars[0],home=c.homeX;Object.assign(c,{x:bin.x,homeX:bin.x,z:bin.z-20,speed:60,y:0,slope:0,choices:{}});
  try{
   for(let i=0;i<240;i++)api.step(1/120);
   assert(c.z+c.length/2<bin.z-1.2&&c.speed<.1,'vehicle drove through trash can');
  }finally{c.homeX=home;}
 });
 check('Charged E-release activates the slingshot',()=>{api.reset({charge:1.5});api.state().hitch=api.cars[0];api.cars[0].speed=110;api.hitch();assert(api.state().boost>0&&api.state().speed>110,'slingshot failed');});
 check('A fork choice stays locked after entering the split',()=>{api.reset({z:400});api.choose(0);assert(api.state().choices[0]===0,'route selection failed');api.state().z=600;api.choose(1);assert(api.state().choices[0]===0,'route changed after split');});
 api.finish();
 await api.alex.ready;
 await api.birdArt.ready;
 check('Birds load animated on all routes and attacks respect the cooldown',()=>{
  assert(api.birdArt.errors.length===0&&api.birdArt.actors.length===BIRD_SITES.length,'bird models missing');
  const p={x:0,z:190,y:0,speed:72,choices:{},grounded:true};
  api.birdArt.reset();let warnings=0;api.birdArt.step(.01,p,event=>{if(event==='warning')warnings++;});
  assert(warnings===1&&api.birdArt.birds[0].phase==='warning','bird attack failed to start');
  api.birdArt.draw(.1,190,'playing');assert(api.birdArt.actors[0].group.visible&&api.birdArt.actors[0].marker.visible,'bird or warning target invisible');
  assert(api.birdArt.actors[0].mixer._actions.length>0,'bird flap missing');
  api.birdArt.reset();
 });
 check('A natural bird attack intercepts a moving rider and a descending glider',()=>{
  for(const air of [false,true]){
   api.birdArt.reset();api.reset({x:4,z:190,y:air?8:0,vy:air?4:0,grounded:!air,gliding:air,hasGlider:air,flightReady:air,glideRemaining:2.5});
   for(let i=0;i<180&&!api.birdArt.birds[0].hit;i++)api.step(1/120);
   assert(api.birdArt.birds[0].hit,'natural '+(air?'aerial':'ground')+' attack missed');
   assert(api.state().condition===92,'natural bird strike did not damage rider');
  }
  api.birdArt.reset();api.finish();
 });
 check('Bird contact damages ground and airborne riders once; ducking avoids it',()=>{
  for(const [height,duck] of [[0,false],[8,false],[0,true]]){
   api.birdArt.reset();api.reset({x:0,z:100,y:height,grounded:height===0});api.controls.duck=duck;
   const b=api.birdArt.birds[0];Object.assign(b,{phase:'dive',time:BIRD_DIVE-.01,startX:0,targetX:0,startZ:100,targetZ:100,startY:height+1.3,targetY:height+1.3});
   api.step(.01);assert(api.state().condition===(duck?100:92),'bird damage or duck evasion failed');
   api.step(.01);assert(api.state().condition===(duck?100:92),'bird hit twice');
  }
  api.controls.duck=false;api.birdArt.reset();api.finish();
 });
 await api.flightArt.ready;
 check('Textured ramps follow the collision slope and meet the procedural road',()=>{
  assert(api.flightArt.errors.length===0&&api.flightArt.ramps.length===api.roofs.reduce((n,r)=>n+(r.isTrainRamp?1:2),0),'ramp art missing');
  for(const {model,roof,descending} of api.flightArt.ramps){
   model.updateMatrixWorld(true);const length=roof.isTrainRamp?38:35;
   for(const u of [.1,.5,.95,.999]){
    const z=descending?roof.end+(1-u)*length:roof.start+u*length;
    const p=worldPoint(roof.x,z,roof.choices);
    const ray=new THREE.Raycaster(new THREE.Vector3(p.x,20,p.z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(model,true)[0];
    assert(hit&&Math.abs(hit.point.y-u*roof.height)<.2,'ramp '+roof.start+' at '+u+': visual '+hit?.point.y+' / collision '+u*roof.height);
   }
  }
  assert(api.flightArt.glider,'glider model missing');
 });
 check('Alex reaches both glider controls with the flying pose',()=>{
  api.alex.reset();api.alex.update(.3,{gliding:true,grounded:false,z:0},'playing',false);
  api.alex.group.updateWorldMatrix(true,true);
  for(const [side,x] of [['Left',.48],['Right',-.48]]){
   const hand=api.alex.model.getObjectByName(`mixamorig${side}Hand`).getWorldPosition(new THREE.Vector3());
   const local=api.alex.group.worldToLocal(hand);
   assert(local.distanceTo(new THREE.Vector3(x,1.66,.85))<.1,'hand misses control bar');
  }
  api.alex.reset();
 });
 await api.worldArt.ready;
 await api.skateboard.ready;
 await api.deliveryArt.ready;
 await api.environmentArt.ready;
 check('All 22 delivery NPCs load and sequence handoff into cheering',()=>{
  assert(api.deliveryArt.actors.length===22,'delivery NPCs missing');
  for(const actor of api.deliveryArt.actors){
   for(const clip of ['idle','wave','cheer',actor.npc.kind==='pickup'?'give':'take'])assert(actor.actions.has(clip),'missing NPC animation');
   assert(!actor.npc.fallback.visible,'placeholder NPC still visible');
  }
  api.reset({x:-10.2,z:209});api.step(.01);
  assert(api.state().handoff>0&&api.state().carrying,'animated pickup did not start');
  const actor=api.deliveryArt.actors.find(a=>a.npc.jobIndex===0&&a.npc.kind==='pickup');
  assert(actor.transfer>0,'NPC transfer not triggered');
  actor.npc.group.visible=true;api.deliveryArt.update(1.61,'playing');api.deliveryArt.update(.01,'playing');
  assert(actor.current===actor.actions.get('cheer'),'NPC did not cheer');
  api.deliveryArt.reset();api.finish();
 });
 check('Trees and streetlights damage and block the rider in the live loop',()=>{
  for(const id of ['tree0','streetlight0']){
   const site=api.environmentArt.sites.find(s=>s.id===id&&s.z>100&&s.z<430&&s.x>0);
   api.environmentArt.contacts.clear();api.reset({x:Math.min(11.5,site.x),z:site.z-.5,speed:72});api.step(.01);
   assert(api.state().condition===90,'scenery collision did not damage rider');
   assert(api.state().x<site.x-site.radius,'rider was not blocked');
  }
  api.environmentArt.contacts.clear();api.finish();
 });
 await api.thiefArt.ready;
 const stampArt=await api.stampReady;
 check('Revamped stamp loads textured geometry',()=>{assert(stampArt?.material.map.image.width===1024,'stamp art missing');});
 check('Thief tackle catches once, releases the hitch, and allows recovery',()=>{
  assert(api.thiefArt.actors.length===10,'thieves missing');
  for(const actor of api.thiefArt.actors)for(const name of ['idle','run','dive','disappointed'])assert(actor.actions.has(name),'thief clip missing');
  api.thiefArt.reset();api.reset({x:0,z:330,speed:0});
  Object.assign(api.thiefArt.thieves[0],{phase:'dive',time:.3,x:0,targetX:0});
  api.step(.001);assert(api.state().caught>0&&api.state().condition===82,'tackle did not catch Alex');
  assert(!api.state().hitch,'caught rider remains hitched');
  const before=api.state().z;for(let i=0;i<100;i++)api.step(.01);
  assert(api.state().z===before&&api.state().condition===82,'caught rider moved or took repeated tackle damage');
  for(let i=0;i<100;i++)api.step(.01);
  assert(api.state().caught===0&&api.state().z>before,'rider did not recover');
  api.thiefArt.reset();api.finish();
 });
 await api.environmentArt.ready;
 check('Streetlights and trees load with near and distant meshes along the routes',()=>{
  assert(api.environmentArt.errors.length===0,'environment assets failed');
  assert(api.environmentArt.batches.length===2,'missing environment models');
  for(const batch of api.environmentArt.batches){
   assert(batch.placements.length>50,'missing route placements');
   assert(batch.near.material.map.image.width===1024,'environment texture missing');
   assert(batch.far.geometry.attributes.position.count<batch.near.geometry.attributes.position.count,'distant mesh not reduced');
  }
 });
 check('Skateboard loads textured and stays attached to the rider',()=>{
  assert(api.skateboard.model?.parent===api.skateboard.group&&api.skateboard.group.parent===api.player,'skateboard missing from rider');
  api.skateboard.model.traverse(o=>{if(o.isMesh)assert(o.material.map?.image?.width===1024,'skateboard texture missing');});
  api.skateboard.present(true);assert(!api.skateboard.group.visible,'menu board overlaps dancing feet');
  api.skateboard.present(false);assert(api.skateboard.group.visible&&api.skateboard.group.position.length()===0,'riding board is missing or offset');
 });
 check('All 13 world models load with textures; traffic, buildings, and trains are replaced',()=>{
  assert(api.worldArt.errors.length===0,'failed assets: '+api.worldArt.errors.join(', '));
  assert(api.worldArt.models.size===13,'missing world models');
  assert(api.worldArt.loadedVehicles===api.cars.length,'placeholder traffic remains');
  assert(api.worldArt.loadedTrainCars===21,'train consist missing');
  assert(api.worldArt.buildings.length===3,'building instances missing');
  for(const model of api.worldArt.models.values())model.traverse(o=>{if(o.isMesh)assert(o.material.map?.image?.width===1024,'texture missing');});
 });
 check('Building colliders follow rendered replacements and junction omissions',()=>{
  assert(api.solidWorld.disabledLayers.has('fallbackBuildings'),'old building collision remains active');
  const bodies=[...new Set([...api.solidWorld.buckets.values()].flat())].filter(b=>b.layer==='buildings');
  const placements=api.worldArt.buildings.flatMap(b=>b.placements);
  assert(bodies.length===placements.length&&bodies.length>100,'building collision placements differ from visible buildings');
  for(const body of bodies)assert(placements.some(p=>Math.hypot(p.matrix.elements[12]-body.x,p.matrix.elements[14]-body.z)<1),'building collider is detached from its model');
 });
 check('Angry drivers keep their visible fist and curse bubble after vehicle art loads',()=>{
  const c=api.cars[3];c.mesh.visible=true;c.driver={phase:'warning',targetX:3};
  api.driverArt.update(10,api.camera);
  assert(c.driverArt.parent===c.mesh&&c.driverArt.visible,'driver reaction missing from loaded vehicle');
  assert(c.driverFist.children.length>=6&&c.driverBubble.material.map,'fist or curse bubble missing');
  c.driver={phase:'idle'};api.driverArt.update(11,api.camera);assert(!c.driverArt.visible,'reaction did not clear');
 });
 check('Deliberate jumps flip, repeated jumps restart, and roof skating stays animated',()=>{
  api.alex.reset();const state={...api.state(),grounded:false,airFlip:true,jumpSequence:1,y:6,jumpFromY:0,vy:10,gliding:false,impact:0,caught:0,handoff:0,ducking:false,ride:null};
  let flipped=false;
  for(let i=0;i<10;i++){
   api.alex.update(.1,state,'playing',false);api.alex.group.updateWorldMatrix(true,true);
   const head=api.alex.model.getObjectByName('mixamorigHead').getWorldPosition(new THREE.Vector3());
   const hips=api.alex.model.getObjectByName('mixamorigHips').getWorldPosition(new THREE.Vector3());flipped ||= head.y<hips.y;
  }
  assert(api.alex.current===api.alex.actions.get('jumpover')&&flipped,'jump flip was not restored');
  state.jumpSequence++;api.alex.update(.01,state,'playing',false);assert(api.alex.current.time<.2,'next flip stayed frozen at the last frame');
  Object.assign(state,{grounded:true,airFlip:false,ride:{type:'bus'}});api.alex.update(.1,state,'playing',false);
  assert(api.alex.current===api.alex.actions.get('skateboardkick'),'roof landing switched to a stationary pose');
  const time=api.alex.current.time;api.alex.update(.1,state,'playing',false);assert(api.alex.current.time!==time,'roof skating did not animate');
  api.alex.reset();
 });
 check('Fallen roadwork uses the trip animation and then returns to skating',()=>{
  api.alex.reset();const state={...newRun(),tripping:.65,impact:.65};api.alex.update(.1,state,'playing',false);
  assert(api.alex.current===api.alex.actions.get('trip'),'trip animation missing');
  state.tripping=0;state.impact=0;api.alex.update(.1,state,'playing',false);
  assert(api.alex.current===api.alex.actions.get('skateboarding'),'trip animation did not release');
  api.alex.reset();
 });
 check('Alex loads with a color texture, skinned mesh, and all 21 animation clips',()=>{
  assert(api.alex.mixer,'character did not load');
  let skinned;
  api.alex.group.traverse(o=>{if(o.isSkinnedMesh)skinned=o;});
  assert(skinned?.material.map?.image?.width>0,'textured skinned mesh missing');
  assert(api.alex.actions.size===21,'animation clips missing');
  for(const mode of ['skateboarding','jumpover','flying','runningslide','take','give','hitbycar','victory','caught']) {
   assert(api.alex.actions.has(mode),'missing '+mode);
  }
 });
 const output=document.createElement('pre');output.id='integration-results';output.textContent=results.join('\n');Object.assign(output.style,{position:'fixed',inset:'20px',zIndex:'100',background:'#29243c',color:'#dbff78',padding:'20px',whiteSpace:'pre-wrap',font:'14px/1.8 monospace',overflow:'auto'});document.body.append(output);
}






