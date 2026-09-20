import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('www', { recursive: true });
for (const f of ['manifest.json','sw.js']) await copyFile(f, 'www/' + f);
let html = await readFile('index.html','utf8');
html = html.replace('</head>', '<link rel="stylesheet" href="mobile.css">\n<link rel="stylesheet" href="next.css">\n</head>')
           .replace('</body>', '<script src="platform.js"></script>\n<script src="shell.js"></script>\n<script src="mobile.js"></script>\n<script src="pages.js"></script>\n<script src="wizard.js"></script>\n<script src="onboarding.js"></script>\n<script src="settings.js"></script>\n<script src="data.js"></script>\n<script src="rollback.js"></script>\n<script src="android.js"></script>\n<script src="next-domain.js"></script>\n<script src="next-services.js"></script>\n<script src="next-native-sms.js"></script>\n<script src="next-app.js"></script>\n<script src="next-ui.js"></script>\n</body>');
await writeFile('www/index.html', html);
for (const f of ['mobile.css','next.css','platform.js','shell.js','mobile.js','pages.js','wizard.js','onboarding.js','settings.js','data.js','rollback.js','android.js','next-domain.js','next-services.js','next-native-sms.js','next-app.js','next-ui.js','rescue.html']) await copyFile('mobile/'+f,'www/'+f);
console.log('Ghestban Next 3.12 assets prepared in www/');
