// RallyPal trial service (Cloudflare Worker "rallypal-trial", KV binding TRIAL).
// RallyPal is free for 3 matches. The count lives on the watch, but reinstalling the app wipes it, so
// the phone also tells this service which matches a watch has used and gets the full list back.
// It only ever sees hashes: no names, no accounts, no match times.
//
// POST /v1/trial  { dev, ids }  ->  { ids }      (see trial.js)
// GET  /                        ->  a one-line description

import { handleTrial } from './trial.js'

const MAX_BODY = 2000

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('RallyPal trial service\n', { headers: { 'content-type': 'text/plain' } })
    }
    if (url.pathname !== '/v1/trial') return json({ error: 'not found' }, 404)
    if (request.method !== 'POST') return json({ error: 'use POST' }, 405)
    const raw = await request.text()
    if (raw.length > MAX_BODY) return json({ error: 'too large' }, 413)
    let body = null
    try {
      body = JSON.parse(raw)
    } catch (e) {
      return json({ error: 'not JSON' }, 400)
    }
    try {
      const r = await handleTrial(env.TRIAL, body)
      return json(r.data, r.status)
    } catch (e) {
      return json({ error: 'storage unavailable' }, 503)
    }
  }
}
