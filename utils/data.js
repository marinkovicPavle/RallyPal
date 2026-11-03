// Watch-side data: settings, the match being played, finished matches and the queue of changes waiting
// for the phone (from SaunaPal).

import { FILES, readJson, writeJson, removeFile } from './store'
import { normalize, setValue } from '../shared/settings'
import { createHistory } from '../shared/historystore'

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
// A light index and one file per match (shared/historystore.js, ROAST item 11): the lists read only the
// index; getMatch reads a match's own file too.

export const HISTORY_KEPT = 200
// the heart rate curve is for the phone's chart and Strava; the watch keeps it on its newest matches, and
// on older ones until the phone has them (ROAST item 8), up to CURVES_UNSENT matches back
const CURVES_KEPT = 20
const CURVES_UNSENT = 60

const hist = createHistory(
  { read: (name) => readJson(name, undefined), write: (name, value) => writeJson(name, value), remove: (name) => removeFile(name) },
  {
    kept: HISTORY_KEPT,
    curvesKept: CURVES_KEPT,
    curvesUnsent: CURVES_UNSENT,
    unsent: () => {
      const out = {}
      loadOutbox().forEach((x) => {
        if (x && x.op === 'upsert') out[x.id] = true
      })
      return out
    }
  }
)

// the matches without their events and curves, newest first
export function loadHistory() {
  return hist.list()
}

// a whole match (events and curve too), or null
export function getMatch(id) {
  return hist.get(id)
}

// Adds or replaces a finished match and queues it for the phone
export function putMatch(rec) {
  hist.put(rec)
  queue({ op: 'upsert', id: rec.id })
  return rec
}

// queueIt false: the phone never saw it (undo of the last point right after the match)
export function deleteMatch(id, queueIt) {
  hist.remove(id)
  dequeue(id)
  if (queueIt !== false) queue({ op: 'delete', id })
}

// Restore from the phone: only adds matches the watch does not have
export function mergeRestored(list) {
  return hist.addMissing(list)
}

// Changes made to the history on the phone page (names, deletes). They come with every sync, so applying
// one again changes nothing; returns whether the history changed.
export function applyPhoneEdits(edits) {
  if (!Array.isArray(edits) || !edits.length) return false
  let changed = false
  edits.forEach((e) => {
    if (e && e.op === 'delete' && hist.remove(e.id)) {
      // the phone already has this change: nothing goes back to it
      dequeue(e.id)
      changed = true
    }
  })
  const named = hist.update((x) => {
    let c = false
    edits.forEach((e) => {
      if (!e || e.op !== 'names' || e.id !== x.id || !e.names) return
      const names = { ...(x.names || {}), ...e.names }
      if (JSON.stringify(names) !== JSON.stringify(x.names || {})) {
        x.names = names
        c = true
      }
    })
    return c
  })
  return changed || named
}

export function markSynced(id, sync) {
  hist.update((x) => {
    if (x.id !== id) return false
    x.sync = { ...(x.sync || {}), ...sync }
    return true
  })
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
