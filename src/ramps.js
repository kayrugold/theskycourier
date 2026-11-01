// Through roads descend beyond the existing platform; the train ramp is a jump.
export const rampLength=r=>r.isTrainRamp?38:35;
export const rampEnd=r=>r.end+(r.isTrainRamp?0:rampLength(r));
export function roadHeight(r,z){
 if(z<r.start||z>rampEnd(r))return 0;
 return Math.max(0,Math.min(r.height,(z-r.start)/rampLength(r)*r.height,r.isTrainRamp?r.height:(rampEnd(r)-z)/rampLength(r)*r.height));
}
