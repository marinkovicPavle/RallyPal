# RallyPal trial service

Cloudflare Worker `rallypal-trial` on Pavle's account ("Pavle019@live.com's Account"), live since 2. 11. 2026:
https://rallypal-trial.svadba-media.workers.dev (KV namespace `rallypal-trial`, id ec22d1f8e57949d0823e9e58c8ab5f71,
bound as `TRIAL`). Separate from SaunaPal's `saunapal-trial` (its own KV, its own daily limits). RallyPal 1.0.0
still talks to `saunapal-trial` (with RallyPal's own hash prefixes); 2.0 and later talk to this one.

Why: RallyPal is free for 3 matches. The watch keeps the count, but reinstalling the app wipes it. Every sync
the phone sends this service the watch's ID and the matches it counted, and gets back every match that watch
has used. A reinstalled app gets its used matches back on its first sync.

- `POST /v1/trial` `{ dev, ids }` -> `{ ids }`. `dev` = SHA-256 of `rallypal-watch|<watch key>` (64 hex),
  `ids` = first 16 hex of SHA-256 of `rallypal-match|<watch key>|<match id>` (shared/trialhash.js). Hashing
  happens on the phone; the service never sees the watch ID, names or match times.
- Watch key: `u:` + getDeviceInfo().uuid (Zepp OS API 4.2+); older watches use a random ID the phone makes up.
- A watch can only add matches (at most 3 kept), never remove them. KV is written only when something new
  comes in. If the service is down the watch keeps its own count (fail open).
- Free plan limits: 100,000 requests/day, KV 1,000 writes/day (about 330 new users a day).

Files: `worker.js` (HTTP), `trial.js` (logic), `test.js` (`node .dev/tools/trial-server/test.js`).

Deploy (done through the Cloudflare API): PUT /accounts/{account}/workers/scripts/rallypal-trial as multipart with
metadata `{ main_module: 'worker.js', compatibility_date: '2026-10-01', bindings: [{ type: 'kv_namespace',
name: 'TRIAL', namespace_id: 'ec22d1f8e57949d0823e9e58c8ab5f71' }] }` and the two modules
(`application/javascript+module`), then POST .../subdomain `{ enabled: true }`.
