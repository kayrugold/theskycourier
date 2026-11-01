import {FORKS,choiceFor} from './routes.js';

export function mobileObjective(state,stop){
 if(!stop)return 'Clocktower finish';
 const side=stop.x<0?'→ Right':'← Left';
 return `${state.carrying?'Deliver':'Pick up'} · ${side} · ${Math.max(0,Math.round(stop.z-state.z))}m`;
}
export function mobileRoute(state){
 const fork=FORKS.find(f=>state.z>=f.start-200&&state.z<f.start+50);
 return fork?`Fork ${state.z<fork.start?'in '+Math.ceil(fork.start-state.z)+'m':'ahead'} · ${fork.names[choiceFor(fork,state.choices)]}`:'';
}
export function mobileNotice(state,{rear,toast='',remaining=0}={}){
 // One slot: immediate threats take precedence over rewards and equipment tips.
 if(rear)return {text:`↑ Traffic behind · ${rear.x>state.x+.8?'move right':rear.x<state.x-.8?'move left':'move aside'}`,danger:true};
 if(state.hitch?.warning)return {text:'Brake lights · tap vehicle to release',danger:true};
 if(remaining>0){
  for(const [match,text,danger] of [
   [/^BIRD DIVE/,'Bird diving · dodge or slide',true],
   [/^SIDEWALK THIEF/,'Thief ahead · dodge or jump',true],
   [/^ANGRY DRIVER/,'Swerving driver · dodge',true],
   [/^BOOST TANK/,'+1 boost tank'],
   [/^GLIDER EQUIPPED/,'Glider collected'],
   [/^PACKAGE RECEIVED/,'Package collected'],
   [/^DELIVERED/,'Delivered! +2,500'],
   [/^Missed that handoff/,'Next stop marked'],
   [/^Collect an orange BOOST/,'Collect a boost tank first'],
   [/^Finish this boost/,'Recover before boosting'],
   [/^Get (behind|closer)/,'Move closer behind a vehicle'],
  ])if(match.test(toast))return {text,danger:!!danger};
 }
 if(state.hitch)return {text:state.charge>=.5?'Tap vehicle to slingshot':'Hitch charging…',danger:false};
 if(state.gliding)return {text:`Gliding · ${state.glideRemaining.toFixed(1)}s`,danger:false};
 if(state.flightReady)return {text:'Tap to open glider',danger:false};
 return {text:'',danger:false};
}

export class MobileHud{
 constructor(){
  const $=id=>document.getElementById(id);
  this.button=$('map-toggle');this.panel=$('delivery-panel');
  this.objective=$('mobile-objective');this.route=$('mobile-route');this.notice=$('mobile-notice');
  this.media=matchMedia('(any-pointer: coarse), (max-width: 760px)');
  this.button.addEventListener('click',()=>this.setMap(!this.open));
  this.media.addEventListener('change',()=>this.setMap(false));
  this.setMap(false);
 }
 setMap(open){
  this.open=!!open&&this.media.matches;
  document.body.classList.toggle('mobile-map-open',this.open);
  this.button.setAttribute('aria-expanded',String(this.open));
  this.button.textContent=this.open?'CLOSE':'MAP';
  this.panel.setAttribute('aria-hidden',String(this.media.matches&&!this.open));
 }
 update(state,mode,stop,notice){
  document.body.dataset.mode=mode;
  if(mode!=='playing'&&this.open)this.setMap(false);
  if(!this.media.matches)return;
  this.objective.textContent=mobileObjective(state,stop);
  this.route.textContent=mobileRoute(state);
  const message=mobileNotice(state,notice);
  this.notice.textContent=message.text;
  this.notice.classList.toggle('danger',message.danger);
 }
}
