import { validatePayload, csv } from './validation.mjs';
export function createSurveyHandler(env: unknown) {
  const E=()=>env as unknown as Record<string,any>;
  const db=()=>E().DB as D1Database;
  const reply=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  async function hash(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
  function config(){const e=E();const owner=e.PRIVACY_OWNER||'',manager=e.PRIVACY_MANAGER||'',contact=e.PRIVACY_CONTACT||'',retention=e.PRIVACY_RETENTION_TEXT||'';const ready=!!owner&&!!manager&&!!contact&&!!retention&&!!e.CONSENT_VERSION;return {prizeEnabled:ready,privacyOwner:owner,privacyManager:manager,privacyContact:contact,retentionText:retention,consentVersion:e.CONSENT_VERSION||'',eventDetails:e.EVENT_DETAILS||'',winnerNotice:e.WINNER_NOTICE||'',interviewContactEnabled:false};}
  function actor(req:Request){if(E().VERCEL_SURVEY_RUNTIME)return E().authenticateVercelAdmin(req);const id=req.headers.get('oai-authenticated-user-id');const email=req.headers.get('oai-authenticated-user-email')?.toLowerCase();const allowed=String(E().ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);return id&&email&&allowed.includes(email)?id:null;}
  async function audit(who:string,action:string,target:string|null=null){await db().prepare('INSERT INTO audit(id,at,actor,action,target) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),who,action,target).run();}
  async function purge(){await db().prepare("DELETE FROM contacts WHERE expires_at != '' AND expires_at <= ?").bind(new Date().toISOString()).run();}
  async function readBounded(req:Request){const reader=req.body?.getReader();if(!reader)throw new Error('body');let size=0,s='';const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>24000){await reader.cancel();throw new Error('size');}s+=decoder.decode(value,{stream:true});}return JSON.parse(s+decoder.decode());}
  async function handle(req:Request){try{
   const url=new URL(req.url),path=url.pathname;
   if (req.method === 'POST' && path === '/api/responses') {
    return reply({error:'설문 조사가 종료되었습니다.'},410);
   }
   if(req.method==='GET'&&path==='/api/config')return reply(config());
   if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return reply({error:'요청 출처를 확인할 수 없습니다.'},403);
   if(req.method==='POST'&&path==='/api/responses'){
    if(!req.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON 요청이 필요합니다.'},415);
    let p:any;try{p=await readBounded(req)}catch{return reply({error:'입력 데이터가 너무 크거나 올바르지 않습니다.'},400)}
    const c=config(),v=validatePayload(p,c);if(v.errors.length)return reply({error:v.errors[0].message,errors:v.errors},422);
    const receiptHash=await hash(p.receipt);
    const existing=await db().prepare('SELECT id,receipt_hash,prize FROM responses WHERE id=?').bind(p.id).first<any>();
    if(existing)return existing.receipt_hash===receiptHash?reply({id:existing.id,saved:true,prize:!!existing.prize}):reply({error:'제출 식별자가 이미 사용되었습니다.'},409);
    // Hashed, time-bucketed network key: no raw IP is persisted.
    const now=Date.now(),bucket=Math.floor(now/600000),network=req.headers.get('cf-connecting-ip')||'local';
    const key=await hash(network+':'+bucket+':'+String(E().RATE_LIMIT_SALT||'okiki'));
    const limit=await db().prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+1200000).first<any>();
    if(limit.count>30)return reply({error:'잠시 후 다시 제출해주세요.'},429);
    const at=new Date().toISOString();
    const stmts=[db().prepare('INSERT INTO responses(id,created_at,answers,prize,interview,q11_applicable,receipt_hash) VALUES(?,?,?,?,?,?,?)').bind(p.id,at,JSON.stringify({schemaVersion:1,...v.answers,other:v.other}),p.prize?1:0,p.interview,v.applicable?1:0,receiptHash)];
    if(p.prize)stmts.push(db().prepare('INSERT INTO contacts(response_id,phone,consent_at,consent_version,notice,expires_at) VALUES(?,?,?,?,?,?)').bind(p.id,p.contact.phone,at,c.consentVersion,JSON.stringify({owner:c.privacyOwner,manager:c.privacyManager,contact:c.privacyContact,retention:c.retentionText,purpose:'경품 추첨, 당첨자 안내 및 기프티콘 발송',fields:['휴대전화번호']}),''));
    try{await db().batch(stmts)}catch(error){const raced=await db().prepare('SELECT receipt_hash,prize FROM responses WHERE id=?').bind(p.id).first<any>();if(raced?.receipt_hash===receiptHash)return reply({id:p.id,saved:true,prize:!!raced.prize});throw error;}
    await db().prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();
    await purge();return reply({id:p.id,saved:true,prize:p.prize},201);
   }
   if(path==='/api/receipt'&&req.method==='POST'){const p=await readBounded(req);const r=await db().prepare('SELECT id,prize,receipt_hash FROM responses WHERE id=?').bind(String(p.id||'')).first<any>();return r&&r.receipt_hash===await hash(String(p.receipt||''))?reply({saved:true,id:r.id,prize:!!r.prize}):reply({error:'저장된 제출을 확인할 수 없습니다.'},404);}
   if(path.startsWith('/api/admin/')){
    const who=actor(req);if(!who && E().VERCEL_SURVEY_RUNTIME)return E().adminLoginRequired();if(!who)return reply({error:'관리자 권한이 필요합니다. 승인된 계정으로 로그인해주세요.'},403);
    await purge();
    if(path==='/api/admin/shipment'&&req.method==='POST'){
     const p=await readBounded(req);if(typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date))return reply({error:'발송 완료일을 입력해주세요.'},400);
     const completed=new Date(p.date+'T00:00:00+09:00');if(!Number.isFinite(completed.getTime())||completed.getTime()>Date.now())return reply({error:'실제 발송이 완료된 날짜를 입력해주세요.'},400);
     const deadline=new Date(completed.getTime()+30*86400000).toISOString();
     await db().batch([db().prepare("UPDATE contacts SET shipment_completed_at=?,expires_at=? WHERE shipment_completed_at IS NULL").bind(p.date,deadline),db().prepare('INSERT INTO audit(id,at,actor,action,target) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),who,'shipment-completed',p.date)]);
     await purge();return reply({saved:true,deadline});
    }
    if(path==='/api/admin/contacts'&&req.method==='DELETE'){const p=await readBounded(req);if(typeof p.id!=='string')return reply({error:'응답 ID가 필요합니다.'},400);await db().batch([db().prepare('DELETE FROM contacts WHERE response_id=?').bind(p.id),db().prepare('INSERT INTO audit(id,at,actor,action,target) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),who,'delete-contact',p.id)]);return reply({deleted:true});}
    if(req.method!=='GET')return reply({error:'지원하지 않는 요청입니다.'},405);
    const from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||'';
    if([from,to].some(v=>v&&!/^\d{4}-\d{2}-\d{2}$/.test(v)))return reply({error:'날짜 형식을 확인해주세요.'},400);
    const where=' WHERE (?=\'\' OR created_at>=?) AND (?=\'\' OR created_at<?)';
    const start=from?new Date(from+'T00:00:00+09:00').toISOString():'',end=to?new Date(Date.parse(to+'T00:00:00+09:00')+86400000).toISOString():'';
    const bindings=[from,start,to,end];
    if(path==='/api/admin/stats'){
     const total=await db().prepare('SELECT count(*) AS n FROM responses'+where).bind(...bindings).first<any>();
     const days=await db().prepare("SELECT date(created_at,'+9 hours') AS day,count(*) AS n FROM responses"+where+' GROUP BY day ORDER BY day DESC').bind(...bindings).all();
     const counts=await db().prepare(`SELECT j.key AS question,CASE WHEN j.type='array' THEN x.value ELSE j.value END AS answer,count(*) AS n FROM responses r,json_each(r.answers) j LEFT JOIN json_each(CASE WHEN j.type='array' THEN j.value ELSE '[]' END) x WHERE j.key IN ('Q1','Q2','Q3','Q4','Q5','Q6','Q9','Q10','Q11','Q12') AND (?='' OR r.created_at>=?) AND (?='' OR r.created_at<?) GROUP BY question,answer`).bind(...bindings).all();
     return reply({total:total.n,days:days.results,counts:counts.results,config:config(),adminAuth:E().VERCEL_SURVEY_RUNTIME ? "basic" : "sites"});
    }
    const contacts=path==='/api/admin/contacts';
    if(!contacts&&path!=='/api/admin/responses')return reply({error:'찾을 수 없습니다.'},404);
    const offset=Math.max(0,Math.min(10000000,Number(url.searchParams.get('offset'))||0));
    const rows=contacts?await db().prepare('SELECT c.* FROM contacts c JOIN responses r ON r.id=c.response_id'+where+' ORDER BY created_at DESC LIMIT 200 OFFSET ?').bind(...bindings,offset).all<any>():await db().prepare('SELECT id,created_at,answers,prize,interview,q11_applicable FROM responses'+where+(url.searchParams.get('interview')==='yes'?" AND interview='인터뷰에 응할 의향이 있습니다'":'')+' ORDER BY created_at DESC LIMIT 200 OFFSET ?').bind(...bindings,offset).all<any>();
    await audit(who,contacts?'view-contacts':'view-responses');
    return reply({rows:rows.results,nextOffset:rows.results.length===200?offset+200:null});
   }
   return reply({error:'찾을 수 없습니다.'},404);
   }catch(error){
    const code = (error as { code?: unknown } | null)?.code;
    const safeCode = typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code) ? code : 'UNKNOWN';
    console.error('Survey API request failed', {
      method: req.method,
      code: E().VERCEL_SURVEY_RUNTIME && !E().DATABASE_URL ? 'DATABASE_URL_MISSING' : safeCode,
    });
    return reply({error:'저장소 연결에 문제가 있습니다. 입력 내용을 유지한 채 다시 시도해주세요.'},503);
  }}
  return handle;
}
