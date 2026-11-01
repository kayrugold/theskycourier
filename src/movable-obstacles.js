import {solidContact} from './solid-collision.js';
import * as T from 'three';
import {forkAt,routeOptions,worldPoint} from './routes.js';
import {movableObstacle} from './traffic-obstacles.js';

export class MovableObstacles{
 constructor(scene,city,obstacles){
  this.instances=[];this.contacts=new Set();
  for(const source of obstacles){
   if(!movableObstacle(source.type))continue;
   city.remove(source.mesh);source.instances=[];
   for(const branch of routeOptions(source.z)){
    const f=forkAt(source.z),choices=f?{[f.id]:branch}:{},p=worldPoint(source.x,source.z,choices);
    const mesh=new T.Group();mesh.rotation.order='YXZ';for(const child of source.mesh.children)mesh.add(child.clone());
    const instance={x:source.x,z:source.z,type:source.type,choices,source,mesh,home:p,knocked:false};
    mesh.userData.obstacle=source;mesh.userData.obstacleInstance=instance;
    scene.add(mesh);this.instances.push(instance);source.instances.push(instance);
   }
  }
  this.reset();
 }
 reset(){
  this.contacts.clear();
  for(const i of this.instances){
   i.knocked=false;i.hit=false;i.debrisTime=0;i.fallenBody=null;i.source.hit=false;
   i.mesh.position.set(i.home.x,0,i.home.z);i.mesh.rotation.set(0,i.home.yaw,0);
   for(const child of i.mesh.children)child.visible=true;
  }
 }
 step(dt){
  for(const i of this.instances){
   if(!i.knocked)continue;
   i.debrisTime=Math.min(1.15,i.debrisTime+dt);
   const t=i.debrisTime/1.15,ease=1-(1-t)**3;
   i.mesh.position.set(T.MathUtils.lerp(i.debrisFrom.x,i.debrisTo.x,ease),.42*ease+Math.sin(t*Math.PI)*.8,T.MathUtils.lerp(i.debrisFrom.z,i.debrisTo.z,ease));
   i.mesh.rotation.set(t*Math.PI/2,i.home.yaw,Math.sin(t*Math.PI)*.3*i.debrisSide);
   for(const child of i.mesh.children)if(child.material?.map)child.visible=false;
   if(t===1&&!i.fallenBody)this.fitFallenBody(i);
  }
 }
 fitFallenBody(i){
  i.mesh.updateMatrixWorld(true);
  const bounds=new T.Box3(),inverseYaw=new T.Matrix4().makeRotationY(-i.home.yaw);
  i.mesh.traverse(object=>{
   if(!object.isMesh||!object.visible||object.material?.map)return;
   object.geometry.computeBoundingBox();
   bounds.union(object.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverseYaw,object.matrixWorld)));
  });
  if(bounds.isEmpty())return;
  const center=bounds.getCenter(new T.Vector3()).applyAxisAngle(new T.Vector3(0,1,0),i.home.yaw),size=bounds.getSize(new T.Vector3());
  i.fallenBody={x:center.x,z:center.z,bottom:Math.max(0,bounds.min.y),top:bounds.max.y,halfX:size.x/2,halfZ:size.z/2,yaw:i.home.yaw};
 }
 tripContacts(from,to,height){
  const touching=new Set(),entered=[];
  for(const i of this.instances){
   if(!i.knocked||!i.fallenBody||Math.abs(i.fallenBody.z-to.z)>Math.abs(to.z-from.z)+5)continue;
   if(solidContact(i.fallenBody,from,to,height)){touching.add(i);if(!this.contacts.has(i))entered.push(i);}
  }
  this.contacts=touching;return entered;
 }
 draw(z){for(const i of this.instances)i.mesh.visible=i.z>z-40&&i.z<z+180;}
}
