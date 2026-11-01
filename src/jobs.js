import { sameRoute, forkAt, choiceFor } from './routes.js';
function job(name,pickupZ,dropZ,forkId=null,count=1){
 const variants=Array.from({length:count},(_,branch)=>{
  const choices=forkId===null?{}:{[forkId]:branch},side=branch%2?-1:1;
  return {pickup:{z:pickupZ,x:-10.2*side,name:`${name.toUpperCase()} PICKUP`,choices},drop:{z:dropZ,x:10.2*side,name:`${name.toUpperCase()} DELIVERY`,choices}};
 });
 return {name,variants,...variants[0],bonus:2500};
}
export const JOBS=[job('Miko → Jun',210,390),job('Market parcels',850,1200,0,2),job('Ada → Bea',1740,2040),job('Arcade express',2600,3260,1,4),job('Sol → Sky Mail',3860,4200),job('Garden parcels',4780,5300,2,2)];
export const JOB_STOPS=JOBS.flatMap((job,jobIndex)=>job.variants.flatMap((variant,variantIndex)=>['pickup','drop'].map(kind=>({stop:variant[kind],jobIndex,variantIndex,kind}))));
export function activeVariant(player){
 const job=JOBS[player.jobIndex];if(!job)return null;
 if(player.carrying)return job.variants[player.jobVariant??0];
 const fork=forkAt(job.pickup.z),index=fork?choiceFor(fork,player.choices):0;
 return job.variants[index]||job.variants[0];
}
export function activeStop(player){const variant=activeVariant(player);return variant?(player.carrying?variant.drop:variant.pickup):null;}
export function updateJob(player){
 if(player.caught>0||player.handoff>0||player.impact>0)return null;
 const stop=activeStop(player);if(!stop)return null;
 if(Math.abs(player.z-stop.z)<5&&Math.abs(player.x-stop.x)<2.4&&player.y<1.1&&sameRoute(stop.z,player.choices,stop.choices)){
  if(!player.carrying){player.jobVariant=JOBS[player.jobIndex].variants.indexOf(activeVariant(player));player.carrying=true;return 'pickup';}
  player.carrying=false;player.completed++;player.jobIndex++;player.jobVariant=0;return 'delivery';
 }
 if(player.z>stop.z+24){player.carrying=false;player.jobIndex++;player.jobVariant=0;return 'missed';}
 return null;
}


