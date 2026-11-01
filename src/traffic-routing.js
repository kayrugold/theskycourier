import {railOpeningAt} from './rail-bridges.js';
import {sameRoute} from './routes.js';
import {rampEnd,roadHeight} from './ramps.js';
// Lane planning is advisory; this guard enforces the actual vehicle footprint.
export function guardTraffic(car,previous,roofs,cars=[]){
 const teleported=Math.abs(car.z-previous.z)>30;
 for(const r of roofs){
  if(!sameRoute(r.start,car.choices,r.choices))continue;
  const front=r.start-car.length/2-1,back=rampEnd(r)+car.length/2+1;
  if(car.z<=front||car.z>=back)continue;
  const margin=r.width/2+.75+car.width/2;
  if(Math.abs(car.x-r.x)>=margin)continue;
  const fits=x=>Math.abs(x-r.x)+car.width/2+.35<r.width/2;
  if(!r.isTrainRamp&&fits(car.x)&&(fits(previous.x)||teleported))continue;
  if(teleported){
   const lane=trafficLane(car,roofs);
   if(lane!==null){car.x=lane;continue;}
  }
  if(previous.z<=front||teleported)car.z=front;
  else {car.x=previous.x;car.z=previous.z;}
  car.speed=0;car.warning=true;
 }
 for(const other of cars){
  if(other===car||other.z<=car.z||!sameRoute(car.z,car.choices,other.choices))continue;
  if(Math.abs(car.x-other.x)>(car.width+other.width)/2+.5)continue;
  const limit=other.z-(car.length+other.length)/2-7;
  if(car.z>limit){
   if(previous.z<=limit||teleported)car.z=limit;
   else if(Math.abs(previous.x-other.x)>(car.width+other.width)/2+.5){car.x=previous.x;car.z=previous.z;}
   car.speed=Math.min(car.speed,other.speed);car.warning=true;
  }
 }
}
export function trafficLane(car,roofs,preferred=car.homeX??car.x){
 const relevant=roofs.filter(r=>sameRoute(r.start,car.choices,r.choices)&&car.z+car.length/2>r.start-100&&car.z-car.length/2<rampEnd(r)+12);
 const fits=(r,x)=>!r.isTrainRamp&&Math.abs(x-r.x)+car.width/2+.35<r.width/2;
 for(const r of relevant){if(car.z+car.length/2>=r.start&&car.z-car.length/2<=rampEnd(r)&&fits(r,car.x))return car.x;}
 const safe=x=>relevant.every(r=>Math.abs(x-r.x)>r.width/2+.75+car.width/2||fits(r,x)&&(car.z+car.length/2<r.start||fits(r,car.x)));
 if(!relevant.length)return preferred;
 return [preferred,0,-5.7,5.7].filter(safe).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred))[0]??null;
}
export function trafficSurface(car,roofs){
 const r=roofs.find(r=>!r.isTrainRamp&&sameRoute(car.z,car.choices,r.choices)&&Math.abs(car.x-r.x)+car.width/2<r.width/2&&car.z+car.length/2>=r.start&&car.z-car.length/2<=rampEnd(r));
 const half=car.length/2,rear=r?roadHeight(r,car.z-half):0,front=r?roadHeight(r,car.z+half):0;
 const slope=(front-rear)/car.length;
 return {y:(front+rear)/2,slope,pitch:-Math.atan(slope)};
}
export function rampRailContact(player,previousX,roofs){
 for(const r of roofs){
  if(!sameRoute(player.z,player.choices,r.choices)||player.z<r.start+2||player.z>rampEnd(r))continue;
  const opening=railOpeningAt(r,player.z);
  if(opening&&player.y+1.4<opening.clearance)continue;
  const top=roadHeight(r,player.z);
  if(player.y>top+1.1)continue;
  for(const side of [-1,1]){
   const rail=r.x+side*(r.width/2+.25);
   if(Math.abs(player.x-rail)>.65)continue;
   // The outside lane is the sidewalk; don't leave a skateable slit beside the rail.
   const wasInside=Math.abs(previousX-r.x)<r.width/2+.25;
   return wasInside?r.x+side*(r.width/2-.45):rail+side*.7;
  }
 }
 return null;
}
