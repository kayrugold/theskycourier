import {cullHiddenTransforms} from './render-culling.js';
import {HANDOFF_SECONDS} from './graphics.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const urls=import.meta.glob('../assets/characters/package_*/game/*.glb',{eager:true,query:'?url',import:'default'});
const textures=import.meta.glob('../assets/characters/package_*/mixamo-upload/*basecolor.jpg',{eager:true,query:'?url',import:'default'});
export class DeliveryArt{
 constructor(npcs){this.npcs=npcs;this.actors=[];this.ready=this.load();}
 async load(){
  for(const [id,kind] of [['package_giver','pickup'],['package_receiver','drop']]){
   const [asset,texture]=await Promise.all([new GLTFLoader().loadAsync(urls[`../assets/characters/${id}/game/character.glb`]),new THREE.TextureLoader().loadAsync(textures[`../assets/characters/${id}/mixamo-upload/${id}_basecolor.jpg`])]);
   texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;
   const material=new THREE.MeshLambertMaterial({map:texture,color:'#999999'});
   for(const npc of this.npcs.filter(n=>n.kind===kind)){
    const model=clone(asset.scene),bounds=new THREE.Box3().setFromObject(model),scale=2.35/bounds.getSize(new THREE.Vector3()).y;
    model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;
    model.rotation.y=npc.stop.x>0?-Math.PI/2:Math.PI/2;
    model.traverse(o=>{if(o.isMesh){o.material=material;o.frustumCulled=false;}});
    npc.fallback.visible=false;npc.group.add(model);cullHiddenTransforms(npc.group);
    const mixer=new THREE.AnimationMixer(model),actions=new Map(asset.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
    this.actors.push({npc,model,mixer,actions,current:null,elapsed:0,transfer:0,celebrate:0});
   }
  }
 }
 reset(){for(const actor of this.actors){actor.transfer=0;actor.celebrate=0;actor.elapsed=0;actor.current=null;actor.mixer.stopAllAction();}}
 handoff(npc){const actor=this.actors.find(a=>a.npc===npc);if(actor){actor.transfer=HANDOFF_SECONDS;actor.celebrate=3;}}
 update(dt,mode){
  if(mode!=='playing')return;
  for(const actor of this.actors){
   actor.elapsed+=dt;
   const name=actor.transfer>0?(actor.npc.kind==='pickup'?'give':'take'):actor.celebrate>0?'cheer':actor.elapsed%9<4?'wave':'idle';
   if(actor.transfer>0)actor.transfer=Math.max(0,actor.transfer-dt);else actor.celebrate=Math.max(0,actor.celebrate-dt);
   if(!actor.npc.group.visible)continue;
   const action=actor.actions.get(name);
   if(actor.current!==action){actor.current?.fadeOut(.12);action.reset().fadeIn(.12).play();action.setLoop(['give','take'].includes(name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);action.clampWhenFinished=true;action.timeScale=['give','take'].includes(name)?action.getClip().duration/HANDOFF_SECONDS:1;actor.current=action;}
   actor.mixer.update(dt);
  }
 }
}
