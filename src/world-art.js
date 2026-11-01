import {CROSSING_TRAINS} from './rail-traffic.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { forkAt, routeOptions, worldPoint } from './routes.js';

const urls = import.meta.glob('../assets/world/*.{glb,jpg}', { eager:true, query:'?url', import:'default' });
const ids = ['4doorbluecar','4doorredcar','4doorblackcar','taxi','schoolbus','semitruckwtrl1',
 'nyctownhouse','nychighrise','nycskyscraper','locomotive0','flatbed1','container1','container2'];
const fullDetail=import.meta.env.DEV&&new URLSearchParams(location.search).has('fullDetail');

export class WorldArt {
 constructor({scene,cars,solidWorld,buildingSites,buildingFallbacks,earlyTrainGroup,crossingTrainGroup,parallelTrainGroup,parallelTrain,trainRing}) {
  Object.assign(this,{scene,cars,solidWorld,buildingSites,buildingFallbacks,earlyTrainGroup,crossingTrainGroup,parallelTrainGroup,parallelTrain,trainRing});
  this.models=new Map();this.lowModels=new Map();this.buildings=[];this.lods=[];this.errors=[];this.loadedVehicles=0;this.loadedTrainCars=0;
  this.frustum=new THREE.Frustum();this.projection=new THREE.Matrix4();
  this.ready=this.load();
 }
 async load() {
  // Limit simultaneous decoding/upload work on low-end integrated graphics.
  for(let i=0;i<ids.length;i+=2)await Promise.all(ids.slice(i,i+2).map(async id=>{
   try{
    const [gltf,texture,low]=await Promise.all([
     new GLTFLoader().loadAsync(urls[`../assets/world/${id}.glb`]),
     new THREE.TextureLoader().loadAsync(urls[`../assets/world/${id}.jpg`]),
     new GLTFLoader().loadAsync(urls[`../assets/world/${id}-low.glb`]),
    ]);
    texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
    const material=new THREE.MeshLambertMaterial({map:texture,color:'#b8b8b8'});
    gltf.scene.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=false;}});
    low.scene.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=false;}});
    this.models.set(id,gltf.scene);
    this.lowModels.set(id,low.scene);
   }catch(error){this.errors.push(id);console.error(`World asset failed: ${id}`,error);}
  }));
  this.installVehicles();this.installBuildings();this.installTrains();
  return this;
 }
 make(id,width,height,length) {
  const source=this.models.get(id);if(!source)return null;
  const model=new THREE.LOD();
  const near=source.clone(true);near.scale.set(width,height,length);model.addLevel(near,0);
  const far=this.lowModels.get(id).clone(true);far.scale.copy(near.scale);model.addLevel(far,fullDetail?10000:45,.15);
  model.userData.asset=id;this.lods.push(model);return model;
 }
 installVehicles(){
  const sedans=['4doorbluecar','taxi','4doorredcar','4doorblackcar'];let n=0;
  for(const car of this.cars){
   const id=car.type==='bus'?'schoolbus':car.type==='semi'?'semitruckwtrl1':sedans[n++%sedans.length];
   const model=this.make(id,car.width,car.height,car.length);if(!model)continue;
   for(const child of [...car.mesh.children])if(child!==car.ring&&child!==car.driverArt&&!car.lamps.includes(child))car.mesh.remove(child);
   car.mesh.add(model);car.art=model;this.loadedVehicles++;
  }
 }
 installBuildings(){
  const names=['nyctownhouse','nychighrise','nycskyscraper'];
  if(!names.every(id=>this.models.has(id)))return;
  this.lastZ=undefined;
  for(const mesh of this.buildingFallbacks)mesh.visible=false;
  // Instance only the nearby buildings. Shared geometry and textures stay small
  // even though the course has hundreds of placements across multiple routes.
  const placements=new Map(names.map(id=>[id,[]]));
  const bounds=new Map(names.map(id=>[id,new THREE.Box3().setFromObject(this.models.get(id))]));
  for(let i=0;i<this.buildingSites.length;i++){
   const site=this.buildingSites[i],id=names[(Math.floor(i/2)+ (site.side>0?1:0))%3];
   for(const branch of routeOptions(site.z)){
    const f=forkAt(site.z),p=worldPoint(site.x,site.z,f?{[f.id]:branch}:{});
    // Near a split, only omit facades that would occupy a neighboring road.
    if(f&&routeOptions(site.z).some(other=>other!==branch&&Math.abs(worldPoint(0,site.z,{[f.id]:other}).x-p.x)<14+site.w/2))continue;
    const transform=new THREE.Object3D();
    // Generated facades face +Z; turn the entrance toward the sidewalk.
    transform.position.set(p.x,0,p.z);transform.rotation.y=p.yaw-site.side*Math.PI/2;
    transform.scale.set(21,id==='nycskyscraper'?site.h*1.35:site.h,site.w);
    transform.updateMatrix();
    // Use exactly the placements accepted for rendering, including junction gaps.
    const box=bounds.get(id),center=box.getCenter(new THREE.Vector3()).multiply(transform.scale).applyAxisAngle(new THREE.Vector3(0,1,0),transform.rotation.y).add(transform.position);
    const size=box.getSize(new THREE.Vector3()).multiply(transform.scale);
    this.solidWorld?.add({x:center.x,z:center.z,bottom:center.y-size.y/2,top:center.y+size.y/2,halfX:size.x/2,halfZ:size.z/2,yaw:transform.rotation.y,layer:'buildings',name:'BUILDING'});
    placements.get(id).push({z:site.z,matrix:transform.matrix.clone(),
     sphere:new THREE.Sphere(new THREE.Vector3(p.x,transform.scale.y/2,p.z),Math.hypot(21,transform.scale.y,site.w)/2)});
   }
  }
  // The placeholders and their colliders share the same replacement lifecycle.
  this.solidWorld?.setLayerEnabled('fallbackBuildings',false);
  for(const id of names){
   const source=this.models.get(id);source.updateMatrixWorld(true);
   source.traverse(o=>{
    if(!o.isMesh)return;
    const mesh=new THREE.InstancedMesh(o.geometry,o.material,128);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;
    let lowMesh;this.lowModels.get(id).traverse(child=>{if(child.isMesh)lowMesh=child;});
    this.lowModels.get(id).updateMatrixWorld(true);
    const farMesh=new THREE.InstancedMesh(lowMesh.geometry,o.material,128);
    farMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);farMesh.frustumCulled=false;farMesh.count=0;
    this.scene.add(mesh,farMesh);this.buildings.push({mesh,farMesh,placements:placements.get(id),local:o.matrixWorld.clone(),farLocal:lowMesh.matrixWorld.clone()});
   });
  }
 }
 trainPart(id,length,height,width,position,across=false){
  const model=this.make(id,width,height,length);if(!model)return null;
  if(across){model.rotation.y=Math.PI/2;model.position.x=position;}else model.position.z=position;
  return model;
 }
 installTrains(){
  if(!['locomotive0','container1','container2','flatbed1'].every(id=>this.models.has(id)))return;
  const replace=(group,parts,across)=>{
   const models=parts.map(p=>this.trainPart(...p,across));
   for(const child of [...group.children])if(child!==this.trainRing)group.remove(child);
   group.add(...models);this.loadedTrainCars+=models.length;
  };
  replace(this.earlyTrainGroup,CROSSING_TRAINS[0].parts,true);
  replace(this.crossingTrainGroup,CROSSING_TRAINS[1].parts,true);
  replace(this.parallelTrainGroup,this.parallelTrain.cars.map(c=>[
   c.type==='engine'?'locomotive0':c.type==='flatbed'?'flatbed1':c.type==='tall_container'?'container2':'container1',
   c.length,c.height,3.2,c.offsetZ]),false);
 }
 update(z,camera,budget={detail:55,scenery:165}){
  if(!fullDetail)for(const lod of this.lods)lod.levels[1].distance=Math.max(.01,budget.detail);
  camera.updateMatrixWorld();
  this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const matrix=new THREE.Matrix4();
  for(const {mesh,farMesh,placements,local,farLocal} of this.buildings){
   let count=0,farCount=0;
   for(const p of placements){
    if(p.z<z-45||p.z>z+(fullDetail?185:budget.scenery)||(!fullDetail&&!this.frustum.intersectsSphere(p.sphere)))continue;
    if(fullDetail||p.sphere.center.distanceTo(camera.position)<budget.detail){
     if(count<mesh.instanceMatrix.count)mesh.setMatrixAt(count++,matrix.multiplyMatrices(p.matrix,local));
    }else if(farCount<farMesh.instanceMatrix.count)farMesh.setMatrixAt(farCount++,matrix.multiplyMatrices(p.matrix,farLocal));
   }
   mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
   farMesh.count=farCount;farMesh.instanceMatrix.needsUpdate=true;
  }
 }
}
