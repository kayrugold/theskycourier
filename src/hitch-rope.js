import * as T from 'three';

// A flexible rope stays procedural; the rigid vehicle attachment is separate.
export class HitchRope extends T.Group {
 constructor(){
  super();
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#b48b50';ctx.fillRect(0,0,64,128);
  for(let y=-64;y<192;y+=16){
   ctx.strokeStyle='#ebcf92';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(64,y+48);ctx.stroke();
   ctx.strokeStyle='#705335';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y+7);ctx.lineTo(64,y+55);ctx.stroke();
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
  this.segments=new T.InstancedMesh(new T.CylinderGeometry(.055,.055,1,8),new T.MeshStandardMaterial({map:texture,roughness:.95}),40);
  this.segments.instanceMatrix.setUsage(T.DynamicDrawUsage);this.segments.frustumCulled=false;this.add(this.segments);
  this.cup=new T.Group();this.add(this.cup);
  const rubber=new T.MeshStandardMaterial({color:'#293b42',roughness:.85,side:T.DoubleSide});
  const profile=[[.07,-.18],[.09,-.06],[.15,.02],[.27,.10],[.28,.15],[.24,.16],[.12,.06],[.06,.01]].map(([x,y])=>new T.Vector2(x,y));
  const cup=new T.Mesh(new T.LatheGeometry(profile,20),rubber);cup.rotation.x=Math.PI/2;this.cup.add(cup);
  const collar=new T.Mesh(new T.CylinderGeometry(.1,.1,.19,12),new T.MeshStandardMaterial({color:'#ef9a3e',metalness:.45,roughness:.45}));collar.rotation.x=Math.PI/2;collar.position.z=-.2;this.cup.add(collar);
  const rim=new T.Mesh(new T.TorusGeometry(.26,.025,6,24),new T.MeshStandardMaterial({color:'#d4d9cc',metalness:.65,roughness:.4}));rim.position.z=.13;this.cup.add(rim);
  this.dummy=new T.Object3D();this.up=new T.Vector3(0,1,0);this.previous=new T.Vector3();this.next=new T.Vector3();this.direction=new T.Vector3();
 }
 update(a,b,charge,time,yaw){
  const distance=a.distanceTo(b),sag=Math.min(.65,distance*.025)*(1-Math.min(1,charge/1.5)*.8);
  const point=(t,out)=>{out.lerpVectors(a,b,t);const bend=Math.sin(Math.PI*t);out.y-=sag*bend;out.x+=Math.sin(time*8-t*9)*.045*bend;};
  point(0,this.previous);
  for(let i=0;i<40;i++){
   point((i+1)/40,this.next);this.direction.subVectors(this.next,this.previous);
   this.dummy.position.copy(this.previous).add(this.next).multiplyScalar(.5);this.dummy.quaternion.setFromUnitVectors(this.up,this.direction.clone().normalize());
   this.dummy.scale.set(1,this.direction.length()+.015,1);this.dummy.updateMatrix();this.segments.setMatrixAt(i,this.dummy.matrix);this.previous.copy(this.next);
  }
  this.segments.instanceMatrix.needsUpdate=true;this.cup.position.copy(b);this.cup.rotation.y=yaw;
 }
}
