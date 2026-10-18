import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = path.resolve('dist');
async function files(dir) {
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...(await files(full)));
    else if (item.name !== 'sw.js') out.push(full);
  }
  return out;
}
const assets = await files(root);
const urls = assets.map((f) => '/' + path.relative(root, f).replaceAll('\\', '/'));
const hash = createHash('sha256');
for (const file of assets.sort()) hash.update(await readFile(file));
const version = hash.digest('hex').slice(0, 12);
const script = `const CACHE='nexus-shell-${version}';
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nexus-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||request.headers.has('Authorization'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>response.ok?response:caches.match('/index.html')).catch(()=>caches.match('/index.html')));return;
 }
 if(ASSETS.includes(url.pathname))event.respondWith(caches.match(url.pathname).then(cached=>cached||fetch(request)));
});
`;
await writeFile(path.join(root, 'sw.js'), script);
console.log(`PWA shell ${version}: ${urls.length} public files; no API/offline mutation caching.`);
