import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Vector3} from 'three';
test('exported bird flap moves skinned wing vertices through a visible stroke',async()=>{
 const b=await readFile(new URL('../assets/flight/game/angrybird-rig.glb',import.meta.url));
 const asset=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 let mesh;asset.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert.ok(mesh);
 const mixer=new AnimationMixer(asset.scene);mixer.clipAction(asset.animations[0]).play();
 mixer.setTime(.2);asset.scene.updateMatrixWorld(true);
 const samples=[];for(let i=0;i<mesh.geometry.attributes.position.count;i+=30)samples.push([i,mesh.getVertexPosition(i,new Vector3())]);
 mixer.setTime(.6);asset.scene.updateMatrixWorld(true);
 const stroke=Math.max(...samples.map(([i,v])=>v.distanceTo(mesh.getVertexPosition(i,new Vector3()))));
 assert.ok(stroke>.35,'wing animation only twists or leaves the mesh stationary');
});
