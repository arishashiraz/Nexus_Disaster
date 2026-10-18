import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
assert.equal(manifest.start_url, '/app');
for (const icon of manifest.icons) {
  await access('dist' + icon.src);
  const bytes = await readFile('dist' + icon.src);
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
  const [size] = icon.sizes.split('x').map(Number);
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}
const worker = await readFile('dist/sw.js', 'utf8');
assert(worker.includes("url.pathname.startsWith('/api/')"));
assert(worker.includes("request.method!=='GET'"));
assert(worker.includes("request.headers.has('Authorization')"));
assert(worker.includes("caches.match('/index.html')"));
const index = await readFile('dist/index.html', 'utf8');
assert(index.includes('manifest.webmanifest'));
const regions = JSON.parse(await readFile('../shared/india-regions.json', 'utf8'));
assert.equal(regions.length, 36);
assert.equal(new Set(regions.map((r) => r.code)).size, 36);
assert.equal(regions.filter((r) => r.kind === 'STATE').length, 28);
assert.equal(regions.filter((r) => r.kind === 'UNION_TERRITORY').length, 8);
console.log(
  'PASS: manifest, PNG dimensions, standalone configuration, offline shell safeguards, and 36 unique regions. Browser installability still requires a real browser check.',
);
