// Development-only visual inspection of the exact game exports.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../assets/world/manifest.json';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#c7b3ce');
scene.add(new THREE.HemisphereLight('#fff4d1','#716789',2.5));
const light=new THREE.DirectionalLight('#ffe1b1',3.1);light.position.set(-3,7,6);scene.add(light);
const camera=new THREE.PerspectiveCamera(40,1,.01,100);
let current,asset;
const select=document.querySelector('#model');
for(const item of manifest){const option=document.createElement('option');option.value=item.id;option.textContent=item.id;select.append(option);}
function render(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);}
async function load(){
 asset=manifest.find(x=>x.id===select.value);
 const [gltf,texture]=await Promise.all([new GLTFLoader().loadAsync('/assets/world/'+asset.id+'.glb'),new THREE.TextureLoader().loadAsync('/assets/world/'+asset.id+'.jpg')]);
 texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
 if(current)scene.remove(current);current=gltf.scene;
 const dims=asset.proportions,max=Math.max(...dims);
 current.scale.set(...dims.map(x=>x/max*4));
 current.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshLambertMaterial({map:texture,color:'#b8b8b8'});});
 scene.add(current);camera.position.set(5,3.8,6);camera.lookAt(0,dims[1]/max*1.8,0);
 document.querySelector('#status').textContent=`${asset.triangles.toLocaleString()} triangles · 1K color texture · +Z is forward`;
 render();
}
select.onchange=load;document.querySelector('#turn').onclick=()=>{current.rotation.y+=Math.PI;render();};window.onresize=render;await load();
