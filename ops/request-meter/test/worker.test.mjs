import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createWorker, PATHS } from '../src/worker.mjs';

function harness(fetchOrigin, brokenDatabase = false) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const errors = [], pending = [], originRequests = [];
  const worker = createWorker({
    fetchOrigin: async (request) => { originRequests.push(request); return fetchOrigin(request); },
    now: () => new Date('2026-09-07T13:37:12Z'),
    reportError: (event) => errors.push(event),
  });
  const env = { METRICS_DB: { prepare(sql) { return { bind(...values) { return { async run() {
    if (brokenDatabase) throw new Error('private-database-error');
    db.prepare(sql).run(...values); return { success: true };
  } }; } }; } } };
  return { db, errors, originRequests,
    async request(path, options) {
      const result = await worker.fetch(new Request('https://escalationpathlabs.com' + path, options),
        env, { waitUntil: (promise) => pending.push(promise) });
      await Promise.all(pending.splice(0));
      return result;
    },
    rows: () => db.prepare('SELECT * FROM request_counts').all(),
  };
}

test('all three paths preserve the resource body and headers', async () => {
  for (const [path, types] of PATHS) {
    const body = path.endsWith('.json') ? '{"fact":"test"}' : '# Skill\n';
    const h = harness(async () => new Response(body, { headers: {
      'Content-Type': types[0] + '; charset=utf-8', 'ETag': '"fixture"', 'Cache-Control': 'max-age=300',
    } }));
    const response = await h.request(path);
    assert.equal(await response.text(), body);
    assert.equal(response.headers.get('ETag'), '"fixture"');
    assert.equal(response.headers.get('Cache-Control'), 'max-age=300');
    assert.equal(response.headers.get('X-EPL-Meter'), 'v1');
    assert.equal(h.rows()[0].representation, 'expected_type');
    assert.equal(h.rows()[0].requests, 1);
    h.db.close();
  }
});

test('every cache HIT is counted and query strings do not create extra buckets', async () => {
  const h = harness(async () => new Response('{}', { headers: {
    'Content-Type': 'application/json', 'CF-Cache-Status': 'HIT',
  } }));
  for (let i = 0; i < 25; i++) await h.request('/catalog.json?arbitrary=' + i);
  assert.equal(h.rows().length, 1);
  assert.equal(h.rows()[0].requests, 25);
  assert.equal(h.rows()[0].cache_status, 'HIT');
  h.db.close();
});

test('homepage and near-match paths bypass the counter', async () => {
  const h = harness(async () => new Response('unchanged'));
  for (const path of ['/', '/catalog.json.bak', '/resources/moltbook/other.json']) {
    const r = await h.request(path);
    assert.equal(await r.text(), 'unchanged');
    assert.equal(r.headers.get('X-EPL-Meter'), null);
  }
  assert.equal(h.rows().length, 0); h.db.close();
});

test('HEAD, 304, 206, wrong content type, and errors cannot inflate full GET metrics', async () => {
  for (const [method, status, type, expected] of [
    ['HEAD', 200, 'application/json', 'head_only'],
    ['GET', 304, 'application/json', 'not_modified'],
    ['GET', 206, 'application/json', 'partial'],
    ['GET', 200, 'text/html', 'unexpected_type'],
    ['GET', 404, 'text/html', 'other_status'],
  ]) {
    const h = harness(async () => new Response(status === 304 || method === 'HEAD' ? null : 'body',
      { status, headers: { 'Content-Type': type } }));
    const response = await h.request('/catalog.json', { method });
    assert.equal(response.status, status);
    assert.equal(h.rows()[0].representation, expected);
    h.db.close();
  }
});

test('probe and crawler hints are separate, and raw request metadata is not stored', async () => {
  const h = harness(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
  for (const ua of ['EPL-Measurement-Probe/1.0', 'Googlebot/2.1', 'python-requests/2.0']) {
    await h.request('/catalog.json?secret=never-log-me', { headers: {
      'User-Agent': ua, 'Authorization': 'Bearer never-log-me', 'CF-Connecting-IP': '192.0.2.1',
    } });
  }
  assert.deepEqual(h.rows().map(r => r.client_hint).sort(), ['declared_crawler', 'declared_probe', 'other']);
  assert.equal(JSON.stringify(h.rows()).includes('never-log-me'), false);
  assert.equal(JSON.stringify(h.rows()).includes('192.0.2.1'), false);
  h.db.close();
});

test('counter failure preserves delivery and emits only a bounded error event', async () => {
  const h = harness(async () => new Response('still available'), true);
  assert.equal(await (await h.request('/catalog.json?private=value')).text(), 'still available');
  assert.equal(h.rows().length, 0);
  assert.deepEqual(h.errors, [{ event: 'counter_write_failed', path: '/catalog.json', hour_utc: '2026-09-07T13:00:00Z' }]);
  h.db.close();
});

test('origin failure is counted as 502; redirects remain redirects', async () => {
  const h = harness(async () => { throw new Error('private-network-error'); });
  assert.equal((await h.request('/catalog.json')).status, 502);
  assert.equal(h.rows()[0].status, 502); h.db.close();
  const redirects = harness(async request => {
    assert.equal(request.redirect, 'manual');
    return new Response(null, { status: 301, headers: { Location: '/catalog.json' } });
  });
  assert.equal((await redirects.request('/catalog.json')).status, 301);
  assert.equal(redirects.rows()[0].status, 301); redirects.db.close();
});

test('report totals separate probes and non-delivery responses', async () => {
  const h = harness(async r => new Response(r.method === 'HEAD' ? null : '{}', {
    headers: { 'Content-Type': 'application/json' },
  }));
  await h.request('/catalog.json');
  await h.request('/catalog.json', { method: 'HEAD' });
  await h.request('/catalog.json', { headers: { 'User-Agent': 'EPL-Measurement-Probe/1.0' } });
  // Use the report's SQL with a fixed clock so this assertion remains deterministic.
  const report = readFileSync(new URL('../report.sql', import.meta.url), 'utf8')
    .replace("'now', '-14 days'", "'2026-09-07', '-14 days'");
  const rows = h.db.prepare(report).all();
  const external = rows.find(r => r.client_hint === 'other');
  assert.equal(external.all_requests, 2);
  assert.equal(external.get_200_expected_type, 1);
  assert.equal(external.head_requests, 1);
  assert.equal(rows.find(r => r.client_hint === 'declared_probe').get_200_expected_type, 1);
  h.db.close();
});
