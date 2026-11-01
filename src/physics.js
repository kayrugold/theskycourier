import {roofContact} from './vehicle-roofs.js';
export {vehicleRoofHeight} from './vehicle-roofs.js';
export const COURSE_LENGTH = 6500;
export const TIME_LIMIT = 150;
export const CRUISE_SPEED = 72;
export const MAX_SPEED = 88;
export const BRAKE_SPEED = 58;
export const GRAVITY = 44;
export const FALL_GRAVITY=48;
export function jumpGravity(p){return p.vy>0?GRAVITY:FALL_GRAVITY;}
export function jumpVelocity(speed) { return 24.2+Math.min(1.8,Math.max(0,speed-72)*.04); }
export function newRun() { return { x: 0, z: 0, y: 0, vy: 0, speed: CRUISE_SPEED, time: TIME_LIMIT, stamps: 0, coinStreak: 0, boosterTanks: 0, tankBoost: 0, condition: 100, invulnerable: 0, grounded: true, gliding: false, hasGlider: false, flightReady: false, glideRemaining: 0, caught: 0, handoff: 0, jobVariant: 0, impact: 0, tripping:0, impactVelocity: 0, impactDirection: null, recovery: 0, ducking: false, sliding:false, slideElapsed:0, slideCooldown:0, slideInput:false, slideQueued:0, jumpGrace:0, jumpFromY:0, jumpBuffer:0, coyoteTime:0, fastFall:false, airFlip:false, jumpSequence:0, jumpElapsed:0, roofCarry:0, lastRoof:null, roofRecatch:0, hitch: null, ride: null, charge: 0, boost: 0, launchSpeed: 0, choices: {}, completed: 0, jobIndex: 0, carrying: false, finished: false }; }
export function rampHeight(z, start, height = 6, length = 35) { return Math.max(0, Math.min(height, (z - start) / length * height)); }
export function canHitch(player, car) { const rear = car.z - (car.length || 4.4) / 2; const dz = rear - player.z; return !(player.impact>0) && dz > 1 && dz < 55 && Math.abs(car.x - player.x) < 5 && Math.abs(player.y-((car.y??0)-(car.slope??0)*(car.length||4.4)/2)) < 1.5; }
export function advanceSpeed(speed, hitched, braking, dt, input = {}, trafficSpeed = 98) {
 if (input.recovery > 0) return input.brake ? speed : Math.min(input.accelerate ? MAX_SPEED : CRUISE_SPEED, speed + (input.impact > 0 ? 4 : 22) * dt);
 if (input.tankBoost>0) {const target=MAX_SPEED+30*Math.min(1,input.tankBoost/.4);return speed>target?Math.max(target,speed-175*dt):Math.min(target,speed+175*dt);}
 if(input.sliding)return Math.max(0,speed-8*dt);
 if (input.brake) return speed > BRAKE_SPEED ? Math.max(BRAKE_SPEED, speed - 48 * dt) : speed;
 if (hitched) return Math.min(trafficSpeed, speed + (trafficSpeed - speed) * (1 - Math.exp(-5 * dt)));
 if (input.boost > 0) return MAX_SPEED + (input.launchSpeed - MAX_SPEED) * Math.min(1, input.boost / 1.6);
 if(input.roofCarry>0&&speed>MAX_SPEED)return Math.max(MAX_SPEED,speed-24*dt);
 speed = Math.min(speed, MAX_SPEED);
 const target = input.accelerate ? MAX_SPEED : CRUISE_SPEED;
 return speed + (target - speed) * (1 - Math.exp(-2.8 * dt));
}
// Roofs are moving surfaces: the courier keeps skating forward across them.
export function advanceRoofSpeed(speed,carrierSpeed,dt,input={}){
 const floor=carrierSpeed+4;
 if(input.sliding||input.brake)return Math.max(floor,speed-8*dt);
 if(input.accelerate&&speed<Math.max(MAX_SPEED,floor))return Math.min(Math.max(MAX_SPEED,floor),speed+14*dt);
 return Math.max(floor,speed-2*dt);
}
export function releaseHitch(player, slingshot = true) {
 if (!player.hitch) return false;
 if (slingshot && player.charge >= .5 && !player.hitch.braking) { player.boost = 1.6; player.launchSpeed = player.hitch.speed + 20 + Math.min(1.5, player.charge) * 9; player.speed = player.launchSpeed; }
 player.hitch = null; player.charge = 0; return player.boost > 0;
}
// Profiles depend on driver and elapsed time, never the rider's pace or position.
export function trafficMotion(index,time){
 const aggressive=index%5===3,erratic=index%5===2;
 const phase=(time+index*3.1)%24;
 const sudden=erratic&&(time+index*1.7)%13.7>12.5;
 const braking=phase>=18&&phase<20||sudden;
 const cruise=[54,68,81,101,91][index%5]+(index%3-1)*3;
 const variation=erratic?Math.sin(time*1.7+index)*12+Math.sin(time*.63+index)*6:Math.sin(time*.35+index)*1.5;
 return {aggressive,erratic,braking,warning:phase>=17.65&&phase<20||sudden,speed:braking?Math.max(18,cruise*.38):cruise+variation};
}
export function vehicleContact(player,car,previousY,previousPosition){return roofContact(player,car,previousY,previousPosition);}
export function simulateFrame(seconds, update) { const count=Math.max(1,Math.ceil(seconds*120));const dt=seconds/count;for(let i=0;i<count;i++)update(dt); }
export function damage(player, amount = 12, force = false, direction = 'front') {
 if (!force && player.invulnerable > 0) return false;
 player.condition=Math.max(0,player.condition-amount);
 player.speed=Math.min(24,player.speed*.24);
 player.invulnerable=1.25;player.impact=1.1;player.recovery=3.2;
 player.impactDirection=direction;player.impactVelocity=direction==='rear'?24:-44;
 player.tripping=0;player.lastRoof=null;player.roofRecatch=0;player.airFlip=false;player.roofCarry=0;player.sliding=false;player.ducking=false;player.jumpGrace=0;player.jumpBuffer=0;player.coyoteTime=0;player.slideQueued=0;player.fastFall=false;
 player.hitch=null;player.ride=null;player.boost=0;player.tankBoost=0;player.charge=0;
 player.gliding=false;player.flightReady=false;
 return true;
}
export const GLIDE_SECONDS=2.5;
export const BARRIER_BOTTOM=1.1;
export const BARRIER_TOP=1.75;
export function armGlider(player) {
 player.flightReady=!!(player.hasGlider && player.y>=2.5);
 player.glideRemaining=player.flightReady?GLIDE_SECONDS:0;
 return player.flightReady;
}
export function updateGlider(player,dt){
 if(player.grounded){player.gliding=false;player.flightReady=false;player.glideRemaining=0;return;}
 if(player.gliding){
  player.glideRemaining=Math.max(0,(player.glideRemaining||0)-dt);
  if(player.glideRemaining===0){player.gliding=false;player.flightReady=false;}
 }
}
export function deployGlider(player) {
 if(player.grounded || !player.hasGlider || !player.flightReady || !(player.glideRemaining>0)) return false;
 player.gliding=!player.gliding;
 if(player.gliding)player.vy=Math.min(player.vy,4);
 return true;
}


