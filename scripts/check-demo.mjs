import {chromium} from 'file:///C:/Users/kayru_tolw96q/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/?check=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForSelector('#integration-results',{timeout:120000});
 const results=await page.locator('#integration-results').textContent();console.log(results);
 if(results.includes('FAIL'))throw Error('Integration failure');
 await page.evaluate(()=>document.querySelector('#integration-results').remove());
 await page.waitForFunction(()=>!document.getElementById('enter-world').disabled,{},{timeout:180000});
 if(!await page.evaluate(()=>document.body.classList.contains('loading')&&courierChecks.sound.music.paused))throw Error('World or music started before entry');
 await page.screenshot({path:'loading-preview.png'});
 await page.click('#enter-world');await page.waitForFunction(()=>courierChecks.sound.music.currentTime>0);
 if(!await page.evaluate(()=>courierChecks.sound.currentTrack.includes('arcadebreeze')))throw Error('Title music missing');
 await page.click('#start');
 await page.waitForFunction(()=>courierChecks.sound.music.readyState>=2,{},{timeout:30000});
 const audio=await page.evaluate(async()=>{
  const s=courierChecks.sound;
  const loaded=await s.assetsReady;if(loaded.some(r=>r.error))throw Error('Supplied effect failed to load');
  if(s.context.state!=='running'||s.music.paused)throw Error('Music did not start after the play gesture');
  s.setVolume('music',0);s.setMode('paused');await new Promise(r=>setTimeout(r,100));
  if(!s.music.paused)throw Error('Paused music is still playing');
  const analyser=s.context.createAnalyser();s.bus.connect(analyser);analyser.fftSize=1024;
  s.play('horn');await new Promise(r=>setTimeout(r,100));
  const data=new Float32Array(1024);analyser.getFloatTimeDomainData(data);
  if(!data.some(v=>Math.abs(v)>.001))throw Error('Effects bus is silent');
  for(const [name,b] of s.buffers){const d=b.getChannelData(0);if(!d.some(v=>v!==0)||d.some(v=>!Number.isFinite(v)))throw Error('Bad sound buffer '+name);}
  analyser.disconnect();s.bus.disconnect(analyser);s.setVolume('music',.35);s.setMode('playing');
  return {effects:s.buffers.size,track:s.music.currentSrc};
 });console.log('Audio playback, pause, effects output and buffers passed',audio);
 await page.evaluate(()=>{
  const a=courierChecks,heard=[],play=a.sound.play;
  a.sound.play=function(name,...args){heard.push(name);return play.call(this,name,...args);};
  try{
   a.birdArt.reset();a.reset({z:180,x:0,speed:72});a.step(.01);
   if(!heard.includes('bird'))throw Error('Live bird warning did not trigger its caw');
   a.thiefArt.reset();a.reset({z:285,x:5,speed:72});a.step(.01);
   if(!heard.includes('thief'))throw Error('Live thief ambush did not trigger voice');
  }finally{a.sound.play=play;}
 });console.log('Live bird and thief warning audio events passed');
 await page.click('#pause');await page.waitForTimeout(100);
 if(!await page.evaluate(()=>courierChecks.sound.cooldowns.has('click')))throw Error('Button click sound missing');
 await page.click('#resume');
 await page.evaluate(()=>{
  const a=courierChecks,tank=a.pickups.find(p=>p.kind==='booster');tank.collected=false;
  a.reset({x:tank.x,z:tank.z-.2,speed:0});a.step(.01);
  if(a.state().boosterTanks!==1||!tank.collected)throw Error('Tank pickup failed');
  a.boostBoard();if(a.state().boosterTanks!==0||a.state().tankBoost<=0)throw Error('Tank activation failed');
  a.exhaust.update(1,true);if(!a.exhaust.points.visible)throw Error('Exhaust missing');
  a.controls.brake=true;a.step(.01);if(a.state().tankBoost!==0)throw Error('Braking did not cancel boost');
  a.reset({boosterTanks:1});
 });
 await page.keyboard.press('b');
 if(!await page.evaluate(()=>courierChecks.state().tankBoost>0&&courierChecks.state().boosterTanks===0))throw Error('B key did not activate boost');
 console.log('Booster pickup, spending, exhaust, braking and B key passed');
 await page.waitForTimeout(200);
 if(!await page.evaluate(()=>courierChecks.exhaust.points.visible&&courierChecks.sound.loops.booster.gain.gain.value>0))throw Error('Boost did not render and play its loop');
 await page.screenshot({path:'booster-preview.png'});
 await page.evaluate(()=>courierChecks.reset({boosterTanks:1}));
 await page.dispatchEvent('#touch-boost','pointerdown');
 if(!await page.evaluate(()=>courierChecks.state().tankBoost>0))throw Error('Touch BOOST failed');
 for(const preset of ['min','low','med','max']){
  await page.selectOption('#quality',preset);await page.waitForTimeout(100);
  const size=await page.locator('#game').evaluate(c=>c.width*c.height);
  console.log(preset+' rendered pixels: '+size);
 }
 await page.selectOption('#quality','low');
 await page.evaluate(async()=>{
  const a=courierChecks;
  const {sameRoute}=await import('/src/routes.js');
  a.reset({z:100,jobIndex:99,time:999,invulnerable:999});
  for(const c of a.cars){c.z=15+c.index*18;c.choices={};}
  for(let i=0;i<7200;i++){
   a.state().condition=100;a.state().invulnerable=999;a.step(1/60);
   for(const c of a.cars)for(const r of a.roofs){
    if(sameRoute(r.start,c.choices,r.choices)&&c.z+c.length/2>r.start&&c.z-c.length/2<r.end&&Math.abs(c.x-r.x)<r.width/2+.7+c.width/2)throw Error('Live traffic entered ramp at '+r.start);
   }
  }
  const b=a.birdArt.birds[0];b.phase='patrol';b.z=a.state().z;b.y=8;
  const actor=a.birdArt.actors[0],before=actor.mixer.time;
  a.birdArt.draw(.2,b.z,'paused');
  if(actor.mixer.time===before)throw Error('Visible bird animation stopped');
 });
 console.log('Two-minute live traffic ramp exclusion and continuous bird animation passed');
 await page.addStyleTag({content:'#paused{display:none!important}'});
 for(const width of [1280,480]){
  await page.setViewportSize({width,height:850});
  await page.evaluate(()=>{courierChecks.reset({x:-10.2,z:209});courierChecks.step(.01);});
  await page.keyboard.press('Escape');await page.waitForTimeout(250);
  const frame=await page.evaluate(async()=>{
   const T=await import('/node_modules/three/build/three.module.js');
   const a=courierChecks,n=a.npcs.find(n=>n.jobIndex===0&&n.kind==='pickup');
   a.camera.updateMatrixWorld();
   return [a.player,n.group].flatMap(o=>[0,2.9].map(y=>new T.Vector3(o.position.x,y,o.position.z).project(a.camera).toArray()));
  });
  if(frame.some(p=>Math.abs(p[0])>.9||Math.abs(p[1])>.9))throw Error('Handoff camera clips actors at width '+width+': '+JSON.stringify(frame));
  await page.screenshot({path:`handoff-${width}.png`});console.log('Handoff fits at '+width);
 }
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
