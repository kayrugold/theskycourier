import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {crossingMotion,crossingBodies} from '../src/rail-traffic.js';
import {constrainTrafficSpeed,guardCrossings,trafficStopLine,guardVehicleSolids,knockObstacle} from '../src/traffic-obstacles.js';
import {guardTraffic} from '../src/traffic-routing.js';
import {SolidWorld} from '../src/solid-collision.js';
import {MovableObstacles} from '../src/movable-obstacles.js';

const car=(patch={})=>({index:0,x:0,z:330,y:0,slope:0,width:2.4,length:4.4,height:2.3,speed:88,choices:{},...patch});
test('cars and buses queue before an active crossing and accelerate after the tail clears',()=>{
 for(const index of [0,1]){
  const rail=crossingMotion(index,0),leader=car({z:rail.z-70}),follower=car({z:rail.z-100,length:10});
  const cars=[leader,follower];let stopped=false;
  for(let time=0;time<10;time+=1/120){
   const tracks=[crossingMotion(index,time)];
   for(const c of cars){
    const previous={x:c.x,z:c.z};
    const limit=constrainTrafficSpeed(c,88,c.speed,1/120,{crossings:tracks,cars});
    c.speed=limit.speed;c.z+=c.speed/120;
    guardCrossings(c,previous,tracks);guardTraffic(c,previous,[],cars);
    if(tracks[0].warning)assert.ok(c.z<=trafficStopLine(c,tracks[0])+.001);
   }
   if(time>3&&time<4)stopped ||= leader.speed<.1;
   assert.ok(leader.z-follower.z>=(leader.length+follower.length)/2+6.99);
  }
  assert.ok(stopped);assert.ok(follower.z>rail.z+40);assert.ok(follower.speed>20);
 }
});
test('signals do not release traffic until the actual train tail clears all lanes',()=>{
 for(const index of [0,1]){
  let warningBeforeArrival=false,clearedWhileActive=false;
  for(let time=0;time<8;time+=.01){
   const t=crossingMotion(index,time);
   if(t.blocked)assert.ok(t.warning);
   if(t.warning&&!t.blocked)warningBeforeArrival=true;
   if(t.active&&t.minX>=15){assert.equal(t.warning,false);clearedWhileActive=true;}
  }
  assert.ok(warningBeforeArrival&&clearedWhileActive);
 }
});
test('vehicles on the railway bridge continue while a train passes below',()=>{
 const c=car({x:-5.7,z:400,y:6}),previous={x:c.x,z:c.z,y:6,slope:0};
 const tracks=[crossingMotion(0,3)];
 assert.equal(constrainTrafficSpeed(c,88,88,1/120,{crossings:tracks}).speed,88);
 c.z=420;guardCrossings(c,previous,tracks);
 guardVehicleSolids(c,previous,[{x:-6.1,start:330,end:462,width:6,height:6,choices:{}}],new SolidWorld(),crossingBodies(tracks));
 assert.equal(c.z,420);assert.equal(c.speed,88);
});
test('trash cans stop vehicles before their full bumper footprint passes into the bin',()=>{
 const bin={x:0,z:20,halfX:1.1,halfZ:1.2,bottom:0,top:1.95,yaw:0,name:'BIN'};
 const world=new SolidWorld();world.add(bin);
 for(const length of [4.4,10,15]){
  const c=car({z:25,length}),previous={x:0,z:5,y:0,slope:0};
  guardVehicleSolids(c,previous,[],world);
  assert.ok(c.z+length/2<18.81);assert.equal(c.speed,0);assert.equal(c.blockedBy,'BIN');
 }
});
test('cars knock cones and barriers aside, removing only that instance from collision',()=>{
 for(const type of ['barrier','cone']){
  const instance={type,x:0,z:20,choices:{},knocked:false};
  const world=new SolidWorld();world.add({x:0,z:20,halfX:1,halfZ:.5,bottom:0,top:1.75,yaw:0,obstacleInstance:instance});
  const other={...instance,x:50};world.add({x:50,z:20,halfX:1,halfZ:.5,bottom:0,top:1.75,yaw:0,obstacleInstance:other});
  const c=car({z:25});guardVehicleSolids(c,{x:0,z:10,y:0,slope:0},[],world);
  assert.ok(instance.knocked);assert.equal(c.z,25);assert.equal(c.speed,88);assert.equal(other.knocked,false);
  assert.equal(world.sweep({x:0,z:15,y:0},{x:0,z:25,y:0},1.4),null);
  assert.ok(world.sweep({x:50,z:15,y:0},{x:50,z:25,y:0},1.4));
 }
 assert.equal(knockObstacle({type:'bin',x:0,z:20},car()),false);
});
test('solid fixtures and moving train bodies block cars, including at low frame rates',()=>{
 const c=car({z:30}),world=new SolidWorld();
 guardVehicleSolids(c,{x:0,z:0,y:0,slope:0},[],world,[{x:0,z:20,halfX:20,halfZ:2,bottom:0,top:4,yaw:0,name:'TRAIN'}]);
 assert.ok(c.z+c.length/2<18.01);assert.equal(c.speed,0);
 const post=car({z:30});world.add({x:0,z:20,halfX:.4,halfZ:.4,bottom:0,top:7,yaw:0,vehicleOnly:true,name:'POST'});
 guardVehicleSolids(post,{x:0,z:0,y:0,slope:0},[],world);
 assert.equal(post.speed,0);assert.equal(post.blockedBy,'POST');
});
test('movable roadwork resets on every branch after a new run',()=>{
 const scene=new T.Scene(),city=new T.Group(),prototype=new T.Group();
 prototype.add(new T.Mesh(new T.BoxGeometry(3,.6,.6),new T.MeshBasicMaterial()));city.add(prototype);
 const source={type:'barrier',x:5.7,z:1000,mesh:prototype};
 const art=new MovableObstacles(scene,city,[source]);assert.equal(art.instances.length,2);
 const i=art.instances[0],home=i.mesh.position.clone();
 assert.ok(knockObstacle(i,car()));art.step(.5);assert.ok(i.mesh.position.distanceTo(home)>1);
 art.reset();assert.equal(i.knocked,false);assert.ok(i.mesh.position.distanceTo(home)<.001);
});
