export const RAIL_CROSSINGS=[
 {z:410,width:3.6,height:3.8},
 {z:1920,width:4.2,height:4.2},
];
// Reserve a generous opening through the embankment, keeping the road above.
export function railBridges(roof,crossings=RAIL_CROSSINGS){
 if(roof.isTrainRamp)return [];
 return crossings.filter(track=>track.z-6>=roof.start+35&&track.z+6<=roof.end&&roof.height-.8>=track.height+.5)
  .map(track=>({...track,start:track.z-6,end:track.z+6,clearance:roof.height-.8}));
}
export function rampSupportSegments(roof){
 const result=[];let start=roof.start+35;
 for(const gap of railBridges(roof)){
  if(gap.start>start)result.push({start,end:gap.start});
  start=gap.end;
 }
 if(start<roof.end)result.push({start,end:roof.end});
 return result;
}
export function railOpeningAt(roof,z){return railBridges(roof).find(gap=>z>=gap.start&&z<=gap.end);}
