// The app's own code the simulator needs outside the watch pages: the scoring engine (to know what is on
// the screen), the texts (to tap a button by its label in every language), made-up finished matches for
// History, and the phone side that answers the watch.

import { newMatch, addPoint, endMatch, view } from '../../../shared/match'
import { makeRecord } from '../../../shared/record'
import { setupTitle } from '../../../shared/setups'
import { zonesFromCurve } from '../../../shared/insights'

export { view } from '../../../shared/match'
export { setLang, t, LANG_NAMES } from '../../../shared/i18n'
export { setupTitle, teamName, partnerName, matchNames } from '../../../shared/setups'
export { defaultRules } from '../../../shared/rules'
export { prettyScore } from '../../../shared/format'
export { createCore } from '../../../app-side/core'

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = a
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// A finished match from a setup: points at random (p: the chance you win one), ended by hand after
// `stopAfter` points if given; tries seeds until the wanted side wins (want: 0, 1 or undefined)
export function playedMatch(setup, start, o) {
  const opts = o || {}
  for (let seed = opts.seed || 1; seed < 500; seed++) {
    const r = rng(seed)
    const m = newMatch(setup, { first: opts.first || 0, mine: 0 }, start)
    m.title = setupTitle(setup)
    m.names = { me: '', opponent: setup.opponent || '', partner: setup.partner || '' }
    let tm = start
    let n = 0
    while (!view(m).done && n < 3000) {
      tm += 22000 + Math.floor(r() * 22000)
      addPoint(m, r() < (opts.p === undefined ? 0.55 : opts.p) ? 0 : 1, tm)
      n++
      if (opts.stopAfter && n >= opts.stopAfter) break
    }
    if (opts.stopAfter) endMatch(m, tm)
    const v = view(m)
    if (opts.want !== undefined && v.winner !== opts.want) continue
    m.hr = []
    for (let s = 0; s <= (tm - start) / 1000; s += 5) m.hr.push([s, 118 + Math.round(40 * Math.sin(s / 240)) + Math.floor(r() * 14)])
    const rec = makeRecord(m, tm)
    const zones = zonesFromCurve(rec.curve, rec.dur, 190)
    if (zones) rec.zones = { max: 190, sec: zones }
    return rec
  }
  throw new Error('no seed gives that result')
}
