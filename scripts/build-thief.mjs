// Offline preparation: keep the original FBXs and ship one texture-free GLB.
// The existing base-color atlas is loaded separately by the game.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { TextureLoader, Texture, MeshStandardMaterial } from 'three';

globalThis.window = { URL };
TextureLoader.prototype.load = function () { return new Texture(); };
globalThis.FileReader = class {
 readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
 readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
};
const root = new URL('../assets/characters/packagethief/', import.meta.url);
async function load(name) {
 const data = await readFile(new URL(name, root));
 return new FBXLoader().parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
}
const model = await load('packagethief_idle_skinned.fbx');
const bones = new Set();
model.traverse(o => {
 if (o.isBone) bones.add(o.name);
 if (o.isMesh) o.material = new MeshStandardMaterial({ roughness: 1 });
});
const animations = [];
for (const file of (await readdir(root)).filter(f => /^(packagethief_idle_skinned|packagethiefdisappointed|zombiewalk|divingsave)\.fbx$/.test(f)).sort()) {
 const source = file === 'packagethief_idle_skinned.fbx' ? model : await load(file);
 const clip = source.animations[0]?.clone();
 if (!clip) throw new Error(`No animation: ${file}`);
 clip.name = file.replace(/\.fbx$/, '').replace('packagethief_idle_skinned', 'idle').replace('packagethiefdisappointed', 'disappointed').replace('zombiewalk', 'run').replace('divingsave', 'dive');
 for (const track of clip.tracks) {
  if (!bones.has(track.name.split('.')[0])) throw new Error(`Unmatched bone: ${track.name}`);
  if (track.name === 'mixamorigHips.position') {
   for (let i = 0; i < track.values.length; i += 3) {
    track.values[i] = 0;
    track.values[i + 2] = 0;
    // Jump height is controlled by physics; keep the articulated pose only.
    if (['jumpover', 'forwardflip'].includes(clip.name)) track.values[i + 1] = 90;
   }
  }
 }
 animations.push(clip);
}
const result = await new GLTFExporter().parseAsync(model, { binary: true, animations });
await mkdir(new URL('game/', root), { recursive: true });
await writeFile(new URL('game/thief.glb', root), Buffer.from(result));
console.log(`Thief: ${bones.size} bones, ${animations.length} clips, ${(result.byteLength / 1048576).toFixed(2)} MB`);

