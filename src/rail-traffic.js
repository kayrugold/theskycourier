import {RAIL_CROSSINGS} from './rail-bridges.js';

const early=[['locomotive0',12,3.8,3.6,20],['flatbed1',5,.85,3,10.5],['container1',12,3.5,3.6,1],['flatbed1',5,.85,3,-8.5],['container2',12,3.5,3.6,-18]];
const mid=[['locomotive0',15,4.2,4.2,40]];
for(let i=0;i<4;i++){mid.push(['flatbed1',5,.9,3.2,28-i*19],[i%2?'container2':'container1',12,3.6,3.6,18-i*19]);}
export const CROSSING_TRAINS=[
 {...RAIL_CROSSINGS[0],cycle:12,duration:6,from:-65,to:65,parts:early},
 {...RAIL_CROSSINGS[1],cycle:16,duration:7.5,from:-85,to:90,parts:mid},
];
// Rendering, signals and traffic use the same train position and tail clearance.
export function crossingMotion(index,time){
 const train=CROSSING_TRAINS[index],phase=((time%train.cycle)+train.cycle)%train.cycle;
 const active=phase<train.duration,x=active?train.from+(train.to-train.from)*phase/train.duration:-999;
 const minX=x+Math.min(...train.parts.map(p=>p[4]-p[1]/2)),maxX=x+Math.max(...train.parts.map(p=>p[4]+p[1]/2));
 return {...train,x,active,minX,maxX,blocked:active&&maxX>-15&&minX<15,warning:active&&maxX>-55&&minX<15};
}
export function crossingBodies(crossings){
 return crossings.flatMap(t=>t.active?t.parts.map(p=>({x:t.x+p[4],z:t.z,halfX:p[1]/2,halfZ:p[3]/2,bottom:0,top:p[2],yaw:0,name:'TRAIN'})):[]);
}
