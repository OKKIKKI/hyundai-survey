import test from 'node:test';import assert from 'node:assert/strict';
import {validatePayload,csv} from '../lib/validation.mjs';import {options} from '../lib/options.mjs';
const valid=()=>({id:crypto.randomUUID(),receipt:crypto.randomUUID(),answers:{Q1:[options.q1[0]],Q2:[options.q2[0]],Q3:options.age[1],Q4:options.q1[0],Q5:options.q2[0],Q6:[options.q5[0]],Q7:'local test',Q8:'',Q9:[options.q8[0]],Q10:options.q9.at(-1),Q11:[],Q12:options.q11.at(-1)},other:{},interview:'',prize:false});
const cfg={prizeEnabled:false,consentVersion:''};
test('valid Q1-Q12 payload',()=>assert.equal(validatePayload(valid(),cfg).errors.length,0));
test('required, branch, max selections, other text and conditional Q11',()=>{for(const mutate of [p=>p.answers.Q1=[],p=>p.answers.Q4='unknown',p=>p.answers.Q6=options.q5.slice(0,3),p=>p.answers.Q9=options.q8.slice(0,3),p=>p.answers.Q7=' ',p=>p.answers.Q2=['기타'],p=>p.answers.Q10=options.q9[0],p=>p.answers.Q12='unknown',p=>p.interview=options.interview[0]]){const p=valid();mutate(p);assert.ok(validatePayload(p,cfg).errors.length)}});
test('all systems require Q11 except none',()=>{for(const system of options.q9){const p=valid();p.answers.Q10=system;if(system!==options.q9.at(-1))p.answers.Q11=[options.q10[0]];assert.equal(validatePayload(p,cfg).errors.length,0)}});
test('prize requires configured purpose, consent version and phone',()=>{const p=valid();p.prize=true;p.contact={phone:'01000000000',consent:true,version:'test'};assert.ok(validatePayload(p,cfg).errors.length);assert.equal(validatePayload(p,{prizeEnabled:true,consentVersion:'test'}).errors.length,0);p.contact.consent=false;assert.ok(validatePayload(p,{prizeEnabled:true,consentVersion:'test'}).errors.length)});
test('CSV formula escaping',()=>assert.ok(csv([['=HYPERLINK("bad")','+1','@x','-2']]).includes("'=HYPERLINK")));
const base=process.env.TEST_BASE;
if(base)test('API: real local DB, replay, validation, receipt and denied admin',async()=>{
 const send=(path,p,origin=base)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(p)});
 const p=valid();let r=await send('responses',p);assert.equal(r.status,201,await r.clone().text());const saved=await r.json();assert.equal(saved.id,p.id);
 const replay=await Promise.all([send('responses',p),send('responses',p)]);for(const x of replay)assert.equal(x.status,200);
 r=await send('receipt',p);assert.equal(r.status,200);
 r=await send('receipt',{...p,receipt:crypto.randomUUID()});assert.equal(r.status,404);
 r=await send('responses',{...p,receipt:crypto.randomUUID()});assert.equal(r.status,409);
 r=await send('responses',valid(),'https://other.invalid');assert.equal(r.status,403);
 const bad=valid();bad.answers.Q7='';r=await send('responses',bad);assert.equal(r.status,422);
 for(const path of ['stats','responses','contacts']){r=await fetch(base+'/api/admin/'+path);assert.equal(r.status,403)}
 r=await fetch(base+'/api/admin/contacts',{method:'DELETE',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({id:p.id})});assert.equal(r.status,403);
});
