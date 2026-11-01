import { cp, mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { globSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
await stat('dist/index.html'); // Run the production build first.
const output = resolve('phone');
// Unique staging directories prevent old assets leaking into later bundles.
const staging = resolve(output, `staging-${Date.now()}`);
const play = resolve(staging, 'sky-courier-play');
const source = resolve(staging, 'sky-courier-source');
async function copy(from, target, name = from) {
  const to = resolve(target, name);
  await mkdir(dirname(to), { recursive:true });
  await cp(from, to, { recursive:true });
}
await copy('dist', play);
await copy('scripts/serve-phone.mjs', play);
await writeFile(resolve(play, 'START-HERE.txt'), 'In Termux: node scripts/serve-phone.mjs\nOpen http://127.0.0.1:4173/ in Chrome.\nNo npm install or build needed.\n');
for (const path of ['src', 'public', 'tests', 'index.html', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', '.nvmrc', 'vite.config.js', 'README.md', 'docs/mobile-testing.md', 'scripts/cache.mjs', 'scripts/serve-phone.mjs', 'assets/world/manifest.json']) await copy(path, source);
const phonePackage = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
delete phonePackage.scripts['prepare:alex'];
delete phonePackage.scripts['package:phone'];
await writeFile(resolve(source, 'package.json'), JSON.stringify(phonePackage, null, 2) + '\n');
// Include only prepared assets actually referenced by the game, including glob imports.
const assets = new Set();
for (const file of globSync('src/**/*.js')) {
  const code = await readFile(file, 'utf8');
  for (const match of code.matchAll(/['"]\.\.\/(assets\/[^'"`]+)['"]/g)) {
    for (const asset of globSync(match[1].replace(/\?url$/, ''))) assets.add(asset);
  }
}
for (const asset of assets) await copy(asset, source);
await writeFile(resolve(source, 'START-HERE.txt'), 'In Termux, inside this directory:\nnpm ci\nnpm run dev\nOpen http://127.0.0.1:5173/\nProduction: npm run build, then node scripts/serve-phone.mjs\nNode 22.12+ required. Edit files in Termux home, not shared Android storage.\n');
for (const [folder, archive] of [['sky-courier-play', 'sky-courier-play.tar.gz'], ['sky-courier-source', 'sky-courier-source.tar.gz']]) {
  const result = spawnSync('tar', ['-czf', resolve(output, archive), '-C', staging, folder], { stdio:'inherit' });
  if (result.status !== 0) throw Error(`Could not archive ${folder}`);
  console.log(`${archive}: ${((await stat(resolve(output, archive))).size / 1024 / 1024).toFixed(1)} MiB`);
}
if (!staging.startsWith(output + sep + 'staging-')) throw Error('Invalid staging path');
await rm(staging, { recursive:true });
console.log(`Bundles saved in ${output}.`);
