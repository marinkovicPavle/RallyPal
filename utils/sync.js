// Talking to the phone (side service), as SaunaPal. Every sync sends the watch settings, the matches
// waiting in the outbox and the free trial (the matches it counted, and whether it is unlocked); the phone
// merges settings (newer change wins), keeps its own copy of the history and answers with the merged
// settings (setups made on the phone arrive this way), the changes made to the history on the phone
// (names, deletes), how many matches it keeps, and what it knows about the trial and the purchase.
// The watch asks for the matches it is missing (a new or reset watch, or one that played before the
// phone was connected), a page at a time, and goes on where it stopped if a restore was cut short.
// The watch's own language goes along, for Automatic on the phone page.

import { loadSettings, replaceSettings, loadOutbox, getMatch, doneOutbox, markSynced, loadHistory, mergeRestored,
  loadMeta, saveMeta, applyPhoneEdits, HISTORY_KEPT } from './data'
import { trialParams, licenceParams, applyTrial } from './licence'
import { watchLang } from './lang'
import { merge } from '../shared/settings'
import { restoreFrom } from '../shared/record'

const BATCH = 3
const TIMEOUT = 30000
// the phone sends 20 matches a page; the watch keeps HISTORY_KEPT
const RESTORE_PAGE = 20
const RESTORE_PAGES = Math.ceil(HISTORY_KEPT / RESTORE_PAGE)

// An error on the phone comes back as an answer with an error in it
function request(page, method, params) {
  return page.request({ method, params }, { timeout: TIMEOUT }).then((res) => {
    if (res && res.error) throw new Error(res.error)
    return res
  })
}

function applySettings(res) {
  if (!res || !res.settings) return false
  const m = merge(loadSettings(), res.settings)
  replaceSettings(m.merged)
  return m.watchChanged
}

function applyDone(res, results) {
  ;((res && res.done) || []).forEach((d) => {
    doneOutbox(d.id, d.op)
    if (d.op === 'upsert' && d.sync) markSynced(d.id, d.sync)
    results.push(d)
  })
}

// opts: { restore: ask for missing matches, onlyId: send this match first }
// Resolves { ok, results, restored, settingsChanged, historyChanged, trialChanged } and never rejects.
export function syncWithPhone(page, opts) {
  const o = opts || {}
  const results = []
  const out = { ok: false, results, restored: 0, settingsChanged: false, historyChanged: false, trialChanged: false }
  let total = 0

  function round(first) {
    let box = loadOutbox()
    if (o.onlyId) box = box.filter((x) => x.id === o.onlyId).concat(box.filter((x) => x.id !== o.onlyId))
    const items = box
      .slice(0, BATCH)
      .map((x) => (x.op === 'upsert' ? { op: 'upsert', id: x.id, rec: getMatch(x.id) } : { op: 'delete', id: x.id }))
      .filter((x) => x.op === 'delete' || x.rec)
    // queued upserts of matches that no longer exist are dropped
    box.slice(0, BATCH).forEach((x) => {
      if (x.op === 'upsert' && !getMatch(x.id)) doneOutbox(x.id, x.op)
    })
    if (!first && !items.length) return Promise.resolve(out)
    const params = { settings: loadSettings(), items, lang: watchLang(), trial: trialParams() }
    const lp = licenceParams()
    Object.keys(lp).forEach((k) => (params[k] = lp[k]))
    return request(page, 'SYNC', params).then((res) => {
      out.ok = true
      if (applySettings(res)) out.settingsChanged = true
      if (applyPhoneEdits(res && res.edits)) out.historyChanged = true
      if (applyTrial(res)) out.trialChanged = true
      if (res && res.total !== undefined) total = Number(res.total) || 0
      applyDone(res, results)
      if (items.length && loadOutbox().length && res && res.done && res.done.length) return round(false)
      return out
    })
  }

  function restore(pageNo) {
    return request(page, 'RESTORE', { page: pageNo }).then((res) => {
      out.restored += mergeRestored((res && res.list) || [])
      const next = pageNo + 1
      if (res && res.more && next < RESTORE_PAGES) {
        // where to go on if this restore is cut short (the start screen was left)
        saveMeta({ restorePage: next })
        return restore(next)
      }
      saveMeta({ restoredAt: Date.now(), restorePage: 0 })
      return out
    })
  }

  return round(true)
    .then(() => {
      if (!o.restore) return out
      const from = restoreFrom(loadMeta(), total, loadHistory().length, Date.now(), HISTORY_KEPT)
      return from >= 0 ? restore(from) : out
    })
    .catch((e) => {
      out.error = String((e && e.message) || e || 'no phone')
      return out
    })
}
