export function vehicleRoofHeight(car,z){return (car.y??0)+(car.slope??0)*(z-car.z)+(car.type==='semi'&&z-car.z>2.9?3.2:car.height)/Math.cos(car.pitch??0);}
export const ROOF_SIDE_MARGIN=.65,ROOF_END_MARGIN=1;

// Catch the edge on descent; rising jumps keep their full arc.
export function roofContact(player,car,previousY,previousPosition){
 const dx=Math.abs(player.x-car.x),dz=Math.abs(player.z-car.z),height=vehicleRoofHeight(car,player.z);
 const body=dx<=car.width/2+(car.type==='car'?.2:.35)&&dz<=car.length/2+.5;
 const top=dx<=car.width/2+ROOF_SIDE_MARGIN&&dz<=car.length/2+ROOF_END_MARGIN;
 if(!body&&!top)return 'none';
 if(player.y+1.8<(car.y??0)+(car.slope??0)*(player.z-car.z))return 'none';
 const recatching=player.lastRoof===car&&player.roofRecatch>0;
 if(!recatching&&!player.grounded&&player.vy<=0&&top&&previousY>=height-.8&&player.y>=height-1.1&&player.y<=height+.2)return 'land';
 if(!body)return 'none';
 if(!player.grounded&&player.vy>0){
  if(player.y>=height-.75)return 'none';
  const sideEntry=previousPosition&&Math.abs(previousPosition.x-(car.previousX??car.x))>car.width/2+.4;
  if(player.jumpGrace>0&&player.z<=car.z&&!sideEntry&&Math.abs((player.jumpFromY??0)-(car.y??0))<1)return 'none';
 }
 return player.y<height-.1?'hit':'none';
}

export function landOnVehicle(player,car){
 // Bring a near miss gently inside the roof footprint so the very next frame
 // cannot throw the rider back off the edge they just caught.
 player.x=Math.max(car.x-car.width/2+.3,Math.min(car.x+car.width/2-.3,player.x));
 player.z=Math.max(car.z-car.length/2+.55,Math.min(car.z+car.length/2-.55,player.z));
 player.y=vehicleRoofHeight(car,player.z);player.vy=0;player.jumpGrace=0;
 player.grounded=true;player.gliding=false;player.airFlip=false;player.ride=car;
 player.hitch=null;player.boost=0;player.tankBoost=0;player.lastRoof=null;player.roofRecatch=0;
 // Absorb only a small part of the forward motion relative to the vehicle.
 // Keep a little forward roll when landing on a faster-moving surface.
 player.speed=car.speed+Math.max(4,(player.speed-car.speed)*.95);
}
