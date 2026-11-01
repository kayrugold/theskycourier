import * as T from 'three';
export class BoosterExhaust{
 constructor(player){
  this.positions=new Float32Array(48*3);this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(this.positions,3));
  this.points=new T.Points(this.geometry,new T.PointsMaterial({color:'#ffbd55',size:.13,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}));
  this.points.frustumCulled=false;this.points.visible=false;player.add(this.points);
 }
 update(time,active){this.points.visible=active;if(!active)return;for(let i=0;i<48;i++){const age=(time*2.6+i/48)%1;this.positions[i*3]=Math.sin(i*17.3)*(.07+age*.35);this.positions[i*3+1]=.32+Math.cos(i*9.1)*age*.15;this.positions[i*3+2]=-1-age*2.8;}this.geometry.attributes.position.needsUpdate=true;}
}

export function createBoosterPickup(label){
 const mesh=new T.Group(),bottles=new T.Group();
 const orange=new T.MeshLambertMaterial({color:'#ffae35',emissive:'#db6200',emissiveIntensity:.55});
 const steel=new T.MeshLambertMaterial({color:'#e8edf0'}),dark=new T.MeshLambertMaterial({color:'#354b61'});
 for(const side of [-1,1]){
  const bottle=new T.Mesh(new T.CylinderGeometry(.26,.26,1.25,10),orange);bottle.position.x=side*.3;bottles.add(bottle);
  const band=new T.Mesh(new T.CylinderGeometry(.275,.275,.2,10),steel);band.position.set(side*.3,.04,0);bottles.add(band);
 }
 const valve=new T.Mesh(new T.BoxGeometry(.85,.18,.25),dark);valve.position.y=.72;bottles.add(valve);mesh.add(bottles);
 const ring=new T.Mesh(new T.TorusGeometry(.95,.055,6,32),orange);ring.rotation.x=Math.PI/2;ring.position.y=-.67;mesh.add(ring);
 const sign=label('BOOST','#342a42','#ffd678',3.1,.75);sign.position.y=1.45;mesh.add(sign);
 return {mesh,bottles,sign};
}
export class SlideTrail{
 constructor(player){
  this.positions=new Float32Array(24*3);this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(this.positions,3));
  this.points=new T.Points(this.geometry,new T.PointsMaterial({color:'#ddc8ac',size:.17,transparent:true,opacity:.4,depthWrite:false}));
  this.points.frustumCulled=false;this.points.visible=false;player.add(this.points);
 }
 update(time,active){
  this.points.visible=active;if(!active)return;
  for(let i=0;i<24;i++){const age=(time*2+i/24)%1;this.positions[i*3]=Math.sin(i*13)*(.25+age*.5);this.positions[i*3+1]=.08+age*.3;this.positions[i*3+2]=-1-age*2.5;}
  this.geometry.attributes.position.needsUpdate=true;
 }
}
