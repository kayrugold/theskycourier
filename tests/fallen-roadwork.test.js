import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {MovableObstacles} from '../src/movable-obstacles.js';
import {knockObstacle} from '../src/traffic-obstacles.js';
import {tripOverRoadwork} from '../src/roadwork.js';
import {newRun} from '../src/physics.js';

function setup(z=100){
 const scene=new T.Scene(),city=new T.Group(),mesh=new T.Group();scene.add(city);city.add(mesh);
 const bar=new T.Mesh(new T.BoxGeometry(3.3,.65,.7),new T.MeshBasicMaterial());bar.position.y=1.425;mesh.add(bar);
 for(const x of [-1.3,1.3]){const leg=new T.Mesh(new T.BoxGeometry(.18,1.75,.3),bar.material);leg.position.set(x,.875,0);mesh.add(leg);}
 const sign=new T.Mesh(new T.PlaneGeometry(30,20),new T.MeshBasicMaterial({map:new T.Texture()}));sign.position.y=8;mesh.add(sign);
 const art=new MovableObstacles(scene,city,[{type:'barrier',x:0,z,mesh}]);
 return {art,i:art.instances[0]};
}
test('player and vehicle strikes share the topple state, with a low collider at the settled mesh',()=>{
 for(const source of [{...newRun(),x:0,speed:72},{index:3,x:0,speed:90}]){
  const {art,i}=setup();assert.ok(knockObstacle(i,source));art.step(.5);assert.equal(i.fallenBody,null);
  art.step(.65);const b=i.fallenBody;assert.ok(b&&b.top<.9&&b.bottom>=0,'hidden sign must not enlarge the trip collider');
  assert.ok(Math.abs(b.x-i.mesh.position.x)<.01);assert.ok(Math.abs(b.z-i.mesh.position.z)<2);
  assert.ok(Math.abs(i.mesh.rotation.x-Math.PI/2)<.001&&Math.abs(i.mesh.rotation.z)<.001);
 }
});
test('a settled barrier trips once per contact; jumping clears it and ducking does not',()=>{
 const {art,i}=setup();knockObstacle(i,{x:0,speed:72});art.step(1.15);const b=i.fallenBody;
 const from={x:b.x,z:b.z-3,y:0},to={x:b.x,z:b.z+3,y:0};
 assert.deepEqual(art.tripContacts(from,to,1.4),[i]);assert.deepEqual(art.tripContacts(from,to,1.4),[]);
 art.tripContacts({...to,z:to.z+2},{...to,z:to.z+3},1.4);
 assert.deepEqual(art.tripContacts(from,to,.65),[i]);
 assert.deepEqual(art.tripContacts({...from,y:b.top+.1},{...to,y:b.top+.1},1.4),[]);
});
test('fallen collision follows the moved obstacle and is removed on a new run',()=>{
 const {art,i}=setup(620);knockObstacle(i,{x:0,speed:80});art.step(1.15);const b=i.fallenBody;assert.ok(b.top<.9,'curved-road barriers must lie flat');
 assert.deepEqual(art.tripContacts({x:i.home.x,z:i.home.z-1,y:0},{x:i.home.x,z:i.home.z+1,y:0},1.4),[]);
 const from={x:b.x,z:b.z-3,y:0},to={x:b.x,z:b.z+3,y:0};assert.deepEqual(art.tripContacts(from,to,1.4),[i]);
 art.reset();assert.equal(i.knocked,false);assert.equal(i.fallenBody,null);assert.deepEqual(art.tripContacts(from,to,1.4),[]);
});
test('tripping stumbles forward, spends no extra tanks and respects hit grace',()=>{
 const p={...newRun(),speed:72,boosterTanks:2};assert.ok(tripOverRoadwork(p));
 assert.equal(p.condition,94);assert.ok(p.tripping>0&&p.impactVelocity>0&&p.speed>24&&p.speed<72);
 assert.equal(p.boosterTanks,2);assert.equal(tripOverRoadwork(p),false);assert.equal(p.condition,94);
});
