import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const handlers = {},
  storage = new Map(),
  deleted = [];
const caches = {
  open: async (name) => ({
    addAll: async (urls) => {
      storage.set(name, new Map(urls.map((url) => [url, { url, body: 'cached public shell' }])));
    },
  }),
  keys: async () => [...storage.keys(), 'unrelated-application-cache'],
  delete: async (name) => {
    deleted.push(name);
    return storage.delete(name);
  },
  match: async (url) => {
    for (const cache of storage.values()) if (cache.has(url)) return cache.get(url);
  },
};
let claimed = false;
vm.runInNewContext(await readFile('dist/sw.js', 'utf8'), {
  URL,
  caches,
  fetch: async () => {
    throw new Error('offline');
  },
  self: {
    location: { origin: 'https://nexus.example' },
    addEventListener: (name, handler) => (handlers[name] = handler),
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
    skipWaiting: () => {},
  },
});
await new Promise((resolve, reject) =>
  handlers.install({ waitUntil: (p) => p.then(resolve, reject) }),
);
await new Promise((resolve, reject) =>
  handlers.activate({ waitUntil: (p) => p.then(resolve, reject) }),
);
assert(claimed);
assert(!deleted.includes('unrelated-application-cache'));
function event(path, { method = 'GET', mode = 'cors', authorized = false } = {}) {
  let response;
  handlers.fetch({
    request: {
      url: new URL(path, 'https://nexus.example').href,
      method,
      mode,
      headers: { has: () => authorized },
    },
    respondWith: (p) => {
      response = p;
    },
  });
  return response;
}
assert.equal(event('/api/incidents'), undefined);
assert.equal(event('/api/auth/login', { method: 'POST' }), undefined);
assert.equal(event('/api/incidents', { method: 'POST' }), undefined);
assert.equal(event('/index.html', { authorized: true }), undefined);
assert.equal(event('https://tiles.example/map.png'), undefined);
const offline = await event('/admin/incidents', { mode: 'navigate' });
assert.equal(offline.url, '/index.html');
const manifest = await event('/manifest.webmanifest');
assert.equal(manifest.url, '/manifest.webmanifest');
console.log(
  'PASS: worker execution — offline navigation fallback, public asset caching, no API/POST/authenticated/external interception, unrelated caches preserved.',
);
