// Watch-side data: settings, the match being played, finished matches and the queue of changes waiting
// for the phone (from SaunaPal).

import { FILES, readJson, writeJson, removeFile } from './store'
import { normalize, setValue } from '../shared/settings'

export function loadSettings() {
  return normalize(readJson(FILES.settings, null))
}

export function settingsValues() {
  return loadSettings().values
}

export function saveSetting(key, value) {
  const next = setValue(loadSettings(), key, value, Date.now())
  writeJson(FILES.settings, next)
  return next.values
}

export function replaceSettings(state) {
  writeJson(FILES.settings, normalize(state))
}

export function loadMeta() {
  return readJson(FILES.meta, {}) || {}
}

export function saveMeta(patch) {
  const m = loadMeta()
  Object.keys(patch).forEach((k) => (m[k] = patch[k]))
  writeJson(FILES.meta, m)
  return m
}

// ---- history ----------------------------------------------------------------------------------------

export const HISTORY_KEPT = 200
// the heart rate curve is for the phone's chart and Strava; the watch keeps it on its newest matches only
const CURVES_KEPT = 20

export function loadHistory() {
  const h = readJson(FILES.history, [])
  return Array.isArray(h) ? h : []
}

function saveHistory(list) {
  list.sort((a, b) => b.start - a.start)
  const out = list.slice(0, HISTORY_KEPT)
  out.forEach((x, i) => {
    if (i >= CURVES_KEPT && x.curve) delete x.curve
  })
  writeJson(FILES.history, out)
}

export function getMatch(id) {
  const h = loadHistory()
  for (let i = 0; i < h.length; i++) if (h[i].id === id) return h[i]
  return null
}

// Adds or replaces a finished match and queues it for the phone
export function putMatch(rec) {
  saveHistory(loadHistory().filter((x) => x.id !== rec.id).concat([rec]))
  queue({ op: 'upsert', id: rec.id })
  return rec
}

// queueIt false: the phone never saw it (undo of the last point right after the match)
export function deleteMatch(id, queueIt) {
  saveHistory(loadHistory().filter((x) => x.id !== id))
  dequeue(id)
  if (queueIt !== false) queue({ op: 'delete', id })
}

// Restore from the phone: only adds matches the watch does not have
export function mergeRestored(list) {
  const h = loadHistory()
  const have = {}
  h.forEach((x) => (have[x.id] = true))
  let added = 0
  ;(list || []).forEach((x) => {
    if (x && x.id && !have[x.id]) {
      h.push(x)
      added++
    }
  })
  if (added) saveHistory(h)
  return added
}

// Changes made to the history on the phone page (names, deletes). They come with every sync, so applying
// one again changes nothing; returns whether the history changed.
export function applyPhoneEdits(edits) {
  if (!Array.isArray(edits) || !edits.length) return false
  const h = loadHistory()
  let changed = false
  const keep = h.filter((x) => {
    const gone = edits.some((e) => e && e.op === 'delete' && e.id === x.id)
    if (gone) changed = true
    return !gone
  })
  keep.forEach((x) => {
    edits.forEach((e) => {
      if (!e || e.op !== 'names' || e.id !== x.id || !e.names) return
      const names = { ...(x.names || {}), ...e.names }
      if (JSON.stringify(names) !== JSON.stringify(x.names || {})) {
        x.names = names
        changed = true
      }
    })
  })
  if (!changed) return false
  // the phone already has these changes: nothing goes back to it
  edits.forEach((e) => e && e.op === 'delete' && dequeue(e.id))
  saveHistory(keep)
  return true
}

export function markSynced(id, sync) {
  const h = loadHistory()
  let changed = false
  h.forEach((x) => {
    if (x.id === id) {
      x.sync = { ...(x.sync || {}), ...sync }
      changed = true
    }
  })
  if (changed) writeJson(FILES.history, h)
}

// ---- outbox -----------------------------------------------------------------------------------------

export function loadOutbox() {
  const o = readJson(FILES.outbox, [])
  return Array.isArray(o) ? o : []
}

function queue(item) {
  const o = loadOutbox().filter((x) => x.id !== item.id)
  o.push(item)
  writeJson(FILES.outbox, o)
}

function dequeue(id) {
  writeJson(FILES.outbox, loadOutbox().filter((x) => x.id !== id))
}

export function doneOutbox(id, op) {
  writeJson(FILES.outbox, loadOutbox().filter((x) => !(x.id === id && x.op === op)))
}

// ---- the match being played -------------------------------------------------------------------------

export function loadActive() {
  const m = readJson(FILES.active, null)
  return m && m.id && Array.isArray(m.ev) ? m : null
}

export function saveActive(m) {
  return writeJson(FILES.active, m)
}

export function clearActive() {
  removeFile(FILES.active)
  removeFile(FILES.hr)
  removeFile(FILES.bg)
}

export function loadHr(id) {
  const f = readJson(FILES.hr, null)
  return f && f.id === id && Array.isArray(f.hr) ? f.hr : []
}

export function saveHr(id, hr) {
  writeJson(FILES.hr, { id, hr })
}
