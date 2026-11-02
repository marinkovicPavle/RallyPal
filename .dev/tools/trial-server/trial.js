// The trial counter itself, without any Cloudflare API so it can be tested with node.
//
// kv: { get(key, 'json'), put(key, text) } (a Workers KV namespace)
// body: { dev: 64 hex characters, ids: [16 hex characters, ...] }
//   dev is the watch's ID hashed on the phone; ids are short hashes of the matches the watch counted.
// Answers { status, data } with data { ids }: every match counted on this watch so far, at most 3.
// A watch can only add matches, never take them back, so reinstalling the app doesn't reset the trial.

export const FREE_MATCHES = 3
const DEV = /^[0-9a-f]{64}$/
const ID = /^[0-9a-f]{16}$/
const MAX_SENT = 10

export async function handleTrial(kv, body) {
  const b = body && typeof body === 'object' ? body : {}
  const dev = typeof b.dev === 'string' ? b.dev : ''
  if (!DEV.test(dev)) return { status: 400, data: { error: 'dev must be 64 hex characters' } }
  const sent = Array.isArray(b.ids) ? b.ids : []
  if (sent.length > MAX_SENT || sent.some((x) => typeof x !== 'string' || !ID.test(x))) {
    return { status: 400, data: { error: 'ids must be up to 10 hashes of 16 hex characters' } }
  }
  const key = 't:' + dev
  const cur = await kv.get(key, 'json')
  const ids = cur && Array.isArray(cur.ids) ? cur.ids.filter((x) => ID.test(x)).slice(0, FREE_MATCHES) : []
  let changed = false
  sent.forEach((h) => {
    if (ids.length < FREE_MATCHES && ids.indexOf(h) < 0) {
      ids.push(h)
      changed = true
    }
  })
  // written only when something new came in (KV allows far fewer writes than reads)
  if (changed) await kv.put(key, JSON.stringify({ ids }))
  return { status: 200, data: { ids } }
}
