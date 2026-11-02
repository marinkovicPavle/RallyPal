// The statistics rows of the summary (drawing 7) and of a match in History (drawing 10), from the
// wearer's side (team 0). Plain data, so it is tested with node.

import { t } from './i18n'
import { clock, percent, resultOf } from './format'

function streak(s) {
  const n = s.streak ? s.streak[0] : 0
  return n === 1 ? t('stat.streakOne') : t('stat.streakValue', { n })
}

function pair(a) {
  return a ? `${a[0]} – ${a[1]}` : '–'
}

// The three rows under the score: points, points won on your serve, and break points (tennis and padel
// sets) or the longest run of points (the other sports)
export function keyRows(rec) {
  const s = rec.stats || {}
  const rows = [
    [t('stat.points'), pair(s.points)],
    [t('stat.serve'), s.servePoints ? percent(s.serveWon[0], s.servePoints[0]) : '–']
  ]
  if (s.breakPoints) rows.push([t('stat.breaks'), `${s.breaks[0]} / ${s.breakPoints[0]}`])
  else rows.push([t('stat.streak'), streak(s)])
  return rows
}

// History details: duration and heart rate first, then the same rows, and the longest run for every sport
export function detailRows(rec) {
  const s = rec.stats || {}
  const rows = [[t('stat.duration'), clock(rec.dur)]]
  if (rec.hrAvg) rows.push([t('stat.hr'), t('stat.hrValue', { a: rec.hrAvg, b: rec.hrMax })])
  keyRows(rec).forEach((r) => rows.push(r))
  if (s.breakPoints) rows.push([t('stat.streak'), streak(s)])
  return rows
}

// YOU WON / YOU LOST / DRAW / MATCH ENDED and its color name
export function resultLine(rec) {
  const r = resultOf(rec)
  return { text: t('result.' + r), tone: r === 'won' ? 'lime' : r === 'lost' ? 'red' : 'gray' }
}

// A record's name and value as the lists write them (shared/insights.js)
export function recordLabel(kind) {
  return t('rec.' + kind)
}

export function recordValue(kind, value) {
  return kind === 'longest' ? clock(value) : String(value)
}
