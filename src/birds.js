import {jumpGravity} from './physics.js';
import {sameRoute,forkAt,routeOptions,routePose} from './routes.js';
export const BIRD_WARNING=.8, BIRD_DIVE=.65, BIRD_COOLDOWN=4;
export const BIRD_SITES=[260,450,650,950,1250,1580,1800,1980,2140,2400,2680,2940,3240,3500,3760,4000,4300,4600,4900,5200,5480,5750,6020,6300].flatMap((z,i)=>routeOptions(z).map(branch=>({z,x:(i+branch)%2?7:-7,choices:forkAt(z)?{[forkAt(z).id]:branch}:{}})));
export function predictBirdTarget(p,seconds){
 let z=p.z,y=p.y,vy=p.vy||0;
 const steps=Math.ceil(seconds*120),dt=seconds/steps;
 for(let i=0;i<steps;i++){
  // Forward speed is distance along the curved road, not raw course Z.
  z+=p.speed*dt/routePose(z,p.choices).pace;
  if(!p.grounded){const glide=p.gliding&&(p.glideRemaining??Infinity)>i*dt;vy-=(glide?9:jumpGravity({vy,fastFall:p.fastFall}))*dt;if(glide)vy=Math.max(-6,vy);y=Math.max(0,y+vy*dt);}
 }
 return {targetX:p.x,targetZ:z,targetY:y+(p.gliding?1.65:1.3)};
}
export function newBirds(random=Math.random){return BIRD_SITES.map(s=>{
 const x=(random()<.5?-1:1)*(6+random()*2),y=6+random()*3;
 return {...s,x,homeZ:s.z,homeX:x,y,warning:.75+random()*.15,approachHeight:4+random()*3,rangeScale:.92+random()*.2,arc:(random()-.5)*5,choices:s.choices||{},phase:'patrol',time:0,hit:false};
});}
export function stepBird(b,p,dt,canAttack=true){
 const warning=b.warning??BIRD_WARNING;
 b.age=(b.age||0)+dt;
 if(b.phase==='spent')return null;
 if(p.handoff>0||p.caught>0||p.impact>0){if(b.phase!=='patrol')b.phase='spent';return null;}
 if(b.phase==='patrol'){
  b.x=b.homeX+Math.sin(b.age*2+b.homeZ)*1.4;
  b.z=b.homeZ+Math.cos(b.age*1.6)*2;
  if(b.homeZ<p.z-20){b.phase='spent';return null;}
  const gap=b.homeZ-p.z;
  if(!canAttack||gap<5||gap>Math.min(125,Math.max(85,p.speed*1.25))*(b.rangeScale??1)||!sameRoute(b.homeZ,p.choices,b.choices))return null;
  b.phase='warning';b.time=0;b.startX=b.x;b.startZ=b.z;b.startY=Math.max(b.y,p.y+(b.approachHeight??5));b.y=b.startY;
  Object.assign(b,predictBirdTarget(p,warning+BIRD_DIVE));
  return 'warning';
 }
 b.time+=dt;
 if(b.phase==='warning'){
  // Track during the warning, then commit to the marked target for the full dive.
  Object.assign(b,predictBirdTarget(p,Math.max(0,warning-b.time)+BIRD_DIVE));
  if(b.time>=warning){b.time-=warning;b.phase='dive';}
  else return null;
 }
 if(b.phase==='dive'){
  const t=Math.min(1,b.time/BIRD_DIVE),ease=t*t*(3-2*t);
  b.x=b.startX+(b.targetX-b.startX)*ease+Math.sin(Math.PI*t)*(b.arc??0);b.z=b.startZ+(b.targetZ-b.startZ)*t;b.y=b.startY+(b.targetY-b.startY)*ease;
  const torso=p.y+(p.gliding?1.65:1.3);
  const contact=!b.hit&&!p.invulnerable&&!(p.ducking&&p.grounded)&&sameRoute(p.z,p.choices,b.choices)&&Math.abs(p.x-b.x)<1.5&&Math.abs(p.z-b.z)<2.2&&Math.abs(torso-b.y)<1.05;
  if(b.time>=BIRD_DIVE){b.phase='escape';b.time=0;}
  if(contact){b.hit=true;return 'hit';}
 }else if(b.phase==='escape'){
  b.x=b.targetX+Math.sign(b.homeX||1)*b.time*9;b.y=b.targetY+b.time*9;b.z=b.targetZ+b.time*35;
  if(b.time>.9)b.phase='spent';
 }
 return null;
}

