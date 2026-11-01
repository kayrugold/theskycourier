import {forkAt,routeOptions,sameRoute} from './routes.js';
import {COURSE_LENGTH} from './physics.js';
import {JOB_STOPS} from './jobs.js';
export function environmentSites(id){
 const sites=[];
 for(let z=-25;z<COURSE_LENGTH;z+=44){
  const fork=forkAt(z);if(fork&&Math.min(z-fork.start,fork.end-z)<230)continue;
  if(id==='tree0'&&Math.floor(z)%3!==0)continue;
  for(const side of [-1,1])for(const branch of routeOptions(z)){
   const site={id,x:side*(id==='tree0'?12:11.4),z:z+(id==='tree0'?10:0),choices:fork?{[fork.id]:branch}:{},radius:id==='tree0'?.65:.4,height:id==='tree0'?6:7};
   if(JOB_STOPS.some(({stop})=>Math.abs(stop.z-site.z)<7&&Math.abs(stop.x-site.x)<3&&sameRoute(site.z,stop.choices,site.choices)))continue;
   sites.push(site);
  }
 }
 return sites;
}
export function sceneryContact(site,player,previous){
 if(player.y>site.height||!sameRoute(site.z,player.choices,site.choices))return false;
 const radius=(site.id==='tree0'&&player.y>2.8?1.7:site.radius)+.4;
 const dx=player.x-previous.x,dz=player.z-previous.z,length=dx*dx+dz*dz;
 const t=length?Math.max(0,Math.min(1,((site.x-previous.x)*dx+(site.z-previous.z)*dz)/length)):0;
 return Math.hypot(previous.x+t*dx-site.x,previous.z+t*dz-site.z)<radius;
}

// Alternating visible planters interrupt both sidewalk edges without sealing them.
export function sidewalkSites(){
 const sites=[];
 for(let z=305,i=0;z<COURSE_LENGTH-80;z+=155,i++){
  const fork=forkAt(z);if(fork&&Math.min(z-fork.start,fork.end-z)<240)continue;
  for(const side of [-1,1])for(const branch of routeOptions(z)){
   const choices=fork?{[fork.id]:branch}:{},x=side*((i+(side>0?1:0))%2?10.15:11.75);
   if(JOB_STOPS.some(({stop})=>Math.abs(stop.z-z)<14&&sameRoute(z,choices,stop.choices)))continue;
   sites.push({x,z,choices});
  }
 }
 return sites;
}
