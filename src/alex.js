import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import modelUrl from '../assets/characters/game/alex.glb?url';
import textureUrl from '../assets/characters/alex/mixamo-upload/alex_basecolor.jpg?url';
import { COURSE_LENGTH } from './physics.js';

export class Alex {
 constructor(parent, fallback) {
  this.group = new THREE.Group();
  parent.add(this.group);
  this.fallback = fallback;
  this.actions = new Map();
  this.ready = this.load().catch(error => console.error('Alex could not load; using the placeholder rider.', error));
 }
 async load() {
  const [asset, texture] = await Promise.all([
   new GLTFLoader().loadAsync(modelUrl), new THREE.TextureLoader().loadAsync(textureUrl),
  ]);
  texture.colorSpace = THREE.SRGBColorSpace;
  // This atlas comes from the original FBX; its UVs were retained in conversion.
  texture.flipY = true;
  const model = asset.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const scale = 2.35 / bounds.getSize(new THREE.Vector3()).y;
  model.scale.setScalar(scale);
  model.position.y = .46 - bounds.min.y * scale;
  const material = new THREE.MeshLambertMaterial({ map: texture, color: '#999999' });
  model.traverse(o => {
   if (!o.isMesh) return;
   o.material.dispose();
   o.material = material;
   // Animated bounds can exceed the bind pose, especially while gliding.
   o.frustumCulled = false;
  });
  this.group.add(model);
  this.model=model;
  this.mixer = new THREE.AnimationMixer(model);
  for (const clip of asset.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
  this.fallback.visible = false;
 }
 reset() { this.event = null; this.current = null; this.mixer?.stopAllAction(); }
 trigger(name, seconds = .7) {
  if (!this.actions.has(name)) return;
  this.event = { name, remaining: seconds, duration: seconds };
  this.current = null;
 }
 update(dt, state, mode, accelerating) {
  if (!this.mixer || mode === 'paused') return;
  if (this.event) {
   this.event.remaining -= dt;
   if (this.event.remaining <= 0) this.event = null;
  }
  let name = mode === 'menu' ? 'hiphopdance'
   : mode === 'result' ? (state.z >= COURSE_LENGTH && state.condition > 0 ? 'victory' : 'sittingdazed')
   : state.caught>0 ? 'caught'
   : state.handoff>0 ? this.event?.name || (state.carrying?'take':'give')
   : state.tripping>0 ? 'trip'
   : state.impact>0 ? (state.impactDirection==='rear'?'hitbycar':'runinto')
   : state.gliding ? 'flying'
   : !state.grounded ? (state.airFlip?'jumpover':'skateboarding')
   : state.ducking ? 'runningslide'
   : state.ride ? 'skateboardkick'
   : this.event?.name || (accelerating && !state.hitch ? 'skateboardkick' : 'skateboarding');
  const action = this.actions.get(name) || this.actions.get('idle');
  if(name==='jumpover'&&this.lastJumpSequence!==state.jumpSequence){
   this.lastJumpSequence=state.jumpSequence;
   if(this.current===action)action.reset().play();
  }
  if (this.current !== action) {
   const previous = this.current;
   // Stop older faded actions so the mixer only evaluates the current blend.
   for (const other of this.actions.values()) if (other !== previous && other !== action) other.stop();
   action.reset();
   const once = ['jumpover', 'runningslide', 'trip', 'hitbycar', 'runinto', 'take', 'give', 'caught'].includes(name);
   action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
   action.clampWhenFinished = once;
   action.timeScale = name==='trip'?action.getClip().duration/.65:name==='caught'?action.getClip().duration/1.4:name === 'jumpover' ? action.getClip().duration/1.08 : name === 'runningslide' ? action.getClip().duration/.3 : state.impact>0 ? action.getClip().duration / 1.1 : this.event?.name === name ? action.getClip().duration / this.event.duration : 1;
   action.fadeIn(.12).play();
   previous?.fadeOut(.12);
   this.current = action;
  }
  // Hold the low part of the slide while duck is held; don't stand back up.
  if(name==='runningslide'){this.mixer.update(dt);action.time=action.getClip().duration*(.18+.32*Math.min(1,(state.slideElapsed??.2)/.12));this.mixer.update(0);return;}
  if(name==='caught'){
   this.mixer.update(dt);
   action.time=Math.max(0,Math.min(1,(1.4-state.caught)/1.4))*action.getClip().duration;
   this.mixer.update(0);
  }else this.mixer.update(dt);
  if(state.gliding)this.fitGlider();
 }
 fitGlider(){
  // Keep both hands on the control bar while retaining the flying body clip.
  this.group.updateWorldMatrix(true,true);
  for(const [side,x] of [['Left',.48],['Right',-.48]]){
   const upper=this.model.getObjectByName(`mixamorig${side}Arm`),lower=this.model.getObjectByName(`mixamorig${side}ForeArm`),hand=this.model.getObjectByName(`mixamorig${side}Hand`);
   const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=hand.getWorldPosition(new THREE.Vector3());
   const target=this.group.localToWorld(new THREE.Vector3(x,1.66,.85));
   const l1=a.distanceTo(b),l2=b.distanceTo(c),delta=target.clone().sub(a),distance=Math.min(delta.length(),l1+l2-.001),direction=delta.normalize();
   const pole=new THREE.Vector3(Math.sign(x)*.35,-1,0).transformDirection(this.group.matrixWorld);
   pole.addScaledVector(direction,-pole.dot(direction)).normalize();
   const along=(l1*l1-l2*l2+distance*distance)/(2*distance),bend=Math.sqrt(Math.max(0,l1*l1-along*along));
   const elbow=a.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
   const aim=(bone,from,to)=>{
    const world=bone.getWorldQuaternion(new THREE.Quaternion());
    const turn=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(turn.multiply(world)));bone.updateWorldMatrix(false,true);
   };
   aim(upper,b.clone().sub(a),elbow.sub(a));
   const elbowNow=lower.getWorldPosition(new THREE.Vector3()),handNow=hand.getWorldPosition(new THREE.Vector3());
   aim(lower,handNow.sub(elbowNow),target.sub(elbowNow));
  }
 }
}
