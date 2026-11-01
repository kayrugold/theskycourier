import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import modelUrl from '../assets/environment/stamp/game/stamp.glb?url';
import textureUrl from '../assets/environment/stamp/game/stamp.jpg?url';

export async function installStampArt(pickups){
 const [asset,texture]=await Promise.all([new GLTFLoader().loadAsync(modelUrl),new THREE.TextureLoader().loadAsync(textureUrl)]);
 texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
 let source;asset.scene.updateMatrixWorld(true);
 asset.scene.traverse(o=>{if(o.isMesh)source=o;});
 const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
 const material=new THREE.MeshLambertMaterial({map:texture,emissive:'#5a3300',emissiveIntensity:.15});
 for(const pickup of pickups){if(pickup.kind)continue;pickup.mesh.geometry=geometry;pickup.mesh.material=material;}
 return {geometry,material};
}
