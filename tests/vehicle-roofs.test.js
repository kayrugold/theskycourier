import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,vehicleContact,jumpGravity,advanceRoofSpeed} from '../src/physics.js';
import {beginJump,stepArcadeActions} from '../src/arcade-movement.js';
import {landOnVehicle} from '../src/vehicle-roofs.js';
import {boardTrickPose,updateBoardTricks} from '../src/board-tricks.js';

const vehicle=()=>({type:'car',x:0,z:100,y:0,width:2.4,length:4.4,height:2.3,speed:60});
test('Down at takeoff, ascent, apex or descent leaves the complete jump arc intact',()=>{
 const run=at=>{
  const p=newRun();beginJump(p);const ys=[];
  for(let i=0;i<140;i++){
   stepArcadeActions(p,1/120,i>=at&&i<at+15);
   if(!p.grounded){p.vy-=jumpGravity(p)/120;p.y+=p.vy/120;if(p.y<=0){p.y=0;p.grounded=true;}}
   ys.push(p.y);
  }
  return ys;
 };
 const normal=run(999);
 for(const at of [0,1,12,40,65,90])assert.deepEqual(run(at),normal);
});
test('a descending near-edge catch lands inside a car roof instead of immediately falling off',()=>{
 const c=vehicle(),p={...newRun(),x:1.7,z:102.9,y:2.1,vy:-4,grounded:false};
 assert.equal(vehicleContact(p,c,2.4),'land');landOnVehicle(p,c);
 assert.equal(p.ride,c);assert.equal(p.y,2.3);
 assert.ok(Math.abs(p.x-c.x)<c.width/2&&Math.abs(p.z-c.z)<c.length/2);
 assert.ok(p.speed>c.speed&&p.speed<=c.speed+16);
});
test('landing on a stopped or slower vehicle loses only five percent of relative momentum',()=>{
 for(const [incoming,carrier] of [[72,0],[88,30],[72,65],[118,0]]){
  const c={...vehicle(),speed:carrier},p={...newRun(),speed:incoming,z:100};
  landOnVehicle(p,c);
  assert.ok(Math.abs(p.speed-(carrier+(incoming-carrier)*.95))<1e-9);
  const landed=p.speed;
  for(let i=0;i<30;i++)p.speed=advanceRoofSpeed(p.speed,carrier,1/120);
  assert.ok(Math.abs(p.speed-(landed-.5))<1e-8,'rolling drag should not erase landing momentum');
 }
});
test('a faster vehicle supplies forward carry without locking the rider to its speed',()=>{
 const c={...vehicle(),speed:100},p={...newRun(),speed:72,z:100};landOnVehicle(p,c);
 assert.equal(p.speed,104);assert.equal(advanceRoofSpeed(p.speed,c.speed,.1),104);
});
test('side and rear body impacts still hurt while successful top catches are safe',()=>{
 const c=vehicle();
 assert.equal(vehicleContact({...newRun(),x:0,z:100},c,0),'hit');
 const rising={...newRun(),grounded:false,x:1,z:100,y:.5,vy:20,jumpGrace:.2,jumpFromY:0};
 assert.equal(vehicleContact(rising,c,.3,{x:4,z:100}),'hit');
 assert.equal(vehicleContact({...rising,x:0,z:101},c,.3,{x:0,z:101}),'hit');
 assert.equal(vehicleContact({...rising,x:0,z:99,y:2.1,vy:-2},c,2.5),'land');
});
test('a rising edge clearance does not zero the jump or snap it onto a roof',()=>{
 const c=vehicle(),p={...newRun(),grounded:false,z:99,y:2,vy:19,jumpGrace:.1,jumpFromY:0};
 assert.equal(vehicleContact(p,c,1.8),'none');assert.equal(p.vy,19);assert.equal(p.grounded,false);
});
test('running off the front cannot immediately pull the rider back onto the same roof',()=>{
 const c=vehicle(),p={...newRun(),grounded:false,z:103,y:2.25,vy:-2,lastRoof:c,roofRecatch:.2};
 assert.equal(vehicleContact(p,c,2.4),'none');
 p.roofRecatch=0;assert.equal(vehicleContact(p,c,2.4),'land');
});
test('occasional board spins are visual only and settle cleanly on landing',()=>{
 const p={...newRun(),grounded:false,airFlip:true,jumpSequence:3,jumpElapsed:.45,vy:10};
 const pose=boardTrickPose(p);assert.ok(Math.abs(pose.spin-Math.PI)<.01);
 const board={rotation:{x:0,y:0}};updateBoardTricks(board,p,.1);assert.ok(board.rotation.y>3);
 p.jumpElapsed=1;updateBoardTricks(board,p,.1);p.grounded=true;
 updateBoardTricks(board,p,.1);assert.ok(Math.abs(board.rotation.y)<.001);assert.equal(p.vy,10);
});
