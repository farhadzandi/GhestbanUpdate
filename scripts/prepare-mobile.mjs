import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('www', { recursive: true });
for (const f of ['index.html','manifest.json','sw.js']) {
  await copyFile(f, 'www/' + f);
}
console.log('Ghestban web assets copied to www/');
