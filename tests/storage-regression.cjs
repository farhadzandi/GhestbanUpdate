const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
new Function(source.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
const fixture={loans:[{id:'legacy',cat:'وام مسکن',person:'حبیبه',amount:2518000,total:144,paid:119,lastPay:'۱۴۰۵/۰۴/۲۶',dueDate:'۱۴۰۵/۰۵/۲۶',history:[]}],simple:[{id:'s',cat:'تعهد',person:'فرهاد',amount:100,history:[]}],income:[],expenses:[],bankAccounts:[]};
(async()=>{
 let launch={};if(process.env.CHROMIUM_PATH)launch={executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']};
 const browser=await chromium.launch({headless:true,...launch});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('http://ghestban.test/setup',r=>r.fulfill({contentType:'text/html',body:'<html>setup</html>'}));
 await page.route('http://ghestban.test/app',r=>r.fulfill({contentType:'text/html',body:source}));
 await page.route('https://**',r=>r.abort());
 await page.goto('http://ghestban.test/setup');
 await page.evaluate(async f=>{await new Promise(ok=>{const q=indexedDB.deleteDatabase('ghestban-durable-v1');q.onsuccess=q.onerror=q.onblocked=ok});localStorage.clear();localStorage.setItem('installments-welcome-v1','1');localStorage.setItem('installments-ledger-v1',JSON.stringify(f));let i=0;try{while(true)localStorage.setItem('quota-fill-'+i++,'x'.repeat(100000));}catch(e){window.__quotaName=e.name;}},fixture);
 assert.match(await page.evaluate(()=>window.__quotaName),/Quota/i);
 await page.goto('http://ghestban.test/app');await page.waitForFunction(()=>document.documentElement.dataset.storageReady==='1');
 assert.equal(await page.locator('.loan').count(),1);assert.equal(await page.locator('.inst-cell').count(),144);assert.equal(await page.locator('#statActive').textContent(),'۱');
 const active=await page.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open('ghestban-durable-v1');q.onsuccess=()=>{const r=q.result.transaction('records').objectStore('records').get('active');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)};q.onerror=()=>reject(q.error)}));
 assert.equal(active.ledger.loans[0].paid,119);assert.equal(active.ledger.loans[0].schedule.length,144);assert.equal(await page.evaluate(()=>localStorage.getItem('installments-ledger-v1')),null);console.log('PASS full localStorage migration preserves and renders legacy ledger');
 // Read the first archival copy and verify it was committed before cleanup.
 const archive=await page.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open('ghestban-durable-v1');q.onsuccess=()=>{const r=q.result.transaction('records').objectStore('records').get('legacy-localStorage');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)};q.onerror=()=>reject(q.error)}));
 assert.equal(JSON.parse(archive['installments-ledger-v1']).loans[0].paid,119);console.log('PASS immutable legacy archive');
 // Reload must use IndexedDB and remain idempotent.
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.storageReady==='1');assert.equal(await page.locator('.inst-cell').count(),144);console.log('PASS reload from IndexedDB');
 // Instrument only this in-memory test page to validate atomic remote replacement.
 const instrumented=source.replace('  updateUndoRedoButtons();\n\n  const beforeMigration=',`  window.__test={getState:()=>state,getActive:()=>dbRead('active'),applyRemotePayload,awaitStorage:()=>storageQueue,failWrites:()=>{dataDb=null},restoreDb:async()=>{await initDataStorage()}};\n  updateUndoRedoButtons();\n\n  const beforeMigration=`);
 await page.route('http://atomic.test/setup',r=>r.fulfill({contentType:'text/html',body:'setup'}));await page.route('http://atomic.test/app',r=>r.fulfill({contentType:'text/html',body:instrumented}));
 await page.goto('http://atomic.test/setup');await page.evaluate(async()=>{await new Promise(ok=>{const q=indexedDB.deleteDatabase('ghestban-durable-v1');q.onsuccess=q.onerror=q.onblocked=ok});localStorage.clear();localStorage.setItem('installments-welcome-v1','1')});await page.goto('http://atomic.test/app');await page.waitForFunction(()=>document.documentElement.dataset.storageReady==='1');
 const remote=structuredClone(fixture);remote.loans[0].cat='داده راه‌دور';remote.loans[0].notes='z'.repeat(6_000_000);
 const success=await page.evaluate(async d=>{const s=await __test.applyRemotePayload(d,true,true);await __test.awaitStorage();const a=await __test.getActive();return {summary:s,cat:__test.getState().loans[0].cat,stored:a.ledger.loans[0].cat,note:a.ledger.loans[0].notes.length}},remote);
 assert.deepEqual(success.cat,'داده راه‌دور');assert.equal(success.stored,'داده راه‌دور');assert.equal(success.note,6_000_000);console.log('PASS large Pull payload stored beyond localStorage quota');
 const failed=await page.evaluate(async d=>{const before=JSON.stringify(__test.getState());__test.failWrites();let error='';try{await __test.applyRemotePayload(d,true,true)}catch(e){error=e.message}return{same:JSON.stringify(__test.getState())===before,error}},fixture);
 assert.equal(failed.same,true);assert.match(failed.error,/اطلاعات و کارت‌های قبلی تغییر نکردند/);console.log('PASS failed Pull cannot replace live data');
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
