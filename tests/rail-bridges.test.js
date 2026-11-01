import test from 'node:test';
import assert from 'node:assert/strict';
import {railBridges,rampSupportSegments,RAIL_CROSSINGS} from '../src/rail-bridges.js';
import {roadHeight} from '../src/ramps.js';
import {rampRailContact,trafficSurface} from '../src/traffic-routing.js';

const roof={start:330,end:462,x:-6.1,height:6,width:6,tunnel:true,choices:{}};
test('railway bridges leave clearance for the entire train and keep supports outside the tracks',()=>{
 for(const track of RAIL_CROSSINGS){
  const r=track.z===410?roof:{...roof,start:1800,end:2000};
  const [bridge]=railBridges(r);
  assert.ok(bridge.start<track.z-track.width/2-1);
  assert.ok(bridge.end>track.z+track.width/2+1);
  assert.ok(bridge.clearance>=track.height+.5);
  const supports=rampSupportSegments(r);
  assert.equal(supports.length,2);
  for(const support of supports)assert.ok(support.end<=bridge.start||support.start>=bridge.end);
 }
});
test('player and vehicles retain a continuous deck across the railway bridge',()=>{
 for(let z=400;z<=420;z+=.5){
  assert.equal(roadHeight(roof,z),6);
  const surface=trafficSurface({x:-5.7,z,width:3.1,length:15,choices:{}},[roof]);
  assert.equal(surface.y,6);assert.ok(Math.abs(surface.pitch)<1e-9);
 }
});
test('bridge openings permit crossing beneath the deck but retain the deck edge rail',()=>{
 const p={x:roof.x+roof.width/2+.25,z:410,y:0,choices:{}};
 assert.equal(rampRailContact(p,p.x-1,[roof]),null);
 assert.notEqual(rampRailContact({...p,y:6},p.x-1,[roof]),null);
 assert.notEqual(rampRailContact({...p,z:398},p.x-1,[roof]),null);
});
test('ramps clear of railway crossings keep their supports and the train jump remains a jump',()=>{
 const r={...roof,start:780,end:940};
 assert.deepEqual(railBridges(r),[]);
 assert.deepEqual(rampSupportSegments(r),[{start:815,end:940}]);
 assert.deepEqual(railBridges({...roof,isTrainRamp:true}),[]);
});
