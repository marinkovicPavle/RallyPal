// Watch side of the trial and the full version (from SaunaPal): which matches were counted, and what the
// phone says about the purchase. The phone asks KiezelPay; the watch keeps the last answer, so it works
// offline. Every sync also sends the watch's ID and counted matches; the phone checks them with the trial
// service, so a reinstalled app gets its used matches back.

import { getDeviceInfo } from '@zos/device'
import { loadMeta, saveMeta } from './data'
import { trialOf, counts, FREE_MATCHES } from '../shared/licence'
import { matchHash } from '../shared/trialhash'

export function trial() {
  return trialOf(loadMeta())
}

// A finished match that counts toward the free ones (5 minutes or longer). The same match saved again
// (UNDO on the summary, then the match goes on) keeps its one place.
export function countMatch(rec) {
  const m = loadMeta()
  if (m.licensed || !counts(rec)) return
  const ids = Array.isArray(m.trialIds) ? m.trialIds.slice() : []
  if (ids.indexOf(rec.id) >= 0 || ids.length >= FREE_MATCHES) return
  ids.push(rec.id)
  saveMeta({ trialIds: ids })
}

// True when this match took a free place; last: it took the last one
export function wasCounted(id) {
  const m = loadMeta()
  const ids = trialIds(m)
  return { counted: !m.licensed && ids.indexOf(id) >= 0, last: !m.licensed && ids.length >= FREE_MATCHES && ids[ids.length - 1] === id }
}

// What identifies this watch for the trial: its unique ID (Zepp OS 4.2 and newer). Older watches have
// none; for them the phone makes up a random ID of its own (see app-side/licence.js). The phone hashes
// it before it leaves the phone.
export function deviceKey() {
  try {
    const d = getDeviceInfo()
    return d.uuid ? 'u:' + d.uuid : ''
  } catch (e) {
    return ''
  }
}

function deviceModel() {
  try {
    return getDeviceInfo().deviceSource || 0
  } catch (e) {
    return 0
  }
}

function trialIds(m) {
  return Array.isArray(m.trialIds) ? m.trialIds : []
}

// What a sync sends about the trial, or null once the app is unlocked. Without a key, the model goes
// along, so two older watches on one phone don't share their free matches.
export function trialParams() {
  const m = loadMeta()
  if (m.licensed) return null
  const key = deviceKey()
  if (key) return { key, ids: trialIds(m) }
  return { key: '', device: deviceModel(), ids: trialIds(m) }
}

// What every sync tells the phone: unlocked, or how many free matches were used
export function licenceParams() {
  const m = loadMeta()
  return m.licensed ? { licensed: true } : { used: trial().used }
}

// The same match can come back as its own id or as 's:<hash>' (an answer to an older request)
function hashOf(key, id) {
  if (id.indexOf('s:') === 0) return id.slice(2)
  return key ? matchHash(key, id) : id
}

// Takes the phone's answer to a sync: matches this watch used before a reinstall, and a purchase made
// while the unlock screen was closed. Returns true when the trial changed.
export function applyTrial(res) {
  const m = loadMeta()
  if (m.licensed) return false
  if (res && res.licence && res.licence.licensed) {
    saveMeta({ licensed: true })
    return true
  }
  const got = res && res.trial && Array.isArray(res.trial.ids) ? res.trial.ids : []
  const ids = trialIds(m).slice()
  // the key the phone used: the watch's own, or the one the phone made up for an older watch
  const key = got.length ? deviceKey() || (res.trial.key ? String(res.trial.key) : '') : ''
  const known = {}
  ids.forEach((id) => (known[hashOf(key, String(id))] = true))
  got.forEach((id) => {
    if (typeof id !== 'string' || ids.length >= FREE_MATCHES) return
    const h = hashOf(key, id)
    if (known[h]) return
    known[h] = true
    ids.push(id)
  })
  if (ids.length === trialIds(m).length) return false
  saveMeta({ trialIds: ids })
  return true
}

// Asks the phone for the licence; with buy, also for a payment code. Resolves { ok, phone, licensed, code }
// and never rejects. The answer is kept on the watch.
export function askPhone(page, buy) {
  const params = { buy: !!buy, used: trial().used, device: deviceModel() }
  // a request that throws at once (no phone) counts as no answer
  return new Promise((resolve) => resolve(page.request({ method: 'LICENCE', params }, { timeout: 30000 })))
    .then((res) => {
      // the phone answered, but couldn't reach KiezelPay
      if (res && res.error) return { ok: false, phone: true, licensed: !!loadMeta().licensed, code: loadMeta().payCode || '' }
      // an unlocked watch stays unlocked (a new phone doesn't know the purchase until the next sync)
      const licensed = !!(res && res.licensed) || !!loadMeta().licensed
      const patch = { licensed }
      if (res && res.code) patch.payCode = String(res.code)
      saveMeta(patch)
      return { ok: true, licensed, code: (res && res.code) || loadMeta().payCode || '' }
    })
    .catch(() => ({ ok: false, licensed: !!loadMeta().licensed, code: loadMeta().payCode || '' }))
}
