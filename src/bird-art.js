import {cullHiddenTransforms} from './render-culling.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {worldPoint} from './routes.js';
import {newBirds,stepBird,BIRD_COOLDOWN} from './birds.js';
import modelUrl from '../assets/flight/game/angrybird-rig.glb?url';
import textureUrl from '../assets/flight/game/angrybird.jpg?url';
export class BirdArt{
 constructor(scene){this.scene=scene;this.actors=[];this.errors=[];this.reset();this.ready=this.load().catch(e=>{this.errors.push(e.message);console.error('Bird load failed',e);});}
 reset(){this.birds=newBirds();this.cooldown=0;}
 async load(){
  const [asset,texture]=await Promise.all([new GLTFLoader().loadAsync(modelUrl),new T.TextureLoader().loadAsync(textureUrl)]);
  texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;
  const mat=new T.MeshLambertMaterial({map:texture});
  for(let i=0;i<this.birds.length;i++){
   const group=new T.Group(),model=clone(asset.scene);model.scale.setScalar(2.8);model.position.y=-.8;model.rotation.y=Math.PI;
   model.traverse(o=>{if(o.isMesh){o.material=mat;o.frustumCulled=false;}});group.add(model);this.scene.add(group);cullHiddenTransforms(group);
   const mixer=new T.AnimationMixer(model);for(const clip of asset.animations)mixer.clipAction(clip).play();mixer.update(i*.11);
   const marker=new T.Mesh(new T.RingGeometry(.8,1,32),new T.MeshBasicMaterial({color:'#ff9b36',side:T.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));
   marker.rotation.x=-Math.PI/2;this.scene.add(marker);
   this.actors.push({group,model,mixer,marker});
  }
 }
 step(dt,player,onEvent){
  if(this.actors.length!==this.birds.length)return;
  this.cooldown=Math.max(0,this.cooldown-dt);
  let busy=this.birds.some(b=>b.phase==='warning'||b.phase==='dive'||b.phase==='escape');
  for(const bird of this.birds){const event=stepBird(bird,player,dt,!busy&&this.cooldown===0);if(event){if(event==='warning'){busy=true;this.cooldown=BIRD_COOLDOWN;}onEvent(event,bird);}}
 }
 draw(dt,z,mode){this.actors.forEach((a,i)=>{
  const b=this.birds[i],visible=mode!=='menu'&&b.phase!=='spent'&&b.z>z-30&&b.z<z+175;
  a.group.visible=visible;a.marker.visible=visible&&(b.phase==='warning'||b.phase==='dive');
  if(!visible)return;
  const p=worldPoint(b.x,b.z,b.choices);a.group.position.set(p.x,b.y,p.z);a.group.rotation.y=p.yaw;
  {a.mixer.timeScale=b.phase==='dive'?2:1.4;a.mixer.update(dt);if(b.phase==='patrol')a.group.position.y+=Math.sin((b.age||0)*4+i)*.4;}
  a.group.rotation.z=b.phase==='dive'?Math.sin(b.time*5)*Math.sign(b.homeX)*.25:Math.sin((b.age||0)*2)*.1;
  if(a.marker.visible){const target=worldPoint(b.targetX,b.targetZ,b.choices);a.marker.position.set(target.x,Math.max(.08,b.targetY-1.2),target.z);a.marker.scale.setScalar(1+Math.sin(b.time*18)*.15);}
 });}
}
