// What a match sends to Strava and Intervals.icu (decisions 16, 31 and 38), built from its history
// record: the title with the result, the description with the statistics, the real sport, and a TCX
// file with the heart rate through the match. The side service does the HTTP calls; this file only
// shapes the data, so it is tested with node.

import { t, lang, setLang, LANGS } from './i18n'
import { sportName, setupTitle } from './setups'
import { prettyScore, resultOf } from './format'
import { detailRows } from './stats'

// Strava's sport_type and Intervals.icu's type for each sport
export const SPORT_TYPE = {
  tennis: 'Tennis',
  padel: 'Padel',
  pickleball: 'Pickleball',
  tabletennis: 'TableTennis',
  squash: 'Squash',
  badminton: 'Badminton'
}
// what both take when a sport type is refused
export const FALLBACK_TYPE = 'Workout'

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

// 2026-10-21T18:10:00, the phone's local time, as Strava and Intervals.icu take start_date_local
export function localIso(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 2026-10-21T16:10:00Z, as a TCX file writes its times
export function utcIso(ms) {
  return new Date(Math.round(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z')
}

export function seconds(rec) {
  const s = Math.round(rec.dur || ((rec.end || rec.start) - rec.start) / 1000)
  return Math.max(60, s || 0)
}

// "Tennis · won 6–4 6–3 · vs Marko"
export function title(rec) {
  const r = resultOf(rec)
  const word = r === 'won' || r === 'lost' || r === 'draw' ? t('home.' + r) : ''
  const score = prettyScore(rec.score)
  const parts = [sportName(rec.sport)]
  const result = [word, score].filter(Boolean).join(' ')
  if (result) parts.push(result)
  const n = rec.names || {}
  if (n.opponent) parts.push(t('out.vs', { name: n.opponent }))
  return parts.join(' · ')
}

// "Tennis · Best of 3" in today's language; a name given to the setup on the phone stays as it is (the
// watch wrote the title in its language when the match began)
function setupLine(rec) {
  const s = { sport: rec.sport, rules: rec.rules, doubles: rec.doubles }
  const now = setupTitle(s)
  if (!rec.title) return now
  const cur = lang()
  const generated = Object.keys(LANGS).some((c) => {
    setLang(c)
    return setupTitle(s) === rec.title
  })
  setLang(cur)
  return generated ? now : rec.title
}

// The setup, the players, the score and the statistics, one per line, and the app's name at the end
export function description(rec) {
  const n = rec.names || {}
  const lines = []
  lines.push(setupLine(rec))
  const who = []
  if (rec.doubles && n.partner) who.push(t('setup.with', { name: n.partner }))
  if (n.opponent) who.push(t('out.vs', { name: n.opponent }))
  if (who.length) lines.push(who.join(' · '))
  if (rec.score) lines.push(`${t('out.score')}: ${prettyScore(rec.score)}`)
  detailRows(rec).forEach((x) => lines.push(`${x[0]}: ${x[1]}`))
  lines.push('')
  lines.push(t('out.by'))
  return lines.join('\n')
}

// The heart rate through the match as a TCX file (no GPS); Strava and Intervals.icu draw it as the
// activity's heart rate chart. Without a curve there is no file and the match goes as a manual activity.
export function tcx(rec) {
  const curve = (rec.curve || []).filter((x) => x && x[1] > 30 && x[1] < 240)
  if (curve.length < 2) return null
  const total = seconds(rec)
  const points = curve.map((x) => `<Trackpoint><Time>${utcIso(rec.start + x[0] * 1000)}</Time><HeartRateBpm><Value>${Math.round(x[1])}</Value></HeartRateBpm></Trackpoint>`)
  // the last point at the end of the match, so the activity is as long as the match
  const last = curve[curve.length - 1]
  if (last[0] < total - 5) points.push(`<Trackpoint><Time>${utcIso(rec.start + total * 1000)}</Time><HeartRateBpm><Value>${Math.round(last[1])}</Value></HeartRateBpm></Trackpoint>`)
  const hr = (k, v) => (v ? `<${k}><Value>${Math.round(v)}</Value></${k}>` : '')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">',
    '<Activities><Activity Sport="Other">',
    `<Id>${utcIso(rec.start)}</Id>`,
    `<Lap StartTime="${utcIso(rec.start)}">`,
    `<TotalTimeSeconds>${total}</TotalTimeSeconds><DistanceMeters>0</DistanceMeters>`,
    hr('AverageHeartRateBpm', rec.hrAvg) + hr('MaximumHeartRateBpm', rec.hrMax),
    '<Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod>',
    `<Track>${points.join('')}</Track>`,
    '</Lap></Activity></Activities>',
    '</TrainingCenterDatabase>'
  ].join('\n')
}

// One multipart/form-data body: fields [[name, value]], and the file as the last part
export function multipart(boundary, fields, file) {
  const parts = fields.map((f) => `--${boundary}\r\nContent-Disposition: form-data; name="${f[0]}"\r\n\r\n${f[1]}\r\n`)
  if (file) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: application/xml\r\n\r\n${file.data}\r\n`)
  }
  return parts.join('') + `--${boundary}--\r\n`
}

export function externalId(rec) {
  return 'rallypal-' + rec.id
}

// Decision 31: when a Zepp workout recorded the same match and already reached Strava, RallyPal fills
// in that activity instead of adding a second one. activities: Strava's list (start_date, elapsed_time).
// The match counts as the same when they overlap for at least half of the match.
export function sameMatch(rec, activities) {
  const start = rec.start
  const end = rec.start + seconds(rec) * 1000
  let best = null
  let bestOverlap = 0
  ;(activities || []).forEach((a) => {
    if (!a || !a.id || !a.start_date) return
    if (a.external_id === externalId(rec)) {
      best = a
      bestOverlap = Infinity
      return
    }
    const from = Date.parse(a.start_date)
    const to = from + (Number(a.elapsed_time) || 0) * 1000
    const overlap = Math.min(end, to) - Math.max(start, from)
    if (overlap >= (end - start) / 2 && overlap > bestOverlap) {
      best = a
      bestOverlap = overlap
    }
  })
  return best
}

// "duplicate of <a href='/activities/123'>…" in a Strava upload error: the activity it already has
export function duplicateOf(error) {
  const m = /activities\/(\d+)/.exec(String(error || ''))
  return m ? m[1] : null
}

// A short fingerprint of what was sent, so a match sent again unchanged makes no new call
export function signature(parts) {
  const s = parts.join('\u0001')
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(16)
}
