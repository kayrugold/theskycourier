import {forkAt,routeOptions,sameRoute} from './routes.js';
import {rampEnd} from './ramps.js';
import {sidewalkSites} from './environment-collision.js';
import {RAIL_CROSSINGS} from './rail-bridges.js';

export function boosterSites(roofs,obstacles){
 const sites=[],planters=sidewalkSites();
 for(let z=90,row=0;z<6350;z+=260,row++){
  if(RAIL_CROSSINGS.some(t=>Math.abs(t.z-z)<18))continue;
  const fork=forkAt(z);
  for(const branch of routeOptions(z)){
   const choices=fork?{[fork.id]:branch}:{};
   const safe=x=>!roofs.some(r=>sameRoute(z,choices,r.choices)&&z>r.start-12&&z<rampEnd(r)+12&&Math.abs(x-r.x)<r.width/2+1)
    &&!obstacles.some(o=>Math.abs(o.z-z)<9&&Math.abs(o.x-x)<2.6)
    &&!planters.some(p=>Math.abs(p.z-z)<5&&Math.abs(p.x-x)<2&&sameRoute(z,choices,p.choices));
   const lane=[0,-5.7,5.7].find(safe),side=[row%2?10.2:-10.2,row%2?-10.2:10.2].find(safe);
   for(const x of [lane,side])if(x!==undefined)sites.push({x,z,y:1.3,choices});
  }
 }
 return sites;
}
