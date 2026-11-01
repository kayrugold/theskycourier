import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,trafficMotion,vehicleContact} from '../src/physics.js';
import {driverIntent,courteousLaneTarget} from '../src/traffic-behavior.js';

const vehicle=(index=0,patch={})=>({index,x:0,homeX:0,z:70,length:4.4,width:2.4,height:2.3,type:'car',choices:{},...trafficMotion(index,8),...patch});

test('driver speed profiles never depend on rider speed or distance',()=>{
 for(const index of [0,1,2,3,4])for(const time of [0,5,18,26]){
  const baseline=trafficMotion(index,time);
  for(const speed of [0,24,58,72,120]){
   const car=vehicle(index,{z:80}),player={...newRun(),z:100,speed};
   driverIntent(car,player,time);
   assert.deepEqual(trafficMotion(index,time),baseline);
  }
 }
});
test('erratic drivers change lanes on their own schedule',()=>{
 const car=vehicle(2,{z:0}),player={...newRun(),z:500};
 const lanes=new Set();for(let t=0;t<60;t++)lanes.add(driverIntent(car,player,t).targetX);
 assert.equal(lanes.size,3);
});

test('ordinary drivers never attack and will wait to merge across a rider',()=>{
 const player={...newRun(),z:100,x:2.85};
 for(let index=0;index<15;index++){
  const car=vehicle(index,{z:80});
  if(!car.aggressive)for(let t=8;t<100;t++)assert.equal(driverIntent(car,player,t).started,false);
 }
 const car=vehicle(0,{z:100});
 assert.equal(courteousLaneTarget(car,player,5.7),0);
 assert.equal(courteousLaneTarget({...car,z:50},player,5.7),5.7);
});

test('angry driver warns before a locked swerve, then respects its cooldown',()=>{
 const player={...newRun(),z:100,x:2.85},car=vehicle(3);
 assert.equal(driverIntent(car,player,7.9).started,false);
 const first=driverIntent(car,player,8);
 assert.equal(first.started,true);assert.equal(first.warning,true);assert.equal(first.targetX,0);
 player.x=-5.7;
 assert.equal(driverIntent(car,player,9.24).targetX,0);
 assert.equal(driverIntent(car,player,9.25).targetX,2.85,'lunge must use original target');
 assert.equal(driverIntent(car,player,10.61).warning,false);
 assert.equal(driverIntent(car,player,20).started,false);
 assert.equal(driverIntent(car,player,22.62).started,true);
});

test('angry drivers leave protected riders and crowded lanes alone',()=>{
 for(const patch of [{handoff:1},{caught:1},{recovery:1},{impact:1},{y:3},{hitch:{}},{ride:{}},{choices:{0:1}}]){
  const player={...newRun(),z:600,...patch},car=vehicle(3,{z:570,choices:{0:0}});
  assert.equal(driverIntent(car,player,8).started,false,JSON.stringify(patch));
 }
 const player={...newRun(),z:100},car=vehicle(3),neighbor=vehicle(0,{z:71});
 assert.equal(driverIntent(car,player,8,[car,neighbor]).started,false);
 driverIntent(car,player,8);
 assert.equal(driverIntent(car,{...player,handoff:1},8.5).warning,false);
 assert.equal(driverIntent(car,player,9).started,false);
});

test('rider fits a narrow gap between normal cars; wide vehicles still block it',()=>{
 const player={...newRun(),z:100};
 for(const x of [-1.8,1.8]){
  const car=vehicle(0,{x,z:100});
  assert.equal(vehicleContact(player,car,0),'none');
  assert.equal(vehicleContact(player,{...car,type:'bus',width:3.1,height:3.5},0),'hit');
 }
 for(const fps of [15,60]){
  const rider={...newRun(),x:2.85,speed:88};
  const pair=[vehicle(0,{x:0,z:30}),vehicle(4,{x:5.7,z:30})];
  for(let i=0;i<fps*12;i++){
   rider.z+=rider.speed/fps;
   for(const car of pair){car.z+=78/fps;assert.equal(vehicleContact(rider,car,0),'none');}
  }
  assert.ok(pair.every(car=>rider.z>car.z+car.length/2),'rider should be able to overtake');
 }
});

test('a vehicle does not yield its lane change to its own roof rider',()=>{
 const c=vehicle(2,{x:-5.7,z:100});const p={...newRun(),x:-5.7,z:100,y:4.4,ride:c};
 assert.equal(courteousLaneTarget(c,p,0),0);
});
