export function swipeDirection(dx,dy,threshold=28){
 if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return null;
 return Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}

// Capture one thumb; cancelled pointers and lost focus never leave gas held.
export function installGestures(canvas,actions){
 let pointer=null,timer;
 const clear=()=>{clearTimeout(timer);pointer=null;actions.gas(false);};
 canvas.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'||!actions.active()||pointer)return;
  event.preventDefault();canvas.setPointerCapture(event.pointerId);
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY,used:false,swiped:false};
  timer=setTimeout(()=>{if(pointer&&!pointer.used){pointer.used=true;actions.gas(true);}},240);
 });
 canvas.addEventListener('pointermove',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const direction=swipeDirection(event.clientX-pointer.x,event.clientY-pointer.y);
  if(!direction)return;
  clearTimeout(timer);actions.gas(false);
  if(!pointer.swiped){pointer.used=true;pointer.swiped=true;actions.swipe(direction);}
 });
 canvas.addEventListener('pointerup',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const tap=!pointer.used;clear();
  if(tap&&actions.active())actions.tap(event.clientX,event.clientY);
 });
 canvas.addEventListener('pointercancel',clear);
 canvas.addEventListener('lostpointercapture',clear);
 window.addEventListener('blur',clear);
 return clear;
}
