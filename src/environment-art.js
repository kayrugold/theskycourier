import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { forkAt, routeOptions, worldPoint } from './routes.js';
import { COURSE_LENGTH } from './physics.js';
import {environmentSites} from './environment-collision.js';

const urls=import.meta.glob('../assets/environment/game/*.{glb,jpg}',{eager:true,query:'?url',import:'default'});
export class EnvironmentArt {
 constructor(scene) {
  this.batches=[];this.errors=[];
  this.sites=['streetlight0','tree0'].flatMap(environmentSites);this.contacts=new Set();
  this.frustum=new THREE.Frustum();this.projection=new THREE.Matrix4();
  this.ready=this.load(scene);
 }
 async load(scene) {
  for(const id of ['streetlight0','tree0']) {
   try {
    const [near,far,texture]=await Promise.all([
     new GLTFLoader().loadAsync(urls[`../assets/environment/game/${id}.glb`]),
     new GLTFLoader().loadAsync(urls[`../assets/environment/game/${id}-low.glb`]),
     new THREE.TextureLoader().loadAsync(urls[`../assets/environment/game/${id}.jpg`]),
    ]);
    texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
    const material=new THREE.MeshLambertMaterial({map:texture});
    const placements=[];
    for(const site of this.sites.filter(site=>site.id===id)) {
      const {x,z,choices}=site,side=Math.sign(x),point=worldPoint(x,z,choices);
      const transform=new THREE.Object3D();
      transform.position.set(point.x,.07,point.z);
      transform.rotation.y=point.yaw+(side>0?Math.PI:0);
      transform.updateMatrix();
      placements.push({z, matrix:transform.matrix.clone(),sphere:new THREE.Sphere(new THREE.Vector3(point.x,3.5,point.z),5)});
    }
    const pair=[];
    for(const asset of [near,far]) {
     asset.scene.updateMatrixWorld(true);
     asset.scene.traverse(o=>{
      if(!o.isMesh)return;
      const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
      const mesh=new THREE.InstancedMesh(geometry,material,96);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;
      scene.add(mesh);pair.push(mesh);
     });
    }
    this.batches.push({id,near:pair[0],far:pair[1],placements});
   }catch(error){this.errors.push(id);console.error(`Environment asset failed: ${id}`,error);}
  }
 }
 update(z,camera,budget={detail:50,scenery:165}) {
  this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  for(const batch of this.batches) {
   batch.near.count=0;batch.far.count=0;
   for(const p of batch.placements) {
    if(p.z<z-30||p.z>z+budget.scenery||!this.frustum.intersectsSphere(p.sphere))continue;
    const mesh=p.sphere.center.distanceTo(camera.position)<budget.detail?batch.near:batch.far;
    if(mesh.count<mesh.instanceMatrix.count)mesh.setMatrixAt(mesh.count++,p.matrix);
   }
   batch.near.instanceMatrix.needsUpdate=true;batch.far.instanceMatrix.needsUpdate=true;
  }
 }
}
