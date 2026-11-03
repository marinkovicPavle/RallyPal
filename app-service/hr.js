// Background service that runs for the whole match (it needs the watch's "run in background"
// permission; see utils/bg.js). While the match page is not on screen it records the heart rate, so a
// match played with the screen off between points still has its full curve. The match page adds what
// was recorded when it opens again.
//
// Limits of an App Service: no timers, no UI, files can only be written while the screen is off. So
// everything happens inside the heart rate callback and the per-minute clock.

import { HeartRate, Time, Screen } from '@zos/sensor'
import { exit } from '@zos/app-service'
import { readFileSync, writeFileSync } from '@zos/fs'

const READ_EVERY_MS = 15000
// the match page marks itself every 10 s while it is on screen; then it records the heart rate itself
const ALIVE_MS = 20000
// written this often while the screen is off: when the wrist comes up the screen turns on and the service
// may no longer write, so what it holds since the last write is lost; every 5 s keeps that to one sample
// (it was 30 s, ROAST item 12)
const FLUSH_EVERY_MS = 5000
const SAMPLE_GAP_S = 5
const KEPT = 1200
// no point for this long: the match was left open, the heart rate is no longer recorded (shared/match.js
// IDLE_HR_S, ROAST item 6); the match page starts the service again when the match goes on
const IDLE_HR_S = 1800

function read(name) {
  try {
    const raw = readFileSync({ path: name, options: { encoding: 'utf8' } })
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function write(name, value) {
  try {
    writeFileSync({ path: name, data: JSON.stringify(value), options: { encoding: 'utf8' } })
    return true
  } catch (e) {
    return false
  }
}

let match = null
let readAt = 0
let aliveAt = 0
let hrSensor = null
let timeSensor = null
let screen = null
let bpm = 0
let lastFlush = 0
let dirty = false
const bg = { id: '', hr: [] }

function refresh(now) {
  if (now - readAt < READ_EVERY_MS && match) return
  readAt = now
  match = read('match.json')
  const alive = read('alive.json')
  aliveAt = alive && alive.at ? alive.at : 0
  if (!match || !match.id) {
    stopAll()
    exit()
    return
  }
  if (bg.id !== match.id) {
    bg.id = match.id
    bg.hr = []
  }
  // the page is on screen: it took what was written and records by itself
  if (pageOn(now)) {
    bg.hr = []
    dirty = false
  }
}

function pageOn(now) {
  return now - aliveAt < ALIVE_MS
}

function screenOff() {
  try {
    return screen ? screen.getStatus() !== 1 : true
  } catch (e) {
    return true
  }
}

function flush(now, force) {
  if (!dirty) return
  if (!force && now - lastFlush < FLUSH_EVERY_MS) return
  if (!screenOff()) return // App Service may only write files with the screen off
  if (write('bg.json', bg)) {
    lastFlush = now
    dirty = false
  }
}

function lastSec(m) {
  const ev = Array.isArray(m.ev) ? m.ev : []
  const e = ev[ev.length - 1]
  return e ? Number(e[e.length - 1]) || 0 : 0
}

function record(now) {
  if (!match || pageOn(now)) return
  const t = Math.max(0, Math.round((now - match.start) / 1000))
  if (t - lastSec(match) > IDLE_HR_S) {
    flush(now, true)
    stopAll()
    exit()
    return
  }
  if (!(bpm > 30 && bpm < 240)) return
  const last = bg.hr[bg.hr.length - 1]
  if (!last || t - last[0] >= SAMPLE_GAP_S) {
    bg.hr.push([t, bpm])
    if (bg.hr.length > KEPT) bg.hr.splice(0, bg.hr.length - KEPT)
    dirty = true
  } else if (bpm > last[1]) last[1] = bpm
}

function onHr() {
  const now = Date.now()
  try {
    bpm = hrSensor.getCurrent()
  } catch (e) {}
  refresh(now)
  record(now)
  flush(now, false)
}

function onMinute() {
  const now = Date.now()
  refresh(now)
  flush(now, true)
}

function stopAll() {
  try {
    if (hrSensor) hrSensor.offCurrentChange(onHr)
  } catch (e) {}
}

AppService({
  onInit() {
    refresh(Date.now())
    try {
      screen = new Screen()
    } catch (e) {}
    try {
      hrSensor = new HeartRate()
      hrSensor.onCurrentChange(onHr)
    } catch (e) {}
    try {
      timeSensor = new Time()
      timeSensor.onPerMinute(onMinute)
    } catch (e) {}
  },
  onDestroy() {
    stopAll()
    flush(Date.now(), true)
  }
})
