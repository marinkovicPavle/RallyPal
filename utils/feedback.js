// Vibration after each point (decision 6): short for a point, longer for a game, two pulses for a set,
// three for the match; each one can be turned off in Settings. No sound (it would only be added if a
// test showed it can be heard). Every call is wrapped so a missing API never breaks a screen.

import { Vibrator, VIBRATOR_SCENE_DURATION } from '@zos/sensor'
import { settingsValues } from './data'

const later = (fn, ms) => (typeof setTimeout === 'function' ? setTimeout(fn, ms) : fn())

// [on ms, off ms, on ms, ...]
const PATTERN = {
  point: [70],
  game: [380],
  set: [220, 160, 220],
  match: [260, 160, 260, 160, 260],
  // four short pulses: change ends (unlike every point, game, set and match vibration)
  ends: [70, 90, 70, 90, 70, 90, 70]
}
const SETTING = { point: 'vibePoint', game: 'vibeGame', set: 'vibeSet', match: 'vibeMatch' }

let vibrator = null
let run = 0

function stop() {
  try {
    if (vibrator) vibrator.stop()
  } catch (e) {}
}

function pulse(ms) {
  try {
    if (!vibrator) vibrator = new Vibrator()
    vibrator.stop()
    vibrator.start({ mode: VIBRATOR_SCENE_DURATION })
    later(stop, ms)
  } catch (e) {}
}

function play(steps) {
  const id = ++run
  let t = 0
  steps.forEach((ms, i) => {
    if (i % 2 === 0) {
      const at = t
      if (at === 0) pulse(ms)
      else later(() => id === run && pulse(ms), at)
    }
    t += ms
  })
}

// what: 'point' | 'game' | 'set' | 'match' (what match.js addPoint returned)
export function pointBuzz(what) {
  const key = SETTING[what]
  if (!key) return
  let on = true
  try {
    on = settingsValues()[key] !== false
  } catch (e) {}
  if (on) play(PATTERN[what])
}

// Change ends: after the point's own vibration
export function endsBuzz() {
  later(() => play(PATTERN.ends), 900)
}

// a short pulse when a setting is switched, so the choice can be felt
export function preview(what) {
  if (PATTERN[what]) play(PATTERN[what])
}

export function stopAll() {
  run++
  stop()
}
