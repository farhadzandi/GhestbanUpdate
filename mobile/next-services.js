(()=>{
  'use strict';
  const D=()=>window.GhestbanNextDomain.state();
  const id=p=>p+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  const commit=(s,reason='state-change')=>{
    window.GhestbanNextDomain.save(s);
    window.GhestbanProviders?.enqueue?.('sync.snapshot',{reason});
    return s;
  };
  const audit=(action,data={})=>{
    const s=D();s.audit=s.audit||[];s.audit.unshift({id:id('au'),at:new Date().toISOString(),action,data});s.audit=s.audit.slice(0,500);commit(s,'audit:'+action);
  };

  const Household={
    get:()=>D().household,
    members:()=>D().members||[],
    addMember:x=>{const s=D();s.members=s.members||[];const v={id:id('m'),role:'viewer',...x};s.members.push(v);commit(s,'member.add');audit('member.add',{id:v.id});return v}
  };
  const Account={
    list:()=>D().accounts||[],
    add:x=>{const s=D(),v={id:id('acc'),kind:'account',ownerId:'owner-local',...x};s.accounts.push(v);commit(s,'account.add');audit('account.add',{id:v.id});return v}
  };
  const Loan={
    list:()=>D().loans||[],
    add:x=>{const s=D(),v={id:id('loan'),installments:[],...x};s.loans.push(v);commit(s,'loan.add');audit('loan.add',{id:v.id});return v},
    pay:(loanId,instId,txId)=>{const s=D(),l=s.loans.find(x=>x.id===loanId),i=l?.installments?.find(x=>x.id===instId);if(!i)return false;i.status='paid';i.transactionId=txId;i.paidAt=new Date().toISOString();commit(s,'installment.paid');audit('installment.paid',{loanId,instId,txId});return true}
  };
  const Transaction={
    list:()=>D().transactions||[],
    add:x=>{const s=D(),v={id:id('tx'),status:'confirmed',recordedBy:'owner-local',...x};s.transactions.push(v);commit(s,'transaction.add');audit('transaction.add',{id:v.id});return v},
    candidates:()=>D().inbox||[],
    candidate:x=>{const s=D();s.inbox=s.inbox||[];const v={id:id('cand'),status:'pending',createdAt:new Date().toISOString(),...x};s.inbox.push(v);commit(s,'transaction.candidate');return v},
    confirm:cId=>{const s=D(),c=(s.inbox||[]).find(x=>x.id===cId);if(!c)return null;c.status='confirmed';commit(s,'transaction.candidate.confirm');return Transaction.add({...c,id:undefined,status:'confirmed'})}
  };
  const Matching={
    suggest:c=>{const hits=[];for(const l of Loan.list())for(const i of(l.installments||[]))if(i.status!=='paid'&&+i.amount===+c.amount)hits.push({loanId:l.id,installmentId:i.id,score:.75,reason:'amount'});return hits.sort((a,b)=>b.score-a.score)}
  };
  const Notification={
    list:()=>D().notifications||[],
    push:x=>{const s=D(),v={id:id('n'),read:false,createdAt:new Date().toISOString(),...x};s.notifications.unshift(v);commit(s,'notification.add');return v}
  };

  const Recovery={
    snapshot:reason=>window.GhestbanNextDomain?.snapshot?.(reason)||window.GhestbanRollback?.snap?.(reason),
    history:()=>window.GhestbanRollback?.history?.()||[],
    restore:id=>window.GhestbanNextDomain?.restore?.(id)||window.GhestbanRollback?.restore?.(id)
  };
  const Backup={
    export:()=>window.GhestbanData?.download?.(),
    import:()=>window.GhestbanData?.pick?.(),
    provider:'local-file+remote',
    pushRemote:opt=>window.GhestbanProviders?.push?.(opt),
    pullRemote:opt=>window.GhestbanProviders?.pull?.(opt),
    status:()=>window.GhestbanProviders?.status?.()
  };
  const BankSms={
    enabled:false,
    parse:text=>window.GhestbanPlatform?.parseShahrSms?.(text)||null,
    ingest:text=>{const p=BankSms.parse(text);return p?Transaction.candidate({...p,raw:text,source:'bank-sms'}):null},
    receive:payload=>{const text=typeof payload==='string'?payload:(payload?.body||payload?.text||'');if(!text)return null;const c=BankSms.ingest(text);if(c)Notification.push({title:'تراکنش بانکی جدید',message:'یک تراکنش برای تأیید دریافت شد'});return c}
  };

  const Sync={
    enabled:true,
    name:'SyncService',
    status:()=>window.GhestbanProviders?.route?.()||Promise.resolve({local:true,mode:'local-only'}),
    push:opt=>window.GhestbanProviders?.push?.(opt),
    pull:opt=>window.GhestbanProviders?.pull?.(opt),
    flush:()=>window.GhestbanProviders?.flush?.(),
    queue:()=>window.GhestbanProviders?.queue?.()||[]
  };
  const Identity={
    enabled:true,
    name:'IdentityService',
    provider:'vps-only',
    setSessionToken:token=>window.GhestbanProviders?.setAccessToken?.(token),
    status:async()=>{const r=await Sync.status();return{enabled:true,provider:'vps',mode:r?.identity||'cached-only',online:!!r?.vps}}
  };
  const License={
    enabled:true,
    name:'LicenseService',
    provider:'vps-only',
    status:async()=>{const r=await Sync.status();return{enabled:true,provider:'vps',mode:r?.license||'cached-only',online:!!r?.vps}}
  };

  window.GhestbanServices={
    HouseholdService:Household,AccountService:Account,LoanService:Loan,TransactionService:Transaction,MatchingService:Matching,
    NotificationService:Notification,BackupService:Backup,RecoveryService:Recovery,BankSmsService:BankSms,
    SyncService:Sync,IdentityService:Identity,LicenseService:License,audit
  };
})();