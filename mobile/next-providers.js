(()=>{
  'use strict';

  const CFG='ghestban_provider_config_v2';
  const OUTBOX='ghestban_sync_outbox_v2';
  const MIRROR='ghestban_next_local_mirror';
  const TIMEOUT_MS=7000;
  const runtime={accessToken:null,github:null,busy:false};
  const now=()=>new Date().toISOString();
  const D=()=>window.GhestbanNextDomain?.state?.();
  const saveState=s=>window.GhestbanNextDomain?.save?.(s);
  const clone=x=>JSON.parse(JSON.stringify(x));

  const defaults={
    mode:'local-first',
    vps:{enabled:false,baseUrl:'',health:'/v1/health',timeoutMs:5000},
    github:{enabled:false,role:'offsite-backup',owner:'',repository:'',branch:'main',path:'backups/ghestban-next.json'},
    policy:{identity:'vps-only',license:'vps-only',syncPrimary:'vps',backupSecondary:'github',offlineWrite:true}
  };

  function loadConfig(){
    try{
      const x=JSON.parse(localStorage.getItem(CFG)||'{}');
      return {...clone(defaults),...x,vps:{...defaults.vps,...(x.vps||{})},github:{...defaults.github,...(x.github||{})},policy:{...defaults.policy,...(x.policy||{})}};
    }catch{return clone(defaults)}
  }
  function saveConfig(x){
    const safe={...clone(defaults),...(x||{})};
    if(safe.vps)delete safe.vps.accessToken;
    if(safe.github)delete safe.github.token;
    localStorage.setItem(CFG,JSON.stringify(safe));return loadConfig();
  }

  function queue(){try{return JSON.parse(localStorage.getItem(OUTBOX)||'[]')}catch{return[]}}
  function setQueue(q){localStorage.setItem(OUTBOX,JSON.stringify(q.slice(-500)))}
  function enqueue(kind,payload={}){
    let q=queue();
    if(kind==='sync.snapshot')q=q.filter(x=>x.kind!=='sync.snapshot');
    const v={id:(crypto.randomUUID?.()||('q_'+Date.now())),kind,payload,createdAt:now(),attempts:0,lastError:null};q.push(v);setQueue(q);return v;
  }
  function markQueue(id,patch){const q=queue(),i=q.findIndex(x=>x.id===id);if(i>=0){q[i]={...q[i],...patch};setQueue(q)}return i>=0}
  function removeQueue(id){setQueue(queue().filter(x=>x.id!==id))}

  function cleanSnapshot(){
    const s=clone(D()||{});
    if(s.settings?.providers){
      if(s.settings.providers.vps)delete s.settings.providers.vps.accessToken;
      if(s.settings.providers.github)delete s.settings.providers.github.token;
    }
    return {format:'ghestban-next',schema:s.schema||2,exportedAt:now(),state:s};
  }

  async function request(url,opt={}){
    const ac=new AbortController(),t=setTimeout(()=>ac.abort(),opt.timeoutMs||TIMEOUT_MS);
    try{
      const r=await fetch(url,{...opt,signal:ac.signal});
      const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
      if(!r.ok){const e=new Error(`HTTP ${r.status}`);e.status=r.status;e.body=body;throw e}return body;
    }finally{clearTimeout(t)}
  }
  function authHeaders(extra={}){return {'Content-Type':'application/json',...(runtime.accessToken?{Authorization:`Bearer ${runtime.accessToken}`}:{ }),...extra}}

  const LocalProvider={
    name:'local',enabled:()=>true,
    health:async()=>({ok:true,provider:'local'}),
    push:async()=>{localStorage.setItem(MIRROR,JSON.stringify(cleanSnapshot()));return{ok:true,provider:'local',at:now()}},
    pull:async()=>{const raw=localStorage.getItem(MIRROR);return raw?JSON.parse(raw):cleanSnapshot()}
  };

  const VpsProvider={
    name:'vps',
    enabled:()=>{const c=loadConfig().vps;return !!(c.enabled&&c.baseUrl)},
    health:async()=>{
      const c=loadConfig().vps;if(!VpsProvider.enabled())return{ok:false,provider:'vps',reason:'not-configured'};
      try{const x=await request(c.baseUrl.replace(/\/$/,'')+c.health,{headers:authHeaders(),timeoutMs:c.timeoutMs});return{ok:true,provider:'vps',detail:x}}
      catch(e){return{ok:false,provider:'vps',reason:e.name==='AbortError'?'timeout':String(e.message||e)}}
    },
    push:async()=>{
      const c=loadConfig().vps;if(!VpsProvider.enabled())throw Error('VPS provider disabled');const s=D();
      return request(c.baseUrl.replace(/\/$/,'')+'/v1/sync/snapshot',{method:'PUT',headers:authHeaders(),body:JSON.stringify({householdId:s?.household?.id||'hh_local',payload:cleanSnapshot()}),timeoutMs:c.timeoutMs});
    },
    pull:async()=>{
      const c=loadConfig().vps;if(!VpsProvider.enabled())throw Error('VPS provider disabled');const s=D();
      return request(c.baseUrl.replace(/\/$/,'')+'/v1/sync/snapshot?householdId='+encodeURIComponent(s?.household?.id||'hh_local'),{headers:authHeaders(),timeoutMs:c.timeoutMs});
    }
  };

  const GitHubProvider={
    name:'github',
    enabled:()=>{const c=loadConfig().github,g=runtime.github;return !!(c.enabled&&g?.token&&(g.owner||c.owner)&&(g.repository||c.repository))},
    health:async()=>GitHubProvider.enabled()?{ok:true,provider:'github',mode:'session-token'}:{ok:false,provider:'github',reason:'not-configured'},
    push:async()=>{
      if(!GitHubProvider.enabled())throw Error('GitHub provider not configured');
      const c=loadConfig().github,g=runtime.github,owner=g.owner||c.owner,repo=g.repository||c.repository,branch=g.branch||c.branch,path=g.path||c.path;
      const api=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
      const headers={Authorization:`Bearer ${g.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
      let sha=null;try{sha=(await request(api+'?ref='+encodeURIComponent(branch),{headers,timeoutMs:10000}))?.sha||null}catch(e){if(e.status!==404)throw e}
      const bytes=new TextEncoder().encode(JSON.stringify(cleanSnapshot()));let bin='';for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode(...bytes.subarray(i,i+32768));
      return request(api,{method:'PUT',headers,body:JSON.stringify({message:'Ghestban offsite backup '+now(),content:btoa(bin),branch,...(sha?{sha}:{})}),timeoutMs:15000});
    },
    pull:async()=>{
      if(!GitHubProvider.enabled())throw Error('GitHub provider not configured');
      const c=loadConfig().github,g=runtime.github,owner=g.owner||c.owner,repo=g.repository||c.repository,branch=g.branch||c.branch,path=g.path||c.path;
      const api=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;
      const x=await request(api,{headers:{Authorization:`Bearer ${g.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},timeoutMs:15000});
      const bin=atob(String(x?.content||'').replace(/\n/g,'')),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes));
    }
  };

  const providers={local:LocalProvider,vps:VpsProvider,github:GitHubProvider};
  async function status(){const out={};for(const [k,p] of Object.entries(providers))out[k]=await p.health();return out}
  async function route(){
    const h=await status(),c=loadConfig();
    return {local:true,vps:!!h.vps?.ok,github:!!h.github?.ok,mode:h.vps?.ok?'online-primary':'offline-local',identity:h.vps?.ok?'vps':'cached-only',license:h.vps?.ok?'vps':'cached-only',sync:h.vps?.ok?'vps':'queued',backup:h.github?.ok?'github-secondary':'local-only',policy:c.policy};
  }

  async function push({includeGitHub=true,queueOnFailure=true}={}){
    if(runtime.busy)return{ok:false,reason:'busy'};runtime.busy=true;const attempts=[];
    try{
      await LocalProvider.push();attempts.push({provider:'local',ok:true});
      if(VpsProvider.enabled())try{await VpsProvider.push();attempts.push({provider:'vps',ok:true})}catch(e){attempts.push({provider:'vps',ok:false,error:String(e.message||e)})}
      if(includeGitHub&&GitHubProvider.enabled())try{await GitHubProvider.push();attempts.push({provider:'github',ok:true})}catch(e){attempts.push({provider:'github',ok:false,error:String(e.message||e)})}
      const remoteConfigured=VpsProvider.enabled()||GitHubProvider.enabled(),remoteOk=attempts.some(x=>x.provider!=='local'&&x.ok);
      if(remoteConfigured&&!remoteOk&&queueOnFailure)enqueue('sync.snapshot',{reason:'remote-unavailable'});
      return{ok:!remoteConfigured||remoteOk,attempts,queued:remoteConfigured&&!remoteOk};
    }finally{runtime.busy=false}
  }

  function extractState(x){
    const p=x?.payload?.format==='ghestban-next'?x.payload:x?.payload?.state?x.payload:x?.format==='ghestban-next'?x:x?.state?x:null;
    if(!p?.state?.household)throw Error('Invalid Ghestban remote payload');return p.state;
  }
  async function pull({provider='vps',apply=false}={}){
    const p=providers[provider];if(!p||!p.enabled())throw Error(provider+' provider unavailable');const raw=await p.pull(),remote=extractState(raw);
    if(apply){window.GhestbanNextDomain?.snapshot?.('قبل از Pull از '+provider);saveState(remote)}return{ok:true,provider,state:remote,applied:!!apply};
  }
  async function flush(){
    const items=queue(),results=[];
    for(const item of items){try{if(item.kind==='sync.snapshot'){const r=await push({queueOnFailure:false});if(r.ok){removeQueue(item.id);results.push({id:item.id,ok:true});continue}}throw Error('remote unavailable')}catch(e){markQueue(item.id,{attempts:(item.attempts||0)+1,lastError:String(e.message||e),lastAttempt:now()});results.push({id:item.id,ok:false})}}
    return results;
  }

  function configureVps({baseUrl,enabled=true,timeoutMs=5000}={}){const c=loadConfig();c.vps={...c.vps,baseUrl:String(baseUrl||'').replace(/\/$/,''),enabled:!!enabled,timeoutMs};return saveConfig(c)}
  function configureGitHub({owner,repository,branch='main',path='backups/ghestban-next.json',enabled=true}={}){const c=loadConfig();c.github={...c.github,owner:owner||'',repository:repository||'',branch,path,enabled:!!enabled};return saveConfig(c)}
  function setAccessToken(token){runtime.accessToken=token||null}
  function setGitHubSession(cfg){runtime.github=cfg?{...cfg}:null}

  window.addEventListener('online',()=>flush().catch(()=>{}));
  window.GhestbanProviders={config:loadConfig,saveConfig,providers,queue,enqueue,flush,status,route,push,pull,configureVps,configureGitHub,setAccessToken,setGitHubSession,cleanSnapshot};
})();