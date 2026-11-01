import test from 'node:test';
import assert from 'node:assert/strict';
import {activateBooster,collectBooster} from '../src/booster.js';
import {newRun,advanceSpeed,damage} from '../src/physics.js';
test('booster tanks cap at three and spend exactly one per activation',()=>{
 const p=newRun();assert.equal(activateBooster(p),false);
 for(let i=0;i<3;i++)assert.equal(collectBooster(p),true);assert.equal(collectBooster(p),false);
 assert.equal(activateBooster(p),true);assert.equal(p.boosterTanks,2);assert.equal(activateBooster(p),false);assert.equal(p.boosterTanks,2);
 assert.equal(newRun().boosterTanks,0);
});
test('boost requires recovery to finish and cannot bypass impact recovery or stack with slingshots',()=>{
 for(const patch of [{hitch:{}},{ride:{}},{recovery:1},{impact:1},{caught:1},{handoff:1},{boost:1},{gliding:true},{finished:true}]){
  const p={...newRun(),boosterTanks:1,...patch};assert.equal(activateBooster(p),false);assert.equal(p.boosterTanks,1);
 }
});
test('boost ramps to a capped speed and a collision cancels propulsion but preserves unused tanks',()=>{
 const p={...newRun(),boosterTanks:2};activateBooster(p);
 for(let i=0;i<60;i++)p.speed=advanceSpeed(p.speed,false,false,1/60,{tankBoost:p.tankBoost});
 assert.equal(p.speed,118);damage(p,10);assert.equal(p.tankBoost,0);assert.equal(p.boosterTanks,1);
});
