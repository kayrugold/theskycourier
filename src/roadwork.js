import {damage} from './physics.js';

export function tripOverRoadwork(player){
 const speed=player.speed;
 if(!damage(player,6,false,'front'))return false;
 player.tripping=.65;player.impact=.65;player.recovery=1.2;
 player.speed=Math.max(24,speed*.6);
 // A trip tumbles forward through the low obstacle rather than pinning the
 // rider against it like an upright wall.
 player.impactVelocity=Math.min(14,speed*.18);
 player.vy=Math.min(player.vy,0);return true;
}
