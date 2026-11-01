export async function loadWorld(tasks,prepare,enter){
 const button=document.getElementById('enter-world'),status=document.getElementById('loading-status'),progress=document.getElementById('loading-progress');
 let completed=0,failed=false;const total=tasks.length+1;progress.max=total;
 const timeout=setTimeout(()=>{status.textContent='Still loading. If your connection stopped, reload and try again.';document.getElementById('loading-retry').hidden=false;},120000);
 document.getElementById('loading-retry').onclick=()=>location.reload();
 try{
  await Promise.all(tasks.map(async([name,promise,validate])=>{const result=await promise;if(validate&&!validate(result))throw Error(name+' did not finish loading');completed++;if(!failed){progress.value=completed;status.textContent=`${completed} / ${total} · ${name} ready`;} }));
  status.textContent='Preparing the city for your first frame…';await prepare();
  clearTimeout(timeout);progress.value=total;document.querySelector('#loading h1').textContent='Your city is ready.';status.textContent='Everything is ready. Enter to start the music.';button.disabled=false;button.textContent='ENTER THE CITY →';
  document.getElementById('loading-retry').hidden=true;
  button.onclick=()=>{button.disabled=true;enter();document.getElementById('loading').classList.add('hidden');document.body.classList.remove('loading');};
 }catch(error){failed=true;clearTimeout(timeout);status.textContent='Could not finish loading: '+error.message;document.getElementById('loading-retry').hidden=false;console.error(error);}
}
