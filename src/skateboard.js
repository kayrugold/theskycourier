import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import modelUrl from '../assets/skateboards/game/skateboard0.glb?url';
import textureUrl from '../assets/skateboards/game/skateboard0.jpg?url';

export class Skateboard {
 constructor(parent, fallback, anisotropy=1) {
  this.group=new THREE.Group();parent.add(this.group);
  this.group.add(fallback);
  this.anisotropy=anisotropy;
  this.ready = this.load(this.group, fallback).catch(error => console.error('Skateboard could not load; using the fallback.', error));
 }
 async load(parent, fallback) {
  const [asset, texture] = await Promise.all([
   new GLTFLoader().loadAsync(modelUrl), new THREE.TextureLoader().loadAsync(textureUrl),
  ]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy=this.anisotropy;
  const material = new THREE.MeshLambertMaterial({ map: texture });
  asset.scene.traverse(object => {
   if (!object.isMesh) return;
   object.material.dispose();
   object.material = material;
  });
  // Prepared at rider scale, centered along Z, with wheel bottoms at Y=0.
  this.model = asset.scene;
  parent.add(this.model);
  fallback.visible = false;
 }
 present(menu) {
  // The dance has wide footwork; keep the menu grounded and uncluttered.
  this.group.visible=!menu;
 }
}
