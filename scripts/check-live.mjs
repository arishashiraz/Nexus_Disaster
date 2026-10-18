import assert from 'node:assert/strict';
const base=process.env.API_URL||'http://localhost:8080/api';
const auth=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@nexus.demo',password:'NexusDemo123!'})});assert.equal(auth.status,200);const {token}=await auth.json();
async function get(path){const response=await fetch(base+path,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,path);return response.json();}
const regions=await get('/regions');assert.equal(regions.length,36);assert.equal(new Set(regions.map(r=>r.code)).size,36);
const results=[];
const selectedCodes=process.argv.includes('--all')?regions.map(r=>r.code):['DL','TN','MH','AS','LA','AN','LD'];
for(const code of selectedCodes){
 const feed=await get('/live/weather?stateCode='+code);assert.equal(feed.state.code,code);assert(['AVAILABLE','STALE','UNAVAILABLE'].includes(feed.status));
 if(feed.status==='AVAILABLE'){assert.equal(typeof feed.data.current.temperature_2m,'number');assert(feed.fetchedAt);assert(feed.data.current.time);}
 else if(feed.status==='UNAVAILABLE')assert.equal(feed.data,null);
 results.push({region:code,status:feed.status,source:feed.source,dataTime:feed.data?.current?.time?new Date(feed.data.current.time*1000).toISOString():null});
}
const quakes=await get('/live/earthquakes');assert(['AVAILABLE','STALE','UNAVAILABLE'].includes(quakes.status));
for(const e of quakes.events){assert(e.latitude>=6&&e.latitude<=38&&e.longitude>=68&&e.longitude<=98);assert(e.url.startsWith('https://earthquake.usgs.gov/'));}
console.log(JSON.stringify({regionDirectory:'36 valid regions',weather:results,earthquakes:{status:quakes.status,count:quakes.events.length,generatedAt:quakes.generatedAt}},null,2));
if(results.some(r=>r.status!=='AVAILABLE')||quakes.status!=='AVAILABLE'){console.log('PARTIAL: unavailable/stale providers are labelled; live availability was not verified for every sampled source.');process.exitCode=2;}
else console.log(`PASS: both live providers returned actual timestamped data; ${selectedCodes.length} weather locations checked.`);
