const files=import.meta.glob('../assets/sounds/*.mp3',{eager:true,query:'?url',import:'default'});
// name: [file, maximum seconds, playback gain]. Originals remain untouched.
export const SOUND_ASSETS={
 thief:['hey',1.4,.95],hurry:['hurry',1,.75],thanks:['thanks',1.5,.8],
 bird:['angrybirdcaw',.9,.8],birdHit:['angrybirdcaw',.4,.65],
 jump:['skateboardjump',.4,.85],launch:['cartoonjump',.55,.7],
 stamp:['collectstamp',.24,.5],construction:['hitconstruction',.65,.8],
 barrier:['hitconstruction',.5,.75],pole:['hitlightpole',.65,.8],
 booster:['hoverboardbooster',1.5,.55],grunt:['oomph',.65,.85],
 car:['runsintometal',.75,.85],land:['skateboardland',.3,.65],
 roll:['skateboardwheels0',2,.35],screech:['tirescreech',.6,.6],
 wood:['woodenthud',.4,.75],tackle:['woodenthud',.3,.7],
};
export async function loadSoundAssets(context,install){
 const decoded=new Map(),report=[];
 for(const [name,[file,seconds,gain]] of Object.entries(SOUND_ASSETS)){
  try{
   let source=decoded.get(file);
   if(!source){const response=await fetch(files[`../assets/sounds/${file}.mp3`]);if(!response.ok)throw Error(response.status);source=await context.decodeAudioData(await response.arrayBuffer());decoded.set(file,source);}
   // Find the first audible onset, retaining 5 ms before it for a clean attack.
   const data=source.getChannelData(0);let peak=0;for(const x of data)peak=Math.max(peak,Math.abs(x));
   let onset=0;while(onset<data.length&&Math.abs(data[onset])<Math.max(.008,peak*.08))onset++;
   const start=Math.max(0,onset-Math.floor(source.sampleRate*.005));
   const length=Math.max(1,Math.min(source.length-start,Math.floor(seconds*source.sampleRate)));
   const buffer=context.createBuffer(source.numberOfChannels,length,source.sampleRate),fade=Math.min(Math.floor(.02*source.sampleRate),length/4);
   for(let ch=0;ch<source.numberOfChannels;ch++){const out=buffer.getChannelData(ch),input=source.getChannelData(ch);for(let i=0;i<length;i++)out[i]=input[start+i]*Math.min(1,i/(source.sampleRate*.003),(length-1-i)/fade)*Math.min(1.5,.8/Math.max(.01,peak));}
   install(name,buffer,gain);report.push({name,file,original:source.duration,seconds:buffer.duration,onset:start/source.sampleRate});
  }catch(error){console.warn('Sound asset fallback:',file,error);report.push({name,file,error:String(error)});}
 }
 return report;
}
