# Ghestban Android / Mobile

This branch starts the Android packaging track while keeping the current Web/PWA release intact.

## Architecture
- One repository and one business-data model.
- Web/PWA remains the canonical web application.
- Android uses Capacitor with app id `ir.ghestban.app`.
- Android assets are prepared into `www/` before Capacitor sync.
- Financial backup tokens/data must never be committed here.

## Family read-only requirement
Target behavior for the mobile UI:
1. Family/viewer mode can see dashboard, installments, due dates and reports.
2. Any mutation (add/edit/delete/payment/sync settings) is guarded.
3. Manager unlock uses a PIN/password gate and automatically relocks.
4. Secrets must not be stored as plaintext.

## Build (developer machine / CI)
```
npm install
node scripts/prepare-mobile.mjs
npm run android:add
npm run android:sync
npm run android:open
```

The first APK is for internal testing; Cafe Bazaar signing/release configuration is intentionally kept separate from source secrets.
