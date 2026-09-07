# EPL resource request measurement

Status: prepared and locally tested; **not deployed**. The experiment clock starts only after the production acceptance checks below pass. GitHub Pages remains the origin. This directory does not change the human site or the resource payloads.

The current Cloudflare browser beacon cannot measure raw Markdown/JSON fetching. This Worker adds hourly request counters to the existing three URLs using a private D1 table. No public dashboard or client callback is required.

## What is measured

- Exact path, UTC hour, HTTP method and status, response representation class, available cache-status hint, and a coarse client hint.
- The Worker runs for matching requests before origin/cache delivery, so a cache hit still causes an increment. It does not sample successful D1 writes.
- `get_200_expected_type` means the Worker obtained a 200 response with the expected media type. It does **not** prove the client received the complete body, identified an independent agent, or used the data in a task.
- HEAD, 304, partial responses, errors, and incorrect media types stay separate.
- `declared_probe` means the caller used `EPL-Measurement-Probe/…`. `declared_crawler` is a conservative user-agent pattern hint. These are self-declared, spoofable hints. `other` includes unidentified crawlers; it must not be relabeled as agents or customers.
- Query strings, raw user agents, IPs, cookies, authorization headers, and referrers are not stored by this counter. There is no unique-client or repeat-client metric.
- A failed D1 increment logs `counter_write_failed` and does not interrupt delivery. There are no application retries after ambiguous writes. Counts can understate traffic during failures, quota exhaustion, or a terminated `waitUntil` task. They are operational counters, not an exactly-once billing ledger.
- Requests that never reach the Worker (browser cache, alternate GitHub URLs, edge security blocks, or bypassing routes) cannot appear in these counters. `CF-Cache-Status` may be unavailable and is then `UNKNOWN`.

## Run local validation

Use Node 22.13 or newer (Node 24 was used during development):

```sh
cd ops/request-meter
node --test test/worker.test.mjs
```

Tests execute the production upsert and report SQL against local SQLite and simulate the origin and D1 binding. They cover all three resource paths, repeated cache hits, route exclusions, conditional/partial/error responses, client hints, database failure, origin failure, redirects, and report interpretation. Cloudflare routing, D1 availability, DNS and TLS still need production validation.

## Deployment prerequisites

1. An authenticated Cloudflare account with permission to manage this domain, Workers, and D1. No Cloudflare integration or authenticated deployment access was available during preparation.
2. An active Cloudflare zone for `escalationpathlabs.com`, with its GitHub Pages origin records proxied. Public NS lookup on 2026-09-07 still showed Porkbun nameservers.
3. Before any nameserver change, export/review the full current DNS zone and preserve all website and email records. Public DNS queries do not constitute a complete zone export. Check Porkbun forwarding requirements, retain the existing forwarding service, and verify `support@escalationpathlabs.com` after the change. Handle DNSSEC/DS records according to the actual current registrar configuration.
4. Use Full (strict) TLS to the existing HTTPS GitHub Pages origin. Do not use Flexible TLS. Keep the existing CNAME file and GitHub custom-domain setting.

The three Worker routes include a trailing wildcard to cover query strings. The code additionally checks the exact pathname, so `/catalog.json.bak` is not counted. Human-facing paths are not mapped to the Worker.

## Create and deploy

Install the supported Cloudflare Wrangler CLI and authenticate using its normal login flow. Record the Wrangler version used for the deployment. Do not put API tokens in this repository.

```sh
cd ops/request-meter
wrangler login
wrangler d1 create epl-resource-metrics
```

Copy the **actual returned database ID** into `wrangler.jsonc`, replacing `REPLACE_WITH_CREATED_DATABASE_ID`. The placeholder is intentional and is not a real database identifier. Then:

```sh
wrangler d1 execute epl-resource-metrics --remote --file=schema.sql
wrangler deploy --dry-run
wrangler deploy
```

Deploy only after the DNS/zone prerequisites are satisfied. Merging this source PR does not deploy the Worker, create a database, or change DNS.

## Production acceptance (required before starting the test)

1. Capture the three current resource bodies and a homepage checksum before cutover.
2. Fetch every resource URL using `User-Agent: EPL-Measurement-Probe/1.0`. Confirm the response status, media type, unchanged bytes, and `X-EPL-Meter: v1`.
3. Fetch each again. D1's probe counters must increase for every request, including when Cloudflare serves a cache hit. An absent cache-status header is not proof of a miss; use the dashboard/cache configuration to establish a real hit before claiming that path has been validated live.
4. Send a HEAD request and a conditional GET with the real ETag. Confirm these are reported separately from full 200 GET responses. Do not force an expected 304 if the origin chooses 200; record the actual response.
5. Confirm the homepage checksum, TLS, and email forwarding still work. The homepage should have no `X-EPL-Meter` header.
6. Query the database and inspect Worker error logs. The response header confirms routing only; it does not prove a counter write succeeded.
7. Record the first successful measurement timestamp and review the DNS TTL propagation period before treating counts as complete coverage. Preserve pre-measurement traffic as unknown, not zero.

```sh
wrangler d1 execute epl-resource-metrics --remote --file=report.sql
```

Use `get_200_expected_type` with `client_hint = 'other'` as **unclassified resource retrieval evidence**. Review declared crawler and probe rows separately. Start the 14-day test after acceptance, with no requirement for public comments or testimonials. Export results during and at the end of the test; collection errors invalidate affected intervals.

## Rollback

Remove just the three Worker routes to return those paths to the existing origin. Leave D1 intact so the measurement history survives. A rollback of authoritative DNS is a separate operation and should not be necessary for a Worker-only problem.

## Sources

- [Worker Routes and proxied origin requirements](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Background writes and waitUntil limits](https://developers.cloudflare.com/workers/runtime-apis/context/)
- [Cloudflare Web Analytics beacon](https://developers.cloudflare.com/web-analytics/about/)

## Related operational limit

The requested Moltbook review interval is 15 minutes. Work's built-in scheduler has an hourly minimum, so no replacement schedule was created. A true 15-minute review-and-response job needs an always-on agent runner with an inference provider, the Moltbook credential supplied through a secret store, durable comment-ID state, and single-run locking. A polling-only cron script would not provide the requested judgment or replies. This Worker does not implement that agent runner.
