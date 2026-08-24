# Ghestban Update Channel

این مخزن فقط کانال عمومی انتشار و بروزرسانی قسط‌بان است و نباید حاوی بکاپ یا داده مالی شخصی باشد.

## نقش مخزن‌ها
- `farhadzandi/Ghestban` — سورس و توسعه (Private)
- `farhadzandi/GhestbanData` — بکاپ و Sync داده مالی (Private)
- `farhadzandi/GhestbanUpdate` — فایل‌های قابل دریافت برای بروزرسانی (Public)

## فایل‌های اصلی
- `index.html` — نسخه قابل نصب PWA
- `manifest.json` — مشخصات PWA
- `sw.js` — Offline cache و فعال‌سازی کنترل‌شده بروزرسانی
- `version.json` — نسخه جاری برای Update Check
- `updates.json` — تاریخچه نسخه‌ها و فهرست تغییرات
- `icons/` — آیکون‌های PWA

## سیاست انتشار
هسته برنامه Offline-First است. قطع اینترنت نباید مانع ثبت یا مشاهده داده‌های مالی شود. بروزرسانی فقط هنگام دسترسی اینترنت بررسی می‌شود و فعال‌سازی نسخه جدید پس از تأیید کاربر انجام می‌شود.

داده‌های مالی و GitHub Token بکاپ هرگز نباید در این مخزن قرار گیرند.
