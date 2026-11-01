import {CoinSequence} from './coin-audio.js';
import {tripOverRoadwork} from './roadwork.js';
import {updateBoardTricks} from './board-tricks.js';
import {landOnVehicle} from './vehicle-roofs.js';
import {boosterSites} from './booster-sites.js';
import {beginJump,stepArcadeActions,JUMP_BUFFER} from './arcade-movement.js';
import {MovableObstacles} from './movable-obstacles.js';
import {crossingMotion,crossingBodies} from './rail-traffic.js';
import {constrainTrafficSpeed,guardCrossings,guardVehicleSolids,knockObstacle} from './traffic-obstacles.js';
import {railBridges,rampSupportSegments,RAIL_CROSSINGS} from './rail-bridges.js';
import {SolidWorld} from './solid-collision.js';
import {DriverArt} from './driver-art.js';
import {sidewalkSites} from './environment-collision.js';
import {rampEnd,roadHeight} from './ramps.js';
import {loadWorld} from './loading.js';
import {activateBooster,collectBooster} from './booster.js';
import {BoosterExhaust,SlideTrail,createBoosterPickup} from './booster-art.js';
import {GameAudio} from './game-audio.js';
import {GRAPHICS,HANDOFF_SECONDS} from './graphics.js';
import {trafficLane,rampRailContact,guardTraffic,trafficSurface} from './traffic-routing.js';
import {driverIntent,courteousLaneTarget} from './traffic-behavior.js';
import { HitchRope } from './hitch-rope.js';
import * as THREE from 'three';
import { FlightArt } from './flight-art.js';
import { Alex } from './alex.js';
import { Skateboard } from './skateboard.js';
import { WorldArt } from './world-art.js';
import { EnvironmentArt } from './environment-art.js';
import { DeliveryArt } from './delivery-art.js';
import { sceneryContact } from './environment-collision.js';
import { BirdArt } from './bird-art.js';
import { ThiefArt } from './thief-art.js';
import { installStampArt } from './stamp-art.js';
import { installGestures } from './gestures.js';
import { armGlider, deployGlider, jumpGravity, jumpVelocity, updateGlider, BARRIER_BOTTOM, BARRIER_TOP } from './physics.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';
import './gestures.css';
import './mobile.css';
import { COURSE_LENGTH, TIME_LIMIT, newRun, canHitch, advanceSpeed, advanceRoofSpeed, damage, simulateFrame, CRUISE_SPEED, MAX_SPEED, releaseHitch, trafficMotion, vehicleContact, vehicleRoofHeight } from './physics.js';

import { FORKS, forkAt, routeOptions, routePose, routeOffset, worldPoint, coursePoint, sameRoute, laneChoice, routeChoices, choiceFor } from './routes.js';
import { JOBS, JOB_STOPS, activeStop, updateJob } from './jobs.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
catch { $('fatal').classList.remove('hidden'); $('fatal-message').textContent = 'This demo needs WebGL. Please open it in a browser with hardware acceleration enabled.'; throw new Error('WebGL unavailable'); }
let quality = 'low';
try { const saved=localStorage.getItem('courier-graphics');if(GRAPHICS[saved])quality=saved; } catch {}
let renderScale = GRAPHICS[quality].scale;
let menuPresentation = true;
function resizeRenderer() {
 const pixelBudget = GRAPHICS[quality].pixels;
 renderer.setPixelRatio(Math.min(Math.min(devicePixelRatio,renderScale), Math.sqrt(pixelBudget / (innerWidth * innerHeight))));
 renderer.setSize(innerWidth, innerHeight);
}
resizeRenderer();
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c7b3ce');
scene.fog = new THREE.Fog('#c7b3ce', 65, 160);
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .1, 190);
scene.add(new THREE.HemisphereLight('#fff4d1', '#716789', 2.5));
const sun = new THREE.DirectionalLight('#ffe1b1', 3.1);
sun.position.set(-35, 70, 30); sun.castShadow = false;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 65, bottom: -65, near: 1, far: 180 });
sun.shadow.bias = -.0004;
scene.add(sun, sun.target);
const mats = new Map();
function mat(color) { if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color })); return mats.get(color); }
const solidWorld=new SolidWorld();
const boxGeo = new THREE.BoxGeometry(1,1,1);
function box(w,h,d,color,x=0,y=0,z=0,parent=scene) { const o = new THREE.Mesh(boxGeo, mat(color)); o.scale.set(w,h,d); o.position.set(x,y,z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
function sphere(r,color,x,y,z,parent=scene) { const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat(color)); o.position.set(x,y,z); o.castShadow=true; parent.add(o); return o; }
function cylinder(r,h,color,x,y,z,parent=scene) { const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,8),mat(color)); o.position.set(x,y,z); o.castShadow=true; parent.add(o); return o; }
const labelMaterials = new Map();
function label(text, background, foreground, width=6, height=2) { const key = [text,background,foreground].join('|'); if(labelMaterials.has(key)) return new THREE.Mesh(new THREE.PlaneGeometry(width,height),labelMaterials.get(key)); const c=document.createElement('canvas');c.width=256;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,256,80);ctx.fillStyle=foreground;ctx.font='900 italic 36px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,42,240);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});labelMaterials.set(key,material);return new THREE.Mesh(new THREE.PlaneGeometry(width,height),material); }
let seed=82;
function random() { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
const city = new THREE.Group();scene.add(city);
// A cheap continuous ground plane keeps the fork medians grounded in the city.
box(700,.25,COURSE_LENGTH+400,'#9ba89b',0,-.6,COURSE_LENGTH/2,scene);
// Build each branch as a continuous strip of short, tangent-aligned road pieces.
const road=null;
function routedBox(w,h,d,color,x,y,z,yaw){const mesh=box(w,h,d,color,x,y,z,city);mesh.rotation.y=yaw;mesh.userData.routed=true;return mesh;}
for(let z=-96;z<COURSE_LENGTH+150;z+=12){
 const fork=forkAt(z+6);
 for(const branch of routeOptions(z+6)){
  const choices=fork?{[fork.id]:branch}:{};
  const p=worldPoint(0,z+6,choices),a=worldPoint(0,z,choices),b=worldPoint(0,z+12,choices);
  const length=Math.hypot(b.x-a.x,b.z-a.z)+.35;
  routedBox(19,.3,length,'#66667a',p.x,-.25+branch*.002,p.z,p.yaw);
  const separated=!fork||Math.min(z-fork.start,fork.end-z)>210;
  if(separated)for(const side of [-1,1]){const q=worldPoint(side*11.5,z+6,choices);routedBox(4,.3,length,'#cdb8b6',q.x,-.08,q.z,p.yaw);const edge=worldPoint(side*9.7,z+6,choices);routedBox(.35,.2,length,'#f5ccb5',edge.x,0,edge.z,p.yaw);}
  for(const x of [-3.2,3.2]){const q=worldPoint(x,z+6,choices);routedBox(.12,.025,4,'#dbcbb9',q.x,-.065+branch*.002,q.z,p.yaw);}
 }
}
const colors=['#d9a48b','#afbec0','#dbbc9d','#b2a4c3','#d58d80','#a4bab2','#e3c6a7'];
const signs=['STAY HIGH','LOCAL','SUN CLUB','FRESH','SKY MAIL','GOOD DAYS','NOON','RIDE ON'];
const buildingSites=[],buildingFallbacks=[];
for(let z=-65;z<COURSE_LENGTH+170;z+=22+(Math.floor((z+65)/22)%9===8?8:0)) {
 // Continue the streetscape through junctions; WorldArt leaves the other roads clear.
 for(const side of [-1,1]) {
  const h=10+random()*16,w=9+random()*5,x=side*(14+w/2),color=colors[Math.floor(random()*colors.length)];
  buildingSites.push({h,w,x,z,side});const buildingStart=city.children.length;
  box(w,h,21,color,x,h/2,z,city);box(w+.6,.5,21.7,'#f0d5b6',x,h,z,city);
  box(w+.4,.7,22,'#85778c',x,3.6,z,city);
  for(let y=6;y<h-1;y+=3.8) for(let zz=-7;zz<=7;zz+=4.5) {box(.07,1.9,1.35,random()>.2?'#666f88':'#f5d994',x-side*(w/2+.04),y,z+zz,city);box(.25,.15,1.7,'#f3d4b3',x-side*(w/2+.15),y-1,z+zz,city);}
  for(let xx=-w/2+1.6;xx<w/2;xx+=3.3) for(let y=6;y<h-1;y+=3.8) box(1.3,1.8,.08,'#72748a',x+xx,y,z-10.55,city);
  const awning=box(2.5,.25,9,random()>.5?'#dc8b7d':'#78a99b',side*14.2,3,z,city);awning.rotation.z=side*.1;
  const sign=label(signs[Math.floor(random()*signs.length)],'#403952','#e3fa94',6,1.5);sign.position.set(side*13.8,4.8,z);sign.rotation.y=-side*Math.PI/2;city.add(sign);
  if(random()>.55) { const tag=label(['FLY!','SOAR','ZIP!'][Math.floor(random()*3)],color,'#f1efae',5,2);tag.position.set(x-side*(w/2+.07),1.65,z+6);tag.rotation.y=-side*Math.PI/2;city.add(tag); }
  if(random()>.55) {cylinder(1.8,3,'#9c7e76',x,h+2.2,z,city);box(3,.2,3,'#584f68',x,h+3.8,z,city);}
  for(const mesh of city.children.slice(buildingStart))mesh.userData.building=true;
 }
}
// Waist-high planters leave a route around each one and stay clear of deliveries.
for(const site of sidewalkSites()){
 const p=worldPoint(site.x,site.z,site.choices);
 const pot=routedBox(1.5,1.05,2.2,'#a86d58',p.x,.525,p.z,p.yaw);
 pot.userData.solidName='PLANTER';
 routedBox(1.65,.15,2.35,'#f0ce9d',p.x,1.05,p.z,p.yaw);
 routedBox(1.2,.35,1.9,'#5c8f69',p.x,1.28,p.z,p.yaw);
}
// Elevated viaducts make the street and roof routes feel like one neighborhood.
for(let z=190;z<COURSE_LENGTH;z+=390) {box(40,1.2,7,'#ccaca4',0,13,z,city);for(const x of [-9.2,9.2]) {box(1.1,13,2,'#c6a39b',x,6.5,z,city);box(2.3,.5,3,'#ebc4a7',x,11.8,z,city);}for(const x of [-18,-12,-6,0,6,12,18])box(.3,1.5,7,'#ebc4a7',x,14,z,city);}
const roofs=[];
const roofDefs=[
 {start:330,end:462,x:-6.1,height:6,width:6,choices:{},tunnel:true},
 {start:780,end:940,x:-5.8,height:6,width:6,choices:{0:0},tunnel:true},
 {start:860,end:1020,x:5.8,height:6,width:6,choices:{0:1},tunnel:true},
 {start:1600,end:1760,x:6.1,height:6,width:6,choices:{},tunnel:true},
 {start:1850,end:1898,x:0,height:6.8,width:6,choices:{},tunnel:true,isTrainRamp:true},
 {start:2520,end:2700,x:-5.8,height:6,width:6,choices:{1:0},tunnel:true},
 {start:2600,end:2780,x:5.8,height:6,width:6,choices:{1:1},tunnel:true},
 {start:2950,end:3130,x:-5.8,height:6,width:6,choices:{1:2},tunnel:true},
 {start:3820,end:4020,x:-6.1,height:6,width:6,choices:{},tunnel:true},
 {start:4080,end:4260,x:6.1,height:6,width:6,choices:{},tunnel:true},
 {start:4760,end:4940,x:-5.8,height:6,width:6,choices:{2:0},tunnel:true},
 {start:4860,end:5040,x:5.8,height:6,width:6,choices:{2:1},tunnel:true},
 {start:5800,end:6020,x:-6.1,height:6,width:6,choices:{},tunnel:true}
];
for(const r of roofDefs){
 roofs.push(r);
 const {start,end,x,height,width,choices,isTrainRamp}=r;
 const length=end-start,rampLen=isTrainRamp?38:35;
 const g=new THREE.BufferGeometry();
 const a=x-width/2,b=x+width/2;
 const pA0=worldPoint(a,start,choices),pA1=worldPoint(a,start+rampLen,choices);
 const pB0=worldPoint(b,start,choices),pB1=worldPoint(b,start+rampLen,choices);
 g.setAttribute('position',new THREE.Float32BufferAttribute([
  pA0.x,0,pA0.z,pA1.x,height,pA1.z,pB0.x,0,pB0.z,
  pB0.x,0,pB0.z,pA1.x,height,pA1.z,pB1.x,height,pB1.z
 ],3));
 g.computeVertexNormals();
 const rm=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:isTrainRamp?'#f6ad55':'#86b7b1',side:THREE.DoubleSide,roughness:.8}));
 rm.receiveShadow=true;rm.userData.routed=true;scene.add(rm);r.fallback=rm;
 if(!isTrainRamp){
  const exitGeometry=new THREE.BufferGeometry(),verts=[];
  for(const [dx,z] of [[a,end],[a,rampEnd(r)],[b,end],[b,end],[a,rampEnd(r)],[b,rampEnd(r)]]){const p=worldPoint(dx,z,choices);verts.push(p.x,roadHeight(r,z),p.z);}
  exitGeometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));exitGeometry.computeVertexNormals();
  const exitMesh=new THREE.Mesh(exitGeometry,rm.material);exitMesh.receiveShadow=true;exitMesh.userData.routed=true;city.add(exitMesh);r.exitFallback=exitMesh;
 }
 const sp=worldPoint(x,start-48,choices);
 const sign=label(isTrainRamp?'↑ JUMP THE TRAIN! ↑':(x<0?'RAMP / D >':'< A / RAMP'),'#34354c','#dcff84',isTrainRamp?6.5:5.5,1.4);
 sign.position.set(sp.x,3.7,sp.z);sign.rotation.y=sp.yaw+Math.PI;sign.userData.routed=true;city.add(sign);
 if(!isTrainRamp){
  const deckLen=length-rampLen,deckCenterZ=start+rampLen+deckLen/2;
  const dp=worldPoint(x,deckCenterZ,choices);
  r.railBridges=railBridges(r);
  // Stop the embankment walls on either side of a railway opening.
  for(const segment of rampSupportSegments(r))for(const side of [-1,1]){
   const p=worldPoint(x+side*(width/2-.25),(segment.start+segment.end)/2,choices);
   routedBox(.5,height,segment.end-segment.start,'#bf9895',p.x,height/2,p.z,p.yaw);
  }
  for(const bridge of r.railBridges){
   const length=bridge.end-bridge.start,center=(bridge.start+bridge.end)/2;
   const deck=worldPoint(x,center,choices);
   // Thin deck and steel edge girders leave the full train envelope clear.
   routedBox(width,.22,length,'#889698',deck.x,height-.11,deck.z,deck.yaw);
   for(const side of [-1,1]){
    const girder=worldPoint(x+side*(width/2-.12),center,choices);
    routedBox(.24,.65,length,'#435968',girder.x,height-.475,girder.z,girder.yaw);
    for(const z of [bridge.start-.5,bridge.end+.5]){
     const pier=worldPoint(x+side*(width/2-.25),z,choices);
     routedBox(.7,height-.25,.8,'#c3b2a0',pier.x,(height-.25)/2,pier.z,pier.yaw);
    }
   }
   for(const z of [bridge.start-.5,bridge.end+.5]){
    const beam=worldPoint(x,z,choices);
    routedBox(width+.2,.5,.8,'#435968',beam.x,height-.5,beam.z,beam.yaw);
   }
  }
  // Short routed panels keep the road seam aligned even on a bend.
  for(let z=start+rampLen;z<end;z+=4){
   const stop=Math.min(end,z+4),verts=[];
   for(const [dx,dz] of [[-width/2,z],[-width/2,stop],[width/2,z],[width/2,z],[-width/2,stop],[width/2,stop]]){const p=worldPoint(x+dx,dz,choices);verts.push(p.x,height,p.z);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
   const top=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:'#687779',side:THREE.DoubleSide}));top.userData.routed=true;city.add(top);
  }
  for(let tz=start+rampLen+15;tz<end-15;tz+=25){
   if(r.railBridges.some(gap=>tz+.4>gap.start&&tz-.4<gap.end))continue;
   const tp=worldPoint(x,tz,choices);
   const beam=box(width-.8,.12,.8,'#fff2b2',tp.x,2.75,tp.z,city);beam.userData.routed=true;
  }
  for(const side of [-1,1]){
   const cp=worldPoint(x+side*(width/2-.1),deckCenterZ,choices);
   routedBox(.1,.25,deckLen,'#f6d6aa',cp.x,height+.1,cp.z,cp.yaw);
  }

 }
}
const lowBeams=[
 {z:520,y:2.2,label:'▼ 2.2m LOW CLEARANCE · DUCK (C/S) ▼',ducked:false},
 {z:1550,y:2.2,label:'▼ 2.2m INDUSTRIAL BEAM · DUCK (C/S) ▼',ducked:false},
 {z:3850,y:2.2,label:'▼ 2.2m LOW CLEARANCE · DUCK (C/S) ▼',ducked:false}
];
for(const b of lowBeams){
 const bm=box(22,.4,1,'#505663',0,b.y+.2,b.z,city);bm.userData.routed=true;
 const c1=cylinder(.18,4,'#505663',-11,2,b.z,city);c1.userData.routed=true;
 const c2=cylinder(.18,4,'#505663',11,2,b.z,city);c2.userData.routed=true;
 const bl=label(b.label,'#34354c','#ffad9e',5.8,1.2);bl.position.set(0,b.y+.8,b.z);bl.rotation.y=Math.PI;bl.userData.routed=true;city.add(bl);
}
// Early District Tram Crossing at z = 410 (Right near the start!)
const EARLY_CROSSING_Z=RAIL_CROSSINGS[0].z;
const earlyTrainGroup=new THREE.Group();scene.add(earlyTrainGroup);
const earlyLamps=[];
for(const side of [-1,1]){
 cylinder(.15,5,'#656378',side*11.8,2.5,EARLY_CROSSING_Z-3,scene);
 const eSign=label('TRAM CROSSING','#f0f0f0','#222',3,1.1);eSign.position.set(side*11.8,4.5,EARLY_CROSSING_Z-3);eSign.rotation.y=side>0?-Math.PI/2:Math.PI/2;scene.add(eSign);
 for(const lx of [-1,1]){const lm=cylinder(.22,.15,'#ff3a55',side*11.8+lx*.8,4.8,EARLY_CROSSING_Z-2.9,scene);lm.rotation.x=Math.PI/2;earlyLamps.push(lm);}
}
box(150,.12,3.5,'#717382',0,-.05,EARLY_CROSSING_Z,scene);
for(const offset of [-1.1,1.1])box(150,.14,.14,'#9da8b3',0,.12,EARLY_CROSSING_Z+offset,scene);
for(let tx=-70;tx<=70;tx+=2.8)box(.35,.16,3.4,'#5a4738',tx,0,EARLY_CROSSING_Z,scene);
// Early Tram model
let eOffsetX=-35;
box(12,3.5,3.6,'#e53e3e',eOffsetX+6,1.75,0,earlyTrainGroup);
box(10,1.2,3.2,'#c53030',eOffsetX+5,3.2,0,earlyTrainGroup);
eOffsetX+=14;
box(5,.85,3,'#4a5568',eOffsetX+2.5,.42,0,earlyTrainGroup);eOffsetX+=6;
box(12,3.5,3.6,'#3182ce',eOffsetX+6,1.75,0,earlyTrainGroup);
eOffsetX+=13;
box(5,.85,3,'#4a5568',eOffsetX+2.5,.42,0,earlyTrainGroup);eOffsetX+=6;
box(10,3.3,3.6,'#38a169',eOffsetX+5,1.65,0,earlyTrainGroup);
const earlyTrain={cleared:false};

// Mid-City Crossing Train at z = 1920
const CROSSING_Z=RAIL_CROSSINGS[1].z;
const crossingTrainGroup=new THREE.Group();scene.add(crossingTrainGroup);
box(150,.12,4.5,'#717382',0,-.05,CROSSING_Z,scene);
for(let tx=-70;tx<=70;tx+=2.8)box(.35,.16,4.2,'#5a4738',tx,0,CROSSING_Z,scene);
for(let rz of [-1.2,1.2])box(150,.18,.2,'#9da8b3',0,.12,CROSSING_Z+rz,scene);
const crossingLamps=[];
for(const side of [-1,1]){
 cylinder(.15,6,'#656378',side*11.8,3,CROSSING_Z-3,scene);
 box(2,.2,.25,'#414052',side*11.8,5.8,CROSSING_Z-3,scene);
 const signCross=label('RAILROAD CROSSING','#f0f0f0','#222',3.2,1.2);
 signCross.position.set(side*11.8,5,CROSSING_Z-3);signCross.rotation.y=side>0?-Math.PI/2:Math.PI/2;scene.add(signCross);
 for(const lx of [-1,1]){
  const lampMesh=cylinder(.22,.15,'#ff3a55',side*11.8+lx*.8,5.8,CROSSING_Z-2.9,scene);
  lampMesh.rotation.x=Math.PI/2;
  crossingLamps.push(lampMesh);
 }
}
const cTrainColors=['#2b6cb0','#dd6b20','#2f855a','#b7791f'];
let carOffsetX=-55;
box(15,3.8,4.2,'#9b2c2c',carOffsetX+7.5,1.9,0,crossingTrainGroup);
box(13,1.4,3.8,'#742a2a',carOffsetX+6.5,3.7,0,crossingTrainGroup);
box(1,.6,.6,'#ffe4a8',carOffsetX+15,2.4,0,crossingTrainGroup);
carOffsetX+=17;
for(let ci=0;ci<4;ci++){
 box(5,.9,3.2,'#4a5568',carOffsetX+2.5,.45,0,crossingTrainGroup);carOffsetX+=6;
 box(12,3.6,3.6,cTrainColors[ci],carOffsetX+6,1.8,0,crossingTrainGroup);
 box(12.2,.12,3.65,'#edf2f7',carOffsetX+6,3.65,0,crossingTrainGroup);
 carOffsetX+=13;
}
box(8,3.2,3.6,'#6b46c1',carOffsetX+4,1.6,0,crossingTrainGroup);
const crossingTrain={cleared:false};
const parallelTrainGroup=new THREE.Group();scene.add(parallelTrainGroup);
const parallelTrain={
 z:2400,speed:82,length:84,width:3.4,x:-5.8,
 cars:[
  {offsetZ:35,length:14,height:3.8,type:'engine',color:'#a83232'},
  {offsetZ:19,length:12,height:3.5,type:'container',color:'#2b6cb0'},
  {offsetZ:9,length:5,height:1.1,type:'flatbed',color:'#4a5568'},
  {offsetZ:-2,length:12,height:4.5,type:'tall_container',color:'#c53030'},
  {offsetZ:-12,length:5,height:1.1,type:'flatbed',color:'#4a5568'},
  {offsetZ:-23,length:12,height:3.5,type:'container',color:'#2f855a'},
  {offsetZ:-35,length:10,height:3.2,type:'caboose',color:'#805ad5'}
 ]
};
for(const tc of parallelTrain.cars){
 if(tc.type==='engine'){
  box(3.2,3.8,tc.length,tc.color,0,1.9,tc.offsetZ,parallelTrainGroup);
  box(2.8,1.4,10,'#742a2a',0,3.6,tc.offsetZ-1,parallelTrainGroup);
 }else if(tc.type==='flatbed'){
  box(3,.9,tc.length,tc.color,0,.45,tc.offsetZ,parallelTrainGroup);
 }else{
  box(3.2,tc.height,tc.length,tc.color,0,tc.height/2,tc.offsetZ,parallelTrainGroup);
  box(3.3,.12,tc.length,'#edf2f7',0,tc.height,tc.offsetZ,parallelTrainGroup);
 }
}
const trainRing=new THREE.Mesh(new THREE.TorusGeometry(1.2,.12,6,18),mat('#55e6a5'));
trainRing.position.set(0,1.6,-40);parallelTrainGroup.add(trainRing);
const signalGantryZ=2850;
box(14,.5,1,'#475569',-5.8,5.1,signalGantryZ,city);
cylinder(.2,5.5,'#475569',-11.5,2.75,signalGantryZ,city);cylinder(.2,5.5,'#475569',0,2.75,signalGantryZ,city);
const gantrySign=label('▼ SIGNAL GANTRY · DUCK (S/C) ▼','#34354c','#ffad9e',5.5,1.2);
gantrySign.position.set(-5.8,5.8,signalGantryZ);gantrySign.rotation.y=Math.PI;city.add(gantrySign);
const obstacles=[];
function obstacle(x,z,type) {const group=new THREE.Group();group.position.set(x,0,z);city.add(group);if(type==='water'){box(5,.025,10,'#719ebc',0,.01,0,group);for(let j=0;j<4;j++)box(3,.03,.1,'#b3d9d9',0,.04,-3+j*2,group);}else if(type==='cone'){
  box(.95,.1,.95,'#4d5059',0,.05,0,group);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.43,1.15,10),mat('#f58b34'));cone.position.y=.675;group.add(cone);
  const stripe=new THREE.Mesh(new THREE.CylinderGeometry(.2,.28,.2,10),mat('#fff1d2'));stripe.position.y=.68;group.add(stripe);
 }else if(type==='barrier'){box(3.3,BARRIER_TOP-BARRIER_BOTTOM,.65,'#f1b37e',0,(BARRIER_TOP+BARRIER_BOTTOM)/2,0,group);for(let j=-1;j<=1;j++){const stripe=box(.35,BARRIER_TOP-BARRIER_BOTTOM,.69,'#fff0c5',j,(BARRIER_TOP+BARRIER_BOTTOM)/2,0,group);stripe.rotation.z=-.3;}box(.18,BARRIER_TOP,.3,'#746d85',-1.3,BARRIER_TOP/2,0,group);box(.18,BARRIER_TOP,.3,'#746d85',1.3,BARRIER_TOP/2,0,group);const cue=label('↓ DUCK','#34354c','#ecff9f',1.6,.4);cue.position.set(0,1.43,-.36);cue.rotation.y=Math.PI;group.add(cue);}else{box(2,1.8,2.2,'#709a91',0,.9,0,group);box(2.2,.2,2.4,'#496f74',0,1.85,0,group);}const record={x,z,type,mesh:group,hit:false};obstacles.push(record);group.userData.obstacle=record;}
for(let i=0;i<96;i++){const z=290+i*64;const lane=[0,5.8,-5.8][i%3];const roof=roofs.find(r=>Math.abs(lane-r.x)<3&&z>r.start-10&&z<rampEnd(r)+10);if(!roof)obstacle(lane,z,i%7===5?'water':i%3===0?'bin':i%5===1?'cone':'barrier');}
// Visible divider hazards alternate sides; a clear lane remains at every row.
for(let i=0;i<42;i++)obstacle(i%2?2.9:-2.9,370+i*144,i%3===0?'bin':'barrier');
const pickups=[];const stampGeo=new THREE.OctahedronGeometry(.55);const stampMat=new THREE.MeshStandardMaterial({color:'#e4ff80',emissive:'#98b442',emissiveIntensity:.4,metalness:.25,roughness:.3});
function stamp(x,y,z){const mesh=new THREE.Mesh(stampGeo,stampMat);mesh.position.set(x,y,z);scene.add(mesh);pickups.push({x,y,z,mesh,collected:false});}
for(let i=0;i<365;i++){const z=30+i*17;const lane=[-5.8,0,5.8][Math.floor(i/7)%3];if(!obstacles.some(o=>Math.abs(o.z-z)<7&&Math.abs(o.x-lane)<3)){const roof=roofs.find(r=>Math.abs(lane-r.x)<3&&z>=r.start&&z<=rampEnd(r));stamp(lane,roof?roadHeight(roof,z)+1.4:1.4,z);}}
for(const r of roofs)for(let z=r.start+45;z<r.end;z+=12)stamp(r.x,7.4,z);
for(const p of [...pickups]){const f=forkAt(p.z);p.choices=f?{[f.id]:0}:{};if(f)for(let i=1;i<f.offsets.length;i++){const mesh=new THREE.Mesh(stampGeo,stampMat);scene.add(mesh);pickups.push({...p,mesh,choices:{[f.id]:i}});}}
const cars=[];
function makeCar(x,z,index){
 const type=index%4===1?'bus':index%4===2?'semi':'car';
 const length=type==='car'?4.4:type==='bus'?10:15,width=type==='car'?2.4:3.1,height=type==='car'?2.3:type==='bus'?3.5:4.4;
 const group=new THREE.Group();scene.add(group);const color=['#e5b565','#87bdb4','#ce8299','#e3a588'][index%4];
 if(type==='car'){box(width,1,length,color,0,.95,0,group);box(2.1,.9,2.35,color,0,1.8,-.2,group);box(1.85,.65,.05,'#596c86',0,1.85,-1.4,group);}
 else if(type==='bus'){
  box(width,2.8,length,color,0,2,0,group);box(width+.1,.15,length,'#e9ddb7',0,height,0,group);
  for(const side of [-1,1])for(let zz=-3.8;zz<4.5;zz+=1.5)box(.03,1,1.1,'#526782',side*(width/2+.02),2.55,zz,group);
  box(2.6,1,.04,'#526782',0,2.55,length/2+.04,group);
 }else{
  box(width,3.4,10,'#b5accb',0,2.55,-2.2,group);box(width+.1,.12,10.1,'#f0d5ac',0,height,-2.2,group);
  box(2.9,2.6,3.5,color,0,1.9,5.4,group);box(2.5,1,.05,'#526782',0,2.5,7.18,group);
  for(const xx of [-1.65,1.65])cylinder(.14,3,'#d4d3d8',xx,2.7,3.7,group);
 }
 for(const side of [-1,1])for(const zz of [-length*.34,length*.34]){const wheel=cylinder(.5,.25,'#414254',side*width/2,.55,zz,group);wheel.rotation.z=Math.PI/2;}
 const lamps=[];for(const xx of [-.8,.8])lamps.push(box(.45,.28,.07,'#c7515e',xx,1,-length/2-.06,group));
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.8,.045,6,24),mat('#dcff84'));ring.rotation.x=Math.PI/2;ring.position.set(0,.13,-length/2);group.add(ring);
 cars.push({x,homeX:x,z,start:z,mesh:group,lamps,index,ring,type,length,width,height,choices:routeChoices(index),...trafficMotion(index,0),contact:false,driver:null});
}
for(let i=0;i<15;i++)makeCar([0,5.7,-5.7][i%3],-110+i*24,i);
for(const c of cars){c.x=trafficLane(c,roofs)??c.homeX;Object.assign(c,trafficSurface(c,roofs));}
const player=new THREE.Group();scene.add(player);
const boardFallback=new THREE.Group();player.add(boardFallback);
box(.95,.17,2.1,'#dbff78',0,.35,0,boardFallback);box(.6,.08,1.5,'#72638c',0,.46,0,boardFallback);
const skateboard=new Skateboard(player,boardFallback,Math.min(8,renderer.capabilities.getMaxAnisotropy()));
const body=new THREE.Group();player.add(body);
box(.3,.7,.35,'#4e5074',-.23,.87,-.2,body);box(.3,.65,.35,'#4e5074',.23,.85,.3,body);box(.45,.2,.55,'#fff0d6',-.23,.53,-.25,body);box(.45,.2,.55,'#fff0d6',.23,.52,.3,body);
const torso=box(.88,.94,.55,'#dc897d',0,1.58,0,body);torso.rotation.z=.06;
sphere(.35,'#d99d7e',0,2.37,.03,body);sphere(.37,'#42405b',0,2.56,-.05,body);box(.7,.13,.57,'#d6f193',0,2.57,.15,body);box(.6,.09,.4,'#d6f193',0,2.53,.42,body);
const armL=box(.24,.85,.25,'#dca184',-.6,1.55,.02,body);armL.rotation.z=-.4;const armR=box(.24,.85,.25,'#dca184',.6,1.55,.1,body);armR.rotation.z=.5;
const bag=box(.75,.72,.38,'#eac467',0,1.55,-.46,body);box(.16,.7,.03,'#9b7159',0,1.55,-.67,body);box(.3,.23,.04,'#fff0c6',.16,1.6,-.7,body);
const glider=new THREE.Group();player.add(glider);const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([-3,3.6,-.8,0,3.8,1.4,0,3.3,-1.2,0,3.8,1.4,3,3.6,-.8,0,3.3,-1.2],3));wingGeo.computeVertexNormals();glider.add(new THREE.Mesh(wingGeo,new THREE.MeshStandardMaterial({color:'#ffe6a0',side:THREE.DoubleSide})));box(.06,1.1,.06,'#72637a',0,2.85,0,glider);glider.visible=false;
const flightArt=new FlightArt(scene,roofs,glider);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.85,24),new THREE.MeshBasicMaterial({color:'#3f3b58',transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const boardShadow=shadow.clone();boardShadow.scale.set(.45,1.15,1);boardShadow.position.y=.01;skateboard.group.add(boardShadow);
// Folded wing pickups are distinct from stamps and persist for this run.
for(const z of [115,1500,3500,5550]){
 const mesh=new THREE.Group();
 const wing=new THREE.Mesh(wingGeo,new THREE.MeshBasicMaterial({color:'#75f5ed',side:THREE.DoubleSide}));
 wing.scale.setScalar(.38);wing.position.y=-1.25;mesh.add(wing);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.09,6,24),mat('#75f5ed'));mesh.add(ring);
 const sign=label('GLIDER','#283b4c','#75f5ed',2.7,.65);sign.position.y=1.65;sign.rotation.y=Math.PI;mesh.add(sign);
 scene.add(mesh);pickups.push({x:0,y:1.7,z,mesh,kind:'glider',choices:{},collected:false});
}
const exhaust=new BoosterExhaust(player);
const slideTrail=new SlideTrail(player);
for(const site of boosterSites(roofs,obstacles)){
 const art=createBoosterPickup(label);scene.add(art.mesh);
 pickups.push({...site,...art,kind:'booster',collected:false});
}
const rope=new HitchRope();scene.add(rope);rope.visible=false;
const finish=new THREE.Group();finish.position.z=COURSE_LENGTH;city.add(finish);box(17,.12,18,'#89b5a1',0,.08,0,finish);for(let x=-7;x<8;x+=2)for(let z=-5;z<=5;z+=2)if((x+z)%4===0)box(2,.02,2,'#e9e9b5',x,.16,z,finish);
for(const x of [-8,8]){box(.35,9,.35,'#e5c8aa',x,4.5,0,finish);sphere(.5,'#dbff84',x,9,0,finish);}const banner=label('DELIVERY!','#39354d','#e5ff93',15,2.7);banner.position.set(0,8,0);banner.rotation.y=Math.PI;finish.add(banner);
box(7,25,7,'#d9b698',0,12.5,35,finish);box(8,.7,8,'#f1d5ac',0,25,35,finish);const clockFace=label('12 : 00','#f9e6b8','#625976',5.5,3);clockFace.position.set(0,21,31.4);clockFace.rotation.y=Math.PI;finish.add(clockFace);
for(let i=0;i<10;i++){const x=(i%2===0?-1:1)*(10+random()*2),z=(i-5)*2;box(.6,1,.5,colors[i%colors.length],x,1,z,finish);sphere(.28,'#dba984',x,1.85,z,finish);}
function registerSolid(object,geometry,yaw){
 if(!['BoxGeometry','CylinderGeometry','ConeGeometry','IcosahedronGeometry'].includes(object.geometry.type))return;
 const p=geometry.attributes.position,c=Math.cos(yaw),s=Math.sin(yaw);
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,bottom=Infinity,top=-Infinity;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)*c-p.getZ(i)*s,z=p.getX(i)*s+p.getZ(i)*c;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);bottom=Math.min(bottom,p.getY(i));top=Math.max(top,p.getY(i));
 }
 if(top<=.25)return;
 const x=(minX+maxX)/2,z=(minZ+maxZ)/2;
 solidWorld.add({x:x*c+z*s,z:-x*s+z*c,bottom,top,halfX:(maxX-minX)/2,halfZ:(maxZ-minZ)/2,yaw,layer:object.userData.building?'fallbackBuildings':'fixtures',obstacle:object.parent?.userData.obstacle,obstacleInstance:object.parent?.userData.obstacleInstance,name:object.userData.solidName??object.parent?.userData.obstacle?.type.toUpperCase()??(top>10?'BRIDGE / BUILDING':'STREET FIXTURE')});
}
const movableObstacles=new MovableObstacles(scene,city,obstacles);
// Spatial batches: discard distant blocks, and draw untextured scenery in one pass per block.
city.updateMatrixWorld(true);
const staticChunks = new Map();
const batches = new Map();
const cityMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
city.traverse(object => {
 if(!object.isMesh)return;
 object.geometry.computeBoundingBox();
 const center=object.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(object.matrixWorld);
 const fork=forkAt(center.z);
 for(const branch of (object.userData.routed?[0]:routeOptions(center.z))){
  const choices=fork?{[fork.id]:branch}:{};
  const pose=routePose(center.z,choices);
  const chunk=Math.floor(center.z/80);
  const textured=!!object.material.map,key=chunk+':'+(object.userData.building?'building:':'')+(textured?object.material.uuid:'color');
  if(!batches.has(key))batches.set(key,{chunk,building:!!object.userData.building,material:textured?object.material:cityMaterial,geometries:[]});
  let geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
  if(!object.userData.routed){
   const transform=new THREE.Matrix4().makeTranslation(pose.x+center.x*Math.cos(pose.yaw),center.y,center.z-center.x*Math.sin(pose.yaw));
   transform.multiply(new THREE.Matrix4().makeRotationY(pose.yaw)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z));geometry.applyMatrix4(transform);
  }
  const yaw=new THREE.Euler().setFromQuaternion(object.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y+(object.userData.routed?0:pose.yaw);
  registerSolid(object,geometry,yaw);
  if(geometry.index){const indexed=geometry;geometry=geometry.toNonIndexed();indexed.dispose();}
  if(textured){if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));}
  else{geometry.deleteAttribute('uv');const colors=new Float32Array(geometry.attributes.position.count*3),color=object.material.color;for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));}
  batches.get(key).geometries.push(geometry);
 }
});
for(const object of scene.children){
 if(!object.isMesh)continue;object.updateMatrixWorld(true);
 const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
 registerSolid(object,geometry,object.rotation.y);geometry.dispose();
}
for(const i of movableObstacles.instances){
 i.mesh.updateMatrixWorld(true);
 i.mesh.traverse(object=>{if(!object.isMesh)return;const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);registerSolid(object,geometry,i.home.yaw);geometry.dispose();});
}
scene.remove(city);
for (const batch of batches.values()) {
 if (!staticChunks.has(batch.chunk)) { const group=new THREE.Group();staticChunks.set(batch.chunk,group);scene.add(group); }
 const geometry=mergeGeometries(batch.geometries);
 if (geometry) {const mesh=new THREE.Mesh(geometry,batch.material);staticChunks.get(batch.chunk).add(mesh);if(batch.building)buildingFallbacks.push(mesh);}
 for (const part of batch.geometries) part.dispose();
}
city.clear();
batches.clear();
// Vehicles and the placeholder courier also use one colored mesh per moving part.
function batchLocal(group, exceptions = []) {
 const parts=[];
 for(const child of [...group.children]) {
  if(!child.isMesh||exceptions.includes(child))continue;
  child.updateMatrix();
  let geometry=child.geometry.clone().applyMatrix4(child.matrix);
  if(geometry.index){const indexed=geometry;geometry=geometry.toNonIndexed();indexed.dispose();}
  geometry.deleteAttribute('uv');
  const colors=new Float32Array(geometry.attributes.position.count*3),color=child.material.color;
  for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(geometry);group.remove(child);
 }
 if(parts.length){group.add(new THREE.Mesh(mergeGeometries(parts),cityMaterial));for(const part of parts)part.dispose();}
}
for(const i of movableObstacles.instances)batchLocal(i.mesh,i.mesh.children.filter(child=>child.material?.map));
const coinSequence=new CoinSequence(pickups);
for(const p of pickups)if(p.kind==='booster')batchLocal(p.bottles);
for(const car of cars)batchLocal(car.mesh,[...car.lamps,car.ring]);
batchLocal(body);
batchLocal(player,[body,glider]);
const alex = new Alex(player, body);
const worldArt=new WorldArt({scene,cars,solidWorld,buildingSites,buildingFallbacks,earlyTrainGroup,crossingTrainGroup,parallelTrainGroup,parallelTrain,trainRing});
const environmentArt=new EnvironmentArt(scene);
for(const site of environmentArt.sites){
 const p=worldPoint(site.x,site.z,site.choices);
 solidWorld.add({x:p.x,z:p.z,halfX:site.radius,halfZ:site.radius,bottom:0,top:site.height,yaw:p.yaw,vehicleOnly:true,name:site.id==='tree0'?'TREE':'STREETLIGHT'});
}
const driverArt=new DriverArt(cars,label);
const thiefArt=new ThiefArt(scene);const birdArt=new BirdArt(scene);
const stampReady=installStampArt(pickups).catch(error=>console.error('Stamp load failed',error));
const npcs=[];
for(const {stop,jobIndex,variantIndex,kind} of JOB_STOPS){
 const group=new THREE.Group(),p=worldPoint(stop.x,stop.z,stop.choices);group.position.set(p.x,.1,p.z);group.rotation.y=p.yaw;scene.add(group);
 const color=kind==='pickup'?'#e7b878':'#95d8c7';
 box(.75,1.1,.55,color,0,1.2,0,group);sphere(.32,'#dba785',0,2.05,0,group);box(.25,.7,.3,'#56516e',-.2,.4,0,group);box(.25,.7,.3,'#56516e',.2,.4,0,group);box(.65,.6,.55,'#e8ca76',-.65,1.1,0,group);batchLocal(group);
 const fallback=new THREE.Group();for(const child of [...group.children])fallback.add(child);group.add(fallback);
 const sign=label(kind==='pickup'?'PICK UP':'DROP OFF','#34354c',kind==='pickup'?'#ffcd87':'#dbff84',6.5,1.9);sign.position.y=5.4;sign.rotation.y=Math.PI;sign.material=sign.material.clone();sign.material.depthTest=false;sign.material.depthWrite=false;sign.material.fog=false;sign.renderOrder=10;group.add(sign);
 const marker=new THREE.Mesh(new THREE.TorusGeometry(2.2,.18,6,32),new THREE.MeshBasicMaterial({color,fog:false}));marker.rotation.x=-Math.PI/2;marker.position.y=.15;group.add(marker);const halo=new THREE.Mesh(new THREE.RingGeometry(1.4,2.5,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false,fog:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.12;group.add(halo);
 const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.22,.6,6,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));beacon.position.y=3;group.add(beacon);
 npcs.push({group,stop,jobIndex,variantIndex,kind,marker,fallback,sign,beacon});
}
const deliveryArt=new DeliveryArt(npcs);
const handoffParcel=box(.55,.45,.4,'#e8ca76');handoffParcel.visible=false;
let transfer=null;
const sunBall=new THREE.Mesh(new THREE.SphereGeometry(17,24,16),new THREE.MeshBasicMaterial({color:'#ffdbad',fog:false}));sunBall.position.set(-75,70,240);scene.add(sunBall);
const sound=new GameAudio();let worldEntered=false;
// Browsers allow title music after the first tap/key gesture, not on a fresh load.
document.addEventListener('pointerdown',()=>{if(worldEntered&&!sound.context)sound.unlock(mode);},{capture:true});
document.addEventListener('keydown',()=>{if(worldEntered&&!sound.context)sound.unlock(mode);},{capture:true});
document.addEventListener('click',event=>{if(worldEntered&&event.target.closest('button,summary')){sound.unlock(mode);sound.play('click');}},{capture:true});
let state=newRun(),mode='loading',elapsed=0,toastTimer=0,last=performance.now();
const keys={left:false,right:false,accelerate:false,brake:false,duck:false};
const touchInput={target:null,brake:0,slide:0,accelerate:false};
let clearGestures=()=>{};
function clearKeys(){ for(const key of Object.keys(keys)) keys[key]=false;touchInput.target=null;touchInput.brake=0;touchInput.slide=0;touchInput.accelerate=false;clearGestures(); }let best=0;try{best=Number(localStorage.getItem('sky-courier-v3-best')||0);}catch{}
function tone(){sound.play('tick',0,.3);}
function toast(text,duration=2.4){
 if(matchMedia('(any-pointer: coarse)').matches)text=text.replace('W gas · S/C slide · A/D steer','Hold for gas · Swipe to steer/duck').replace(/press Space|Space/g,'tap').replace('then E','then tap the vehicle').replace('Shift uses one tank','BOOST uses one tank').replace('Shift / BOOST','Tap BOOST');
 $('toast').textContent=text;$('toast').style.opacity='1';toastTimer=duration;
}
function start(){if(!worldEntered)return;sound.unlock();sound.lastGrounded=true;sound.hornIn=8;deliveryArt.reset();movableObstacles.reset();environmentArt.contacts.clear();transfer=null;alex.reset();thiefArt.reset();birdArt.reset();state=newRun();coinSequence.reset();elapsed=0;mode='playing';clearKeys();for(const item of pickups){item.collected=false;item.mesh.visible=true;}for(const o of obstacles)o.hit=false;for(const c of cars){c.z=c.start;c.x=trafficLane(c,roofs)??c.homeX;c.braking=false;c.contact=false;Object.assign(c,trafficMotion(c.index,0),trafficSurface(c,roofs));c.driver=null;c.profileBraking=c.braking;}for(const id of ['menu','result','paused'])$(id).classList.add('hidden');$('hud').classList.remove('hidden');camera.position.set(0,3.6,-6.3);camera.fov=47;tone(420,.15);toast('First pickup: right sidewalk! W gas · S/C slide · A/D steer',3);updateHud();}
function boostBoard(){if(mode!=='playing')return;if(activateBooster(state)){toast('BOARD BOOST! · Shift uses one tank',1.5);}else toast(state.boosterTanks?'Finish this boost or recover · jump off vehicles / release hitch first':'Collect an orange BOOST tank first',1.4);}
function jump(){
 if(state.caught>0||state.handoff>0)return;
 if(mode!=='playing'||state.impact>0||state.caught>0||state.handoff>0)return;
 if(!state.grounded&&state.flightReady&&deployGlider(state)){state.tankBoost=0;sound.play('glider');toast(state.gliding?'Glider open':'Glider folded',1.2);}
 else if(beginJump(state)){sound.play('jump');}
 else state.jumpBuffer=JUMP_BUFFER;
}
function hitch(){
 if(mode!=='playing'||state.impact>0)return;
 if(state.hitch){const boosted=releaseHitch(state);toast(boosted?'SLINGSHOT! Catch the next ramp.':'Released · build charge for a slingshot');tone(700,.15);return;}
 const car=cars.filter(c=>sameRoute(state.z,state.choices,c.choices)&&canHitch(state,c)).sort((a,b)=>a.z-b.z)[0];
 if(car){state.hitch=car;state.charge=0;state.boost=0;state.tankBoost=0;toast('Hitched · charge, then E to slingshot');tone(220,.15);}
 else if(parallelTrain){
  const trainRearZ=parallelTrain.z-40;
  const trainDistZ=trainRearZ-state.z;
  if(trainDistZ>1&&trainDistZ<50&&Math.abs(state.x-(-5.8))<4&&state.y<2){
   state.hitch={speed:82,z:trainRearZ,length:10,index:99,warning:false,choices:{}};
   state.charge=0;state.boost=0;state.tankBoost=0;toast('Hitched to Freight Train! Charge, then E to slingshot');tone(220,.15);return;
  }
  toast('Get behind traffic or the train to hitch',1.5);
 }else toast('Get behind traffic to hitch',1.5);
}
function pause(){if(mode==='paused')sound.unlock();if(mode==='playing'){mode='paused';clearKeys();$('paused').classList.remove('hidden');}else if(mode==='paused'){mode='playing';$('paused').classList.add('hidden');}}
function end(success){sound.play(success?'goal':'grunt');state.finished=true;mode='result';state.hitch=null;rope.visible=false;$('result').classList.remove('hidden');const score=success?Math.round(state.completed*2500+state.stamps*100+state.condition*15+state.time*40):0;$('result-eyebrow').textContent=success?'SIGNED, SEALED, DELIVERED.':'EVERY COURIER STARTS SOMEWHERE.';$('result-title').textContent=success?'Special delivery!':state.condition<=0?'Rough ride.':'Missed the bell.';$('result-detail').textContent=success?`Main delivery complete. ${state.completed} of ${JOBS.length} neighborhood handoffs completed.`:state.condition<=0?'The package took a beating. Jump the barriers and give traffic a little room.':'Borrow more speed from traffic and keep your momentum between hitches.';$('result-stats').innerHTML=`<div><b>${state.stamps}</b><small>STAMPS</small></div><div><b>${Math.round(state.condition)}%</b><small>PACKAGE</small></div><div><b>${score.toLocaleString()}</b><small>SCORE</small></div>`;if(score>best){best=score;try{localStorage.setItem('sky-courier-v3-best',String(best));}catch{}}$('best').textContent=best?`PERSONAL BEST · ${best.toLocaleString()}`:'Fresh package. Fresh start.';if(success){tone(523,.2);setTimeout(()=>tone(659,.2),170);setTimeout(()=>tone(784,.4),340);}else tone(180,.3);}
function groundAt(x,z){
 const p=worldPoint(x,z,state.choices),support=solidWorld.support({...p,y:state.y});
 for(const r of roofs){
  if(sameRoute(z,state.choices,r.choices)&&Math.abs(x-r.x)<r.width/2&&z>=r.start&&z<=rampEnd(r)){
   const rampLength=r.isTrainRamp?38:35;
   if(r.tunnel&&state.y<2.2&&z>=r.start+rampLength&&z<=r.end) return 0;
   return Math.max(support,roadHeight(r,z));
  }
 }
 if(parallelTrain&&Math.abs(x-parallelTrain.x)<1.8){
  const relZ=z-parallelTrain.z;
  const car=parallelTrain.cars.find(c=>Math.abs(relZ-c.offsetZ)<=c.length/2+.3);
  if(car&&car.height>1.5)return car.height;
 }
 return support;
}
function collision(message,amount=12,force=false,direction='front'){if(damage(state,amount,force,direction)){alex.trigger(direction==='rear'?'hitbycar':'runinto',1.1);toast(message,1.6);sound.play(/BIRD/.test(message)?'birdHit':/STREETLIGHT/.test(message)?'pole':/TREE/.test(message)?'wood':/BUMPER|REAR IMPACT|BRAKE|bumper|TRAM|TRAIN/.test(message)?'car':/barrier/i.test(message)?'barrier':'construction');if(/BUMPER|REAR IMPACT|bumper/.test(message))sound.play('screech',0,.85);sound.play('grunt',0,.55);return true;}return false;}
function update(dt){
 const previousX=state.x;state.handoff=Math.max(0,(state.handoff||0)-dt);
 state.caught=Math.max(0,(state.caught||0)-dt);state.tripping=Math.max(0,(state.tripping||0)-dt);
 touchInput.brake=Math.max(0,touchInput.brake-dt);
 touchInput.slide=Math.max(0,touchInput.slide-dt);
 const controls={...keys,brake:keys.brake||touchInput.brake>0,accelerate:keys.accelerate||touchInput.accelerate};
 if(keys.left||keys.right)touchInput.target=null;
 if(touchInput.target!==null&&Math.abs(touchInput.target-state.x)<.1){state.x=touchInput.target;touchInput.target=null;}
 state.impact=Math.max(0,state.impact-dt);state.recovery=Math.max(0,state.recovery-dt);
 state.impactVelocity*=Math.exp(-8*dt);
 elapsed+=dt;state.time=Math.max(0,state.time-dt);state.invulnerable=Math.max(0,state.invulnerable-dt);state.boost=Math.max(0,state.boost-dt);state.tankBoost=Math.max(0,state.tankBoost-dt);state.roofCarry=Math.max(0,state.roofCarry-dt);
 const slidePressed=keys.duck||controls.brake||touchInput.slide>0;
 const standPoint={...worldPoint(state.x,state.z,state.choices),y:state.y};
 const canStand=!state.sliding||!solidWorld.sweep(standPoint,standPoint,1.4);
 if(stepArcadeActions(state,dt,slidePressed,canStand))sound.play('jump');
 const steer=(keys.left?1:0)-(keys.right?1:0)||(touchInput.target===null?0:Math.sign(touchInput.target-state.x));
 const steeringStep=touchInput.target===null?23*dt:Math.min(23*dt,Math.abs(touchInput.target-state.x));
 state.x=THREE.MathUtils.clamp(state.x+steer*steeringStep*(state.sliding?.6:1)*(state.caught>0||state.handoff>0?0:1),-11.5,11.5);
 for(const fork of FORKS){
  if(state.z>=fork.start-260&&state.z<fork.start){
   if(steer)state.choices[fork.id]=laneChoice(state.x,fork.offsets.length);
   else if(state.choices[fork.id]===undefined){
    const stop=activeStop(state);
    if(stop&&stop.choices&&stop.choices[fork.id]!==undefined)state.choices[fork.id]=stop.choices[fork.id];
    else state.choices[fork.id]=laneChoice(state.x,fork.offsets.length);
   }
  }
 }
 const previousY=state.y,previousZ=state.z;
 const railTraffic=[crossingMotion(0,elapsed),crossingMotion(1,elapsed)];
 const freightZ=2350+((elapsed*22.8)%1100);
 const movingTrains=[...crossingBodies(railTraffic),...parallelTrain.cars.map(c=>({x:parallelTrain.x,z:freightZ+c.offsetZ,halfX:parallelTrain.width/2,halfZ:c.length/2,bottom:0,top:c.height,yaw:0,name:'TRAIN'}))];
 for(const c of cars){
  const oldTraffic={x:c.x,z:c.z,y:c.y,slope:c.slope},previousSpeed=c.speed;
  c.previousX=c.x;
  const motion=trafficMotion(c.index,elapsed),brakeStarted=!(c.profileBraking??c.braking)&&motion.braking;
  c.profileBraking=motion.braking;
  Object.assign(c,motion);
  const limits=constrainTrafficSpeed(c,motion.speed,previousSpeed,dt,{crossings:railTraffic,cars,obstacles});
  c.speed=limits.speed;c.braking ||= limits.braking;c.warning ||= limits.warning;c.blockedBy=limits.blockedBy;
  const intent=driverIntent(c,state,elapsed,cars);
  if(intent.started){sound.play('horn',(c.x-state.x)/10,.65);toast('ANGRY DRIVER! Dodge the committed swerve.',1.25);}
  c.warning ||= intent.warning;
  if(c.aggressive&&brakeStarted&&(state.hitch===c||state.ride===c)){
   const wasRiding=state.ride===c;collision('BRAKE SLAM! Thrown off the vehicle.',16,true);state.grounded=false;state.vy=wasRiding?6:4;state.x=THREE.MathUtils.clamp(state.x+(state.x<=0?-2.3:2.3),-11.5,11.5);
  }
  c.z+=c.speed*dt/routePose(c.z,c.choices).pace;
  let recycled=false;
  if(c.z>state.z+300){c.z=state.z-90-Math.floor(c.index/3)*28;c.choices={...state.choices};c.x=trafficLane(c,roofs)??c.homeX;c.contact=false;c.driver=null;recycled=true;}
  if(c.z<state.z-220){c.z=state.z+240+c.index%3*24;c.choices={...state.choices};c.x=trafficLane(c,roofs)??c.homeX;c.contact=false;c.driver=null;recycled=true;}
  if(recycled){
   Object.assign(c,trafficSurface(c,roofs));
   for(const track of railTraffic)if(track.warning&&c.y<track.height&&Math.abs(c.z-track.z)<c.length/2+track.width/2+4){c.z=track.z-track.width/2-c.length/2-3;c.speed=0;}
   for(const o of obstacles)if(o.type==='bin'&&c.y<2&&Math.abs(c.x-o.x)<c.width/2+1.1&&Math.abs(c.z-o.z)<c.length/2+2.2){c.z=o.z-1.2-c.length/2-1;c.speed=0;}
  }
  const plannedLane=trafficLane(c,roofs,recycled?c.homeX:intent.targetX);
  const lane=plannedLane===null?null:courteousLaneTarget(c,state,plannedLane);
  const laneSpeed=c.driver?.phase==='lunge'?9:3.5;
  if(lane!==null)c.x+=THREE.MathUtils.clamp(lane-c.x,-laneSpeed*dt,laneSpeed*dt);
  else c.z-=c.speed*dt/routePose(c.z,c.choices).pace;
  guardTraffic(c,oldTraffic,roofs,cars);
  Object.assign(c,trafficSurface(c,roofs));
  if(!recycled){guardCrossings(c,oldTraffic,railTraffic);guardVehicleSolids(c,oldTraffic,roofs,solidWorld,movingTrains);}
  for(const lamp of c.lamps)lamp.material=mat(c.warning?'#ff3a55':'#a54f63');
  c.frameDX=c.x-oldTraffic.x;
  c.ring.visible=sameRoute(state.z,state.choices,c.choices)&&canHitch(state,c);
 }
 if(state.ride&&state.ride!==parallelTrain){
  const dx=state.ride.frameDX||0;state.x=THREE.MathUtils.clamp(state.x+dx,-11.5,11.5);
  if(touchInput.target!==null)touchInput.target+=dx;
 }
 movableObstacles.step(dt);
 if(controls.brake&&state.grounded&&!state.sliding){releaseHitch(state,false);state.boost=0;state.tankBoost=0;}
 if(state.hitch){
  const c=state.hitch;state.charge=Math.min(1.5,state.charge+dt);
  const gap=c.z-c.length/2-state.z;
  if(gap>65||Math.abs(state.x-c.x)>6||!sameRoute(state.z,state.choices,c.choices)){releaseHitch(state,false);toast('Rope released at the fork',1);}
  else if(gap<2){collision('Too close to the bumper!',12,true);state.z=c.z-c.length/2-3;}
 }
 state.speed=state.ride?(state.ride===parallelTrain?state.ride.speed:advanceRoofSpeed(state.speed,state.ride.speed,dt,{...controls,sliding:state.sliding})):advanceSpeed(state.speed,!!state.hitch,state.hitch?.braking,dt,{...controls,brake:controls.brake&&state.grounded,sliding:state.sliding,roofCarry:state.roofCarry,boost:state.boost,tankBoost:state.tankBoost,launchSpeed:state.launchSpeed,recovery:state.recovery,impact:state.impact},state.hitch?.speed);
 if(state.caught>0||state.handoff>0){state.speed=0;state.impactVelocity=0;}
 state.z=Math.max(0,state.z+(state.speed+state.impactVelocity)*dt/routePose(state.z,state.choices).pace);
 const contacts=new Set();
 for(const site of environmentArt.sites){
  if(!environmentArt.batches.some(batch=>batch.id===site.id)||site.z<Math.min(previousZ,state.z)-3||site.z>Math.max(previousZ,state.z)+3)continue;
  if(sceneryContact(site,state,{x:previousX,z:previousZ})){
   contacts.add(site);
   if(!environmentArt.contacts.has(site))collision(site.id==='tree0'?'TREE! Watch the sidewalk.':'STREETLIGHT! Watch the sidewalk.',10);
   state.x=site.x-Math.sign(site.x)*((site.id==='tree0'&&state.y>2.8?1.7:site.radius)+.42);
  }
 }
 environmentArt.contacts=contacts;
 const railX=rampRailContact(state,previousX,roofs);
 if(railX!==null){state.x=railX;state.speed=Math.max(35,state.speed-12*dt);}
 const ground=groundAt(state.x,state.z),oldGround=groundAt(state.x,previousZ);
 if(state.ride&&state.ride!==parallelTrain){
  const c=state.ride,edge=Math.abs(state.x-c.x)>c.width/2+.6||Math.abs(state.z-c.z)>c.length/2+.65||!sameRoute(state.z,state.choices,c.choices);
  const top=vehicleRoofHeight(c,state.z),stepDown=top<state.y-.65;
  if(edge||stepDown){
   armGlider(state);state.roofCarry=1.6;state.ride=null;state.grounded=false;state.vy=edge?2:0;
   if(edge){state.lastRoof=c;state.roofRecatch=.25;}
  }else state.y=top;
 }
 if(state.grounded&&!state.ride){
  if(ground<state.y-.3){armGlider(state);state.grounded=false;state.vy=4;toast(state.flightReady?'Rooftop exit · Space to glide':'Rooftop exit · collect a cyan glider to fly',1.3);}
  else if(ground>state.y+1.2){collision('Building edge! Jump earlier.');state.x+=state.x<0?1.8:-1.8;}
  else {state.y=ground;const launch=roofs.find(r=>r.isTrainRamp&&sameRoute(state.z,state.choices,r.choices)&&Math.abs(state.x-r.x)<r.width/2&&ground>=r.height-.1&&oldGround<r.height-.1);if(launch){armGlider(state);state.vy=jumpVelocity(state.speed);state.coyoteTime=0;state.airFlip=true;state.jumpSequence++;state.jumpFromY=state.y;state.grounded=false;sound.play('launch');toast(state.flightReady?'RAMP LAUNCH · Space to open glider!':'Ramp launch · collect a glider to fly!',1.8);}}
 }
 updateGlider(state,dt);
 if(!state.grounded){
  state.vy-=(state.gliding?9:jumpGravity(state))*dt;if(state.gliding)state.vy=Math.max(state.vy,-6);state.y+=state.vy*dt;
  if(ground>0&&state.vy<=0&&state.y<=ground+.1&&state.y>=ground-.85&&previousY>=ground-.95){
   state.y=ground;state.vy=0;state.grounded=true;state.gliding=false;
  }else if(state.vy<=0&&previousY>=ground-.1&&state.y<=ground){
   state.y=ground;state.vy=0;state.grounded=true;state.gliding=false;
  }else if(ground>0&&state.y<ground-.3&&oldGround<ground-.3&&state.y>2.2){
   collision('Clip! Clear the roof before landing.');state.x+=state.x<0?2:-2;
  }
  if(state.y<0){state.y=0;state.vy=0;state.grounded=true;state.gliding=false;}
 }
 const from={...worldPoint(previousX,previousZ,state.choices),y:previousY};
 const to={...worldPoint(state.x,state.z,state.choices),y:state.y};
 const bodyHeight=state.ducking?.65:1.4,solidHit=solidWorld.sweep(from,to,bodyHeight);
 if(solidHit){
  const hit=solidHit;if(hit.body.obstacle)hit.body.obstacle.hit=true;
  if(hit.body.obstacleInstance&&state.grounded&&hit.ny===0)knockObstacle(hit.body.obstacleInstance,state);
  if(hit.ny===1){state.y=hit.body.top;state.vy=0;state.grounded=true;state.gliding=false;state.ride=null;}
  else if(hit.ny===-1){state.y=hit.body.bottom-bodyHeight-.04;state.vy=Math.min(0,state.vy);collision('HEAD IMPACT! Clear the structure.',10);}
  else {
   const p={x:from.x+(to.x-from.x)*hit.t+hit.nx*(.03+(hit.depth??0)),z:from.z+(to.z-from.z)*hit.t+hit.nz*(.03+(hit.depth??0))};
   const course=coursePoint(p,state.choices);state.x=THREE.MathUtils.clamp(course.x,-11.5,11.5);state.z=course.z;
   collision(hit.body.name+'! Steer around the solid object.',10);
  }
 }
 const debrisTo={...worldPoint(state.x,state.z,state.choices),y:state.y};
 for(const instance of movableObstacles.tripContacts(from,debrisTo,bodyHeight)){
  if(tripOverRoadwork(state)){toast('TRIPPED! Jump over fallen roadwork.',1.3);sound.play('barrier');sound.play('grunt',0,.55);}
 }
 for(const c of cars){
  if(!sameRoute(state.z,state.choices,c.choices)){c.contact=false;continue;}
  if(state.ride===c||state.caught>0||state.handoff>0)continue;
  const contact=vehicleContact(state,c,previousY,{x:previousX,z:previousZ,y:previousY});
  if(contact==='land'){
   landOnVehicle(state,c);toast('Roof run · '+(c.type==='semi'?'semi':c.type==='bus'?'bus':'car')+' · Space to jump again',1.2);
  }else if(contact==='hit'){
   if(!c.contact){const rear=c.z<state.z;collision(rear?'REAR IMPACT! Knocked forward.':'BUMPER IMPACT! Knocked back.',c.aggressive?15:10,true,rear?'rear':'front');state.grounded=false;state.vy=5;state.x=THREE.MathUtils.clamp(state.x+(state.x<=c.x?-2.2:2.2),-11.5,11.5);}c.contact=true;
  }
  else c.contact=false;
 }
 for(const b of lowBeams){
  if(Math.abs(state.z-b.z)<1.8&&Math.abs(state.x)<10&&state.y<b.y){
   const headHeight=state.y+(state.ducking?.65:1.4);
   if(headHeight>b.y){
    collision('Low clearance beam! Duck with S or C to slide under.',12);
   }else if(state.ducking&&!b.ducked){
    b.ducked=true;toast('SLICK SLIDE! Ducked under the beam.',1.2);tone(740,.08);
   }
  }else if(Math.abs(state.z-b.z)>10){
   b.ducked=false;
  }
 }
 // Early tram motion at z = 410
 const eCrossing=railTraffic[0].active,eTrainX=railTraffic[0].x;
 earlyTrainGroup.position.set(eTrainX,0,EARLY_CROSSING_Z);
 earlyTrainGroup.visible=eCrossing;
 if(Math.abs(state.z-EARLY_CROSSING_Z)<120){
  for(let li=0;li<earlyLamps.length;li++)earlyLamps[li].material=mat((railTraffic[0].warning&&li%2===Math.floor(elapsed*4)%2)?'#ff2244':'#441118');
 }
 if(Math.abs(state.z-EARLY_CROSSING_Z)<2.4&&eCrossing){
  if(state.y>3.8){
   if(!earlyTrain.cleared){earlyTrain.cleared=true;toast('TRAM LEAP! Leaped over the tram!',1.6);tone(820,.15);}
  }else if(state.ducking&&state.y<1.15){
   if(!earlyTrain.cleared){earlyTrain.cleared=true;toast('TRAM SLIDE! Ducked under the tram flatbed!',1.6);tone(760,.12);}
  }else if(Math.abs(state.x-eTrainX)<30){
   collision('TRAM IMPACT! Duck under flatbeds or jump over!',16,true);
  }
 }else if(Math.abs(state.z-EARLY_CROSSING_Z)>25){
  earlyTrain.cleared=false;
 }
 // Mid crossing train motion at z = 1920
 const isCrossing=railTraffic[1].active,trainX=railTraffic[1].x;
 crossingTrainGroup.position.set(trainX,0,CROSSING_Z);
 crossingTrainGroup.visible=isCrossing;
 if(Math.abs(state.z-CROSSING_Z)<160){
  for(let li=0;li<crossingLamps.length;li++)crossingLamps[li].material=mat((railTraffic[1].warning&&li%2===Math.floor(elapsed*4)%2)?'#ff2244':'#441118');
 }
 if(Math.abs(state.z-CROSSING_Z)<2.6&&isCrossing){
  if(state.y>4.2){
   if(!crossingTrain.cleared){crossingTrain.cleared=true;toast('TRAIN LEAP! High flyover!',1.6);tone(820,.15);}
  }else if(state.ducking&&state.y<1.25){
   if(!crossingTrain.cleared){crossingTrain.cleared=true;toast('TRAIN SLIDE! Ducked under the crossing train!',1.6);tone(760,.12);}
  }else if(Math.abs(state.x-trainX)<48){
   collision('TRAIN IMPACT! Jump the ramp or time the crossing.',18,true);
  }
 }else if(Math.abs(state.z-CROSSING_Z)>30){
  crossingTrain.cleared=false;
 }
 parallelTrain.z=freightZ;
 parallelTrainGroup.position.set(-5.8,0,parallelTrain.z);
 parallelTrainGroup.visible=state.z>1800&&state.z<3600;
 const onTrainX=Math.abs(state.x-(-5.8))<1.8,trainRelZ=state.z-parallelTrain.z;
 if(onTrainX&&trainRelZ>-40&&trainRelZ<42){
  const activeCar=parallelTrain.cars.find(c=>Math.abs(trainRelZ-c.offsetZ)<=c.length/2+.3);
  const roofH=activeCar?activeCar.height:0;
  if(state.ride===parallelTrain){
   state.y=roofH;state.speed=82;
   if(Math.abs(state.z-signalGantryZ)<1.5){
    if(!state.ducking&&state.y>3.8){
     collision('SIGNAL GANTRY! Duck with S or C on the train.');
     state.ride=null;state.grounded=false;state.vy=4;
    }else if(state.ducking){
     toast('SLICK SLIDE! Ducked under the signal gantry.',1.3);tone(740,.08);
    }
   }
  }else if(!state.grounded&&state.vy<=0&&previousY>=roofH-.1&&state.y<=roofH+.15&&roofH>1.5){
   state.y=roofH;state.vy=0;state.grounded=true;state.gliding=false;state.ride=parallelTrain;
   toast('Riding the Freight Train! Jump across containers.',2);tone(520,.15);
  }
 }else if(state.ride===parallelTrain){
  state.ride=null;state.grounded=false;state.vy=2;
 }
 // Solid bins and barriers are handled by the swept geometry above. Only
 // water remains a proximity hazard; the ducking cue does not cause damage.
 for(const o of obstacles){
  if(o.hit)continue;
  if(o.type==='water'&&Math.abs(state.z-o.z)<5&&Math.abs(state.x-o.x)<2.6&&state.y<1.15){
   o.hit=true;collision('Water steals your momentum!',5);
  }else if(o.type==='barrier'&&!o.instances?.some(i=>i.knocked&&sameRoute(o.z,state.choices,i.choices))&&state.ducking&&state.y<.65&&previousZ<o.z&&state.z>=o.z&&Math.abs(state.x-o.x)<1.6){
   o.hit=true;toast('SLICK SLIDE! Ducked under the barrier.',1);tone(700,.08);
  }
 }
 if(state.grounded)updateGlider(state,0);
 coinSequence.advance(state,previousZ);
 for(const p of pickups){if(!p.collected&&Math.abs(state.z-p.z)<1.7&&Math.abs(state.x-p.x)<1.4&&Math.abs(state.y+1.3-p.y)<1.7&&sameRoute(state.z,state.choices,p.choices)){if(p.kind==='booster'&&!collectBooster(state))continue;p.collected=true;if(p.kind==='booster'){sound.play('pickup');toast('BOOST TANK +1 · Shift / BOOST · '+state.boosterTanks+'/3',2);}else if(p.kind==='glider'){state.hasGlider=true;toast('GLIDER EQUIPPED · launch or jump off a raised road, then Space!',3);tone(950,.2);}else{state.stamps++;sound.playCoin(coinSequence.collect(state));}}}
 const handoffStop=activeStop(state),handoffJob=state.jobIndex;
 if(handoffStop&&!state.carrying&&handoffStop.z-state.z>10&&handoffStop.z-state.z<60&&state.hurryStop!==handoffStop&&sameRoute(handoffStop.z,state.choices,handoffStop.choices)){state.hurryStop=handoffStop;sound.play('hurry',0,.8);}
 const jobEvent=updateJob(state);
 if(jobEvent){if(jobEvent==='delivery')sound.play('thanks');if(jobEvent!=='missed')sound.play(jobEvent==='pickup'?'pickup':'delivery');
  if(jobEvent!=='missed'){
   const npc=npcs.find(n=>n.jobIndex===handoffJob&&n.stop===handoffStop);
   deliveryArt.handoff(npc);state.handoff=HANDOFF_SECONDS;state.handoffSide=Math.sign(handoffStop.x);state.speed=0;state.hitch=null;state.boost=0;state.tankBoost=0;
   state.x=handoffStop.x-Math.sign(handoffStop.x)*1.3;state.z=handoffStop.z;
   alex.trigger(jobEvent==='pickup'?'take':'give',HANDOFF_SECONDS);transfer={stop:handoffStop,kind:jobEvent};
  }
  toast(jobEvent==='pickup'?'PACKAGE RECEIVED! Follow the green delivery marker.':jobEvent==='delivery'?'DELIVERED! +2,500 BONUS':'Missed that handoff. Next stop marked.',2.5);tone(jobEvent==='missed'?200:800,.2);
 }
 thiefArt.step(dt,state,event=>{
  if(event==='warning'){sound.play('thief');toast('SIDEWALK THIEF! Dodge or jump the tackle.',1.5);}
  if(event==='caught'){
   damage(state,18,true);state.caught=1.4;state.impact=0;state.impactVelocity=0;state.speed=0;state.vy=0;state.y=0;state.grounded=true;
   toast('TACKLED! Get back on your board.',2);sound.play('tackle');sound.play('grunt');
  }
 });
 birdArt.step(dt,state,event=>{
  if(event==='warning'){toast('BIRD DIVE! Move aside · ground riders can duck.',1.6);sound.play('bird');}
  if(event==='hit')collision('BIRD STRIKE! Dodge the orange target.',8);
 });
 if(state.z>=COURSE_LENGTH&&state.condition>0)end(true);else if(state.time<=0||state.condition<=0)end(false);
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').style.opacity=0;}
}
function updateHud(){document.getElementById('boost-status').textContent=state.tankBoost>0?'BOOSTING · '+state.tankBoost.toFixed(1)+'s':'BOOST · '+state.boosterTanks+'/3 TANKS · SHIFT';document.getElementById('touch-boost').textContent=state.tankBoost>0?'BOOSTING!':'BOOST · '+state.boosterTanks+'/3';document.getElementById('touch-boost').classList.toggle('charged',state.boosterTanks>0);
 const rear=cars.filter(c=>{
  const gap=state.z-c.z-c.length/2,closing=c.speed-state.speed;
  return gap>0&&closing>0&&gap/closing<1.8&&Math.abs(c.x-state.x)<c.width/2+2&&state.y<c.height&&sameRoute(state.z,state.choices,c.choices);
 }).sort((a,b)=>(state.z-a.z-a.length/2)/(a.speed-state.speed)-(state.z-b.z-b.length/2)/(b.speed-state.speed))[0];
 $('rear-warning').textContent=rear?`${rear.type.toUpperCase()} FROM BEHIND · ${rear.x>state.x+.8?'LEFT':rear.x<state.x-.8?'RIGHT':'MOVE ASIDE'} ↑`:'';
 $('glider-status').textContent=state.gliding?`GLIDER · ${state.glideRemaining.toFixed(1)}s LEFT`:state.flightReady?'GLIDER READY · SPACE TO OPEN':state.hasGlider?'GLIDER EQUIPPED · USE A RAMP / ROOFTOP':'GLIDER · COLLECT A CYAN WING';
 const seconds=Math.ceil(state.time);$('time').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;$('time').style.color=seconds<20?'#ffad9e':'';$('speed').textContent=Math.round(state.speed*2.5);$('stamps').textContent=String(state.stamps).padStart(2,'0');$('condition').textContent=`${Math.round(state.condition)}%`;$('progress').style.width=`${Math.min(100,state.z/COURSE_LENGTH*100)}%`;$('district').textContent=state.z<COURSE_LENGTH/3?'01 / PAINTWORKS DISTRICT':state.z<COURSE_LENGTH*2/3?'02 / SUNSET VIADUCT':'03 / CLOCKTOWER SQUARE';const hint=$('hitch-hint');if(state.hitch){hint.style.display='block';const phase=(elapsed+state.hitch.index*2.7)%12;hint.textContent=state.hitch.warning?'BRAKE LIGHTS! RELEASE NOW':state.charge>=.5?(matchMedia('(any-pointer: coarse)').matches?'CHARGED · TAP VEHICLE TO SLINGSHOT':'CHARGED · E TO SLINGSHOT'):'CHARGING ROPE…';hint.style.background=state.hitch.warning?'#ffb29d':'#dbff78';}else{hint.style.background='#dbff78';hint.style.display=cars.some(c=>sameRoute(state.z,state.choices,c.choices)&&canHitch(state,c))?'block':'none';hint.textContent=matchMedia('(any-pointer: coarse)').matches?'TAP A VEHICLE TO HITCH':'BORROW SOME SPEED · E / HITCH';}$('touch-hitch').textContent=state.hitch?'SLING':'HITCH';updateDeliveryHud();drawMap();$('touch-jump').textContent=!state.grounded?(state.gliding?'FOLD':state.flightReady?'GLIDE':'JUMP'):'JUMP';}
const look=new THREE.Vector3(),desired=new THREE.Vector3();
let hudElapsed=0, frameTotal=0, frameCount=0, fps=0, measuredCalls=0, qualityTimer=0;
function updatePerformance(frameDelta) {
 frameTotal+=frameDelta; frameCount++; qualityTimer+=frameDelta;
 if(frameTotal>=1){fps=Math.round(frameCount/frameTotal);frameTotal=0;frameCount=0;$('performance').textContent=`${fps} FPS · ${Math.round(renderer.getPixelRatio()*100)}% · ${measuredCalls} DRAWS`;}
 if(qualityTimer>=3){qualityTimer=0;if(mode==='playing'&&['min','low'].includes(quality)&&fps>0&&fps<55&&renderScale>.4){renderScale=Math.max(.4,Math.min(renderScale,renderer.getPixelRatio())-.05);resizeRenderer();}}
}
function chooseRoute(index){
 const f=FORKS.find(f=>state.z>=f.start-260&&state.z<f.start+50);
 if(f&&index<f.offsets.length){
  const oldChoice=choiceFor(f,state.choices);
  const oldOffset=routeOffset(state.z,oldChoice);
  const newOffset=routeOffset(state.z,index);
  state.choices[f.id]=index;
  state.x=THREE.MathUtils.clamp(state.x+(oldOffset-newOffset),-11.5,11.5);
  toast('Route: '+f.names[index],1);
 }
}
function updateRouteHint(){
 const fork=FORKS.find(f=>state.z>=f.start-260&&state.z<f.start+80),hint=$('route-hint');
 if(fork){
  const dist=fork.start-state.z;
  hint.textContent=`${fork.offsets.length}-WAY FORK · ${dist>0?Math.round(dist)+'m':'ENTERING'} · ${fork.names[choiceFor(fork,state.choices)]}`;
  hint.style.display='block';
 }
 else if(state.tankBoost>0){hint.textContent='BOARD BOOST · '+state.tankBoost.toFixed(1)+'s';hint.style.display='block';}
 else if(state.boost>0){hint.textContent='SLINGSHOT · '+state.boost.toFixed(1)+'s';hint.style.display='block';}
 else if(state.ride){hint.textContent='RIDING '+state.ride.type.toUpperCase()+' · SPACE TO JUMP';hint.style.display='block';}
 else {const r=roofs.find(r=>state.z>=r.start-110&&state.z<r.start+10);const roofTip=state.hasGlider&&(state.flightReady||state.grounded&&state.y>3);hint.style.display=r||roofTip?'block':'none';hint.textContent=r?(r.x<0?'RIGHT RAMP · D / →':'LEFT RAMP · A / ←'):(state.flightReady?'GLIDER READY · SPACE TO FLY':'ROOFTOP · JUMP, THEN SPACE TO GLIDE');}
 const buttons=$('fork-buttons');buttons.classList.toggle('hidden',!fork||state.z>=fork.start+50);
 for(let i=0;i<4;i++){const button=buttons.children[i];button.hidden=!fork||i>=fork.offsets.length;if(fork&&i<fork.offsets.length){button.textContent=(i+1)+' · '+fork.names[i];button.classList.toggle('chosen',choiceFor(fork,state.choices)===i);}}
}
function updateDeliveryHud(){const stop=activeStop(state),cue=document.getElementById('delivery-cue'),distance=stop?stop.z-state.z:Infinity;cue.style.display=distance>=-5&&distance<220?'block':'none';cue.style.background=state.carrying?'#baf58d':'#ffca79';cue.textContent=stop?[(stop.x<state.x?'→':'←'),state.carrying?'DELIVER':'PICK UP',Math.max(0,Math.round(distance))+'m',stop.x<0?'RIGHT SIDEWALK':'LEFT SIDEWALK'].join(' · '):'';$('delivery-count').textContent=state.completed+'/'+JOBS.length;$('job-text').textContent=stop?`${state.carrying?'DROP':'PICK UP'} · ${stop.name} · ${stop.x<0?'RIGHT':'LEFT'} · ${Math.max(0,Math.round(stop.z-state.z))}m`:'All neighborhood stops passed · Clocktower finish';}
const mapCanvas=$('mini-map'),mapCtx=mapCanvas.getContext('2d');
function drawMap(){
 const ctx=mapCtx,w=160,h=170,start=state.z-70,range=900;ctx.clearRect(0,0,w,h);ctx.fillStyle='#29243ce8';ctx.fillRect(0,0,w,h);
 const point=(x,z)=>[w/2-x*.43,h-(z-start)/range*h];
 for(let route=0;route<4;route++){ctx.beginPath();for(let z=start;z<start+range;z+=8){const f=forkAt(z),choice=f?Math.min(route,f.offsets.length-1):0,p=point(routeOffset(z,choice),z);if(z===start)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.strokeStyle='#92859f';ctx.lineWidth=3;ctx.stroke();}
 ctx.beginPath();for(let z=start;z<start+range;z+=8){const p=point(routePose(z,state.choices).x,z);if(z===start)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.strokeStyle='#dbff78';ctx.lineWidth=2;ctx.stroke();
 const stop=activeStop(state);if(stop){const p=worldPoint(stop.x,stop.z,stop.choices),[x,y]=point(p.x,p.z);ctx.fillStyle=state.carrying?'#dbff78':'#ffbf84';ctx.beginPath();ctx.arc(x,Math.max(8,Math.min(h-8,y)),5,0,Math.PI*2);ctx.fill();}
 for(const entry of JOB_STOPS){
  if(entry.jobIndex<state.jobIndex||entry.stop.z<start||entry.stop.z>start+range||entry.stop===stop)continue;
  if(entry.jobIndex===state.jobIndex&&state.carrying&&entry.kind==='pickup')continue;
  const p=worldPoint(entry.stop.x,entry.stop.z,entry.stop.choices),[x,y]=point(p.x,p.z);
  ctx.fillStyle=entry.kind==='pickup'?'#ffbf84':'#8ee5a5';ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 }
 for(const thief of thiefArt.thieves){
  if(thief.phase==='spent'||thief.z<start||thief.z>start+range)continue;
  const p=worldPoint(thief.x,thief.z,thief.choices),[x,y]=point(p.x,p.z);
  ctx.fillStyle='#ff7373';ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+4,y);ctx.lineTo(x,y+4);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();
 }
 const p=worldPoint(state.x,state.z,state.choices),[x,y]=point(p.x,p.z);ctx.fillStyle='#fff5de';ctx.beginPath();ctx.moveTo(x,y-6);ctx.lineTo(x-4,y+4);ctx.lineTo(x+4,y+4);ctx.closePath();ctx.fill();
}
function draw(now){requestAnimationFrame(draw);const frameDelta=Math.max(0,(now-last)/1000);last=now;const dt=Math.min(frameDelta,.25);
 if(mode==='playing'){
  if(frameDelta>2){pause();}else simulateFrame(frameDelta,step=>{if(mode==='playing')update(step);});
 }
 hudElapsed+=dt;if(hudElapsed>=.1){hudElapsed=0;updateHud();updateRouteHint();}
 updatePerformance(frameDelta);
 sound.update(dt,state,cars,mode);
 const t=now/1000;
 if(menuPresentation!==(mode==='menu')){menuPresentation=mode==='menu';resizeRenderer();}
 skateboard.present(menuPresentation||state.caught>0||state.gliding);boardShadow.visible=menuPresentation;
 alex.group.position.y=menuPresentation||state.caught>0?-.46:0;
 if(mode==='menu'){
  body.position.y=-.46;body.scale.set(1,1,1);body.rotation.set(0,0,0);
  earlyTrainGroup.visible=false;crossingTrainGroup.visible=false;parallelTrainGroup.visible=false;
  player.position.set(0,0,12);player.rotation.set(0,Math.PI+.12,0);player.scale.set(1,1,1);player.visible=true;
  // Leave the left side for the title and put the dancer in the open right side.
  const portrait=innerWidth<760;
  camera.position.set(0,2.4,portrait?5.1:5.7);camera.fov=43;
  look.set(portrait?1.1:1.65,1.65,12);camera.lookAt(look);camera.updateProjectionMatrix();
  sun.position.set(-12,20,4);sun.target.position.set(0,1,12);
 }
 else{
  const p=worldPoint(state.x,state.z,state.choices),ahead=worldPoint(state.x*.6,state.z+8,state.choices),behind=worldPoint(state.x*.75,state.z-6.3,state.choices);
  player.position.set(p.x,state.y+Math.sin(t*7)*.04,p.z);const steer=(keys.right?1:0)-(keys.left?1:0);player.rotation.z=THREE.MathUtils.lerp(player.rotation.z,-steer*.17,.15);player.rotation.y=p.yaw-steer*.1;
  if(state.ducking){body.position.y=-.48;body.scale.set(1,.6,1.25);body.rotation.x=.62;}
  else{body.position.y=0;body.scale.set(1,1,1);body.rotation.x=state.hitch?.12:-.06;}
  player.visible=true;glider.visible=state.gliding;
  // Keep the street readable instead of lifting the camera through the full hop.
  const jumpLift=!state.grounded&&!state.gliding?Math.max(0,state.y-state.jumpFromY):0;
  desired.set(behind.x,state.y-jumpLift*.35+(state.ducking?3.1:3.6),behind.z);camera.position.lerp(desired,1-Math.exp(-dt*(state.impact>0?4:10)));look.set(ahead.x,state.y-jumpLift*.2+.2,ahead.z);camera.fov=THREE.MathUtils.lerp(camera.fov,47+Math.min(5,Math.max(0,state.speed-72)*.16),1-Math.exp(-dt*3));camera.updateProjectionMatrix();if(state.handoff>0&&transfer){const n=worldPoint(transfer.stop.x,transfer.stop.z,transfer.stop.choices);const center=new THREE.Vector3((p.x+n.x)/2,1.25,(p.z+n.z)/2);const back=worldPoint((state.x+transfer.stop.x)/2,state.z-7.5/Math.min(1,camera.aspect),state.choices);camera.position.set(back.x,3.8,back.z);camera.fov=48;camera.updateProjectionMatrix();look.copy(center);}
  camera.lookAt(look);sunBall.position.set(p.x-75,70,p.z+230);
 }
 shadow.position.set(player.position.x,(state.ride?vehicleRoofHeight(state.ride,state.z):groundAt(state.x,state.z))+.08,player.position.z);shadow.scale.setScalar(1+state.y*.08);
 rope.visible=!!state.hitch;if(state.hitch){const a=worldPoint(state.x,state.z,state.choices),b=worldPoint(state.hitch.x,state.hitch.z-state.hitch.length/2-.17,state.hitch.choices);rope.update(new THREE.Vector3(a.x,state.y+1.45,a.z),new THREE.Vector3(b.x,(state.hitch.y??0)-(state.hitch.slope??0)*state.hitch.length/2+.7,b.z),state.charge,t,b.yaw);}
 const viewZ=mode==='menu'?12:state.z;
 movableObstacles.draw(viewZ);
 worldArt.update(viewZ,camera,GRAPHICS[quality]);flightArt.update(viewZ);
 environmentArt.update(viewZ,camera,GRAPHICS[quality]);thiefArt.draw(dt,viewZ,mode);birdArt.draw(dt,viewZ,mode);
 for(const [chunk,group] of staticChunks) group.visible=chunk==='road'||(chunk*80<viewZ+175&&(chunk+1)*80>viewZ-30);
 for(const car of cars){car.mesh.visible=car.z>viewZ-25&&car.z<viewZ+175;if(car.mesh.visible){const p=worldPoint(car.x,car.z,car.choices);car.mesh.position.set(p.x,car.y,p.z);car.mesh.rotation.set(0,p.yaw,0);car.mesh.rotateX(car.pitch);}}
 driverArt.update(t,camera);
 for(const npc of npcs){npc.group.visible=npc.stop.z>viewZ-25&&npc.stop.z<viewZ+170;const active=npc.stop===activeStop(state);npc.marker.visible=true;npc.marker.scale.setScalar(active?1+Math.sin(t*4)*.12:.85);npc.beacon.visible=active;npc.sign.scale.setScalar(active?1.15:.8);npc.sign.quaternion.copy(camera.quaternion).premultiply(npc.group.quaternion.clone().invert());}
 for(const p of pickups){p.mesh.visible=!p.collected&&p.z>viewZ-8&&p.z<viewZ+150;if(p.mesh.visible){const pos=worldPoint(p.x,p.z,p.choices);p.mesh.position.set(pos.x,p.y+Math.sin(t*3+p.z)*.15,pos.z);if(p.kind==='booster'){p.bottles.rotation.y=t*1.8;p.sign.quaternion.copy(camera.quaternion);}else p.mesh.rotation.y=t*1.8;}}
 if(state.handoff>0)player.rotation.y=worldPoint(state.x,state.z,state.choices).yaw+state.handoffSide*Math.PI/2;
 deliveryArt.update(dt,mode);
 handoffParcel.visible=mode==='playing'&&state.handoff>0&&!!transfer;
 if(handoffParcel.visible){const a=worldPoint(transfer.stop.x,transfer.stop.z,transfer.stop.choices),b=worldPoint(state.x,state.z,state.choices);const t=transfer.kind==='pickup'?1-state.handoff/HANDOFF_SECONDS:state.handoff/HANDOFF_SECONDS;handoffParcel.position.set(THREE.MathUtils.lerp(a.x,b.x,t),1.35+Math.sin(t*Math.PI)*.15,THREE.MathUtils.lerp(a.z,b.z,t));}
 alex.update(dt,state,mode,keys.accelerate||touchInput.accelerate);
 exhaust.update(elapsed,state.tankBoost>0&&mode!=='menu'&&mode!=='result');
 slideTrail.update(elapsed,state.sliding&&state.grounded&&mode==='playing');
 updateBoardTricks(skateboard.group,state,dt);
 renderer.render(scene,camera);measuredCalls=renderer.info.render.calls;
}
const inputMap={a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',w:'accelerate',ArrowUp:'accelerate',s:'brake',ArrowDown:'brake',c:'duck',C:'duck',Control:'duck'};
window.addEventListener('keydown',event=>{
 if(event.target instanceof HTMLSelectElement||event.target instanceof HTMLInputElement) return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Escape'].includes(event.key))event.preventDefault();
 if(event.key==='Escape'&&!event.repeat){pause();return;}
 if(mode!=='playing')return;
 const action=inputMap[event.key]||inputMap[event.key.toLowerCase()];if(action)keys[action]=true;
 if(!event.repeat&&['1','2','3','4'].includes(event.key))chooseRoute(Number(event.key)-1);
 if(!event.repeat&&event.key===' ')jump();
 if(!event.repeat&&event.key.toLowerCase()==='e')hitch();
 if(!event.repeat&&(event.key==='Shift'||event.key.toLowerCase()==='b'))boostBoard();
});
window.addEventListener('keyup',event=>{const action=inputMap[event.key]||inputMap[event.key.toLowerCase()];if(action)keys[action]=false;});
const raycaster=new THREE.Raycaster();
function tapVehicle(x,y){
 const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);
 const hits=raycaster.intersectObjects(cars.filter(c=>c.mesh.visible).map(c=>c.mesh),true);
 if(!hits.length)return false;
 const car=cars.find(c=>{let o=hits[0].object;while(o){if(o===c.mesh)return true;o=o.parent;}return false;});
 if(car===state.hitch)hitch();else if(car&&sameRoute(state.z,state.choices,car.choices)&&canHitch(state,car)){
  state.hitch=car;state.charge=0;state.boost=0;state.tankBoost=0;toast('Hitched · tap again to slingshot');tone(220,.15);
 }else toast('Get closer to hitch.',1.5);
 return true;
}
canvas.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&mode==='playing')tapVehicle(event.clientX,event.clientY);});
clearGestures=installGestures(canvas,{
 active:()=>mode==='playing',gas:value=>{touchInput.accelerate=value;},
 swipe(direction){if(mode!=='playing')return;if(direction==='up')jump();else if(direction==='down')touchInput.slide=.2;
  else touchInput.target=THREE.MathUtils.clamp((touchInput.target??state.x)+(direction==='left'?2.85:-2.85),-11.5,11.5);},
 tap(x,y){if(state.hitch)hitch();else if(!tapVehicle(x,y))jump();},
});
const gestureHelp=document.createElement('p');gestureHelp.className='gesture-help';
gestureHelp.textContent='Swipe sideways to steer · Up or tap to jump/glide · Down to slide · Tap BOOST for NOS · Hold to accelerate · Tap a vehicle to hitch; tap again to release.';
$('start').after(gestureHelp);
window.addEventListener('blur',()=>{if(mode==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys[button.dataset.key]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys[button.dataset.key]=false);}
$('touch-boost').addEventListener('pointerdown',event=>{event.preventDefault();boostBoard();});
$('touch-jump').addEventListener('pointerdown',event=>{event.preventDefault();jump();});$('touch-hitch').addEventListener('pointerdown',event=>{event.preventDefault();hitch();});
for(let i=0;i<4;i++)$('fork-buttons').children[i].onclick=()=>chooseRoute(i);
$('start').onclick=start;$('restart').onclick=start;$('pause-restart').onclick=start;$('pause').onclick=pause;$('resume').onclick=pause;$('home').onclick=()=>{mode='menu';state=newRun();player.visible=true;glider.visible=false;rope.visible=false;$('result').classList.add('hidden');$('hud').classList.add('hidden');$('menu').classList.remove('hidden');};
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();resizeRenderer();});
for(const key of ['music','effects']){const input=document.getElementById('volume-'+key);input.value=Math.round(sound.settings[key]*100);input.addEventListener('input',()=>sound.setVolume(key,input.value/100));}
$('quality').value=quality;
$('quality').addEventListener('change',event=>{quality=event.target.value;renderScale=GRAPHICS[quality].scale;try{localStorage.setItem('courier-graphics',quality);}catch{}resizeRenderer();event.target.blur();});
if(import.meta.env.PROD&&'serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(console.warn);
loadWorld([
 ['Alex and animations',alex.ready,()=>!!alex.mixer],['Skateboard',skateboard.ready,()=>!!skateboard.model],
 ['Buildings and traffic',worldArt.ready,()=>!worldArt.errors.length],['Trees and lights',environmentArt.ready,()=>!environmentArt.errors.length],
 ['Delivery characters',deliveryArt.ready,()=>deliveryArt.actors.length===npcs.length],['Thieves',thiefArt.ready,()=>thiefArt.actors.length===thiefArt.thieves.length],
 ['Birds',birdArt.ready,()=>!birdArt.errors.length],['Ramps and glider',flightArt.ready,()=>!flightArt.errors.length],
 ['Stamps',stampReady,result=>!!result],['Music and sound effects',sound.preload()],
],async()=>{const textures=new Set();scene.traverse(o=>{for(const material of (Array.isArray(o.material)?o.material:[o.material]))if(material?.map)textures.add(material.map);});for(const texture of textures)renderer.initTexture(texture);await renderer.compileAsync(scene,camera);},()=>{worldEntered=true;mode='menu';sound.unlock('menu');sound.play('click');last=performance.now();requestAnimationFrame(draw);});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('benchmark')) {
 import('./benchmark.js').then(({benchmark})=>benchmark({
  ready:Promise.all([alex.ready,worldArt.ready,skateboard.ready,environmentArt.ready,thiefArt.ready,stampReady,deliveryArt.ready]),renderer,
  prepare(z){start();state.z=z;state.choices={0:0,1:1,2:0};for(const c of cars)c.z=z-60+c.index*18;update(.001);mode='benchmark';renderScale=.5;resizeRenderer();},
 }));
}
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('check')) {
 import('./checks.js').then(({runChecks})=>runChecks({
  reset(patch){coinSequence.reset();movableObstacles.reset();state=Object.assign(newRun(),patch);elapsed=0;mode='playing';clearKeys();for(const c of cars){c.z=10000+c.index*100;c.x=c.homeX;c.choices=routeChoices(c.index);c.braking=false;c.contact=false;Object.assign(c,trafficMotion(c.index,0),trafficSurface(c,roofs));c.driver=null;c.profileBraking=c.braking;}},
  alex,birdArt,flightArt,worldArt,environmentArt,skateboard,thiefArt,stampReady,deliveryArt,npcs,player,camera,renderer,sound,pickups,exhaust,boostBoard,state:()=>state,step:update,jump,hitch,controls:keys,roofs,cars,obstacles,movableObstacles,solidWorld,driverArt,roof:roofs[0],choose:chooseRoute,time:value=>elapsed=value,
  finish(){state=newRun();mode='menu';$('result').classList.add('hidden');},
 }));
}











