import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {TextureLoader,Texture,MeshStandardMaterial} from 'three';
globalThis.window={URL};TextureLoader.prototype.load=()=>new Texture();
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};
for(const id of ['package_giver','package_receiver']){
 const root=new URL(`../assets/characters/${id}/`,import.meta.url);
 const load=async name=>{const b=await readFile(new URL(name+'.fbx',root));return new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
 const model=await load('idle_skinned'),bones=new Set();
 model.traverse(o=>{if(o.isBone)bones.add(o.name);if(o.isMesh)o.material=new MeshStandardMaterial();});
 const animations=[];
 for(const name of ['idle_skinned','wave','cheer',id==='package_giver'?'give':'take']){
  const source=name==='idle_skinned'?model:await load(name),clip=source.animations[0].clone();
  clip.name=name==='idle_skinned'?'idle':name;
  for(const track of clip.tracks){
   if(!bones.has(track.name.split('.')[0]))throw Error(`Unmatched ${id} bone: ${track.name}`);
   if(track.name==='mixamorigHips.position')for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+2]=0;}
  }
  animations.push(clip);
 }
 const result=await new GLTFExporter().parseAsync(model,{binary:true,animations});
 await mkdir(new URL('game/',root),{recursive:true});await writeFile(new URL('game/character.glb',root),Buffer.from(result));
 console.log(id,bones.size,'bones',animations.map(c=>c.name));
}
