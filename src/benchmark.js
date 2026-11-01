// Repeatable, stationary views isolate rendering cost from player input.
export async function benchmark(api){
 await api.ready;
 const output=document.createElement('pre');output.id='benchmark-results';
 Object.assign(output.style,{position:'fixed',left:'20px',top:'80px',zIndex:100,background:'#29243c',color:'#dbff78',padding:'16px'});
 document.body.append(output);output.textContent='Measuring city views…';
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const results=[];
 for(const z of [800,2800,4700]){
  api.prepare(z);
  for(let i=0;i<30;i++)await frame();
  const times=[];let last=await frame();
  for(let i=0;i<90;i++){const now=await frame();times.push(now-last);last=now;}
  times.sort((a,b)=>a-b);
  results.push({z,fps:Math.round(1000/(times.reduce((a,b)=>a+b,0)/times.length)),p95ms:Math.round(times[85]),triangles:api.renderer.info.render.triangles,draws:api.renderer.info.render.calls});
  output.textContent=JSON.stringify(results,null,2);
 }
 output.textContent='BENCHMARK COMPLETE\n'+JSON.stringify(results,null,2);
}
