const clamp=t=>Math.max(0,Math.min(1,t));
export function boardTrickPose(state){
 const airborne=!state.grounded&&state.airFlip&&!state.gliding;
 const age=state.jumpElapsed||0;
 const progress=clamp((age-.12)/.66),ease=progress*progress*(3-2*progress);
 return {
  active:airborne,
  spin:airborne&&state.jumpSequence%3===0?Math.PI*2*ease:0,
  pitch:airborne?-.12*Math.sin(Math.PI*clamp(age/1.08)):0,
 };
}
export function updateBoardTricks(group,state,dt){
 const pose=boardTrickPose(state),blend=1-Math.exp(-dt*18);
 if(pose.active)group.rotation.y=pose.spin;
 else {
  group.rotation.y=Math.atan2(Math.sin(group.rotation.y),Math.cos(group.rotation.y));
  group.rotation.y+=( (state.sliding?.45:0)-group.rotation.y)*blend;
 }
 group.rotation.x+=(pose.pitch-group.rotation.x)*blend;
}
