export const FORKS = [
 { id: 0, start: 480, end: 1450, offsets: [48,-48], names: ['Market Loop','Canal Run'] },
 { id: 1, start: 2200, end: 3570, offsets: [138,46,-46,-138], names: ['West Arcade','Busway','Sky Mail','Freight Row'] },
 { id: 2, start: 4410, end: 5540, offsets: [55,-55], names: ['Garden Rise','Express Row'] },
];
const smooth=t=>t*t*t*(t*(t*6-15)+10);
export function forkAt(z) { return FORKS.find(f=>z>=f.start&&z<=f.end); }
export function routeOptions(z) { const f=forkAt(z);return f?f.offsets.map((_,i)=>i):[0]; }
export function choiceFor(f,choices={}) { return Math.max(0,Math.min(f.offsets.length-1,choices[f.id]??Math.floor(f.offsets.length/2))); }
export function routeOffset(z, choice=0) { const f=forkAt(z);if(!f)return 0;const edge=Math.min(z-f.start,f.end-z);if(edge<=0)return 0;return f.offsets[choice] * smooth(Math.min(1,edge/260)); }
export function routePose(z, choices={}) {
 const f=forkAt(z),choice=f?choiceFor(f,choices):0;
 const x=routeOffset(z,choice);
 const slope=(routeOffset(z+.1,choice)-routeOffset(z-.1,choice))/.2;
 return {x,z,yaw:Math.atan(slope),pace:Math.hypot(1,slope),choice};
}
export function worldPoint(x,z,choices={}) { const p=routePose(z,choices);return {x:p.x+x*Math.cos(p.yaw),z:z-x*Math.sin(p.yaw),yaw:p.yaw}; }
export function sameRoute(z, first={},second={}) { const f=forkAt(z);return !f||Math.abs(routeOffset(z,choiceFor(f,first))-routeOffset(z,choiceFor(f,second)))<7; }
export function laneChoice(x,count) { return Math.min(count-1,Math.max(0,Math.floor((11.5-x)/23*count))); }
export function routeChoices(index) { return Object.fromEntries(FORKS.map(f=>[f.id,index%f.offsets.length])); }

// Inverse used when world-space scenery blocks or deflects a course-space rider.
export function coursePoint(point,choices={}){
 let z=point.z;
 const residual=z=>{const p=routePose(z,choices);return z-(point.x-p.x)*Math.tan(p.yaw)-point.z;};
 for(let i=0;i<8;i++){
  const error=residual(z);if(Math.abs(error)<1e-7)break;
  const slope=(residual(z+.05)-residual(z-.05))/.1;
  z-=error/Math.max(.2,slope);
 }
 const p=routePose(z,choices);
 return {x:(point.x-p.x)/Math.cos(p.yaw),z};
}
