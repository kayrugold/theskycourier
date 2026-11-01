// Swept collision against the same oriented boxes used to draw street fixtures.
// Keep this independent of rendering and spatial culling.
export function solidContact(body,from,to,height=1.4,radius=.4){
 const c=Math.cos(body.yaw??0),s=Math.sin(body.yaw??0);
 const local=p=>({x:(p.x-body.x)*c-(p.z-body.z)*s,z:(p.x-body.x)*s+(p.z-body.z)*c,y:p.y??0});
 const a=local(from),b=local(to);
 const angle=typeof radius==='object'?(radius.yaw??0)-(body.yaw??0):0;
 const rx=typeof radius==='object'?Math.abs(Math.cos(angle))*radius.halfX+Math.abs(Math.sin(angle))*radius.halfZ:radius;
 const rz=typeof radius==='object'?Math.abs(Math.sin(angle))*radius.halfX+Math.abs(Math.cos(angle))*radius.halfZ:radius;
 const bounds=[['x',-body.halfX-rx,body.halfX+rx],['z',-body.halfZ-rz,body.halfZ+rz],['y',body.bottom-height+.03,body.top-.03]];
 let enter=0,leave=1,axis=null,sign=0,depth=0;
 for(const [key,min,max] of bounds){
  const delta=b[key]-a[key];
  if(Math.abs(delta)<1e-9){if(a[key]<=min||a[key]>=max)return null;continue;}
  let lo=(min-a[key])/delta,hi=(max-a[key])/delta;
  if(lo>hi)[lo,hi]=[hi,lo];
  if(lo>=enter){enter=lo;axis=key;sign=delta>0?-1:1;}
  leave=Math.min(leave,hi);
  if(enter>leave)return null;
 }
 if(leave<0||enter>1)return null;
 // A run reset or vehicle dismount can start within a fixture. Push to its
 // nearest horizontal face instead of leaving the rider trapped in the solid.
 if(!axis){
  const faces=[['x',-1,a.x+body.halfX+rx],['x',1,body.halfX+rx-a.x],['z',-1,a.z+body.halfZ+rz],['z',1,body.halfZ+rz-a.z]].sort((u,v)=>u[2]-v[2]);
  [axis,sign,depth]=faces[0];enter=0;
 }
 const nx=axis==='x'?sign*c:axis==='z'?sign*s:0,nz=axis==='x'?-sign*s:axis==='z'?sign*c:0;
 return {body,t:Math.max(0,enter),nx,nz,depth,ny:axis==='y'?sign:0};
}

export class SolidWorld{
 constructor(){this.buckets=new Map();this.disabledLayers=new Set();this.count=0;}
 setLayerEnabled(layer,enabled){if(enabled)this.disabledLayers.delete(layer);else this.disabledLayers.add(layer);}
 add(body){
  const c=Math.abs(Math.cos(body.yaw??0)),s=Math.abs(Math.sin(body.yaw??0));
  const reach=s*body.halfX+c*body.halfZ;body.reachX=c*body.halfX+s*body.halfZ;
  for(let cell=Math.floor((body.z-reach)/32);cell<=Math.floor((body.z+reach)/32);cell++){
   if(!this.buckets.has(cell))this.buckets.set(cell,[]);
   this.buckets.get(cell).push(body);
  }
  this.count++;
 }
 nearby(from,to,padding=.5,vehicle=false){
  const bodies=new Set();
  for(let cell=Math.floor((Math.min(from.z,to.z)-1)/32);cell<=Math.floor((Math.max(from.z,to.z)+1)/32);cell++)for(const body of this.buckets.get(cell)??[]){if(body.vehicleOnly&&!vehicle||this.disabledLayers.has(body.layer)||body.obstacleInstance?.knocked)continue;if(body.x+body.reachX+padding<Math.min(from.x,to.x)||body.x-body.reachX-padding>Math.max(from.x,to.x))continue;bodies.add(body);}
  return bodies;
 }
 sweep(from,to,height){
  let first=null;
  for(const body of this.nearby(from,to)){
   const hit=solidContact(body,from,to,height);
   if(hit&&(!first||hit.t<first.t))first=hit;
  }
  return first;
 }
 sweepVehicle(from,to,height,shape,moving=[]){
  let first=null;const reach=Math.hypot(shape.halfX,shape.halfZ);
  const bodies=this.nearby({...from,z:from.z-reach},{...to,z:to.z+reach},reach,true);
  for(const body of [...bodies,...moving]){
   if(body.top<=Math.max(from.y,to.y)+.04||body.obstacleInstance?.knocked)continue;
   const hit=solidContact(body,from,to,height,shape);
   if(hit&&(!first||hit.t<first.t))first=hit;
  }
  return first;
 }
 support(point){
  let top=0;
  for(const body of this.nearby(point,point)){
   if(body.top>point.y+.15)continue;
   const c=Math.cos(body.yaw??0),s=Math.sin(body.yaw??0),dx=point.x-body.x,dz=point.z-body.z;
   if(Math.abs(dx*c-dz*s)<=body.halfX&&Math.abs(dx*s+dz*c)<=body.halfZ)top=Math.max(top,body.top);
  }
  return top;
 }
}
