import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('www', { recursive: true });
for (const f of ['manifest.json','sw.js']) await copyFile(f, 'www/' + f);
let html = await readFile('index.html','utf8');
html = html.replace('</head>', '<link rel="stylesheet" href="mobile.css">\n</head>')
           .replace('</body>', '<script src="mobile.js"></script>\n<script src="onboarding.js"></script>\n<script src="settings.js"></script>\n<script src="data.js"></script>\n<script src="android.js"></script>\n</body>');
await writeFile('www/index.html', html);
await copyFile('mobile/mobile.css','www/mobile.css');
await copyFile('mobile/mobile.js','www/mobile.js');
await copyFile('mobile/onboarding.js','www/onboarding.js');
await copyFile('mobile/settings.js','www/settings.js');
await copyFile('mobile/data.js','www/data.js');
await copyFile('mobile/android.js','www/android.js');
console.log('Ghestban Android assets prepared in www/');
