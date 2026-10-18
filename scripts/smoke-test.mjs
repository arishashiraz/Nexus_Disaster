// Real HTTP integration checks. Creates clearly labelled fictional QA records.
import assert from 'node:assert/strict';
const base=process.env.API_URL||'http://localhost:8080/api';
let checks=0;
async function request(method,path,token,body,status=200){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;
}
const login=async role=>(await request('POST','/auth/login',null,{email:role+'@nexus.demo',password:'NexusDemo123!'})).token;
const [admin,citizen,responder,volunteer,other]=await Promise.all(['admin','citizen','responder','volunteer','volunteer2'].map(login));
await request('GET','/incidents',null,null,401);
await request('GET','/incidents','invalid.jwt.token',null,401);
await request('GET','/users',citizen,null,403);
const users=await request('GET','/users',admin);assert(users.every(u=>!('password'in u)));checks++;
const email=`qa.${Date.now()}@example.com`;
const registration=await request('POST','/auth/register',null,{name:'QA Fictional Citizen',email,password:'QaPassword123!',role:'CITIZEN'},201);
await request('POST','/auth/login',null,{email,password:'QaPassword123!'});
await request('POST','/auth/register',null,{name:'QA Admin attempt',email:'invalid@example.com',password:'QaPassword123!',role:'ADMIN'},400);
const incident=await request('POST','/incidents',citizen,{stateCode:'TN',district:'Chennai',title:'QA DEMO: Chennai flood response',type:'FLOOD',description:'Fictional automated verification scenario. Families require evacuation.',location:'Velachery, Chennai',latitude:12.9815,longitude:80.218,severity:'HIGH',affectedPeople:35,contact:'Fictional QA contact'},201);
await request('GET',`/incidents/${incident.id}`,registration.token,null,404);
await request('PATCH',`/incidents/${incident.id}/verify`,citizen,{verification:'VERIFIED',priority:'HIGH'},403);
await request('PATCH',`/incidents/${incident.id}/verify`,admin,{verification:'VERIFIED',priority:'HIGH',note:'QA: report verified'});
const person=role=>users.find(u=>u.email===role+'@nexus.demo').id;
const assignment=await request('POST','/assignments',admin,{incidentId:incident.id,assigneeId:person('responder'),task:'QA: coordinate safe evacuation'},201);
const task=await request('POST','/assignments',admin,{incidentId:incident.id,assigneeId:person('volunteer'),task:'QA: distribute relief kits'},201);
await request('PATCH',`/assignments/${task.id}/status`,other,{status:'ACCEPTED'},403);
for(const status of ['ACCEPTED','IN_PROGRESS','COMPLETED'])await request('PATCH',`/assignments/${task.id}/status`,volunteer,{status,note:'QA progress recorded'});
for(const status of ['IN_PROGRESS','RESOLVED'])await request('PATCH',`/assignments/${assignment.id}/status`,responder,{status,note:'QA rescue progress recorded'});
assert.equal((await request('GET',`/incidents/${incident.id}`,citizen)).status,'RESOLVED');checks++;
assert((await request('GET',`/incidents/${incident.id}/history`,citizen)).length>=5);checks++;
const resource=await request('POST','/resources',admin,{name:`QA water ${Date.now()}`,category:'WATER',unit:'kits',quantity:10},201);
const makeRequest=quantity=>request('POST','/resource-requests',citizen,{resourceId:resource.id,quantity,location:'QA Chennai shelter',reason:'Fictional concurrency test'},201);
const [r1,r2]=await Promise.all([makeRequest(7),makeRequest(7)]);
const outcomes=await Promise.all([r1,r2].map(r=>fetch(`${base}/resource-requests/${r.id}/review`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${admin}`},body:JSON.stringify({status:'APPROVED',note:'QA approval'})})));
assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,400]);checks++;
const inventory=await request('GET','/resources',admin);assert.equal(inventory.find(r=>r.id===resource.id).quantity,3);checks++;
const approved=outcomes[0].status===200?r1:r2;
await request('PATCH',`/resource-requests/${approved.id}/review`,admin,{status:'APPROVED'},400);
await request('POST','/alerts',admin,{title:'QA DEMO: response completed',message:'Fictional verification alert. This is not a real emergency.',severity:'LOW',location:'Chennai'},201);
assert((await request('GET','/alerts',citizen)).some(a=>a.title==='QA DEMO: response completed'));checks++;
await request('PATCH','/auth/me',registration.token,{name:'QA Fictional Citizen',phone:'QA contact',skills:'First aid',available:true});
assert.equal((await request('GET','/auth/me',registration.token)).skills,'First aid');checks++;
await request('GET','/analytics/overview',admin);await request('GET','/analytics/incidents',admin);await request('GET','/analytics/resources',admin);
console.log(`PASS: ${checks} HTTP/status/data assertions against PostgreSQL-backed API.`);
console.log(`Verified incident #${incident.id}, assignments #${assignment.id}/#${task.id}, and concurrent inventory approval. Fictional QA records are retained.`);
