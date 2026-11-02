// A finished match as the history keeps it: the match itself (setup and events, so everything can be
// worked out again), plus the result, the score, the statistics and the heart rate, worked out once.

import { view, scoreText, duration } from './match'

// heart rate samples kept per match (one every 5 s is 50 minutes; longer matches are thinned out)
const CURVE_MAX = 600
const SAMPLE_GAP_S = 5

// m.hr: [[sec, bpm]] in time order
export function addHr(m, sec, bpm) {
  if (!(bpm > 30 && bpm < 240)) return false
  if (!m.hr) m.hr = []
  const last = m.hr[m.hr.length - 1]
  if (last && sec - last[0] < SAMPLE_GAP_S) {
    if (bpm > last[1]) last[1] = bpm
    return false
  }
  m.hr.push([sec, bpm])
  return true
}

// What the background service recorded while the app was closed, merged in time order
export function mergeHr(m, samples) {
  if (!samples || !samples.length) return
  const have = {}
  ;(m.hr || []).forEach((x) => (have[x[0]] = true))
  const all = (m.hr || []).concat(samples.filter((x) => x && !have[x[0]] && x[1] > 30 && x[1] < 240))
  all.sort((a, b) => a[0] - b[0])
  m.hr = all
}

export function hrStats(hr) {
  const list = (hr || []).filter((x) => x && x[1] > 30)
  if (!list.length) return { avg: null, max: null }
  let sum = 0
  let max = 0
  list.forEach((x) => {
    sum += x[1]
    if (x[1] > max) max = x[1]
  })
  return { avg: Math.round(sum / list.length), max }
}

function thin(hr, max) {
  const list = hr || []
  if (list.length <= max) return list.slice()
  const step = list.length / max
  const out = []
  for (let i = 0; i < max; i++) out.push(list[Math.floor(i * step)])
  return out
}

export function makeRecord(m, end) {
  const v = view(m)
  const h = hrStats(m.hr)
  return {
    v: 1,
    id: m.id,
    start: m.start,
    end,
    sport: m.sport,
    rules: m.rules,
    doubles: m.doubles,
    first: m.first,
    mine: m.mine,
    ev: m.ev.slice(),
    setup: m.setup,
    title: m.title || '',
    names: m.names || {},
    winner: v.winner,
    draw: v.draw,
    ended: v.ended,
    score: scoreText(v),
    dur: duration(m, end, true),
    stats: v.stats,
    hrAvg: h.avg,
    hrMax: h.max,
    curve: thin(m.hr, CURVE_MAX)
  }
}

// The match again from a record (undo of the last point from the summary)
export function matchOf(rec) {
  return {
    v: 1,
    id: rec.id,
    start: rec.start,
    setup: rec.setup,
    sport: rec.sport,
    rules: rec.rules,
    doubles: rec.doubles,
    first: rec.first,
    mine: rec.mine,
    ev: rec.ev.slice(),
    title: rec.title,
    names: rec.names,
    hr: (rec.curve || []).slice()
  }
}

export function wonCount(history) {
  return history.filter((r) => r.winner === 0 && !r.draw).length
}
