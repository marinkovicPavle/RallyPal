// Phone side of the free trial and the purchase (from SaunaPal).
//
// Trial: the watch sends its ID and the matches it counted; the phone hashes them and asks the trial
// service, which remembers them per watch. After a reinstall the watch gets its used matches back from
// there. With no answer the watch keeps its own count.
//
// Purchase: KiezelPay. The phone keeps an account token; KiezelPay answers either "licensed" or a payment
// code that the user enters at kzl.io/code. A purchase is never taken back here once seen.
//
// io: { get, set, readJson, writeJson, http, now }
// Storage keys:
//   licence            { licensed, used, code, checked }  read by the settings page
//   trialSeen          { dev, hashes, at }  the trial service's last answer for this watch
//   KPAY_ACCOUNTTOKEN  KiezelPay account token (the name their own library uses)
//   kpayDevice         the watch model number KiezelPay asks for
//   trialPhoneId       a random ID this phone made up for watches without their own (older than Zepp OS 4.2)

import { devHash, matchHash } from '../shared/trialhash'
import { FREE_MATCHES, TRIAL_URL, KPAY_APP_ID, KPAY_TEST } from '../shared/licence'

const KPAY_URL = 'https://api.kiezelpay.com/api/v3/status'
const KPAY_LIB = 'rallypal-1.0'
// the trial service is asked again after this long even when nothing new was counted
const TRIAL_RECHECK_MS = 12 * 3600000
// while a payment code is out, a sync checks with KiezelPay at most this often
const KPAY_RECHECK_MS = 10 * 60000
const HASH = /^[0-9a-f]{16}$/

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 3) | 8).toString(16)
  })
}

export function createLicence(io, appId) {
  const KPAY_ID = appId === undefined ? KPAY_APP_ID : appId

  function state() {
    const s = io.readJson('licence', null)
    return s && typeof s === 'object' ? s : {}
  }

  function save(patch) {
    const s = state()
    Object.keys(patch).forEach((k) => (s[k] = patch[k]))
    io.writeJson('licence', s)
    return s
  }

  // A watch older than Zepp OS 4.2 has no ID of its own: the phone makes up a random one and keeps it, so
  // two people never share a trial. It lasts as long as the Zepp app keeps this app's phone storage.
  function phoneKey(device) {
    let id = io.get('trialPhoneId')
    if (!id) {
      id = uuid()
      io.set('trialPhoneId', id)
    }
    return 'p:' + id + '|' + (Number(device) || 0)
  }

  // t: { key, ids } from the watch (key '' and the model from older watches). Resolves { ids, key } (the
  // watch's ids, plus 's:<hash>' for matches only the service knows about, and the key the hashes were made
  // with), or null when the service can't be reached.
  function trial(t) {
    if (!t) return Promise.resolve(null)
    const key = t.key ? String(t.key) : phoneKey(t.device)
    const dev = devHash(key)
    const byHash = {}
    ;(Array.isArray(t.ids) ? t.ids : []).slice(0, 10).forEach((id) => {
      const s = String(id)
      byHash[s.indexOf('s:') === 0 ? s.slice(2) : matchHash(key, s)] = s
    })
    const mine = Object.keys(byHash).filter((h) => HASH.test(h))
    const seen = io.readJson('trialSeen', null)
    const fresh =
      seen && seen.dev === dev && Array.isArray(seen.hashes) && io.now() - seen.at < TRIAL_RECHECK_MS &&
      (seen.hashes.length >= FREE_MATCHES || mine.every((h) => seen.hashes.indexOf(h) >= 0))
    const ask = fresh
      ? Promise.resolve(seen.hashes)
      : io
          .http({ url: TRIAL_URL, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dev, ids: mine }) })
          .then((r) => {
            const list = r && r.status === 200 && r.data && Array.isArray(r.data.ids) ? r.data.ids : null
            if (!list) throw new Error('trial service ' + (r && r.status))
            const hashes = list.filter((h) => typeof h === 'string' && HASH.test(h)).slice(0, FREE_MATCHES)
            io.writeJson('trialSeen', { dev, hashes, at: io.now() })
            return hashes
          })
    return ask
      .then((hashes) => {
        const ids = hashes.map((h) => byHash[h] || 's:' + h)
        const all = {}
        mine.concat(hashes).forEach((h) => (all[h] = true))
        save({ used: Math.min(FREE_MATCHES, Object.keys(all).length) })
        return t.key ? { ids } : { ids, key }
      })
      .catch(() => null)
  }

  function token() {
    let t = io.get('KPAY_ACCOUNTTOKEN')
    if (!t) {
      t = uuid()
      io.set('KPAY_ACCOUNTTOKEN', t)
    }
    return t
  }

  // Asks KiezelPay. Resolves { licensed, code } and rejects when KiezelPay can't be reached.
  function kpay() {
    if (!KPAY_ID) return Promise.reject(new Error('KiezelPay app ID not set'))
    const device = io.get('kpayDevice')
    const params = {
      appid: KPAY_ID,
      accounttoken: token(),
      platform: 'zepp',
      device,
      test: KPAY_TEST ? 'true' : 'false',
      skiptrial: 'true',
      nocache: String(io.now()),
      libv: KPAY_LIB,
      partnumber: device
    }
    const url = KPAY_URL + '?' + Object.keys(params).map((k) => k + '=' + encodeURIComponent(params[k])).join('&')
    return io.http({ url, method: 'GET' }).then((r) => {
      const d = r && r.data
      if (!r || r.status !== 200 || !d || !d.status) throw new Error('KiezelPay ' + (r && r.status))
      if (d.status === 'licensed') {
        save({ licensed: true, code: '', checked: io.now() })
        return { licensed: true, code: '' }
      }
      const code = d.paymentCode !== undefined && d.paymentCode !== null ? String(d.paymentCode) : ''
      save({ code, checked: io.now() })
      return { licensed: false, code }
    })
  }

  // LICENCE from the watch: { buy, used, device }. buy asks KiezelPay for a payment code.
  function licence(params) {
    const p = params || {}
    if (p.device) io.set('kpayDevice', String(p.device))
    const s = state()
    if (p.used !== undefined && !s.licensed) save({ used: Math.min(FREE_MATCHES, Number(p.used) || 0) })
    if (s.licensed) return Promise.resolve({ licensed: true, code: '' })
    if (!p.buy && !s.code) return Promise.resolve({ licensed: false, code: '' })
    return kpay()
  }

  // On every sync the watch says how many free matches it used and whether it is unlocked. An unlocked
  // watch unlocks the phone too: after a new phone or a reinstalled Zepp app the phone has a new
  // KiezelPay token and no record of the purchase, and a licensed watch never shows a payment code.
  function fromWatch(w) {
    const p = w || {}
    if (p.licensed === true) {
      if (!state().licensed) save({ licensed: true, code: '' })
      return
    }
    if (p.used !== undefined && !state().licensed) save({ used: Math.min(FREE_MATCHES, Number(p.used) || 0) })
  }

  // On every sync: a payment made after the unlock screen was closed (or restored at kzl.io/unlock)
  // still reaches the watch. Resolves { licensed } and never rejects.
  function onSync() {
    const s = state()
    if (s.licensed) return Promise.resolve({ licensed: true })
    if (!s.code || io.now() - (Number(s.checked) || 0) < KPAY_RECHECK_MS) return Promise.resolve({ licensed: false })
    return kpay()
      .then((r) => ({ licensed: r.licensed }))
      .catch(() => ({ licensed: false }))
  }

  function licensed() {
    return state().licensed === true
  }

  return { trial, licence, onSync, fromWatch, state, licensed }
}
