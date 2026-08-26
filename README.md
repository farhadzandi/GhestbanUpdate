# Ghestban Update Channel

این مخزن فقط کانال عمومی انتشار و بروزرسانی قسط‌بان است و نباید حاوی بکاپ یا داده مالی شخصی باشد.

## نقش مخزن‌ها
- `farhadzandi/Ghestban` — سورس و توسعه (Private)
- `farhadzandi/GhestbanData` — بکاپ و Sync داده مالی (Private)
- `farhadzandi/GhestbanUpdate` — فایل‌های قابل دریافت برای بروزرسانی (Public)

## مدل اجرا
- Windows: فایل HTML مستقل، قابل اجرا و استفاده کامل در حالت آفلاین؛ اینترنت فقط برای Backup/Sync/Update لازم است.
- Mobile/Browser: PWA از GitHub Pages با Service Worker و اجرای Offline پس از نصب.

## نسخه 3.10.0
- دفتر حساب‌های بانکی: شماره حساب، شماره کارت و شبا.
- روش و کانال پرداخت.
- ثبت مشابه با شناسه مستقل و Duplicate Warning.
- Pagination، Search و Filter برای درآمد و هزینه.
- Backup Schema v2 شامل حساب‌های بانکی و تمام Metadata جدید تراکنش.

## سیاست امنیتی
داده‌های مالی و GitHub Token بکاپ هرگز نباید در این مخزن عمومی قرار گیرند. توکن GitHub فقط برای `GhestbanData` خصوصی استفاده می‌شود. کارت‌های دارای CVV/تاریخ انقضا در بکاپ برنامه به‌صورت `cardsBlob` رمزنگاری‌شده باقی می‌مانند.
