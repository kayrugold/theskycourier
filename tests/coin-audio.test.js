import test from 'node:test';
import assert from 'node:assert/strict';
import {CoinSequence,coinPlaybackRate,synthesizeCoin} from '../src/coin-audio.js';

const coin=(z,extra={})=>({z,y:1.4,choices:{},collected:false,...extra});
const rider=(extra={})=>({z:0,y:0,grounded:true,jumpFromY:0,choices:{},coinStreak:0,...extra});

test('coin chime is deterministic, finite, audible and fades to silence',()=>{
 const pcm=synthesizeCoin(),again=synthesizeCoin();
 assert.deepEqual(pcm,again);assert.equal(pcm.length,6175);
 assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);
 assert.ok(pcm.every(Number.isFinite));
 const peak=Math.max(...pcm.map(Math.abs));assert.ok(peak>.2&&peak<.8);
 const rms=part=>Math.sqrt(part.reduce((sum,v)=>sum+v*v,0)/part.length);
 assert.ok(rms(pcm.slice(-500))<rms(pcm.slice(500,1000))*.02);
});

test('coin pitch rises musically and caps rather than becoming shrill',()=>{
 const rates=Array.from({length:12},(_,i)=>coinPlaybackRate(i+1));
 assert.equal(rates[0],1);
 for(let i=1;i<9;i++)assert.ok(rates[i]>rates[i-1]);
 assert.equal(rates[8],rates[11]);assert.ok(rates[11]<3.1);
});

test('collecting consecutive coins climbs; missing the next coin resets',()=>{
 const first=coin(10),second=coin(20),seq=new CoinSequence([first,second]),p=rider();
 first.collected=true;assert.equal(seq.collect(p),1);
 p.z=12;seq.advance(p,10);assert.equal(p.coinStreak,1);
 assert.equal(seq.collect(p),2);
 p.z=22;seq.advance(p,12);assert.equal(p.coinStreak,0);
 assert.equal(seq.collect(p),1);
});

test('alternate coins in a collected row and special pickups do not break the chain',()=>{
 const seq=new CoinSequence([coin(10,{collected:true}),coin(10),coin(20,{kind:'booster'}),coin(30,{kind:'glider'})]);
 const p=rider({z:40,coinStreak:3});seq.advance(p,0);assert.equal(p.coinStreak,3);
});

test('coins on other branches or roof levels do not break a street chain',()=>{
 const seq=new CoinSequence([coin(900,{choices:{0:1}}),coin(910,{y:7.4})]);
 const p=rider({z:930,choices:{0:0},coinStreak:3});seq.advance(p,880);assert.equal(p.coinStreak,3);
});

test('jumping over an uncollected coin still misses the street sequence',()=>{
 const seq=new CoinSequence([coin(10)]),p=rider({z:12,y:6,grounded:false,coinStreak:3});
 seq.advance(p,9);assert.equal(p.coinStreak,0);
});

test('backtracking does not repeat a miss, and a new run clears passed rows',()=>{
 const seq=new CoinSequence([coin(10)]),p=rider({z:12,coinStreak:3});
 seq.advance(p,9);seq.collect(p);seq.advance(p,9);assert.equal(p.coinStreak,1);
 seq.reset();seq.advance(p,9);assert.equal(p.coinStreak,0);
});
