import {jumpVelocity,armGlider,releaseHitch} from './physics.js';
export const SLIDE_MIN=.65,SLIDE_MAX=1.2,JUMP_BUFFER=.14,COYOTE_SECONDS=.1;

export function beginJump(p){
 if((!p.grounded&&!(p.coyoteTime>0))||p.impact>0||p.caught>0||p.handoff>0)return false;
 if(p.ride)p.roofCarry=1.6;
 p.airFlip=true;p.jumpSequence=(p.jumpSequence||0)+1;p.jumpElapsed=0;p.lastRoof=null;p.roofRecatch=0;
 armGlider(p);p.jumpFromY=p.y;p.jumpGrace=.28;p.jumpBuffer=0;p.coyoteTime=0;
 p.vy=jumpVelocity(p.speed);p.grounded=false;p.ride=null;p.fastFall=false;
 p.sliding=false;p.ducking=false;p.slideQueued=0;releaseHitch(p,false);return true;
}
export function stepArcadeActions(p,dt,slidePressed,canStand=true){
 if(!p.grounded)p.jumpElapsed=(p.jumpElapsed||0)+dt;
 p.roofRecatch=Math.max(0,(p.roofRecatch||0)-dt);
 p.jumpGrace=Math.max(0,(p.jumpGrace||0)-dt);
 p.jumpBuffer=Math.max(0,(p.jumpBuffer||0)-dt);
 if(p.grounded){p.jumpFromY=p.y;p.airFlip=false;}
 p.coyoteTime=p.grounded?COYOTE_SECONDS:Math.max(0,(p.coyoteTime||0)-dt);
 p.slideCooldown=Math.max(0,(p.slideCooldown||0)-dt);
 p.slideQueued=Math.max(0,(p.slideQueued||0)-dt);
 const pressed=slidePressed&&!p.slideInput;p.slideInput=slidePressed;
 if(p.impact>0||p.caught>0||p.handoff>0){p.sliding=false;p.ducking=false;p.slideQueued=0;return false;}
 if(p.jumpBuffer>0&&beginJump(p))return true;
 // Down is a ground action. Holding it through landing can start a slide,
 // but it never changes an airborne jump or its vertical velocity.
 if(!p.grounded)p.slideQueued=slidePressed?.1:0;
 if(p.grounded){
  p.fastFall=false;
  if((pressed||p.slideQueued>0)&&!p.sliding&&!p.slideCooldown){p.sliding=true;p.slideElapsed=0;p.slideQueued=0;releaseHitch(p,false);}
 }
 if(p.sliding){
  p.slideElapsed+=dt;
  if(!p.grounded||((p.slideElapsed>=SLIDE_MAX||!slidePressed&&p.slideElapsed>=SLIDE_MIN)&&canStand)){
   p.sliding=false;p.slideCooldown=.18;
  }
 }
 p.ducking=!!p.sliding;return false;
}
