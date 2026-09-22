(()=>{
  'use strict';
  const Cap=window.Capacitor;
  const getPlugin=()=>Cap?.Plugins?.GhestbanSms||null;
  const normalize=r=>({available:true,granted:r?.sms==='granted'||r?.receiveSms==='granted'||r?.granted===true,raw:r||{}});

  async function status(){
    const p=getPlugin();if(!p)return{available:false,granted:false};
    try{return normalize(await p.checkPermissions())}catch(e){return{available:true,granted:false,error:String(e)}}
  }
  async function request(){
    const p=getPlugin();if(!p)return{available:false,granted:false};
    try{return normalize(await p.requestPermissions())}catch(e){return{available:true,granted:false,error:String(e)}}
  }
  async function enable(){
    const r=await request(),s=window.GhestbanNextDomain.state();s.settings=s.settings||{};s.settings.sms=!!r.granted;window.GhestbanNextDomain.save(s);return r;
  }
  function bind(){
    window.addEventListener('ghestbanBankSms',e=>window.GhestbanServices?.BankSmsService?.receive?.(e.detail||{}));
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.GhestbanNativeSms={status,request,enable};
})();