import {chromium} from 'file:///C:/Users/kayru_tolw96q/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:800}});
 await page.goto('http://127.0.0.1:5173/?check=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForSelector('#integration-results',{timeout:180000});
 await page.evaluate(()=>document.querySelector('#integration-results').remove());
 await page.waitForFunction(()=>!document.getElementById('enter-world').disabled,{},{timeout:180000});
 await page.click('#enter-world');await page.click('#start');
 await page.keyboard.down('c');await page.waitForTimeout(900);
 console.log(await page.evaluate(()=>{const a=courierChecks.alex,action=a.actions.get('runningslide');if(a.current!==action)throw Error('Slide not active');return {slideDuration:action.getClip().duration,heldTime:action.time};}));
 await page.keyboard.press('Escape');await page.keyboard.up('c');await page.addStyleTag({content:'#paused{display:none!important}'});await page.screenshot({path:'slide-preview.png'});
}finally{await browser.close();}
