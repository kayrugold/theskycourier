import { sameRoute } from './routes.js';

export const THIEF_SITES=[{x:10.8,z:330},{x:-10.8,z:1810},...[0,1].map(branch=>({x:branch?10.8:-10.8,z:1050,choices:{0:branch}})),...[0,1,2,3].map(branch=>({x:branch%2?10.8:-10.8,z:3000,choices:{1:branch}})),...[0,1].map(branch=>({x:branch?10.8:-10.8,z:5100,choices:{2:branch}}))];
export function newThieves(){return THIEF_SITES.map(site=>({...site,homeX:site.x,choices:site.choices||{},phase:'idle',time:0,hit:false}));}
// One committed lateral ambush. The target is sampled once, never chased.
export function stepThief(thief,player,dt){
 if(player.handoff>0)return null;
 if(thief.phase==='spent')return null;
 if(thief.phase==='idle'){
  const gap=thief.z-player.z;
  if(gap< -10){thief.phase='spent';return null;}
  if(gap>Math.min(70,Math.max(25,player.speed*.65+5))||gap<10||Math.abs(player.x-thief.homeX)>13||!sameRoute(thief.z,player.choices,thief.choices))return null;
  thief.phase='warning';thief.targetX=player.x;thief.stageDistance=Math.min(3,Math.abs(thief.homeX-player.x));thief.time=0;return 'warning';
 }
 thief.time+=dt;
 const sign=Math.sign(thief.homeX-thief.targetX)||1;
 if(thief.phase==='warning'&&thief.time>=.15){thief.phase='run';thief.time=0;}
 if(thief.phase==='run'){
  thief.x=thief.homeX+(thief.targetX+sign*(thief.stageDistance??3)-thief.homeX)*Math.min(1,thief.time/.3);
  if(thief.time>=.3){thief.phase='dive';thief.time=0;}
 }
 if(thief.phase==='dive'){
  thief.x=thief.targetX+sign*(thief.stageDistance??3)*(1-Math.min(1,thief.time/.35));
  if(!thief.hit&&Math.abs(player.z-thief.z)<2.5&&Math.abs(player.x-thief.x)<2.3&&player.y<1.3&&!player.caught&&sameRoute(thief.z,player.choices,thief.choices)){
   thief.hit=true;return 'caught';
  }
  if(thief.time>=1.4){thief.phase='spent';}
 }
 return null;
}
