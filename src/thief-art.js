import {cullHiddenTransforms} from './render-culling.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { worldPoint } from './routes.js';
import { newThieves, stepThief } from './thieves.js';
import modelUrl from '../assets/characters/packagethief/game/thief.glb?url';
import textureUrl from '../assets/characters/packagethief/mixamo-textured/packagethief_basecolor.jpg?url';

export class ThiefArt {
 constructor(scene){this.scene=scene;this.actors=[];this.reset();this.ready=this.load().catch(error=>console.error('Thief load failed',error));}
 reset(){this.thieves=newThieves();for(const actor of this.actors){actor.current=null;actor.mixer.stopAllAction();}}
 async load(){
  const [asset,texture]=await Promise.all([new GLTFLoader().loadAsync(modelUrl),new THREE.TextureLoader().loadAsync(textureUrl)]);
  texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;
  const material=new THREE.MeshLambertMaterial({map:texture,color:'#999999'});
  for(const thief of this.thieves){
   const group=new THREE.Group(),model=clone(asset.scene);
   const bounds=new THREE.Box3().setFromObject(model),scale=2.35/bounds.getSize(new THREE.Vector3()).y;
   model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;
   model.traverse(o=>{if(o.isMesh){o.material=material;o.frustumCulled=false;}});
   group.add(model);this.scene.add(group);cullHiddenTransforms(group);
   const mixer=new THREE.AnimationMixer(model),actions=new Map(asset.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
   this.actors.push({group,mixer,actions,current:null});
  }
 }
 step(dt,player,onEvent){if(this.actors.length!==this.thieves.length)return;for(const thief of this.thieves){const event=stepThief(thief,player,dt);if(event)onEvent(event,thief);}}
 draw(dt,z,mode){
  this.actors.forEach((actor,index)=>{
   const thief=this.thieves[index],p=worldPoint(thief.x,thief.z,thief.choices);
   actor.group.visible=mode!=='menu'&&thief.z>z-25&&thief.z<z+160;
   actor.group.position.set(p.x,0,p.z);actor.group.rotation.y=p.yaw+(thief.homeX>0?-Math.PI/2:Math.PI/2);
   const name=thief.phase==='run'?'run':thief.phase==='dive'?'dive':thief.phase==='spent'?'disappointed':'idle';
   // Diving Save lunges toward local -X; locomotion faces local +Z.
   if(name==='dive')actor.group.rotation.y=p.yaw+(thief.homeX>0?0:Math.PI);
   const action=actor.actions.get(name);
   if(action!==actor.current){
    actor.current?.fadeOut(.1);action.reset().fadeIn(.1).play();
    action.setLoop(['dive','disappointed'].includes(name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);
    action.clampWhenFinished=true;action.timeScale=name==='dive'?action.getClip().duration/1.4:name==='run'?2:1;
    actor.current=action;
   }
   if(mode==='playing'&&actor.group.visible){
    if(name==='dive'){actor.mixer.update(dt);action.time=.4+Math.min(1,thief.time/1.4)*1.9;actor.mixer.update(0);}
    else actor.mixer.update(dt);
   }
  });
 }
}
