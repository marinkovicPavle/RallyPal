// Phone side of RallyPal, without any Zepp API so it can be tested with node.
//
// storage: { getItem(key), setItem(key, value) } (the Zepp settings storage, shared with the settings page)
//
// Storage keys:
//   settings   { values, stamps }  watch settings, newer change wins per key (setups are made here)
//   history    [record]            the phone copy of every match, newest first; the newest ones keep
//                                  their heart rate curve
//   lastSync   time of the last sync, shown on the settings page
//   watchLang  the watch's own language, for Automatic on the phone page
//   phoneEdits [{ id, op: 'names' | 'delete', names?, at }] changes made to the history on the phone page;
//              sent with every sync (applying them twice changes nothing) and dropped after EDITS_KEPT_MS
//   outbox     [{ id, at, tries }] matches still to be sent to Strava and Intervals.icu (or sent again)
//   status     { strava: { ok, key, vars, at, busy? }, intervals: { … } } the line under each service on the
//              settings page; key and vars are a phone text (setting/text.js), so it shows in the page's language
//   stravaClientId, stravaClientSecret, stravaAuth (JSON tokens), stravaCode, stravaSend ('false' = off)
//   intervalsKey, intervalsAthlete
//   sentGone   { id: { sync, at } } what was sent of a match the watch deleted (UNDO on the summary), so the
//              same match coming back updates its Strava and Intervals.icu activities instead of adding new ones
//   licence, trialSeen, KPAY_ACCOUNTTOKEN, kpayDevice, trialPhoneId  the free trial and the purchase (licence.js)
// A match's rec.sync keeps what was sent: stravaId, stravaUpload (still processing), stravaSig,
// intervalsId, intervalsSig.
//
// net: { http(req) -> Promise<{ status, data }>, wait(ms) -> Promise }, the Zepp fetch (app-side/index.js)

import { merge, normalize } from '../shared/settings'
import { setLang, LANGS } from '../shared/i18n'
import { SPORT_TYPE, FALLBACK_TYPE, title, description, tcx, multipart, localIso, seconds, externalId, sameMatch,
  duplicateOf, signature } from '../shared/integrations'
import { prettyScore } from '../shared/format'
import { sportName } from '../shared/setups'
import { base64Encode } from './base64'
import { createLicence } from './licence'
import { counts } from '../shared/licence'

export const PHONE_HISTORY_MAX = 1000
// heart rate curves (for the chart of a match) stay on the newest matches only
const PHONE_CURVES_KEPT = 200
const RESTORE_PAGE = 20
const EDITS_KEPT_MS = 60 * 86400000
// matches waiting for Strava and Intervals.icu; tiny entries, so plenty of room (none dropped in practice)
const OUTBOX_MAX = 500
// a match that failed this many times waits for Retry now, so it can't hold up newer ones (ROAST item 9)
const AUTO_TRIES = 5
const GONE_KEPT_MS = 14 * 86400000
const GONE_MAX = 50

const STRAVA = 'https://www.strava.com/api/v3'
const STRAVA_TOKEN = 'https://www.strava.com/oauth/token'
const INTERVALS = 'https://intervals.icu/api/v1'
// how long a Strava upload is waited for before the next try picks it up
const UPLOAD_POLLS = 6
const UPLOAD_POLL_MS = 2500

export function createCore(storage, clock, net) {
  const now = () => (clock ? clock() : Date.now())
  const http = (net && net.http) || (() => Promise.reject(keyError('no network', 'err.offline', { what: '' })))
  const wait = (net && net.wait) || (() => Promise.resolve())

  function get(key) {
    const v = storage.getItem(key)
    return v === undefined || v === null ? '' : String(v).trim()
  }

  function readJson(key, fallback) {
    try {
      const raw = storage.getItem(key)
      if (raw === undefined || raw === null || raw === '') return fallback
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch (e) {
      return fallback
    }
  }

  function writeJson(key, value) {
    storage.setItem(key, JSON.stringify(value))
  }

  const lic = createLicence(
    { get, set: (k, v) => storage.setItem(k, v), readJson, writeJson, http: (req) => http(req), now },
    net && net.kpayAppId
  )

  function history() {
    const h = readJson('history', [])
    return Array.isArray(h) ? h : []
  }

  function saveHistory(list) {
    list.sort((a, b) => b.start - a.start)
    const out = list.slice(0, PHONE_HISTORY_MAX)
    out.forEach((x, i) => {
      if (i >= PHONE_CURVES_KEPT && x.curve) delete x.curve
    })
    writeJson('history', out)
  }

  function edits() {
    const e = readJson('phoneEdits', [])
    return Array.isArray(e) ? e.filter((x) => x && x.id && now() - (Number(x.at) || 0) < EDITS_KEPT_MS) : []
  }

  // What was sent of matches the watch deleted, for a while
  function gone() {
    const g = readJson('sentGone', {})
    return g && typeof g === 'object' && !Array.isArray(g) ? g : {}
  }

  function keepGone(rec) {
    const s = rec && rec.sync
    if (!s || !(s.stravaId || s.intervalsId || s.stravaUpload)) return
    const g = gone()
    g[rec.id] = { sync: s, at: now() }
    const ids = Object.keys(g).filter((id) => now() - (Number(g[id].at) || 0) < GONE_KEPT_MS)
    ids.sort((a, b) => g[b].at - g[a].at)
    const out = {}
    ids.slice(0, GONE_MAX).forEach((id) => (out[id] = g[id]))
    writeJson('sentGone', out)
  }

  function applyItem(item, phoneEdits) {
    const list = history()
    const prev = list.filter((x) => x.id === item.id)[0] || (gone()[item.id] ? { sync: gone()[item.id].sync } : null)
    const mine = phoneEdits.filter((e) => e.id === item.id)
    // a match deleted on the phone stays deleted; names changed on the phone win over the watch's
    if (item.op === 'upsert' && mine.some((e) => e.op === 'delete')) return { id: item.id, op: 'upsert', sync: null }
    if (item.op === 'upsert' && item.rec) {
      const rec = item.rec
      mine.filter((e) => e.op === 'names').forEach((e) => (rec.names = { ...(rec.names || {}), ...e.names }))
      rec.sync = keepSent(prev && prev.sync, rec.sync)
      // the watch keeps curves on its newest matches only; the phone keeps the one it has
      if (prev && prev.curve && !rec.curve) rec.curve = prev.curve
      saveHistory(list.filter((x) => x.id !== item.id).concat([rec]))
      // only the full version sends, and only a match of 5 minutes or more (ROAST item 13)
      if (services().any && lic.licensed() && counts(rec)) queue(rec.id)
      return { id: item.id, op: 'upsert', sync: rec.sync }
    }
    if (item.op === 'delete') {
      keepGone(list.filter((x) => x.id === item.id)[0])
      saveHistory(list.filter((x) => x.id !== item.id))
    }
    return { id: item.id, op: item.op, sync: null }
  }

  // What the phone sent is the phone's to know: a watch copy without the Strava or Intervals.icu id (or
  // with an older one) doesn't take it away
  function keepSent(phone, watch) {
    const out = { ...(phone || {}), ...(watch || {}) }
    ;['stravaId', 'stravaUpload', 'stravaSig', 'intervalsId', 'intervalsSig'].forEach((k) => {
      if (phone && phone[k]) out[k] = phone[k]
    })
    return out
  }

  // The watch sends its settings and up to a few queued matches (upserts and deletes); the answer has
  // the merged settings (setups made on the phone reach the watch this way) and what was done. Strava and
  // Intervals.icu come after the answer (sendOutbox), so a slow upload never holds up the watch.
  // The trial goes along: the matches the watch counted ({ key, ids }), how many it used and whether it
  // is unlocked; the answer has what the trial service and KiezelPay say, and how many matches the phone
  // keeps (a watch with fewer asks for the rest, utils/sync.js).
  function sync(params) {
    const p = params || {}
    const phone = readJson('settings', null)
    const m = merge(p.settings, phone)
    if (m.phoneChanged || !phone) writeJson('settings', m.merged)
    lic.fromWatch({ licensed: p.licensed, used: p.used })
    const items = Array.isArray(p.items) ? p.items : []
    const pending = edits()
    const done = items.filter((x) => x && x.id).map((x) => applyItem(x, pending))
    if (p.lang) storage.setItem('watchLang', String(p.lang))
    writeJson('phoneEdits', pending)
    storage.setItem('lastSync', String(now()))
    return Promise.all([lic.trial(p.trial), lic.onSync()]).then(([trial, licence]) => ({
      settings: m.merged, done, edits: pending, total: history().length, trial, licence
    }))
  }

  // A new or reset watch asks for its history back, a page at a time (without the curves)
  function restore(params) {
    const page = Math.max(0, Number((params && params.page) || 0))
    const list = history()
    const from = page * RESTORE_PAGE
    const slice = list.slice(from, from + RESTORE_PAGE).map((x) => {
      const c = { ...x }
      delete c.curve
      return c
    })
    return Promise.resolve({ list: slice, more: from + RESTORE_PAGE < list.length, total: list.length })
  }

  // Settings edited on the phone: stamped so the newer change wins on the next sync
  function setSetting(key, value) {
    const cur = normalize(readJson('settings', null))
    cur.values[key] = value
    cur.stamps[key] = now()
    writeJson('settings', normalize(cur))
  }

  // ---- status lines on the settings page ---------------------------------------------------------

  function setStatus(service, ok, key, vars) {
    const s = readJson('status', {}) || {}
    s[service] = { ok, key, vars: vars || {}, at: now() }
    writeJson('status', s)
  }

  function setError(service, e) {
    const x = errorStatus(e, service)
    setStatus(service, false, x.key, x.vars)
  }

  // Titles and descriptions in the app's language: the Language setting, or on Automatic the watch's
  function applyLanguage() {
    const chosen = normalize(readJson('settings', null)).values.lang
    const watch = get('watchLang')
    setLang(LANGS[chosen] ? chosen : LANGS[watch] ? watch : 'en')
  }

  function what(rec) {
    return [sportName(rec.sport), prettyScore(rec.score)].filter(Boolean).join(' ')
  }

  function services() {
    const s = { strava: stravaOn(), intervals: !!intervalsConfig() }
    s.any = s.strava || s.intervals
    return s
  }

  // ---- Intervals.icu ------------------------------------------------------------------------------

  function intervalsConfig() {
    const key = get('intervalsKey')
    const athlete = get('intervalsAthlete')
    return key && athlete ? { key, athlete } : null
  }

  function intervals(cfg, path, method, body, type) {
    return http({
      url: INTERVALS + path,
      method,
      headers: { Authorization: 'Basic ' + base64Encode('API_KEY:' + cfg.key), 'Content-Type': type || 'application/json' },
      body: body === undefined ? undefined : type ? body : JSON.stringify(body)
    }).then((r) => {
      if (r.status < 200 || r.status >= 300) throw httpError('Intervals.icu', r.status)
      return r.data
    }, netError('Intervals.icu'))
  }

  function intervalsCheck() {
    applyLanguage()
    const cfg = intervalsConfig()
    if (!cfg) {
      setStatus('intervals', false, 'conn.ivlNeed')
      return Promise.resolve(false)
    }
    return intervals(cfg, `/athlete/${encodeURIComponent(cfg.athlete)}`, 'GET')
      .then((a) => {
        const name = (a && (a.firstname || String(a.name || '').split(' ')[0])) || ''
        setStatus('intervals', true, name ? 'conn.connectedAs' : 'conn.connected', { name })
        return true
      })
      .catch((e) => {
        setError('intervals', e)
        return false
      })
  }

  // The match as an Intervals.icu activity with its heart rate (a TCX file), or as a manual one when it
  // has no heart rate; the real sport type, the title and the description go on after
  function sendIntervals(rec) {
    const cfg = intervalsConfig()
    const name = title(rec)
    const desc = description(rec)
    const type = SPORT_TYPE[rec.sport] || FALLBACK_TYPE
    const sig = signature([name, desc, type])
    const sync = rec.sync || {}
    const update = (id) => intervals(cfg, `/activity/${encodeURIComponent(id)}`, 'PUT', { type, name, description: desc })
      .catch((e) => (e.status === 400 || e.status === 422 ? intervals(cfg, `/activity/${encodeURIComponent(id)}`, 'PUT', { type: FALLBACK_TYPE, name, description: desc }) : Promise.reject(e)))
      .then(() => ({ intervalsId: id, intervalsSig: sig }))
    if (sync.intervalsId) return sync.intervalsSig === sig ? Promise.resolve({}) : update(sync.intervalsId)
    const athlete = `/athlete/${encodeURIComponent(cfg.athlete)}`
    const file = tcx(rec)
    let made
    if (file) {
      const boundary = 'RallyPal' + rec.id.replace(/\W/g, '')
      const query = `?name=${encodeURIComponent(name)}&external_id=${encodeURIComponent(externalId(rec))}`
      made = intervals(cfg, `${athlete}/activities${query}`, 'POST', multipart(boundary, [], { name: externalId(rec) + '.tcx', data: file }),
        'multipart/form-data; boundary=' + boundary)
    } else {
      made = intervals(cfg, `${athlete}/activities/manual`, 'POST', {
        start_date_local: localIso(rec.start), type, name, description: desc, elapsed_time: seconds(rec), moving_time: seconds(rec),
        external_id: externalId(rec)
      })
    }
    return made.then((r) => {
      const id = r && (r.id || (r.activities && r.activities[0] && r.activities[0].id))
      if (!id) throw keyError('Intervals.icu did not return the activity', 'err.noActivity', { what: 'Intervals.icu' })
      // kept at once: if the next step fails, the next try updates this activity instead of adding another
      storeSync(rec.id, { intervalsId: String(id) })
      return update(id)
    })
  }

  // ---- Strava -------------------------------------------------------------------------------------

  function stravaApp() {
    const id = get('stravaClientId')
    const secret = get('stravaClientSecret')
    return id && secret ? { id, secret } : null
  }

  function stravaConnected() {
    const auth = readJson('stravaAuth', null)
    return !!(stravaApp() && ((auth && (auth.access_token || auth.refresh_token)) || get('stravaCode')))
  }

  function stravaOn() {
    return stravaConnected() && get('stravaSend') !== 'false'
  }

  function tokenRequest(app, params) {
    return http({
      url: STRAVA_TOKEN,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: app.id, client_secret: app.secret, ...params })
    }).then((r) => {
      if (r.status < 200 || r.status >= 300 || !r.data || !r.data.access_token) throw keyError('Strava sign-in ' + r.status, 'err.signin', { code: r.status })
      const auth = readJson('stravaAuth', {}) || {}
      const next = {
        access_token: r.data.access_token,
        refresh_token: r.data.refresh_token || auth.refresh_token,
        expires_at: r.data.expires_at || Math.round(now() / 1000) + 3600
      }
      writeJson('stravaAuth', next)
      return next.access_token
    }, netError('Strava'))
  }

  // A valid access token: refreshed when it is about to run out; the code from the sign-in is traded once
  // A new sign-in (Connect again after Strava took the access back) comes first; its code is kept when
  // the phone is offline, and dropped once used or refused (ROAST item 9)
  function stravaToken() {
    const app = stravaApp()
    if (!app) return Promise.reject(keyError('Strava app not set up', 'conn.stravaNeed'))
    const code = get('stravaCode')
    if (code) {
      return tokenRequest(app, { grant_type: 'authorization_code', code }).then(
        (token) => {
          storage.setItem('stravaCode', '')
          return token
        },
        (e) => {
          if (e && e.key !== 'err.offline') storage.setItem('stravaCode', '')
          throw e
        }
      )
    }
    const auth = readJson('stravaAuth', null)
    if (auth && auth.access_token && auth.expires_at > now() / 1000 + 120) return Promise.resolve(auth.access_token)
    if (auth && auth.refresh_token) return tokenRequest(app, { grant_type: 'refresh_token', refresh_token: auth.refresh_token })
    return Promise.reject(keyError('Strava not connected', 'err.notConnected'))
  }

  function strava(token, path, method, body, type) {
    return http({
      url: STRAVA + path,
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': type || 'application/json' },
      body: body === undefined ? undefined : type ? body : JSON.stringify(body)
    }).then((r) => {
      if (r.status < 200 || r.status >= 300) throw httpError('Strava', r.status, r.data)
      return r.data
    }, netError('Strava'))
  }

  function stravaCheck() {
    applyLanguage()
    if (!stravaApp()) {
      setStatus('strava', false, 'conn.stravaNeed')
      return Promise.resolve(false)
    }
    return stravaToken()
      .then((token) => strava(token, '/athlete', 'GET'))
      .then((a) => {
        const name = (a && (a.firstname || a.username)) || ''
        setStatus('strava', true, name ? 'conn.connectedAs' : 'conn.connected', { name })
        return true
      })
      .catch((e) => {
        setError('strava', e)
        return false
      })
  }

  function stravaDisconnect() {
    storage.setItem('stravaAuth', '')
    storage.setItem('stravaCode', '')
    const s = readJson('status', {}) || {}
    delete s.strava
    writeJson('status', s)
  }

  // The title, the description and the real sport on the activity; a sport type Strava refuses becomes
  // Workout
  function stravaUpdate(token, id, rec, sig) {
    const body = { name: title(rec), description: description(rec), sport_type: SPORT_TYPE[rec.sport] || FALLBACK_TYPE }
    return strava(token, `/activities/${id}`, 'PUT', body)
      .catch((e) => (e.status === 400 || e.status === 422 ? strava(token, `/activities/${id}`, 'PUT', { ...body, sport_type: FALLBACK_TYPE }) : Promise.reject(e)))
      .then(() => ({ stravaId: String(id), stravaUpload: '', stravaSig: sig }))
  }

  // Waits for Strava to turn an upload into an activity; { id } when it did, { upload } when it is still
  // working (the next try asks again)
  function pollUpload(token, upload, left) {
    return strava(token, `/uploads/${upload}`, 'GET').then((u) => {
      if (u && u.activity_id) return { id: String(u.activity_id) }
      if (u && u.error) {
        const dup = duplicateOf(u.error)
        if (dup) return { id: dup }
        throw keyError('Strava upload: ' + u.error, 'err.upload')
      }
      if (left <= 0) return { upload }
      return wait(UPLOAD_POLL_MS).then(() => pollUpload(token, upload, left - 1))
    })
  }

  // The match as a manual activity (no heart rate): when it has no curve, or Strava can't take the file
  function stravaManual(token, rec) {
    return strava(token, '/activities', 'POST', {
      name: title(rec),
      sport_type: SPORT_TYPE[rec.sport] || FALLBACK_TYPE,
      start_date_local: localIso(rec.start),
      elapsed_time: seconds(rec),
      description: description(rec)
    }).then((a) => {
      if (!a || !a.id) throw keyError('Strava did not return the activity', 'err.noActivity', { what: 'Strava' })
      return { id: String(a.id) }
    })
  }

  // Decision 31: the Strava activity of a Zepp workout recorded at the same time, if there is one
  function findSame(token, rec) {
    const after = Math.floor(rec.start / 1000) - 3600
    const before = Math.ceil(rec.start / 1000) + seconds(rec) + 600
    return strava(token, `/athlete/activities?after=${after}&before=${before}&per_page=20`, 'GET')
      .then((list) => sameMatch(rec, Array.isArray(list) ? list : []))
      .catch(() => null)
  }

  // Sends the match, or updates what was sent; returns the sync fields that changed
  function sendStrava(rec) {
    const sync = rec.sync || {}
    const sig = signature([title(rec), description(rec), rec.sport])
    return stravaToken().then((token) => {
      if (sync.stravaId) return sync.stravaSig === sig ? {} : stravaUpdate(token, sync.stravaId, rec, sig)
      const made = sync.stravaUpload
        ? pollUpload(token, sync.stravaUpload, UPLOAD_POLLS)
        : findSame(token, rec).then((same) => {
          if (same) return { id: String(same.id) }
          const file = tcx(rec)
          if (!file) return stravaManual(token, rec)
          const boundary = 'RallyPal' + rec.id.replace(/\W/g, '')
          const body = multipart(boundary, [['data_type', 'tcx'], ['external_id', externalId(rec)]], { name: externalId(rec) + '.tcx', data: file })
          return strava(token, '/uploads', 'POST', body, 'multipart/form-data; boundary=' + boundary)
            .then((u) => {
              if (u && u.error) {
                const dup = duplicateOf(u.error)
                if (dup) return { id: dup }
                throw keyError('Strava upload: ' + u.error, 'err.upload')
              }
              if (!u || !u.id) throw keyError('Strava did not return the upload', 'err.noActivity', { what: 'Strava' })
              return u.activity_id ? { id: String(u.activity_id) } : wait(UPLOAD_POLL_MS).then(() => pollUpload(token, u.id_str || u.id, UPLOAD_POLLS))
            })
            // a file Strava can't read still gives the match, without its heart rate
            .catch((e) => (e.key === 'err.upload' || e.status === 400 || e.status === 422 ? stravaManual(token, rec) : Promise.reject(e)))
        })
      return made.then((r) => {
        if (!r.id) return { stravaUpload: String(r.upload), waiting: true }
        // kept at once, so a failed update can't lead to a second activity
        storeSync(rec.id, { stravaId: String(r.id), stravaUpload: '' })
        return stravaUpdate(token, r.id, rec, sig)
      })
    })
  }

  // ---- the outbox: matches still to be sent ------------------------------------------------------------

  function outbox() {
    const o = readJson('outbox', [])
    return Array.isArray(o) ? o.filter((x) => x && x.id) : []
  }

  function queue(id) {
    const o = outbox().filter((x) => x.id !== id)
    o.push({ id, at: now(), tries: 0 })
    writeJson('outbox', o.slice(-OUTBOX_MAX))
  }

  function storeSync(id, change) {
    const h = history()
    h.forEach((x) => {
      if (x.id === id) x.sync = { ...(x.sync || {}), ...change }
    })
    writeJson('history', h)
  }

  let running = null

  // Sends up to max matches from the outbox, one after another (only one run at a time). Resolves
  // { sent, failed, waiting }; a match that failed stays for the next sync or Retry now.
  // force (Retry now): also the matches that failed AUTO_TRIES times. The ones tried least go first, so
  // matches that keep failing never hold up newer ones. Only the full version sends.
  function sendOutbox(max, force) {
    if (running) return running
    if (!lic.licensed()) return Promise.resolve({ sent: 0, failed: 0, waiting: 0 })
    applyLanguage()
    const todo = outbox()
      .filter((x) => force || (x.tries || 0) < AUTO_TRIES)
      .sort((a, b) => (a.tries || 0) - (b.tries || 0) || a.at - b.at)
      .slice(0, max || 5)
    const res = { sent: 0, failed: 0, waiting: 0 }
    running = todo
      .reduce((chain, item) => chain.then(() => sendOne(item, res)), Promise.resolve())
      .then(() => res, () => res)
      .then((r) => {
        running = null
        return r
      })
    return running
  }

  function sendOne(item, res) {
    const rec = history().filter((x) => x.id === item.id)[0]
    const done = () => writeJson('outbox', outbox().filter((x) => x.id !== item.id))
    if (!rec) return Promise.resolve(done())
    const on = services()
    let failed = false
    let waiting = false
    let sent = false
    let p = Promise.resolve()
    if (on.strava) {
      p = p.then(() => sendStrava(rec)
        .then((change) => {
          if (change.waiting) {
            waiting = true
            delete change.waiting
            setStatus('strava', true, 'conn.processing', { what: what(rec) })
          } else if (change.stravaId) {
            sent = true
            setStatus('strava', true, 'conn.sent', { what: what(rec) })
          }
          storeSync(rec.id, change)
          rec.sync = { ...(rec.sync || {}), ...change }
        })
        .catch((e) => {
          failed = true
          setError('strava', e)
        }))
    }
    if (on.intervals) {
      p = p.then(() => sendIntervals(rec)
        .then((change) => {
          if (change.intervalsId) {
            sent = true
            setStatus('intervals', true, 'conn.sent', { what: what(rec) })
          }
          storeSync(rec.id, change)
        })
        .catch((e) => {
          failed = true
          setError('intervals', e)
        }))
    }
    return p.then(() => {
      if (sent) res.sent++
      if (failed) res.failed++
      if (waiting) res.waiting++
      if (!failed && !waiting) return done()
      writeJson('outbox', outbox().map((x) => (x.id === item.id ? { ...x, tries: (x.tries || 0) + (failed ? 1 : 0) } : x)))
    })
  }

  // A match renamed on the phone page: its title on Strava and Intervals.icu changes with it
  function resendEdited() {
    const sent = history().filter((x) => x.sync && (x.sync.stravaId || x.sync.intervalsId))
    const ids = {}
    sent.forEach((x) => (ids[x.id] = true))
    edits().filter((e) => e.op === 'names' && ids[e.id] && now() - (Number(e.at) || 0) < 3600000).forEach((e) => queue(e.id))
  }

  // How many matches wait after a failed try (the settings page shows it with Retry now)
  function failedCount() {
    return outbox().filter((x) => x.tries > 0).length
  }

  return { sync, restore, setSetting, history, readJson, writeJson, intervalsCheck, stravaCheck, stravaDisconnect, sendOutbox,
    resendEdited, failedCount, services, licence: lic.licence, licensed: lic.licensed }
}

function httpError(what, status, data) {
  const e = new Error(`${what} ${status}`)
  e.what = what
  e.status = status
  e.data = data
  return e
}

// an error the settings page shows as a text of its own
function keyError(msg, key, vars) {
  const e = new Error(msg)
  e.key = key
  e.vars = vars || {}
  return e
}

// fetch itself failed: no internet, or the service could not be reached
function netError(what) {
  return (e) => {
    if (e && (e.status || e.key)) throw e
    throw keyError(`${what} unreachable: ${(e && e.message) || e}`, 'err.offline', { what })
  }
}

// { key, vars } of an error, as a phone text (setting/text.js)
export function errorStatus(e, service) {
  if (e && e.key) return { key: e.key, vars: e.vars || {} }
  const what = (e && e.what) || (service === 'strava' ? 'Strava' : 'Intervals.icu')
  const code = (e && e.status) || ''
  if (code === 401 || code === 403) return { key: service === 'strava' ? 'err.stravaAuth' : 'err.ivlAuth', vars: { what, code } }
  if (code === 404 && service === 'intervals') return { key: 'err.ivlAuth', vars: { what, code } }
  if (code === 429) return { key: 'err.rate', vars: { what } }
  return { key: 'err.http', vars: { what, code: code || '?' } }
}
