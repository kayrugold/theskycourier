import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Alex} from '../src/alex.js';
import {FlightArt} from '../src/flight-art.js';
const r=new T.WebGLRenderer({antialias:true});r.setSize(innerWidth,innerHeight);document.body.append(r.domElement);
const s=new T.Scene();s.background=new T.Color('#c7b3ce');s.add(new T.HemisphereLight(0xffffff,0x72657c,2.5));
const c=new T.PerspectiveCamera(40,innerWidth/innerHeight,.01,100);c.position.set(7,4,7);
const controls=new OrbitControls(c,r.domElement);controls.target.set(0,2,0);s.add(new T.GridHelper(10,20));
const player=new T.Group(),glider=new T.Group();s.add(player);player.add(glider);
const alex=new Alex(player,new T.Group()),art=new FlightArt(s,[],glider);await Promise.all([alex.ready,art.ready]);
function pose(){alex.mixer.stopAllAction();alex.actions.get(document.querySelector('#pose').value).reset().play();alex.mixer.update(.1);}
document.querySelector('#pose').onchange=pose;pose();window.review={alex,art,camera:c,scene:s};
const clock=new T.Clock();r.setAnimationLoop(()=>{alex.mixer.update(Math.min(.05,clock.getDelta()));if(document.querySelector('#pose').value==='flying')alex.fitGlider();controls.update();r.render(s,c);});
