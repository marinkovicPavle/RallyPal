// The watch's history in files (ROAST item 11): a light index (history.json: every match without its events
// and heart rate curve) that the start screen, the card and the lists read, and one file per match
// (m_<id>.json: { ev, curve }) read only when a match is opened, sent or undone. Plain logic over an io, so
// it is tested with node; utils/data.js gives it the watch's files.
//
// Safe writes: the index is written twice, first to history.json.bak and then to history.json, so a watch
// switched off in the middle of a write still has one whole copy; reading falls back to the .bak. A match's
// own file is written before the index points to it and removed only after the index no longer does.
//
// io: { read(name) -> value or undefined, write(name, value) -> bool, remove(name) }

export const INDEX = 'history.json'
const BAK = INDEX + '.bak'
const HEAVY = ['ev', 'curve']

export function detailName(id) {
  return 'm_' + String(id).replace(/[^\w-]/g, '') + '.json'
}

// a record without its events and curve; hc: it has a curve in its own file
export function light(rec) {
  const o = {}
  Object.keys(rec).forEach((k) => {
    if (HEAVY.indexOf(k) < 0) o[k] = rec[k]
  })
  o.hc = !!(rec.curve && rec.curve.length)
  return o
}

// opts: { kept, curvesKept, curvesUnsent, unsent() -> { id: true } (matches the phone doesn't have yet) }
export function createHistory(io, opts) {
  const o = opts || {}
  const kept = o.kept || 200
  const curvesKept = o.curvesKept || 20
  const curvesUnsent = o.curvesUnsent || 60
  const unsent = o.unsent || (() => ({}))

  function valid(list) {
    return Array.isArray(list) && list.every((x) => x && typeof x === 'object' && x.id)
  }

  function writeIndex(list) {
    io.write(BAK, list)
    return io.write(INDEX, list)
  }

  // The index; an old one-file history (records with their events) is split once
  function list() {
    let h = io.read(INDEX)
    if (!valid(h)) h = io.read(BAK)
    if (!valid(h)) return []
    if (h.some((x) => x.ev)) {
      h.forEach((x) => {
        if (x.ev) io.write(detailName(x.id), { ev: x.ev, curve: x.curve || null })
      })
      h = h.map(light)
      writeIndex(h)
    }
    return h
  }

  function detail(id) {
    const d = io.read(detailName(id))
    return d && typeof d === 'object' ? d : null
  }

  // the whole record: the index entry and its own file
  function get(id) {
    const e = list().filter((x) => x.id === id)[0]
    if (!e) return null
    const d = detail(id) || {}
    const rec = { ...e, ev: Array.isArray(d.ev) ? d.ev : [] }
    if (d.curve && d.curve.length) rec.curve = d.curve
    delete rec.hc
    return rec
  }

  // Sorts, keeps the newest `kept`, drops the curves of older matches the phone already has (they stay on
  // the phone), writes the index and removes the files of matches no longer in it
  function save(h) {
    h.sort((a, b) => b.start - a.start)
    const out = h.slice(0, kept)
    const gone = h.slice(kept)
    const waiting = unsent()
    out.forEach((x, i) => {
      if (x.hc && i >= curvesKept && (!waiting[x.id] || i >= curvesUnsent)) {
        const d = detail(x.id)
        if (d) io.write(detailName(x.id), { ev: d.ev || [], curve: null })
        x.hc = false
      }
    })
    writeIndex(out)
    gone.forEach((x) => io.remove(detailName(x.id)))
    return out
  }

  // adds or replaces a whole record
  function put(rec) {
    io.write(detailName(rec.id), { ev: rec.ev || [], curve: rec.curve && rec.curve.length ? rec.curve : null })
    save(list().filter((x) => x.id !== rec.id).concat([light(rec)]))
    return rec
  }

  function remove(id) {
    const h = list()
    if (!h.some((x) => x.id === id)) return false
    save(h.filter((x) => x.id !== id))
    io.remove(detailName(id))
    return true
  }

  // Restore from the phone: adds only matches the watch doesn't have; returns how many
  function addMissing(records) {
    const h = list()
    const have = {}
    h.forEach((x) => (have[x.id] = true))
    let added = 0
    ;(records || []).forEach((r) => {
      if (r && r.id && !have[r.id]) {
        have[r.id] = true
        io.write(detailName(r.id), { ev: r.ev || [], curve: r.curve && r.curve.length ? r.curve : null })
        h.push(light(r))
        added++
      }
    })
    if (added) save(h)
    return added
  }

  // changes to index fields only (names, sync); fn(entry) returns true when it changed something
  function update(fn) {
    const h = list()
    let changed = false
    h.forEach((x) => {
      if (fn(x)) changed = true
    })
    if (changed) writeIndex(h)
    return changed
  }

  return { list, get, put, remove, addMissing, update, save }
}
