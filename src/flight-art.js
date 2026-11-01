import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {worldPoint} from './routes.js';
import inspection from '../assets/flight/game/inspection.json';
const files=import.meta.glob(['../assets/flight/game/raisedramp.*','../assets/flight/game/launchramp.*','../assets/flight/game/glider0.*'],{eager:true,query:'?url',import:'default'});
async function load(name){
 const [asset,texture]=await Promise.all([new GLTFLoader().loadAsync(files[`../assets/flight/game/${name}.glb`]),new T.TextureLoader().loadAsync(files[`../assets/flight/game/${name}.jpg`])]);
 texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 // Meshy left a few reversed faces around the launch lip; show both sides
 // so the visible takeoff surface agrees with the measured riding surface.
 asset.scene.traverse(o=>{if(o.isMesh)o.material=new T.MeshLambertMaterial({map:texture,side:name.includes('ramp')?T.DoubleSide:T.FrontSide});});return asset.scene;
}
// Source models have +Blender Y uphill (= -glTF Z). The art and collision
// share a linear riding surface; retain detail relative to the sampled top.
function sourceHeight(name,z){
 const points=inspection.find(a=>a.id===name).centerline.filter(Boolean);
 const t=-z;let i=1;while(i<points.length-1&&points[i][1]<t)i++;
 const a=points[i-1],b=points[i];return T.MathUtils.lerp(a[2],b[2],(t-a[1])/(b[1]-a[1]));
}
export class FlightArt {
 constructor(scene,roofs,glider){this.ramps=[];this.errors=[];this.ready=this.load(scene,roofs,glider).catch(e=>{this.errors.push(e.message);console.error(e);});}
 async load(scene,roofs,glider){
  const [raised,launch,wing]=await Promise.all(['raisedramp','launchramp','glider0'].map(load));
  for(const roof of roofs){
   const name=roof.isTrainRamp?'launchramp':'raisedramp',source=roof.isTrainRamp?launch:raised;
   const width=inspection.find(a=>a.id===name).dimensions;const sx=(roof.width+1.4)/(width[0]/width[1]);
   const length=roof.isTrainRamp?38:35,entry=.477,exit=-.49;
   for(const descending of (roof.isTrainRamp?[false]:[false,true])){
   const model=source.clone(true);
   model.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
     const z=p.getZ(i),u=T.MathUtils.clamp((entry-z)/(entry-exit),0,1);
     const pos=worldPoint(roof.x-p.getX(i)*sx,descending?roof.end+(1-u)*length:roof.start+u*length,roof.choices);
     const y=u*roof.height+(p.getY(i)-sourceHeight(name,z))*sx;
     p.setXYZ(i,pos.x,y,pos.z);
    }p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
   });scene.add(model);this.ramps.push({model,roof,descending});if(descending){roof.exitArt=model;roof.exitFallback.visible=false;}else{roof.art=model;roof.fallback.visible=false;}
   }
  }
  // The Meshy wing spans its source Z axis. Turn its nose toward +Z.
  wing.rotation.y=Math.PI/2;wing.scale.setScalar(6.6);wing.position.set(0,1.45,0);
  for(const child of [...glider.children])child.visible=false;
  glider.add(wing);this.glider=wing;
 }
 update(z){for(const {model,roof,descending} of this.ramps){const start=descending?roof.end:roof.start;model.visible=start<z+180&&start+40>z-30;}}
}

