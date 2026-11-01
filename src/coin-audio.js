import {sameRoute} from './routes.js';

// A pentatonic climb stays musical, then holds at a comfortable upper register.
const steps=[0,2,4,7,9,12,14,16,19];
export function coinPlaybackRate(streak){
 return 2**(steps[Math.min(steps.length-1,Math.max(0,Math.floor(streak)-1))]/12);
}

export function synthesizeCoin(rate=22050){
 const samples=new Float32Array(Math.ceil(.28*rate));
 for(let i=0;i<samples.length;i++){
  const t=i/rate;
  // A soft metallic strike opens into a higher bell, with no random pitch jitter.
  const bell=(time,f)=>time<0?0:Math.min(1,time/.002)*Math.exp(-time*24)*
   (Math.sin(2*Math.PI*f*time)+.24*Math.sin(2*Math.PI*f*2.76*time)*Math.exp(-time*20));
  const fade=Math.min(1,(samples.length-1-i)/(rate*.025));
  samples[i]=(.24*bell(t,880)+.3*bell(t-.035,1320))*fade;
 }
 return samples;
}

export class CoinSequence{
 constructor(pickups){
  const rows=new Map();
  for(const p of pickups)if(!p.kind){if(!rows.has(p.z))rows.set(p.z,[]);rows.get(p.z).push(p);}
  this.rows=[...rows].sort(([a],[b])=>a-b);this.reset();
 }
 reset(){this.passed=new Set();}
 advance(state,previousZ){
  if(state.z<=previousZ)return;
  const level=(state.grounded?state.y:state.jumpFromY)+1.3;
  for(const [z,coins] of this.rows){
   if(z+1.7<previousZ||z+1.7>=state.z||this.passed.has(z))continue;
   this.passed.add(z);
   // Branch copies and coins at a different height are separate opportunities.
   const available=coins.filter(p=>sameRoute(z,state.choices,p.choices)&&Math.abs(p.y-level)<1.7);
   if(available.length&&!available.some(p=>p.collected))state.coinStreak=0;
  }
 }
 collect(state){state.coinStreak=(state.coinStreak||0)+1;return state.coinStreak;}
}
