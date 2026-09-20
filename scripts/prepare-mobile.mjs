import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('www', { recursive: true });
for (const f of ['manifest.json','sw.js']) await copyFile(f, 'www/' + f);
let html = await readFile('index.html','utf8');
html = html.replace('</head>', '<link rel="stylesheet" href="mobile.css">\n</head>')
           .replace('</body>', '<script src="platform.js"></script>\n<script src="mobile.js"></script>\n<script src="pages.js"></script>\n<script src="wizard.js"></script>\n<script src="onboarding.js"></script>\n<script src="settings.js"></script>\n<script src="data.js"></script>\n<script src="android.js"></script>\n</body>');
await writeFile('www/index.html', html);
for (const f of ['mobile.css','platform.js','mobile.js','pages.js','wizard.js','onboarding.js','settings.js','data.js','android.js','rescue.html']) await copyFile('mobile/'+f,'www/'+f);
console.log('Ghestban Android 3.11 assets prepared in www/');
