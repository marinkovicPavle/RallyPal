// Talking to the phone (side service), as SaunaPal. Every sync sends the watch settings and the matches
// waiting in the outbox; the phone merges settings (newer change wins), keeps its own copy of the history
// and answers with the merged settings (setups made on the phone arrive this way) and the changes made to
// the history on the phone (names, deletes). A new or reset watch asks for its history back (restore), a
// page at a time. The watch's own language goes along, for Automatic on the phone page.

import { loadSettings, replaceSettings, loadOutbox, getMatch, doneOutbox, markSynced, loadHistory, mergeRestored,
  loadMeta, saveMeta, applyPhoneEdits } from './data'
import { watchLang } from './lang'
import { merge } from '../shared/settings'

const BATCH = 3
const TIMEOUT = 30000

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

// opts: { restore: ask for the history when this watch has none, onlyId: send this match first }
// Resolves { ok, results, restored, settingsChanged, historyChanged } and never rejects.
export function syncWithPhone(page, opts) {
  const o = opts || {}
  const results = []
  const out = { ok: false, results, restored: 0, settingsChanged: false, historyChanged: false }

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
    return request(page, 'SYNC', { settings: loadSettings(), items, lang: watchLang() }).then((res) => {
      out.ok = true
      if (applySettings(res)) out.settingsChanged = true
      if (applyPhoneEdits(res && res.edits)) out.historyChanged = true
      applyDone(res, results)
      if (items.length && loadOutbox().length && res && res.done && res.done.length) return round(false)
      return out
    })
  }

  function restore(pageNo) {
    return request(page, 'RESTORE', { page: pageNo }).then((res) => {
      out.restored += mergeRestored((res && res.list) || [])
      if (res && res.more && pageNo < 40) return restore(pageNo + 1)
      saveMeta({ restoredAt: Date.now() })
      return out
    })
  }

  return round(true)
    .then(() => {
      const meta = loadMeta()
      if (o.restore && !meta.restoredAt && loadHistory().length === 0) return restore(0)
      if (o.restore && !meta.restoredAt) saveMeta({ restoredAt: Date.now() })
      return out
    })
    .catch((e) => {
      out.error = String((e && e.message) || e || 'no phone')
      return out
    })
}
