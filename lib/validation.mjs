import { options } from './options.mjs';
export function validatePayload(p, config) {
 const errors=[]; const a=p?.answers||{};
 const fail=(q,message)=>errors.push({question:q,message});
 const specs={Q1:['q1',1,99],Q2:['q2',1,99],Q3:['age',1,1],Q6:['q5',1,2],Q9:['q8',1,2],Q10:['q9',1,1],Q12:['q11',1,1]};
 for(const [q,[key,min,max]] of Object.entries(specs)){
  const vals=Array.isArray(a[q])?a[q]:[a[q]];
  if(vals.length<min||vals.length>max||new Set(vals).size!==vals.length||vals.some(v=>!options[key].includes(v)))fail(q,q+' 응답을 확인해주세요.');
  if(max>1&&!Array.isArray(a[q]))fail(q,'복수 선택 문항은 목록 형식이어야 합니다.');
  if(max===1&&Array.isArray(a[q]))fail(q,'단일 선택 문항입니다.');
 }
 for(const [q,source] of [['Q4','Q1'],['Q5','Q2']])if(typeof a[q]!=='string'||!Array.isArray(a[source])||!a[source].includes(a[q]))fail(q,q+'는 앞서 선택한 항목이어야 합니다.');
 for(const q of ['Q7','Q8'])if(typeof a[q]!=='string'||a[q].length>5000||(q==='Q7'&&!a[q].trim()))fail(q,q+' 내용을 입력해주세요. (최대 5,000자)');
 const applicable=a.Q10!==options.q9.at(-1);
 if(!Array.isArray(a.Q11)||new Set(a.Q11).size!==a.Q11.length||a.Q11.some(v=>!options.q10.includes(v))||(applicable&&!a.Q11.length)||(!applicable&&a.Q11.length))fail('Q11','Q11 조건부 응답을 확인해주세요.');
 const other={};
 for(const q of ['Q1','Q2','Q6','Q9','Q11']){
  const value=p?.other?.[q];
  if(a[q]?.includes?.('기타')){if(typeof value!=='string'||!value.trim()||value.length>500)fail(q,q+' 기타 내용을 입력해주세요. (최대 500자)');else other[q]=value.trim();}
 }
 const experienced=options.q11.slice(0,2).includes(a.Q12);
 if(typeof p.interview!=='string'||(p.interview&&!options.interview.includes(p.interview))||(!experienced&&p.interview))fail('interview','인터뷰 의향 응답을 확인해주세요.');
 if(typeof p.prize!=='boolean')fail('prize','추첨 참여 여부를 확인해주세요.');
 if(p.prize){
  if(!config.prizeEnabled)fail('prize','경품 개인정보 안내가 확정되지 않아 현재 추첨 신청을 받지 않습니다.');
  if(p.contact?.consent!==true||p.contact?.version!==config.consentVersion)fail('prize','최신 개인정보 안내를 확인하고 동의해주세요.');
  if(typeof p.contact?.phone!=='string'||!/^01[0-9]{8,9}$/.test(p.contact.phone))fail('prize','올바른 휴대전화번호를 입력해주세요.');
 }
 if(!/^[a-f0-9-]{36}$/i.test(p.id||'')||!/^[-a-zA-Z0-9]{36,80}$/.test(p.receipt||''))fail('form','제출 식별자가 올바르지 않습니다.');
 return {errors, answers:Object.fromEntries([...Array(12)].map((_,i)=>['Q'+(i+1),a['Q'+(i+1)]])), other, applicable, experienced};
}
export function csv(rows){const escape=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,m=>"'"+m).replaceAll('"','""')+'"';return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n');}
