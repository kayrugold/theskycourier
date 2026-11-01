import {chromium} from 'file:///C:/Users/kayru_tolw96q/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.route('**/audio-check',route=>route.fulfill({contentType:'text/html',body:'<button id="play">Play</button>'}));
 await page.goto('http://127.0.0.1:5173/audio-check');
 await page.evaluate(async()=>{const {GameAudio}=await import('/src/game-audio.js');window.sound=new GameAudio();document.querySelector('button').onclick=()=>sound.unlock('menu');});
 await page.click('#play');await page.waitForFunction(()=>sound.music.currentTime>0,{},{timeout:30000});
 await page.evaluate(()=>{if(!sound.music.currentSrc.endsWith('arcadebreeze.ogg'))throw Error('Title music is incorrect');sound.unlock('playing');});
 await page.waitForFunction(()=>sound.music.currentSrc.endsWith('neondodger.ogg')&&sound.music.currentTime>0);
 console.log(await page.evaluate(async()=>{
  await sound.voiceReady;
  const report=await sound.assetsReady;if(report.some(r=>r.error))throw Error(JSON.stringify(report));
  if(new Set(report.map(r=>r.file)).size!==16)throw Error('Not all supplied sound files are mapped');
  if(sound.buffers.get('stamp').duration>.241)throw Error('Stamp cue too long');
  console.log('Sample report',JSON.stringify(report));
  if(!sound.music.currentSrc.endsWith('neondodger.ogg'))throw Error('Wrong music format');
  sound.setVolume('music',0);sound.setMode('paused');
  const analyser=sound.context.createAnalyser();sound.bus.connect(analyser);
  for(const name of sound.buffers.keys()){
   sound.play(name);await new Promise(r=>setTimeout(r,70));
   const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);
   if(!values.some(x=>Math.abs(x)>.0001))throw Error('Silent effect: '+name);
  }
  sound.setVolume('music',.35);sound.play('bird');if(sound.music.volume>.1)throw Error('Warning did not duck music');
  sound.setVolume('effects',0);if(sound.settings.effects!==0)throw Error('Mute failed');sound.setMode('menu');
  if(!sound.music.getAttribute('src').endsWith('arcadebreeze.ogg'))throw Error('Returning home did not restore title music');
  return {track:sound.music.currentSrc,effects:sound.buffers.size,musicPaused:sound.music.paused};
 }));
}finally{await browser.close();}
