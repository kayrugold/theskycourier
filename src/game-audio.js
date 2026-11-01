import {coinPlaybackRate,synthesizeCoin} from './coin-audio.js';
import {sameRoute} from './routes.js';
import {loadSoundAssets} from './sound-assets.js';
const musicFiles=import.meta.glob('../assets/music/*.{ogg,mp3,wav}',{eager:true,query:'?url',import:'default'});
// Alternate exports of the same song are one playlist entry; prefer compact Ogg.
const songs=new Map();
for(const [path,url] of Object.entries(musicFiles).sort(([a],[b])=>Number(a.endsWith('.ogg'))-Number(b.endsWith('.ogg'))))songs.set(path.replace(/\.[^.]+$/,''),url);
const titleTrack=[...songs].find(([name])=>name.endsWith('/arcadebreeze'))?.[1];
const tracks=[...songs].filter(([name])=>!name.endsWith('/arcadebreeze')).map(([,url])=>url);
const durations={coin:.28,roll:2,engine:2,wind:2,jump:.42,land:.25,barrier:.65,construction:.8,car:1,tackle:.65,grunt:.3,thief:.9,bird:.85,birdHit:.6,glider:.65,pickup:.55,delivery:.8,goal:1.7,horn:.5,tick:.12,click:.09};
// Pre-render lightweight arcade effects once; playback uses native audio buffers.
export function synthesize(name,rate=22050){
 if(name==='coin')return synthesizeCoin(rate);
 const samples=new Float32Array(Math.ceil((durations[name]??.3)*rate));let filtered=0,phase=0;
 for(let i=0;i<samples.length;i++){
  const t=i/rate,u=i/samples.length,noise=Math.random()*2-1;
  filtered+=.12*(noise-filtered);
  let v=0;
  if(name==='roll')v=filtered*.5+Math.sin(t*2*Math.PI*43)*.025;
  else if(name==='engine')v=Math.sin(t*2*Math.PI*60)*.22+Math.sin(t*2*Math.PI*120)*.1+filtered*.12;
  else if(name==='wind')v=filtered*.45;
  else if(['pickup','delivery','goal','tick'].includes(name)){
   const notes=name==='goal'?[523,659,784,1047]:name==='delivery'?[659,784,1047]:[440,659];
   const n=Math.min(notes.length-1,Math.floor(u*notes.length));v=Math.sin(t*2*Math.PI*notes[n])*.25*Math.sin(Math.PI*((u*notes.length)%1));
  }else if(name==='horn')v=(Math.sin(t*2*Math.PI*349)+Math.sin(t*2*Math.PI*440))*.2;
  else if(name==='click')v=(Math.sin(t*2*Math.PI*850)*.35+noise*.15)*Math.exp(-t*60);
  else if(name==='jump'){
   // Board tail pops against asphalt, followed by a short airy lift.
   v=(noise*.7+Math.sin(t*2*Math.PI*155)*.6)*Math.exp(-t*95)+filtered*.8*Math.sin(Math.PI*u)*Math.exp(-u*2);
  }else if(name==='car'){
   // Heavy bumper thump, crumpling metal, then a short tire skid.
   phase+=2*Math.PI*(90-45*u)/rate;
   v=Math.sin(phase)*.8*Math.exp(-t*12)+noise*.65*Math.exp(-t*22);
   v+=(Math.sin(t*2*Math.PI*327)+Math.sin(t*2*Math.PI*569))*.12*Math.exp(-t*8);
   if(t>.1)v+=(noise*.17+Math.sin(2*Math.PI*(1450*t+90*Math.sin(t*12)))*.12)*Math.sin(Math.PI*Math.min(1,(t-.1)/.8));
  }else if(name==='barrier'){
   // Hollow plastic/wood clack with a loose double rattle; no engine/crash bass.
   const strike=Math.exp(-t*60)+.6*Math.exp(-Math.max(0,t-.12)*65)*(t>.12?1:0)+.3*Math.exp(-Math.max(0,t-.25)*60)*(t>.25?1:0);
   v=(noise*.4+Math.sin(t*2*Math.PI*420)*.35+Math.sin(t*2*Math.PI*710)*.2)*strike;
  }else if(name==='construction'){
   v=noise*.5*Math.exp(-t*50);
   for(const f of [237,613,1087,1721])v+=Math.sin(t*2*Math.PI*f)*.16*Math.exp(-t*(4+f/450));
  }else if(['grunt','thief'].includes(name)){
   phase+=2*Math.PI*(name==='thief'?155-65*u:110-50*u)/rate;
   v=(Math.sin(phase)+.4*Math.sin(phase*3)+.2*Math.sin(phase*5))*.23+filtered*.15;
  }else if(name==='bird'||name==='birdHit'){
   // Raspy harmonic caw, two calls for an attack; impact adds a wing slap.
   const local=name==='bird'?t%.43:t;
   const call=Math.sin(Math.PI*Math.min(1,local/.32))**.6;
   phase+=2*Math.PI*(name==='bird'?510-170*Math.min(1,local/.32):680-300*u)/rate;
   v=(Math.sin(phase)*.26+Math.sin(phase*2)*.22+Math.sin(phase*3)*.18+Math.sin(phase*5)*.1+noise*.2)*call*(.8+.2*Math.sin(t*2*Math.PI*32));
   if(name==='birdHit')v+=filtered*.6*Math.exp(-t*20);
  }else if(name==='glider')v=filtered*.7+Math.sin(2*Math.PI*t*(350-150*u))*.09;
  else {const metal=name==='construction'||name==='car';v=filtered*.8+noise*(metal?.25:.06)+Math.sin(2*Math.PI*t*(metal?173:85))*Math.exp(-u*12)*.45;}
  const loop=['roll','engine','wind'].includes(name);
  const envelope=loop?1:Math.min(1,t/.012)*Math.pow(1-u,1.5);
  samples[i]=Math.max(-.8,Math.min(.8,v*envelope));
 }
 return samples;
}
export class GameAudio{
 constructor(){
  this.settings={music:.35,effects:.65};try{const saved=JSON.parse(localStorage.getItem('courier-audio'));for(const k of ['music','effects'])if(Number.isFinite(saved?.[k]))this.settings[k]=Math.max(0,Math.min(1,saved[k]));}catch{}
  this.music=new Audio();this.music.preload='none';this.track=0;this.music.volume=this.settings.music;
  this.music.addEventListener('ended',()=>{if(this.mode==='menu'){this.music.currentTime=0;}else if(tracks.length){this.track=(this.track+1)%tracks.length;this.currentTrack=tracks[this.track];this.music.src=this.musicURLs.get(this.currentTrack)||this.currentTrack;}this.resumeMusic();});
  this.buffers=new Map();this.voices=new Set();this.cooldowns=new Map();this.hornIn=8;this.mode=null;this.lastGrounded=true;this.duckUntil=0;
  this.musicURLs=new Map();this.setMode('loading');
 }
 unlock(mode='playing',activate=true){
  try{
   if(!this.context){
    const c=this.context=new (window.AudioContext||window.webkitAudioContext)();this.bus=c.createGain();this.bus.gain.value=this.settings.effects;this.bus.connect(c.destination);
    for(const name of Object.keys(durations)){const data=synthesize(name);const b=c.createBuffer(1,data.length,22050);b.copyToChannel(data,0);this.buffers.set(name,b);}
    this.buffers.set('booster',this.buffers.get('wind'));this.buffers.set('stamp',this.buffers.get('tick'));this.sampleGains=new Map();
    this.assetsReady=loadSoundAssets(c,(name,buffer,gain)=>{this.buffers.set(name,buffer);this.sampleGains.set(name,gain);const loop=this.loops?.[name];if(loop){loop.source.stop();loop.source.disconnect();const source=c.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(loop.gain);source.start();loop.source=source;}});
    this.voiceReady=this.assetsReady;
    this.loops={};for(const name of ['roll','engine','wind','booster']){const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=this.buffers.get(name);source.loop=true;gain.gain.value=0;source.connect(gain).connect(pan).connect(this.bus);source.start();this.loops[name]={source,gain,pan};}
   }
   if(activate)this.context.resume().catch(()=>{});this.setMode(mode);if(activate)this.resumeMusic();
  }catch(e){console.warn('Audio unavailable',e);}
 }
 async preload(){
  this.unlock('loading',false);
  if(!this.context)throw Error('Audio could not initialize');
  const report=await this.assetsReady;if(report.some(r=>r.error))throw Error('Some sound effects could not load');
  this.preloadedMusic=[];
  for(const url of [titleTrack,...tracks].filter(Boolean)){
   const response=await fetch(url);if(!response.ok)throw Error('Music could not load');
   const blobURL=URL.createObjectURL(await response.blob());this.musicURLs.set(url,blobURL);
   const media=new Audio();media.preload='auto';this.preloadedMusic.push(media);
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Music preload timed out')),60000);media.oncanplaythrough=()=>{clearTimeout(timer);resolve();};media.onerror=()=>{clearTimeout(timer);reject(Error('Music format could not decode'));};media.src=blobURL;media.load();});
  }
 }
 resumeMusic(){if(this.settings.music&&['menu','playing'].includes(this.mode)&&this.music.getAttribute('src'))this.music.play().catch(()=>{});else this.music.pause();}
 setVolume(key,value){this.settings[key]=Math.max(0,Math.min(1,Number(value)||0));try{localStorage.setItem('courier-audio',JSON.stringify(this.settings));}catch{}if(this.bus)this.bus.gain.setTargetAtTime(this.settings.effects,this.context.currentTime,.04);this.music.volume=this.settings.music;this.resumeMusic();}
 setMode(mode){
  if(mode===this.mode)return;this.mode=mode;
  const url=mode==='menu'?titleTrack:mode==='playing'?tracks[this.track]:null;
  if(url&&this.currentTrack!==url){this.currentTrack=url;this.music.src=this.musicURLs.get(url)||url;this.duckUntil=0;}
  this.resumeMusic();
  if(mode!=='playing'){if(this.loops)for(const loop of Object.values(this.loops))loop.gain.gain.setTargetAtTime(0,this.context.currentTime,.03);if(mode!=='result')for(const source of this.voices)if(!source.ui)source.stop();}
 }
 playCoin(streak){this.play('coin',0,.85,coinPlaybackRate(streak));}
 play(name,pan=0,volume=1,playbackRate){
  const c=this.context;if(!c||!this.settings.effects||this.mode==='loading')return;
  const priority=['bird','birdHit','thief','hurry','thanks','car','barrier','construction','tackle'].includes(name);
  if(this.voices.size>=16){if(!priority)return;const oldest=this.voices.values().next().value;oldest.stop();this.voices.delete(oldest);}
  if(priority){this.duckUntil=c.currentTime+(this.buffers.get(name)?.duration||1)+.25;this.music.volume=this.settings.music*.25;}
  if(c.currentTime-(this.cooldowns.get(name)??-10)<(['stamp','coin'].includes(name)?.065:.09))return;this.cooldowns.set(name,c.currentTime);
  const same=[...this.voices].filter(s=>s.effectName===name);if(same.length>=2){same[0].stop();this.voices.delete(same[0]);}
  const source=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();source.effectName=name;source.ui=name==='click';source.buffer=this.buffers.get(name)||this.buffers.get('tick');source.playbackRate.value=playbackRate??(name==='birdHit'?1.3:['pickup','delivery','goal','horn','thief'].includes(name)?1:.94+Math.random()*.12);gain.gain.value=volume*(this.sampleGains.get(name)??(name==='bird'||name==='thief'?1.6:1));panner.pan.value=Math.max(-1,Math.min(1,pan));source.connect(gain).connect(panner).connect(this.bus);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();panner.disconnect();};source.start();
 }
 update(dt,state,cars,mode){
  this.setMode(mode);if(!this.context)return;
  const target=this.settings.music*(this.context.currentTime<this.duckUntil?.25:1);this.music.volume+=(target-this.music.volume)*Math.min(1,dt*5);
  if(mode!=='playing')return;
  if(!this.lastGrounded&&state.grounded&&state.caught<=0)this.play('land',0,.8);this.lastGrounded=state.grounded;
  this.elapsedAudio=(this.elapsedAudio||0)+dt;if(this.elapsedAudio<.05)return;dt=this.elapsedAudio;this.elapsedAudio=0;
  const now=this.context.currentTime;
  const level=(name,value)=>this.loops[name].gain.gain.setTargetAtTime(value*(this.sampleGains.get(name)??1),now,.04);
  level('booster',state.tankBoost>0?1:0);
  level('roll',state.grounded&&!state.ride&&state.speed>5&&state.handoff<=0?Math.min(.7,state.speed/140):0);
  this.loops.roll.source.playbackRate.setTargetAtTime(.65+state.speed/100,now,.1);
  level('wind',state.gliding?.8:!state.grounded?.15:0);
  let closest=null,distance=55;for(const car of cars){if(!sameRoute(state.z,state.choices,car.choices))continue;const d=Math.hypot(car.z-state.z,(car.x-state.x)*2);if(d<distance){distance=d;closest=car;}}
  level('engine',closest?(1-distance/55)*.55:0);if(closest){this.loops.engine.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(state.x-closest.x)/10)),now,.1);this.loops.engine.source.playbackRate.setTargetAtTime(.7+closest.speed/150,now,.1);}
  this.hornIn-=dt;if(this.hornIn<=0&&closest&&distance<35&&state.handoff<=0){this.play('horn',(state.x-closest.x)/10,.55);this.hornIn=9+Math.random()*10;}
 }
}
