// What v2 reads out of the matches, the same on the watch and the phone (from SaunaPal 3.0): heart rate
// zones (ROAST-v2 item 4) and records (item 5). Everything is worked out from the stored matches, so a
// restored history or a match deleted on the phone gives the same answers.

import { resultOf } from './format'

// ---- heart rate zones -----------------------------------------------------------------------------

// Zone n starts at ZONE_PCT[n] % of the maximum; time under 60 % counts in zone 1
export const ZONE_PCT = [50, 60, 70, 80, 90]
// gray, blue, green, amber, red: the same on the watch and the phone (as SaunaPal)
export const ZONE_COLORS = [0x9e9e9e, 0x3d8ef0, 0x2ecc71, 0xffa000, 0xff4d4d]
// a gap between two samples longer than this is not counted (the watch lost the heart rate)
const GAP_S = 60
// the maximum when the user set none and the watch doesn't know the age
export const HR_MAX_DEFAULT = 190

// The maximum heart rate for zones: the user's own (Settings on the phone), else 220 minus the age from
// the Zepp profile
export function hrMaxOf(values, age) {
  const own = Number(values && values.hrMax)
  if (own >= 120 && own <= 230) return own
  const a = Number(age)
  return a >= 10 && a <= 100 ? 220 - a : HR_MAX_DEFAULT
}

export function zoneOf(bpm, hrMax) {
  const pct = (100 * bpm) / hrMax
  let z = 0
  for (let i = 1; i < ZONE_PCT.length; i++) if (pct >= ZONE_PCT[i]) z = i
  return z
}

// Seconds in each of the 5 zones from a match's heart rate ([[sec, bpm]] in time order), each sample
// counting until the next one; null without heart rate
export function zonesFromCurve(curve, dur, hrMax) {
  const c = (curve || []).filter((x) => x && x[1] > 30 && x[1] < 240)
  if (c.length < 2 || !hrMax) return null
  const out = [0, 0, 0, 0, 0]
  c.forEach((x, i) => {
    const next = i + 1 < c.length ? c[i + 1][0] : Math.max(x[0], dur || x[0])
    const sec = Math.min(GAP_S, Math.max(0, next - x[0]))
    out[zoneOf(x[1], hrMax)] += sec
  })
  return out.some((s) => s > 0) ? out.map((s) => Math.round(s)) : null
}

// [percent of each zone], adding up to 100
export function zonePercents(sec) {
  const total = sec.reduce((a, b) => a + b, 0)
  if (!total) return [0, 0, 0, 0, 0]
  const raw = sec.map((x) => (100 * x) / total)
  const out = raw.map(Math.floor)
  let left = 100 - out.reduce((a, b) => a + b, 0)
  raw
    .map((x, i) => [x - Math.floor(x), i])
    .sort((a, b) => b[0] - a[0])
    .forEach((p) => {
      if (left > 0 && sec[p[1]] > 0) {
        out[p[1]]++
        left--
      }
    })
  return out
}

// ---- records --------------------------------------------------------------------------------------

// The records in the order the lists show them:
//   longest   the longest match (seconds)
//   streak    the longest run of points won in one match
//   winRun    the most matches won in a row
//   week      the most matches in one week (Monday to Sunday)
export const RECORDS = ['longest', 'streak', 'winRun', 'week']
// beaten records are celebrated from this many earlier matches on (the first ones would all be records)
export const CELEBRATE_AFTER = 3

function weekStart(ts) {
  const d = new Date(ts)
  const day = (d.getDay() + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime()
}

// { longest: { value, at }, streak, winRun, week }; at: the start of the match (week: of the week, winRun:
// of its last match). null when there is none.
export function records(history) {
  const out = { longest: null, streak: null, winRun: null, week: null }
  const better = (k, value, at) => {
    if (value > 0 && (!out[k] || value > out[k].value)) out[k] = { value, at }
  }
  const list = (history || []).filter((h) => h && h.start).slice().sort((a, b) => a.start - b.start)
  const weeks = {}
  let run = 0
  list.forEach((h) => {
    better('longest', Number(h.dur) || 0, h.start)
    better('streak', h.stats && h.stats.streak ? h.stats.streak[0] : 0, h.start)
    const r = resultOf(h)
    if (r === 'won') {
      run++
      better('winRun', run, h.start)
    } else if (r === 'lost' || r === 'draw') run = 0
    const w = weekStart(h.start)
    weeks[w] = (weeks[w] || 0) + 1
  })
  Object.keys(weeks).forEach((w) => better('week', weeks[w], Number(w)))
  return out
}

// The records the newest match beat, in list order: [{ kind, value }]. Only from the 4th match on.
export function newRecords(history, rec) {
  const before = (history || []).filter((h) => h.id !== rec.id)
  if (before.length < CELEBRATE_AFTER) return []
  const a = records(before)
  const b = records(before.concat([rec]))
  return RECORDS.filter((k) => b[k] && a[k] && b[k].value > a[k].value).map((k) => ({ kind: k, value: b[k].value }))
}
