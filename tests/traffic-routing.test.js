import test from 'node:test';
import assert from 'node:assert/strict';
import {trafficLane,rampRailContact,guardTraffic,trafficSurface} from '../src/traffic-routing.js';
const roof={start:330,end:462,x:6.1,height:6,width:6,choices:{}};
const launch={...roof,isTrainRamp:true};
test('ramp guard stops late lane changes and relocates recycled traffic clear of ramps',()=>{
 const c={x:6.1,homeX:5.7,z:325,length:10,width:2.8,speed:90,choices:{}};
 guardTraffic(c,{x:6.1,z:323},[launch]);assert.equal(c.z,324);assert.equal(c.speed,0);
 c.z=380;guardTraffic(c,{x:6.1,z:10000},[launch]);assert.ok(Math.abs(c.x-roof.x)>5.15);
 c.x=2;c.z=380;guardTraffic(c,{x:0,z:379},[roof]);assert.equal(c.x,0);assert.equal(c.z,379);
});
test('following traffic preserves a seven metre gap when approaching a queue',()=>{
 const car={x:0,z:99,width:3,length:10,speed:90,choices:{}};
 const leader={x:0,z:112,width:3,length:10,speed:0,choices:{}};
 guardTraffic(car,{x:0,z:94},[],[car,leader]);assert.equal(car.z,95);assert.equal(car.speed,0);
});
test('traffic still avoids the train launch ramp',()=>{
 for(const x of [-6.1,0,6.1]){
  const r={...launch,x};const c={x,homeX:x,z:240,length:10,width:2.8,choices:{}};
  const lane=trafficLane(c,[r]);assert.notEqual(lane,null);assert.ok(Math.abs(lane-x)>3+.75+1.4);
  for(let z=240;z<470;z+=.8){c.z=z;const target=trafficLane(c,[r]);c.x+=Math.max(-.08,Math.min(.08,target-c.x));if(z>=325)assert.ok(Math.abs(c.x-x)>5,'vehicle enters ramp');}
 }
});
test('ramp rails block the narrow outside slit while leaving the sidewalk and top open',()=>{
 assert.ok(rampRailContact({x:9.4,z:350,y:0,choices:{}},10.2,[roof])>=10);
 assert.ok(rampRailContact({x:9.4,z:350,y:4,choices:{}},8,[roof])<9);
 assert.equal(rampRailContact({x:10.5,z:350,y:0,choices:{}},10.5,[roof]),null);
 assert.equal(rampRailContact({x:9.4,z:350,y:8,choices:{}},8,[roof]),null);
});

test('cars, buses and semis drive continuously up, across and down the raised road',()=>{
 for(const length of [4.4,10,15]){
  const c={x:5.7,homeX:5.7,z:310,length,width:2.8,speed:72,choices:{}};
  let lastY=0,up=false,down=false;
  for(let z=310;z<=520;z+=.5){
   const previous={x:c.x,z:c.z};c.z=z;
   assert.equal(trafficLane(c,[roof]),5.7);
   guardTraffic(c,previous,[roof]);assert.equal(c.z,z);
   const surface=trafficSurface(c,[roof]);Object.assign(c,surface);
   assert.ok(Math.abs(c.y-lastY)<.1);assert.ok(c.y>=0&&c.y<=6);
   up ||= c.pitch<-.1;down ||= c.pitch>.1;lastY=c.y;
  }
  assert.ok(up&&down);assert.equal(c.y,0);
 }
});
test('traffic cannot merge through the side of a raised deck',()=>{
 const c={x:0,z:400,length:10,width:2.8,speed:72,choices:{},homeX:0};
 assert.equal(trafficLane(c,[roof],5.7),0);
 c.x=5.7;guardTraffic(c,{x:0,z:399},[roof]);assert.equal(c.x,0);assert.equal(c.z,399);
});
test('elevated vehicle roofs and contacts use the ramp elevation',async()=>{
 const {vehicleRoofHeight,vehicleContact,canHitch}=await import('../src/physics.js');
 const c={x:5.7,z:400,length:10,width:2.8,height:3.5,type:'bus',choices:{},...trafficSurface({x:5.7,z:400,length:10,width:2.8,choices:{}},[roof])};
 assert.equal(vehicleRoofHeight(c,400),9.5);
 assert.equal(vehicleContact({x:5.7,z:400,y:0},c,0),'none');
 assert.equal(vehicleContact({x:5.7,z:400,y:6},c,6),'hit');
 assert.equal(canHitch({x:5.7,z:380,y:6},c),true);
 assert.equal(canHitch({x:5.7,z:380,y:0},c),false);
});
