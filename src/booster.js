export const BOOSTER_SECONDS=1.6,BOOSTER_CAPACITY=3;
export function collectBooster(p){if(p.boosterTanks>=BOOSTER_CAPACITY)return false;p.boosterTanks++;return true;}
export function activateBooster(p){
 if(!p.boosterTanks||p.tankBoost>0||p.boost>0||p.hitch||p.ride||p.gliding||p.caught>0||p.handoff>0||p.recovery>0||p.impact>0||p.finished)return false;
 p.boosterTanks--;p.tankBoost=BOOSTER_SECONDS;return true;
}
