export const PATHS = new Map([
  ['/skill.md', ['text/markdown', 'text/plain']],
  ['/catalog.json', ['application/json']],
  ['/resources/moltbook/api-reality.json', ['application/json']],
]);

export const INCREMENT_SQL = `
  INSERT INTO request_counts
    (hour_utc, path, method, status, representation, cache_status, client_hint, requests)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT (hour_utc, path, method, status, representation, cache_status, client_hint)
  DO UPDATE SET requests = requests + 1
`;

function clientHint(request) {
  const ua = request.headers.get('User-Agent') || '';
  if (ua.startsWith('EPL-Measurement-Probe/')) return 'declared_probe';
  if (/Googlebot|bingbot|Baiduspider|DuckDuckBot|YandexBot|GPTBot|ClaudeBot|CCBot|Bytespider/i.test(ua)) {
    return 'declared_crawler';
  }
  return 'other';
}

function cacheStatus(response) {
  const status = (response.headers.get('CF-Cache-Status') || '').toUpperCase();
  return ['HIT', 'MISS', 'BYPASS', 'DYNAMIC', 'EXPIRED', 'STALE', 'UPDATING', 'REVALIDATED'].includes(status)
    ? status : 'UNKNOWN';
}

function representation(request, response, expectedTypes) {
  if (request.method === 'HEAD') return 'head_only';
  if (request.method !== 'GET') return 'other_method';
  if (response.status === 304) return 'not_modified';
  if (response.status === 206) return 'partial';
  if (response.status !== 200) return 'other_status';
  const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  return expectedTypes.includes(type) ? 'expected_type' : 'unexpected_type';
}

// Dependency injection permits local checks without contacting the production site.
export function createWorker({ fetchOrigin = (request) => fetch(request), now = () => new Date(),
  reportError = (event) => console.error(JSON.stringify(event)) } = {}) {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const expectedTypes = PATHS.get(url.pathname);
      if (url.hostname !== 'escalationpathlabs.com' || !expectedTypes) return fetchOrigin(request);

      // On a Worker Route, same-URL fetch goes to the DNS-configured origin.
      // Manual redirects preserve origin status and avoid following a CNAME redirect loop.
      const startedAt = now();
      let upstream;
      try {
        upstream = await fetchOrigin(new Request(request, { redirect: 'manual' }));
      } catch {
        reportError({ event: 'origin_fetch_failed', path: url.pathname });
        upstream = new Response('Origin unavailable', {
          status: 502, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
        });
      }

      const values = [startedAt.toISOString().slice(0, 13) + ':00:00Z', url.pathname,
        ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)
          ? request.method : 'OTHER',
        upstream.status, representation(request, upstream, expectedTypes),
        cacheStatus(upstream), clientHint(request)];

      // Runs for cached and uncached responses. No origin-only logging or sampling.
      // Logging is best effort: delivery remains available if D1 is unavailable.
      const write = Promise.resolve().then(async () => {
        const result = await env.METRICS_DB.prepare(INCREMENT_SQL).bind(...values).run();
        if (!result.success) throw new Error('Counter update did not succeed');
      }).catch(() => {
        // Do not log URLs, raw user agents, IPs, headers, or database error strings.
        // Do not retry an ambiguous increment, which could have committed already.
        reportError({ event: 'counter_write_failed', path: url.pathname, hour_utc: values[0] });
      });
      ctx.waitUntil(write);

      const response = new Response(upstream.body, upstream);
      response.headers.set('X-EPL-Meter', 'v1');
      return response;
    },
  };
}

export default createWorker();
