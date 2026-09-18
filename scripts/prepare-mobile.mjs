import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('www', { recursive: true });
for (const f of ['manifest.json','sw.js']) await copyFile(f, 'www/' + f);
let html = await readFile('index.html','utf8');
html = html.replace('</head>', '<link rel="stylesheet" href="mobile.css">\n</head>')
           .replace('</body>', '<script src="mobile.js"></script>\n<script src="onboarding.js"></script>\n</body>');
await writeFile('www/index.html', html);
await copyFile('mobile/mobile.css','www/mobile.css');
await copyFile('mobile/mobile.js','www/mobile.js');
await copyFile('mobile/onboarding.js','www/onboarding.js');
console.log('Ghestban Android assets prepared in www/');
