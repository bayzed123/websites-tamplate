import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('demo documentation declares the non-production boundary', async () => {
  const readme = await read('README.md');
  assert.match(readme, /non-production/i);
  assert.match(readme, /fictional products, customers, orders/i);
  assert.match(readme, /must not be connected to the delivered Rinova repository/i);
});

test('demo seed uses Veloura records and fresh asset URLs', async () => {
  const schema = await read('worker/schema.sql');
  const seed = await read('worker/migrations/0014-veloura-demo-seed.sql');
  assert.match(schema, /Lumen Dew Barrier Serum/);
  assert.match(schema, /manus-storage\/veloura-lumen-serum/);
  assert.match(seed, /VA-DEMO-1001/);
  assert.match(seed, /example\.test/);
});

test('demo migrations do not fabricate reviews or ratings', async () => {
  const migrations = await Promise.all([
    read('worker/migrations/0003-user-product-catalog.sql'),
    read('worker/migrations/0014-veloura-demo-seed.sql'),
  ]);
  assert.ok(migrations.every((content) => !/INSERT\s+(OR\s+IGNORE\s+)?INTO\s+reviews/i.test(content)));
  assert.ok(!migrations.some((content) => /,\s*4\.[0-9],|,\s*5\.[0-9],/.test(content)));
});

test('demo worker does not allow the completed client origins', async () => {
  const worker = await read('worker/src/index.ts');
  assert.doesNotMatch(worker, /rinovabd|velourabd|bayzed123\.github\.io/i);
  assert.match(worker, /veloura-atelier-demo/);
});
