// node test.js
import assert from 'node:assert/strict'
import { handleTrial } from './trial.js'
import worker from './worker.js'

function memoryKv() {
  const data = new Map()
  let writes = 0
  return {
    data,
    writes: () => writes,
    async get(key, type) {
      const v = data.has(key) ? data.get(key) : null
      return v !== null && type === 'json' ? JSON.parse(v) : v
    },
    async put(key, value) {
      writes++
      data.set(key, value)
    }
  }
}

const dev = 'a'.repeat(64)
const h = (n) => String(n).repeat(16).slice(0, 16)

const kv = memoryKv()
let r = await handleTrial(kv, { dev, ids: [] })
assert.deepEqual(r, { status: 200, data: { ids: [] } })
assert.equal(kv.writes(), 0)
r = await handleTrial(kv, { dev, ids: [h(1)] })
assert.deepEqual(r.data.ids, [h(1)])
// the same match again changes nothing and writes nothing
r = await handleTrial(kv, { dev, ids: [h(1)] })
assert.equal(kv.writes(), 1)
// a reinstalled app sends nothing and still gets its matches back
r = await handleTrial(kv, { dev, ids: [] })
assert.deepEqual(r.data.ids, [h(1)])
// at most 3 are kept; leaving a match out never removes it
r = await handleTrial(kv, { dev, ids: [h(2), h(3), h(4)] })
assert.deepEqual(r.data.ids, [h(1), h(2), h(3)])
r = await handleTrial(kv, { dev, ids: [h(5)] })
assert.deepEqual(r.data.ids, [h(1), h(2), h(3)])
assert.equal(kv.writes(), 2)
// another watch has its own count
r = await handleTrial(kv, { dev: 'b'.repeat(64), ids: [] })
assert.deepEqual(r.data.ids, [])
// bad input
assert.equal((await handleTrial(kv, { dev: 'x', ids: [] })).status, 400)
assert.equal((await handleTrial(kv, { dev, ids: ['nothex'] })).status, 400)
assert.equal((await handleTrial(kv, { dev, ids: Array(11).fill(h(1)) })).status, 400)
assert.equal((await handleTrial(kv, null)).status, 400)

// through the Worker
const env = { TRIAL: memoryKv() }
const post = (body) => worker.fetch(new Request('https://x.dev/v1/trial', { method: 'POST', body }), env)
let res = await post(JSON.stringify({ dev, ids: [h(7)] }))
assert.equal(res.status, 200)
assert.deepEqual(await res.json(), { ids: [h(7)] })
assert.equal((await post('{')).status, 400)
assert.equal((await post('x'.repeat(3000))).status, 413)
assert.equal((await worker.fetch(new Request('https://x.dev/v1/trial'), env)).status, 405)
assert.equal((await worker.fetch(new Request('https://x.dev/nope'), env)).status, 404)
assert.equal((await worker.fetch(new Request('https://x.dev/'), env)).status, 200)
const broken = { TRIAL: { get: async () => { throw new Error('down') } } }
assert.equal((await worker.fetch(new Request('https://x.dev/v1/trial', { method: 'POST', body: JSON.stringify({ dev, ids: [] }) }), broken)).status, 503)
console.log('trial service tests passed')
