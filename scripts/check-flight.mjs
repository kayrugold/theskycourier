import {chromium} from 'file:///C:/Users/kayru_tolw96q/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:850}});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.goto('http://127.0.0.1:5173/?check=1');
await page.waitForSelector('#integration-results',{timeout:120000});
const results=await page.locator('#integration-results').textContent();console.log(results);
if(results.includes('FAIL')){await browser.close();throw Error('Browser integration checks failed');}
await page.evaluate(()=>document.querySelector('#integration-results').remove());
await page.waitForFunction(()=>!document.getElementById('enter-world').disabled,{},{timeout:180000});await page.click('#enter-world');await page.click('#start');await page.addStyleTag({content:'#paused{display:none!important}'});
await page.evaluate(async()=>{await courierChecks.flightArt.ready;courierChecks.reset({x:-6.1,z:326,speed:0});});
await page.waitForTimeout(150);await page.keyboard.press('Escape');
await page.screenshot({path:'ramp-fitted.png'});
await page.evaluate(()=>courierChecks.reset({z:367,x:-6.1,y:8,vy:0,grounded:false,hasGlider:true,flightReady:true,gliding:true,glideRemaining:2.5}));
await page.waitForTimeout(350);await page.keyboard.press('Escape');
await page.screenshot({path:'glider-fitted.png'});
await browser.close();

