import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files=(await readdir('dist',{recursive:true,withFileTypes:true})).filter(f=>f.isFile()&&f.name!=='sw.js').map(f=>'/'+(f.parentPath+'/'+f.name).replaceAll('\\','/').split('/dist/').pop().replace(/^dist\//,''));
const version=createHash('sha256').update(await readFile('dist/index.html')).digest('hex').slice(0,12);
const source=(await readFile('public/sw.js','utf8')).replace("'sky-courier-v1'",`'sky-courier-${version}'`).replace('const BUILD_ASSETS = [];',`const BUILD_ASSETS = ${JSON.stringify(files)};`);
await writeFile('dist/sw.js',source);
console.log(`Offline cache prepared: ${files.length} files, version ${version}`);
