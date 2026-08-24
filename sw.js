// Qestban v3.9.2 Service Worker — Offline-First + controlled updates
const APP_VERSION = '3.9.2';
const CACHE_NAME = `qestban-${APP_VERSION}`;
const APP_SHELL = ['./','./index.html','./manifest.json','./updates.json','./icons/icon-192.svg','./icons/icon-512.svg'];
const RUNTIME_CACHE = `qestban-runtime-${APP_VERSION}`;
const SHEETJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Best effort only: Excel is not a core dependency. Cache it when the network allows it,
    // but never fail PWA installation just because the CDN is blocked or offline.
    try{
      const res=await fetch(SHEETJS_URL,{cache:'no-store'});
      if(res){ const runtime=await caches.open(RUNTIME_CACHE); await runtime.put(SHEETJS_URL,res.clone()); }
    }catch(e){}
  })());
  // Deliberately no skipWaiting(): the current app keeps running until the user accepts the update.
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    // Keep the current caches and one previous qestban app cache as a safety net.
    const appCaches=keys.filter(k=>k.startsWith('qestban-') && !k.startsWith('qestban-runtime-')).sort().reverse();
    const keep=new Set([CACHE_NAME,RUNTIME_CACHE,...appCaches.slice(0,2)]);
    await Promise.all(keys.filter(k=>k.startsWith('qestban-') && !keep.has(k)).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});

async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME); const cached=await cache.match(request);
  const network=fetch(request).then(res=>{ if(res && res.ok) cache.put(request,res.clone()); return res; }).catch(()=>null);
  return cached || (await network) || new Response('Offline',{status:503,statusText:'Offline'});
}

self.addEventListener('fetch', event => {
  const req=event.request; if(req.method!=='GET') return;
  const url=new URL(req.url);

  // version.json must be fresh; a stale version must never trigger a false update notification.
  if(url.origin===self.location.origin && url.pathname.endsWith('/version.json')){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response('',{status:503,statusText:'Offline'})));
    return;
  }

  // Same-origin app files: use local cache immediately, refresh silently when possible.
  if(url.origin===self.location.origin){ event.respondWith(staleWhileRevalidate(req)); return; }

  // Cache SheetJS after the first successful online use so Excel continues working during later outages.
  if(req.url===SHEETJS_URL || (url.hostname==='cdnjs.cloudflare.com' && url.pathname.includes('/xlsx/'))){
    event.respondWith((async()=>{
      const cache=await caches.open(RUNTIME_CACHE); const cached=await cache.match(req);
      if(cached) return cached;
      try{ const res=await fetch(req); if(res) await cache.put(req,res.clone()); return res; }
      catch(e){ return new Response('',{status:503,statusText:'Offline'}); }
    })());
  }
});
