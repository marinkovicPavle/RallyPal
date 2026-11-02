// Settings live on the watch and on the phone. Each value carries the time it was last changed, so when
// the two meet the newer change wins per setting (editing one thing on the phone and another on the
// watch keeps both). Same as SaunaPal.

import { SETTINGS, defaults, sanitize, clone } from './schema'

// { values: { key: value }, stamps: { key: ms } }
export function normalize(stored) {
  const base = defaults()
  const values = {}
  const stamps = {}
  const src = (stored && stored.values) || {}
  const st = (stored && stored.stamps) || {}
  SETTINGS.forEach((s) => {
    values[s.key] = s.key in src ? sanitize(s.key, src[s.key]) : base[s.key]
    stamps[s.key] = Number(st[s.key]) || 0
  })
  return { values, stamps }
}

export function setValue(state, key, value, now) {
  const next = normalize(state)
  next.values[key] = sanitize(key, value)
  next.stamps[key] = now
  return next
}

// Returns the merged settings and whether each side has to take changes from the other
export function merge(watch, phone) {
  const a = normalize(watch)
  const b = normalize(phone)
  const out = { values: {}, stamps: {} }
  let watchChanged = false
  let phoneChanged = false
  SETTINGS.forEach((s) => {
    const k = s.key
    const useB = b.stamps[k] > a.stamps[k]
    out.values[k] = clone(useB ? b.values[k] : a.values[k])
    out.stamps[k] = useB ? b.stamps[k] : a.stamps[k]
    if (useB && JSON.stringify(a.values[k]) !== JSON.stringify(b.values[k])) watchChanged = true
    if (!useB && a.stamps[k] > b.stamps[k]) phoneChanged = true
  })
  return { merged: out, watchChanged, phoneChanged }
}
