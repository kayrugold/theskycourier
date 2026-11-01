import * as T from 'three';

// A small shared geometry fist and a comic speech bubble make an attack readable.
export class DriverArt{
 constructor(cars,label){
  this.cars=cars;
  const skin=new T.MeshLambertMaterial({color:'#efb87f'}),sleeve=new T.MeshLambertMaterial({color:'#e24e43'});
  const cube=new T.BoxGeometry(1,1,1),round=new T.SphereGeometry(1,8,6);
  for(const car of cars){
   const group=new T.Group(),arm=new T.Group();
   const part=(geo,material,x,y,z,w,h,d)=>{const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);arm.add(mesh);};
   part(cube,sleeve,.18,0,0,.65,.3,.3);
   part(round,skin,.56,.03,0,.34,.23,.23);
   for(let i=0;i<4;i++)part(round,skin,.62,.2,(i-1.5)*.13,.15,.14,.09);
   part(round,skin,.48,-.08,.23,.2,.12,.13);
   group.add(arm);
   const bubble=label('#@%*!','#fff6d9','#a92c39',3.5,1.2);bubble.position.set(0,car.height+1.25,0);group.add(bubble);
   group.visible=false;car.mesh.add(group);car.driverArt=group;car.driverFist=arm;car.driverBubble=bubble;
  }
 }
 update(time,camera){
  for(const car of this.cars){
   const active=car.driver?.phase==='warning'||car.driver?.phase==='lunge';
   car.driverArt.visible=active&&car.mesh.visible;
   if(!active)continue;
   const side=Math.sign(car.driver.targetX-car.x)||1;
   car.driverFist.position.set(side*(car.width/2-.05),Math.min(car.height-.55,2.4),car.length*.3);
   car.driverFist.rotation.set(0,side<0?Math.PI:0,Math.sin(time*24)*.28);
   car.driverBubble.quaternion.copy(car.mesh.quaternion).invert().multiply(camera.quaternion);
   car.driverBubble.scale.setScalar(1+Math.sin(time*13)*.04);
  }
 }
}
