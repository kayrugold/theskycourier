import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const r=new T.WebGLRenderer({antialias:true});r.setSize(innerWidth,innerHeight);document.body.append(r.domElement);
const s=new T.Scene();s.background=new T.Color('#c7b3ce');s.add(new T.HemisphereLight(0xffffff,0x72657c,2.5));
const c=new T.PerspectiveCamera(40,innerWidth/innerHeight,.01,100);c.position.set(1.3,1.1,1.4);
const controls=new OrbitControls(c,r.domElement);controls.target.set(0,.25,0);
s.add(new T.GridHelper(2,20));s.add(new T.AxesHelper(.7));
let model,mixer;const select=document.querySelector('#asset');
const requested=new URLSearchParams(location.search).get('asset');if([...select.options].some(o=>o.value===requested))select.value=requested;
async function load(){const name=select.value;const [a,t]=await Promise.all([new GLTFLoader().loadAsync('/assets/flight/game/'+name+(name==='angrybird'?'-rig':'')+'.glb'),new T.TextureLoader().loadAsync('/assets/flight/game/'+name+'.jpg')]);t.flipY=false;t.colorSpace=T.SRGBColorSpace;if(model)s.remove(model);model=a.scene;model.traverse(o=>{if(o.isMesh)o.material=new T.MeshLambertMaterial({map:t});});s.add(model);mixer=new T.AnimationMixer(model);for(const clip of a.animations)mixer.clipAction(clip).play();window.review={model,camera:c,scene:s,mixer};}
select.onchange=load;await load();const clock=new T.Clock();r.setAnimationLoop(()=>{mixer?.update(Math.min(.05,clock.getDelta()));controls.update();r.render(s,c);});
