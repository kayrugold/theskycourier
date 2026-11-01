import {readFile,readdir,writeFile} from 'node:fs/promises';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {TextureLoader,Texture,Box3,Vector3} from 'three';
globalThis.window={URL};TextureLoader.prototype.load=function(){return new Texture();};
const result=[];
for(const category of ['vehicles','buildings','trains']){
 for(const file of await readdir(`assets/${category}`,{recursive:true})){
  if(!file.endsWith('.fbx'))continue;
  const path=`assets/${category}/${file}`;const b=await readFile(path);
  const model=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,triangles:(o.geometry.index?.count||o.geometry.attributes.position.count)/3,uv:!!o.geometry.attributes.uv});});
  result.push({category,id:file.split(/[\\/]/)[0],path,meshes,size:new Box3().setFromObject(model).getSize(new Vector3()).toArray()});
 }
}
await writeFile('assets/world-inspection.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
