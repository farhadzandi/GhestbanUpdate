# Ghestban Update Channel

Public release/update channel for **Ghestban**, a personal finance and installment-management application.

> The main application source and user financial data are kept in private repositories. This public repository is limited to distributable update assets, release metadata, and non-sensitive documentation.

## Public portfolio summary

Ghestban is designed around:

- installment and obligation tracking;
- bank-account and payment-method records;
- offline-first operation;
- mobile/PWA access;
- backup and synchronization through a private GitHub data repository;
- schema migration and recovery safeguards;
- automated regression testing with Playwright.

### Repository model

- `farhadzandi/Ghestban` — application source and development (**Private**)
- `farhadzandi/GhestbanData` — encrypted/private financial backup and sync (**Private**)
- `farhadzandi/GhestbanUpdate` — downloadable update channel (**Public**)

### Security boundary

No personal financial data, production tokens, private backup files, or customer secrets should ever be committed to this public repository.

---

## توضیحات فارسی

این مخزن فقط کانال عمومی انتشار و بروزرسانی قسط‌بان است و نباید حاوی بکاپ یا داده مالی شخصی باشد.

## نقش مخزن‌ها
- `farhadzandi/Ghestban` — سورس و توسعه (Private)
- `farhadzandi/GhestbanData` — بکاپ و Sync داده مالی (Private)
- `farhadzandi/GhestbanUpdate` — فایل‌های قابل دریافت برای بروزرسانی (Public)

## مدل اجرا
- Windows: فایل HTML مستقل، قابل اجرا و استفاده کامل در حالت آفلاین؛ اینترنت فقط برای Backup/Sync/Update لازم است.
- Mobile/Browser: PWA از GitHub Pages با Service Worker و اجرای Offline پس از نصب.

## نسخه 3.10.6
- رفع خالی ماندن جدول هنگام پر شدن ظرفیت ذخیره‌سازی مرورگر.
- انتقال خودکار و بدون حذف اطلاعات قدیمی به IndexedDB با نگهداری آرشیو اولیه.
- ثبت اتمی دفتر اقساط و کارت‌های رمزنگاری‌شده؛ Pull ناقص وضعیت فعلی را جایگزین نمی‌کند.
- توقف Push هنگام خطای ذخیره‌سازی و نمایش هشدار بازیابی روشن.
- Snapshot بازیابی در ذخیره‌سازی پایدار و Undo محدود به نشست جاری برای جلوگیری از تکثیر چندباره داده.

## نسخه 3.10.5
- نمای شماره‌دار و جزئیات قابل کلیک برای اقساط، مناسب وام‌های ۱۴۴قسطی.
- انتقال داده‌های قدیمی بدون حذف تاریخچه و بدون ساخت تاریخ پرداخت فرضی.
- اصلاح بازگردانی پرداخت، جمع مبالغ متفاوت و مبلغ مستقل پرداخت تعهدات.
- سازگاری JSON Backup / GitHub Pull با Schema v4 و حفظ بازیابی کارت‌ها.
- ویندوز همچنان یک فایل HTML مستقل است؛ فایل دانلودشده قبلی خودکار جایگزین نمی‌شود.

## نسخه 3.10.0
- دفتر حساب‌های بانکی: شماره حساب، شماره کارت و شبا.
- روش و کانال پرداخت.
- ثبت مشابه با شناسه مستقل و Duplicate Warning.
- Pagination، Search و Filter برای درآمد و هزینه.
- برنامه اقساط ساختاریافته: هر قسط می‌تواند سررسید، مبلغ و شناسه پرداخت مستقل داشته باشد.
- قسط پرداخت‌شده سبز، سررسید گذشته قرمز و نزدیک سررسید مشخص می‌شود.
- ساخت خودکار برنامه اقساط و ورود گروهی شناسه‌ها با Paste چندخطی.
- توضیحات اقساط چندخطی و جدا از داده‌های ساختاریافته نمایش داده می‌شود.
- ثبت پرداخت روی هر ردیف قسط و نگهداری تاریخ، شماره پیگیری و روش پرداخت.
- Backup Schema v2 شامل حساب‌های بانکی، برنامه اقساط و Metadata جدید تراکنش‌ها است.

## سیاست امنیتی
داده‌های مالی و GitHub Token بکاپ هرگز نباید در این مخزن عمومی قرار گیرند. توکن GitHub فقط برای `GhestbanData` خصوصی استفاده می‌شود. کارت‌های دارای CVV/تاریخ انقضا در بکاپ برنامه به‌صورت `cardsBlob` رمزنگاری‌شده باقی می‌مانند.

## آزمون توسعه
با Node.js و Playwright دارای Chromium:
`node tests/regression.cjs`
و
`node tests/storage-regression.cjs`.

برای Chromium نصب‌شده، مسیر آن را با `CHROMIUM_PATH` مشخص کنید.

آزمون‌ها فقط داده ساختگی دارند و شامل مهاجرت ۱۴۴/۱۱۹، پرداخت از رابط، بازگردانی، ویرایش، حذف، مبالغ متفاوت، ورود بکاپ و چیدمان موبایل هستند. آزمون ذخیره‌سازی، ظرفیت پر localStorage، مهاجرت به IndexedDB و Pull اتمی بزرگ را نیز بررسی می‌کند.
