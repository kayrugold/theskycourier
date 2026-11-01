import test from 'node:test';
import assert from 'node:assert/strict';
import {JOBS,JOB_STOPS,activeStop,updateJob} from '../src/jobs.js';
import {newRun} from '../src/physics.js';
import {environmentSites,sceneryContact} from '../src/environment-collision.js';
import {sameRoute} from '../src/routes.js';

test('every fork branch has a repeatable bonus pair, locked to the picked-up package',()=>{
 for(let j=0;j<JOBS.length;j++)for(let v=0;v<JOBS[j].variants.length;v++){
  const variant=JOBS[j].variants[v],p=Object.assign(newRun(),{jobIndex:j,choices:{...variant.pickup.choices},x:variant.pickup.x,z:variant.pickup.z});
  assert.equal(activeStop(p),variant.pickup);assert.equal(updateJob(p),'pickup');assert.equal(p.jobVariant,v);
  Object.assign(p,{x:variant.drop.x,z:variant.drop.z});assert.equal(updateJob(p),'delivery');assert.equal(p.completed,1);
  assert.notEqual(updateJob(p),'delivery');
 }
 assert.equal(JOB_STOPS.length,22);
});
test('handoffs require proximity and are blocked during an existing handoff or tackle',()=>{
 const p=Object.assign(newRun(),{x:JOBS[0].pickup.x,z:210,handoff:.4});
 assert.equal(updateJob(p),null);p.handoff=0;p.caught=.5;assert.equal(updateJob(p),null);p.caught=0;p.z=200;assert.equal(updateJob(p),null);
});
test('tree and lamp contacts are swept, height aware, and route aware',()=>{
 const site={id:'streetlight0',x:11.4,z:1000,radius:.4,height:7,choices:{0:0}};
 const p={x:11.4,z:1005,y:0,choices:{0:0}},prev={x:11.4,z:995};
 assert.equal(sceneryContact(site,p,prev),true);
 assert.equal(sceneryContact(site,{...p,choices:{0:1}},prev),false);
 assert.equal(sceneryContact(site,{...p,y:8},prev),false);
 assert.equal(sceneryContact(site,{...p,x:8},{x:8,z:995}),false);
 const tree={...site,id:'tree0',x:12,radius:.65,height:6};assert.equal(sceneryContact(tree,{...p,x:11.5},prev),true);
});
test('physical scenery leaves room around every delivery stop',()=>{
 for(const site of ['tree0','streetlight0'].flatMap(environmentSites))for(const {stop} of JOB_STOPS)
  assert.ok(!(Math.abs(site.z-stop.z)<7&&Math.abs(site.x-stop.x)<3&&sameRoute(site.z,site.choices,stop.choices)));
});

