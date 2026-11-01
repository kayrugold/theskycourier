import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileNotice,mobileObjective,mobileRoute} from '../src/mobile-hud.js';
import {newRun} from '../src/physics.js';

test('mobile traffic warning takes the single notice slot ahead of rewards',()=>{
 const notice=mobileNotice(newRun(),{rear:{x:5},toast:'BOOST TANK +1',remaining:2});
 assert.deepEqual(notice,{text:'↑ Traffic behind · move right',danger:true});
 assert.equal(mobileNotice(newRun(),{rear:{x:-5}}).text,'↑ Traffic behind · move left');
});
test('mobile HUD stays quiet for routine impact explanations and absent equipment',()=>{
 assert.equal(mobileNotice(newRun()).text,'');
 assert.equal(mobileNotice(newRun(),{toast:'BIN! Steer around the solid object.',remaining:1}).text,'');
});
test('important mobile warnings stay short and expired pickup notices disappear',()=>{
 assert.deepEqual(mobileNotice(newRun(),{toast:'BIRD DIVE! Move aside · ground riders can duck.',remaining:1}),{text:'Bird diving · dodge or slide',danger:true});
 assert.equal(mobileNotice(newRun(),{toast:'GLIDER EQUIPPED',remaining:0}).text,'');
});
test('mobile directions use the same sidewalk convention as the course',()=>{
 assert.equal(mobileObjective(newRun(),{x:-10,z:165}),'Pick up · → Right · 165m');
 assert.equal(mobileObjective({...newRun(),carrying:true,z:100},{x:10,z:165}),'Deliver · ← Left · 65m');
});
test('mobile fork guidance appears near a fork and clears after entry',()=>{
 assert.equal(mobileRoute({...newRun(),z:368,choices:{0:1}}),'Fork in 112m · Canal Run');
 assert.equal(mobileRoute({...newRun(),z:550}),'');
});
