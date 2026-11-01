import test from 'node:test';
import assert from 'node:assert/strict';
import {solidContact,SolidWorld} from '../src/solid-collision.js';
import {worldPoint,coursePoint,FORKS} from '../src/routes.js';
import {sidewalkSites} from '../src/environment-collision.js';
import {JOB_STOPS} from '../src/jobs.js';
import {sameRoute} from '../src/routes.js';

const post={x:9.2,z:190,halfX:.55,halfZ:1,bottom:0,top:13,yaw:0};
test('bridge posts stop swept ground and airborne motion, including at low frame rates',()=>{
 for(const y of [0,4,9]){
  const hit=solidContact(post,{x:9.2,z:180,y},{x:9.2,z:200,y});
  assert.ok(hit&&hit.t>0&&hit.t<1);assert.equal(hit.nz,-1);
 }
 assert.equal(solidContact(post,{x:11,z:180,y:0},{x:11,z:200,y:0}),null);
});
test('overhead fixtures respect ducking, jumping and top landings',()=>{
 const beam={...post,x:0,halfX:10,bottom:1.2,top:1.6};
 assert.ok(solidContact(beam,{x:0,z:180,y:0},{x:0,z:200,y:0},1.4));
 assert.equal(solidContact(beam,{x:0,z:180,y:0},{x:0,z:200,y:0},.65),null);
 assert.equal(solidContact(beam,{x:0,z:180,y:2},{x:0,z:200,y:2}),null);
 const hit=solidContact(beam,{x:0,z:190,y:3},{x:0,z:190,y:1});
 assert.equal(hit.ny,1);
});
test('oriented solids use their actual footprint and do not leave a rider embedded',()=>{
 const body={...post,x:0,z:0,yaw:Math.PI/4,halfZ:5};
 assert.equal(solidContact(body,{x:-4,z:4,y:0},{x:-3,z:4,y:0}),null);
 const hit=solidContact(body,{x:0,z:0,y:0},{x:0,z:1,y:0});assert.ok(hit);assert.equal(hit.t,0);
});
test('spatial collision queries retain distant and hidden fixtures, with physical top support',()=>{
 const world=new SolidWorld();world.add(post);
 assert.ok(world.sweep({x:9.2,z:0,y:0},{x:9.2,z:300,y:0},1.4));
 assert.equal(world.support({x:9.2,z:190,y:13}),13);
 assert.equal(world.support({x:9.2,z:190,y:0}),0);
});
test('replaced scenery disables its old collision and support without disabling other fixtures',()=>{
 const world=new SolidWorld();
 world.add({...post,layer:'fallbackBuildings'});
 world.add({...post,x:-9.2,layer:'fixtures'});
 const from={x:9.2,z:180,y:0},to={x:9.2,z:200,y:0};
 assert.ok(world.sweep(from,to,1.4));
 world.setLayerEnabled('fallbackBuildings',false);
 assert.equal(world.sweep(from,to,1.4),null);
 assert.equal(world.support({x:9.2,z:190,y:13}),0);
 assert.ok(world.sweep({...from,x:-9.2},{...to,x:-9.2},1.4));
 world.setLayerEnabled('fallbackBuildings',true);
 assert.ok(world.sweep(from,to,1.4));
});
test('world collision corrections convert back to every curved road branch',()=>{
 for(const f of FORKS)for(let branch=0;branch<f.offsets.length;branch++)for(let z=f.start-5;z<f.end+5;z+=31)for(const x of [-11.5,0,11.5]){
  const choices={[f.id]:branch},point=coursePoint(worldPoint(x,z,choices),choices);
  assert.ok(Math.abs(point.x-x)<.001&&Math.abs(point.z-z)<.001,JSON.stringify({x,z,point}));
 }
});
test('visible sidewalk furniture interrupts both edges and leaves delivery access',()=>{
 const sites=sidewalkSites();
 for(const side of [-1,1])for(const edge of [10.1,11.5]){
  assert.ok(sites.some(s=>Math.sign(s.x)===side&&Math.abs(s.x-side*edge)<1.15));
 }
 for(const site of sites)for(const {stop} of JOB_STOPS)assert.ok(Math.abs(stop.z-site.z)>=14||!sameRoute(site.z,site.choices,stop.choices));
});
