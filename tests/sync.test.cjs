const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');

const source=fs.readFileSync(path.join(__dirname,'../wealthflow-app/app.js'),'utf8');
const marker='  render();setInterval(';
assert.equal(source.split(marker).length,2,'The harness must intercept the single app bootstrap.');
function storage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const row=n=>({id:id(n),kind:'accounts',payload:{name:'Account '+n,openingBalance:1},updated_at:'2026-10-28T00:00:00Z'});
const response=(data,range,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...(range?{'Content-Range':range}:{})}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function app(fetch){
  const localStorage=storage(),sessionStorage=storage();
  const context=vm.createContext({
    window:{WEALTHFLOW_CLOUD:{url:'https://test.supabase.co',key:'sb_publishable_test'},addEventListener(){}},
    document:{addEventListener(){},querySelector(){return null;},getElementById(id){return id==='modal-root'?{innerHTML:''}:null;}},
    localStorage,sessionStorage,fetch,crypto:webcrypto,console,URL,URLSearchParams,Intl,Date,
    navigator:{onLine:true},location:{origin:'https://example.test',pathname:'/',hash:'',protocol:'https:'},
    history:{replaceState(){}},setTimeout,clearTimeout,setInterval(){return 1;},clearInterval(){},confirm:()=>true
  });
  const instrumentation=`
    render=()=>{};toast=message=>globalThis.lastToast=message;
    globalThis.api={pullCloud,flushQueue,mutate,importJSON,fetchCloudRecords,cloudFetch,
      renderGateway,renderSettings,topbar,banner,balances,
      reset(user='A',initial={},queue=[]){
        changeIdentity({access_token:'token-'+user,refresh_token:'refresh-'+user,user:{id:user,email:user+'@example.test'}});
        data=cleanData(initial);ops=queue;syncStatus='local';booting=false;persist();storeQueue();
      },
      queue(items){ops=items;storeQueue();},
      snapshot(){return {data,ops,syncStatus,syncError,booting};},
      cached(user='A'){return read(userStorageKey(user),null);},
      signedOut(){endLocalSession('Signed out.');},
      lastToast(){return globalThis.lastToast;}
    };return;
  `;
  vm.runInContext(source.replace(marker,instrumentation+marker),context);
  context.api.reset();
  return context.api;
}
function pageResponse(url,rows,cap=500){
  const params=new URL(url).searchParams,offset=Number(params.get('offset'));
  const page=rows.slice(offset,offset+Math.min(cap,Number(params.get('limit'))));
  return response(page,page.length?`${offset}-${offset+page.length-1}/${rows.length}`:`*/${rows.length}`);
}

test('loads all 1,205 records before replacing data and calculating balances',async()=>{
  const rows=Array.from({length:1205},(_,n)=>row(n+1)),offsets=[];
  const api=app(async(url,options)=>{
    offsets.push(Number(new URL(url).searchParams.get('offset')));
    assert.equal(options.headers.Prefer,'count=exact');
    assert.equal(new URL(url).searchParams.get('order'),'id.asc');
    return pageResponse(url,rows);
  });
  assert.equal(await api.pullCloud(),true);
  assert.deepEqual(offsets,[0,500,1000]);
  assert.equal(api.snapshot().data.accounts.length,1205);
  assert.equal(Object.values(api.balances()).reduce((a,b)=>a+b,0),1205);
  assert.equal(api.cached().accounts.length,1205);
  assert.equal(api.snapshot().syncStatus,'synced');
});

test('continues loading when the server caps pages below the requested size',async()=>{
  const rows=Array.from({length:301},(_,n)=>row(n+1)),offsets=[];
  const api=app(async url=>{offsets.push(Number(new URL(url).searchParams.get('offset')));return pageResponse(url,rows,137);});
  assert.equal(await api.pullCloud(),true);
  assert.deepEqual(offsets,[0,137,274]);
  assert.equal(api.snapshot().data.accounts.length,301);
});

test('a verified empty cloud clears the signed-in user view',async()=>{
  const api=app(async()=>response([],'*/0'));
  api.reset('A',{accounts:[{id:id(1),name:'Old'}]});
  assert.equal(await api.pullCloud(),true);
  assert.equal(api.snapshot().data.accounts.length,0);
});

test('concurrent sync callers share one request',async()=>{
  const request=deferred();let calls=0;
  const api=app(()=>{calls++;return request.promise;});
  const first=api.pullCloud(),second=api.pullCloud();
  assert.equal(first,second);
  request.resolve(response([],'*/0'));
  assert.equal(await first,true);assert.equal(calls,1);
});

test('an edit during a slow read survives, is written, and triggers a fresh read',async()=>{
  const request=deferred(),saved=[];let reads=0,writes=0;
  const api=app(async(url,options)=>{
    if(options.method==='POST'){writes++;saved.push(...JSON.parse(options.body));return response(null,null,204);}
    if(++reads===1)return request.promise;
    return pageResponse(url,saved);
  });
  const pending=api.pullCloud();
  api.mutate([{kind:'accounts',record:{id:id(1),name:'New account',openingBalance:10}}]);
  assert.equal(api.snapshot().syncStatus,'pending');
  request.resolve(response([],'*/0'));
  assert.equal(await pending,true);
  assert.equal(reads,2);assert.equal(writes,1);
  assert.equal(api.snapshot().data.accounts[0].name,'New account');
  assert.equal(api.cached().accounts[0].name,'New account');
  assert.equal(api.snapshot().ops.length,0);
});

test('a previously completed write still invalidates an older outstanding read',async()=>{
  const request=deferred(),saved=[];let reads=0;
  const api=app(async(url,options)=>{
    if(options.method==='POST'){saved.push(...JSON.parse(options.body));return response(null,null,204);}
    if(++reads===1)return request.promise;
    return pageResponse(url,saved);
  });
  const pending=api.pullCloud();
  api.mutate([{kind:'accounts',record:{id:id(1),name:'Keep me'}}]);
  assert.equal(await api.flushQueue(),true);
  assert.equal(api.snapshot().ops.length,0);
  request.resolve(response([],'*/0'));
  assert.equal(await pending,true);
  assert.equal(api.snapshot().data.accounts[0].name,'Keep me');
  assert.equal(reads,2);
});

test('failed writes preserve the queue and local records, then retry successfully',async()=>{
  const saved=[];let offline=true;
  const api=app(async(url,options)=>{
    if(offline)throw Error('offline');
    if(options.method==='POST'){saved.push(...JSON.parse(options.body));return response(null,null,204);}
    return pageResponse(url,saved);
  });
  api.mutate([{kind:'accounts',record:{id:id(1),name:'Offline edit'}}]);
  assert.equal(await api.pullCloud(),false);
  assert.equal(api.snapshot().ops.length,1);
  assert.equal(api.cached().accounts[0].name,'Offline edit');
  assert.equal(api.snapshot().syncStatus,'error');
  assert.match(api.banner(),/Sync needs attention/);
  assert.doesNotMatch(api.topbar(),/>Cloud synced</);
  offline=false;
  assert.equal(await api.pullCloud(),true);
  assert.equal(api.snapshot().ops.length,0);
  assert.equal(api.snapshot().data.accounts[0].name,'Offline edit');
});

test('concurrent queue flushes send each operation only once',async()=>{
  const write=deferred();let calls=0;
  const api=app(()=>{calls++;return write.promise;});
  api.queue([{user_id:'A',kind:'accounts',record:{id:id(1),name:'One'}}]);
  const first=api.flushQueue(),second=api.flushQueue();assert.equal(first,second);
  write.resolve(response(null,null,204));
  assert.equal(await first,true);assert.equal(calls,1);assert.equal(api.snapshot().ops.length,0);
});

test('a different-user queue item is kept and never sent',async()=>{
  let calls=0;const api=app(async()=>{calls++;return response(null,null,204);});
  api.queue([{user_id:'B',kind:'accounts',record:{id:id(1)}}]);
  assert.equal(await api.pullCloud(),false);assert.equal(calls,0);
  assert.equal(api.snapshot().ops.length,1);
  assert.match(api.snapshot().syncError,/different account/);
});

for(const scenario of ['missing count','failed later page','changed total','duplicate page','empty later page']){
  test(`${scenario} keeps the complete saved copy`,async()=>{
    const rows=Array.from({length:501},(_,n)=>row(n+1));let calls=0;
    const api=app(async url=>{
      calls++;
      if(scenario==='missing count')return response(rows.slice(0,500));
      if(calls===1)return pageResponse(url,rows);
      if(scenario==='failed later page')throw Error('offline');
      if(scenario==='changed total')return response([row(501)],'500-500/502');
      if(scenario==='duplicate page')return response([row(1)],'500-500/501');
      return response([],'*/501');
    });
    api.reset('A',{accounts:[{id:id(999),name:'Saved copy'}]});
    assert.equal(await api.pullCloud(),false);
    assert.equal(api.snapshot().data.accounts.length,1);
    assert.equal(api.snapshot().data.accounts[0].name,'Saved copy');
    assert.equal(api.cached().accounts[0].name,'Saved copy');
    assert.equal(api.snapshot().syncStatus,'error');
  });
}

test('late account A read cannot overwrite account B data or status',async()=>{
  const request=deferred();let calls=0;
  const api=app(async url=>++calls===1?request.promise:pageResponse(url,[row(2)]));
  const pendingA=api.pullCloud();
  api.reset('B');
  assert.equal(await api.pullCloud(),true);
  request.resolve(response([row(1)],'0-0/1'));
  assert.equal(await pendingA,false);
  assert.equal(api.snapshot().data.accounts[0].id,id(2));
  assert.equal(api.cached('B').accounts[0].id,id(2));
  assert.equal(api.snapshot().syncStatus,'synced');
});

test('late account A write cannot remove account B pending changes',async()=>{
  const request=deferred();let writes=0;
  const api=app(async()=>{writes++;return request.promise;});
  api.queue([{user_id:'A',kind:'accounts',record:{id:id(1)}}]);
  const pending=api.flushQueue();
  api.reset('B',{},[{user_id:'B',kind:'accounts',record:{id:id(2)}}]);
  request.resolve(response(null,null,204));
  assert.equal(await pending,false);assert.equal(writes,1);
  assert.equal(api.snapshot().ops[0].user_id,'B');
  assert.equal(api.snapshot().syncStatus,'local');
});

test('401 from an old identity cannot retry using the next account token',async()=>{
  const request=deferred();let calls=0;
  const api=app(()=>{calls++;return request.promise;});
  const pending=api.pullCloud();api.reset('B');
  request.resolve(response({message:'expired'},null,401));
  assert.equal(await pending,false);assert.equal(calls,1);
  assert.equal(api.snapshot().syncStatus,'local');
});

test('signing out while a read is pending keeps the dashboard and cache empty',async()=>{
  const request=deferred();const api=app(()=>request.promise);
  const pending=api.pullCloud();api.signedOut();
  request.resolve(response([row(1)],'0-0/1'));
  assert.equal(await pending,false);
  assert.equal(api.snapshot().data.accounts.length,0);
  assert.equal(api.cached(),null);
  assert.equal(api.snapshot().syncStatus,'local');
});

test('a backup read started under one identity cannot restore into another',async()=>{
  const file=deferred();const api=app(async()=>response([],'*/0'));
  const pending=api.importJSON({text:()=>file.promise});api.reset('B');
  file.resolve(JSON.stringify({format:'WealthFlow backup',data:{accounts:[{id:id(1)}],settings:{id:id(2)}}}));
  await assert.rejects(pending,/account changed/);
  assert.equal(api.snapshot().data.accounts.length,0);assert.equal(api.snapshot().ops.length,0);
});

test('privacy information is linked before signup and from Settings',()=>{
  const api=app(async()=>response([],'*/0'));
  assert.match(api.renderGateway(),/V5\.2 · Beta/);
  assert.match(api.renderGateway(),/href="privacy\.html"/);
  assert.match(api.renderSettings(),/href="privacy\.html"/);
  const privacy=fs.readFileSync(path.join(__dirname,'../wealthflow-app/privacy.html'),'utf8');
  assert.match(privacy,/not end-to-end encrypted/);
  assert.match(privacy,/Issues are public/);
});
