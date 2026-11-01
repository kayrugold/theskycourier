import {routePose,worldPoint,coursePoint,sameRoute} from './routes.js';
import {trafficSurface} from './traffic-routing.js';

const DECEL=45,ACCEL=18;
export const movableObstacle=type=>type==='barrier'||type==='cone';
export function trafficStopLine(car,crossing){return crossing.z-crossing.width/2-car.length/2-3;}

export function constrainTrafficSpeed(car,requested,previousSpeed,dt,{crossings=[],cars=[],obstacles=[]}={}){
 let speed=Math.min(requested,previousSpeed+ACCEL*dt),stopZ=null,blockedBy=null;
 const stop=(line,reason,leaderSpeed=0)=>{
  const distance=(line-car.z)*routePose(car.z,car.choices).pace;
  if(distance<-.05)return;
  const limit=Math.sqrt(Math.max(0,leaderSpeed*leaderSpeed+2*DECEL*distance));
  if(limit<=speed){speed=limit;stopZ=line;blockedBy=reason;}
 };
 for(const track of crossings)if(track.warning&&(car.y??0)<track.height+.2)stop(trafficStopLine(car,track),'train');
 for(const o of obstacles){
  if(o.type!=='bin'||(car.y??0)>2||(o.choices&&!sameRoute(o.z,car.choices,o.choices))||Math.abs(car.x-o.x)>car.width/2+1.1)continue;
  stop(o.z-1.2-car.length/2-1,'bin');
 }
 for(const other of cars){
  if(other===car||other.z<=car.z||!sameRoute(car.z,car.choices,other.choices)||Math.abs(car.x-other.x)>(car.width+other.width)/2+.5||Math.abs((car.y??0)-(other.y??0))>3)continue;
  stop(other.z-(car.length+other.length)/2-7,'traffic',other.speed);
 }
 return {speed,stopZ,blockedBy,braking:speed<previousSpeed-.01||speed<.1,warning:blockedBy!==null};
}

export function guardCrossings(car,previous,crossings){
 for(const track of crossings){
  if(!track.warning||(car.y??0)>=track.height+.2)continue;
  const line=trafficStopLine(car,track);
  if(previous.z<=line+.01&&car.z>line){car.z=line;car.speed=0;car.braking=true;car.warning=true;car.blockedBy='train';}
 }
}

export function knockObstacle(instance,car){
 if(instance.knocked||!movableObstacle(instance.type))return false;
 instance.knocked=true;instance.hit=true;instance.debrisTime=0;
 const side=Math.sign(instance.x-car.x)||((car.index??0)%2?1:-1);
 instance.debrisFrom=worldPoint(instance.x,instance.z,instance.choices);
 instance.debrisTo=worldPoint(side*10.8,instance.z+4+Math.min(5,car.speed*.04),instance.choices);
 instance.debrisSide=side;
 return true;
}

export function guardVehicleSolids(car,previous,roofs,world,movingBodies=[]){
 if(Math.abs(car.z-previous.z)>30)return;
 const surface=trafficSurface(car,roofs);Object.assign(car,surface);
 const from={...worldPoint(previous.x,previous.z,car.choices),y:(previous.y??car.y)+Math.abs(previous.slope??0)*car.length/2};
 const to={...worldPoint(car.x,car.z,car.choices),y:car.y+Math.abs(car.slope)*car.length/2};
 const shape={halfX:car.width/2,halfZ:car.length/2,yaw:routePose(car.z,car.choices).yaw};
 for(let i=0;i<12;i++){
  const hit=world.sweepVehicle(from,to,car.height,shape,movingBodies);
  if(!hit)return;
  const instance=hit.body.obstacleInstance;
  if(instance&&knockObstacle(instance,car))continue;
  const t=Math.max(0,hit.t-.002);
  if(hit.depth>0){
   const p=coursePoint({x:from.x+hit.nx*(hit.depth+.03),z:from.z+hit.nz*(hit.depth+.03)},car.choices);
   car.x=p.x;car.z=p.z;
  }else {car.x=previous.x+(car.x-previous.x)*t;car.z=previous.z+(car.z-previous.z)*t;}
  car.speed=0;car.braking=true;car.warning=true;car.blockedBy=hit.body.name;
  Object.assign(car,trafficSurface(car,roofs));return;
 }
}
