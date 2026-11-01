import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';

test('prepared world meshes have UVs, finite unit bounds, and stay within the mobile triangle budget',async()=>{
 const root=new URL('../assets/world/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.equal(manifest.length,13);
 for(const asset of manifest){
  const bytes=await readFile(new URL(asset.id+'.glb',root));
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  let triangles=0;
  scene.traverse(o=>{
   if(!o.isMesh)return;
   assert.ok(o.geometry.attributes.uv,asset.id+' missing UVs');
   assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),asset.id+' invalid vertices');
   triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
  });
  assert.ok(triangles>1000&&triangles<=6500,asset.id+' triangle budget');
  const bounds=new Box3().setFromObject(scene),size=bounds.getSize(new Vector3());
  for(const value of size.toArray())assert.ok(Math.abs(value-1)<.002,asset.id+' incorrect normalization');
  assert.ok(Math.abs(bounds.min.y)<.002,asset.id+' floating origin');
  assert.ok((await readFile(new URL(asset.id+'.jpg',root))).length>1000,asset.id+' missing texture');
  const lowBytes=await readFile(new URL(asset.id+'-low.glb',root));
  const low=await new GLTFLoader().parseAsync(lowBytes.buffer.slice(lowBytes.byteOffset,lowBytes.byteOffset+lowBytes.byteLength),'');
  let lowTriangles=0;low.scene.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.uv);lowTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  assert.ok(lowTriangles>500&&lowTriangles<=1800,asset.id+' distance mesh budget');
  const lowBounds=new Box3().setFromObject(low.scene),lowSize=lowBounds.getSize(new Vector3());
  for(const value of lowSize.toArray())assert.ok(Math.abs(value-1)<.08,asset.id+' distance mesh shape changed: '+lowSize.toArray().join(', '));
 }
});
