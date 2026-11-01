import {sameRoute} from './routes.js';

// A minority of drivers warn, commit to one spot, then cool down. Never home in.
export function driverIntent(car,player,time,cars=[]) {
 const cruiseLane=car.erratic?[-5.7,0,5.7][Math.floor((time+car.index*3)/(8+car.index%3))%3]:car.homeX;
 const behavior=car.driver??={phase:'idle',until:0,cooldown:0,targetX:car.homeX};
 const protectedRider=player.handoff>0||player.caught>0||player.recovery>0||player.impact>0;
 if(!car.aggressive||protectedRider||!sameRoute(player.z,player.choices,car.choices)||Math.abs(car.z-player.z)>100){
  if(behavior.phase!=='idle')behavior.cooldown=time+12;
  behavior.phase='idle';
  return {targetX:cruiseLane,warning:false,started:false};
 }
 let started=false;
 if(behavior.phase==='warning'&&time>=behavior.until){behavior.phase='lunge';behavior.until=time+1.35;}
 if(behavior.phase==='lunge'&&time>=behavior.until){behavior.phase='idle';behavior.cooldown=time+12;}
 const gap=player.z-car.z-car.length/2;
 const crowded=cars.some(other=>other!==car&&sameRoute(car.z,car.choices,other.choices)&&Math.abs(other.z-car.z)<(other.length+car.length)/2+10&&Math.abs(other.x-player.x)<(other.width+car.width)/2+1);
 if(behavior.phase==='idle'&&time>=Math.max(8,behavior.cooldown)&&gap>=14&&gap<=80&&car.speed>player.speed+3&&Math.abs(player.y-(car.y??0))<1.5&&!player.hitch&&!player.ride&&!car.braking&&!crowded){
  behavior.phase='warning';behavior.until=time+1.25;
  behavior.targetX=Math.max(-10.5,Math.min(10.5,player.x));started=true;
 }
 return {targetX:behavior.phase==='lunge'?behavior.targetX:cruiseLane,warning:behavior.phase!=='idle',started};
}

export function courteousLaneTarget(car,player,target) {
 if(player.ride===car||car.aggressive||!sameRoute(player.z,player.choices,car.choices))return target;
 const clearance=car.width/2+.8;
 // Hold off a merge across the rider's space, including a rider splitting lanes.
 if(Math.abs(car.z-player.z)<car.length/2+10&&Math.min(car.x,target)-clearance<player.x&&Math.max(car.x,target)+clearance>player.x)return car.x;
 return target;
}
