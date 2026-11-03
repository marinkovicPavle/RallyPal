// Fake Zepp OS modules for the screen simulator (tools/sim/run.mjs). Every @zos/* and zml import of the
// app is bundled against this one file; the state lives in globalThis.__sim so the runner can drive it.

const sim = () => globalThis.__sim

import WIDTHS from './inter-widths.json'

// ---- @zos/ui ---------------------------------------------------------------------------------------
const names = ['IMG', 'TEXT', 'FILL_RECT', 'STROKE_RECT', 'ARC', 'CIRCLE', 'BUTTON', 'GROUP', 'SCROLL_LIST', 'VIEW_CONTAINER', 'QRCODE']
export const widget = {}
names.forEach((n) => (widget[n] = n))
export const prop = { TEXT: 'text', MORE: 'more', VISIBLE: 'visible', COLOR: 'color', X: 'x', Y: 'y', W: 'w', H: 'h', SRC: 'src' }
export const align = { LEFT: 'left', RIGHT: 'right', CENTER_H: 'center', TOP: 'top', BOTTOM: 'bottom', CENTER_V: 'middle' }
export const text_style = { WRAP: 'wrap', ELLIPSIS: 'ellipsis', NONE: 'none', CHAR_WRAP: 'wrap' }
export const event = { CLICK_UP: 'up', CLICK_DOWN: 'down', MOVE: 'move' }

export function createWidget(type, p) {
  if (!widget[type]) throw new Error('unknown widget ' + type)
  for (const k of Object.keys(p || {})) {
    const v = p[k]
    if (typeof v === 'number' && !isFinite(v)) throw new Error(`${type}.${k} is ${v}`)
    if (v === undefined && k !== 'click_func') throw new Error(`${type}.${k} is undefined`)
  }
  const w = { id: sim().nextId++, type, props: { ...p }, listeners: {}, deleted: false }
  sim().widgets.push(w)
  return {
    _w: w,
    setProperty(k, v) {
      if (k === undefined) throw new Error('setProperty(undefined) on ' + type)
      if (w.deleted) sim().warnings.push('setProperty on a deleted ' + type)
      if (k === 'more') Object.assign(w.props, v)
      else w.props[k] = v
    },
    getProperty(k) {
      return w.props[k]
    },
    addEventListener(ev, fn) {
      ;(w.listeners[ev] = w.listeners[ev] || []).push(fn)
    },
    // false: touch goes through to what is under it
    setEnable(v) {
      w.disabled = !v
    }
  }
}
// Text measured with the simulator's font (Inter Medium, what render.py draws with; the T-Rex 3 Pro's
// own font measured about 5% narrower on a photo, so a text that fits here fits there)
// A text with a character Inter doesn't have (Japanese) is measured, and drawn, with a CJK font throughout
// (as SaunaPal; the widths come from widths.py)
const isCjk = (str) => [...String(str)].some((c) => WIDTHS.inter[c] === undefined && c.codePointAt(0) >= 0x2e80)
function inter(str, size, cjk) {
  const tbl = cjk === undefined ? (isCjk(str) ? WIDTHS.cjk : WIDTHS.inter) : cjk ? WIDTHS.cjk : WIDTHS.inter
  let n = 0
  for (const c of String(str)) n += tbl[c] === undefined ? 620 : tbl[c]
  return (n * size) / 1000
}
// Wrapping like render.py: at spaces, and in a CJK text between any two characters
export function wrapLines(str, size, width) {
  const cjk = isCjk(str)
  const lines = []
  String(str).split('\n').forEach((para) => {
    let cur = ''
    const parts = cjk ? [...para] : para.split(' ')
    parts.forEach((part) => {
      const t = cjk ? (cur + part).replace(/^ +/, '') : (cur + ' ' + part).trim()
      if (inter(t, size, cjk) <= width || !cur) cur = t
      else {
        lines.push(cur)
        cur = cjk ? part.replace(/^ +/, '') : part
      }
    })
    lines.push(cur)
  })
  return { lines, cjk }
}
export function getTextLayout(str, o) {
  const size = o.text_size
  const lh = Math.round(size * 1.25)
  if (!o.wrapped) return { width: Math.ceil(inter(str, size)), height: lh, rows: 1 }
  const { lines, cjk } = wrapLines(str, size, o.text_width)
  const widest = Math.max(0, ...lines.map((l) => inter(l, size, cjk)))
  return { width: Math.ceil(widest), height: lines.length * lh, rows: lines.length }
}
export function deleteWidget(h) {
  if (h && h._w) h._w.deleted = true
}
// shortcut card: the runner sets sim().card = { w, margin, radius }; the card sets its own height
export function getAppWidgetSize() {
  const c = sim().card
  return { w: c.w, h: c.h, margin: c.margin, radius: c.radius }
}
export function setAppWidgetSize(o) {
  const d = sim().device
  if (!(o.h >= d.h * 0.2 && o.h <= d.h * 0.6)) sim().warnings.push(`card height ${o.h} is outside 20-60% of the screen`)
  sim().card.h = o.h
}

// ---- @zos/device -----------------------------------------------------------------------------------
export const SCREEN_SHAPE_ROUND = 1
export const SCREEN_SHAPE_SQUARE = 0
export function getDeviceInfo() {
  const d = sim().device
  return { width: d.w, height: d.h, screenShape: d.round ? 1 : 0, keyNumber: d.keys, keyType: 'normal', deviceName: d.name,
    deviceSource: 8519936, uuid: sim().uuid }
}

// ---- @zos/router -----------------------------------------------------------------------------------
export function replace(o) {
  sim().nav = { how: 'replace', url: o.url, params: o.params }
}
export function push(o) {
  sim().nav = { how: 'push', url: o.url, params: o.params }
}
export function back() {
  sim().nav = { how: 'back' }
}
export function exit() {
  sim().nav = { how: 'exit' }
  sim().log.push('exit')
}
export function home() {
  sim().nav = { how: 'home' }
}

// ---- @zos/interaction ------------------------------------------------------------------------------
export const KEY_SELECT = 1
export const KEY_BACK = 2
export const KEY_UP = 3
export const KEY_DOWN = 4
export const KEY_HOME = 5
export const KEY_SHORTCUT = 6
export const KEY_EVENT_CLICK = 1
export const KEY_EVENT_LONG_PRESS = 2
export const KEY_EVENT_DOUBLE_CLICK = 3
export const KEY_EVENT_PRESS = 4
export const KEY_EVENT_RELEASE = 5
export const GESTURE_UP = 1
export const GESTURE_DOWN = 2
export const GESTURE_LEFT = 3
export const GESTURE_RIGHT = 4
export const MODAL_CONFIRM = 1
export const MODAL_CANCEL = 0
export function onKey(o) {
  sim().onKey = typeof o === 'function' ? o : o.callback
}
export function offKey() {
  sim().onKey = null
}
export function onGesture(o) {
  sim().onGesture = typeof o === 'function' ? o : o.callback
}
export function offGesture() {
  sim().onGesture = null
}
export function showToast(o) {
  sim().log.push('toast: ' + o.content)
}
export function createModal() {
  return { show() {} }
}

// ---- @zos/page / display / app / user --------------------------------------------------------------
export function scrollTo(o) {
  sim().scroll = typeof o === 'number' ? o : o.y
}
export function getScrollTop() {
  return sim().scroll || 0
}
export function setScrollMode() {}
export function setWakeUpRelaunch() {
  sim().log.push('wakeUpRelaunch')
}
export function setPageBrightTime() {
  sim().log.push('brightTime')
}
export function resetPageBrightTime() {}
export function pauseDropWristScreenOff() {}
export function resetDropWristScreenOff() {}
export function queryPermission() {
  return [sim().bgPermission ? 2 : 0]
}
export function requestPermission(o) {
  sim().log.push('requestPermission')
  sim().bgPermission = true
  if (o.callback) o.callback([2])
  return 0
}
export function getProfile() {
  return { age: sim().age, nickName: 'Sim' }
}

// ---- @zos/sensor -----------------------------------------------------------------------------------
export const VIBRATOR_SCENE_SHORT_LIGHT = 1
export const VIBRATOR_SCENE_STRONG_REMINDER = 2
export const VIBRATOR_SCENE_DURATION = 3
export const VIBRATOR_SCENE_DURATION_LONG = 4
export class Vibrator {
  start(o) {
    sim().log.push('vibrate ' + o.mode)
  }
  stop() {}
}
export class HeartRate {
  getCurrent() {
    return sim().bpm
  }
  onCurrentChange(fn) {
    sim().hrListeners.push(fn)
  }
  offCurrentChange() {
    sim().hrListeners = []
  }
}
export class BodyTemperature {
  // like the T-Rex 3 Pro: hundredths of a degree in `value`, `time` a few seconds
  getCurrent() {
    return { value: Math.round(sim().temp * 100), time: 6 }
  }
  // like a watch that measures only while you sleep: one value at 03:00
  getToday() {
    const out = []
    for (let i = 0; i < 288; i++) out.push(i === 36 ? 34.1 : -1000)
    return out
  }
}
export class Time {
  onPerMinute() {}
}
export class Screen {
  getStatus() {
    return 1
  }
}
// the watch's sounds: playing one is logged as 'sound <source> <type>'
function soundSource(name, types, enabled) {
  return class {
    getSourceType() {
      return Object.fromEntries(types.map((t, i) => [t, i]))
    }
    start(type) {
      sim().log.push(`sound ${name} ${types[type]}`)
    }
    stop() {}
    [enabled]() {
      return true
    }
  }
}
export const SystemSounds = soundSource('system', ['ALARM', 'MESSAGE', 'REGULAR', 'ACHIEVE', 'CAMERA', 'ABN_HIGH', 'ABN_LOW', 'SOS'], 'getEnabled')
export const Buzzer = soundSource('buzzer', ['ALARM', 'REMIND_1', 'REMIND_2', 'OPERATE', 'SUCCESS', 'FAILURE'], 'isEnabled')
export function checkSensor() {
  return true
}

// ---- @zos/settings --------------------------------------------------------------------------------
// the watch's language as Zepp numbers it (2 English, 3 Spanish, 6 French, 7 German, 10 Italian, 15 Portuguese)
export function getLanguage() {
  return sim().lang === undefined ? 2 : sim().lang
}

// ---- @zos/fs ---------------------------------------------------------------------------------------
// The app's assets (the language files): plain ASCII, as the build writes them
export const O_RDONLY = 0
const openAssets = {}
let nextFd = 3
function assetBytes(path) {
  const s = sim().assets[path]
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}
export function statAssetsSync(o) {
  return sim().assets[o.path] === undefined ? undefined : { size: sim().assets[o.path].length }
}
export function openAssetsSync(o) {
  if (sim().assets[o.path] === undefined) return -1
  const fd = nextFd++
  openAssets[fd] = o.path
  return fd
}
export function readSync(o) {
  const bytes = assetBytes(openAssets[o.fd])
  new Uint8Array(o.buffer).set(bytes.subarray(0, o.buffer.byteLength))
  return Math.min(bytes.length, o.buffer.byteLength)
}
export function closeSync(fd) {
  delete openAssets[fd]
}
export function readFileSync(o) {
  const v = sim().files[o.path]
  return v === undefined ? undefined : v
}
export function writeFileSync(o) {
  sim().files[o.path] = o.data
}
export function rmSync(o) {
  delete sim().files[o.path]
}

// ---- @zos/alarm / app-service / notification -------------------------------------------------------
export function set(o) {
  const id = sim().nextAlarm++
  sim().alarms[id] = o
  return id
}
export function cancel(id) {
  delete sim().alarms[typeof id === 'object' ? id.id : id]
}
export function start(o) {
  sim().log.push('service start ' + o.file)
  sim().service = true
}
export function stop() {
  sim().service = false
}
export function notify(o) {
  sim().log.push('notify ' + o.title)
}

// ---- zml -------------------------------------------------------------------------------------------
export function BasePage(o) {
  return {
    ...o,
    request(req) {
      sim().requests.push(req)
      const h = sim().phone
      return h ? Promise.resolve(h(req)) : Promise.reject(new Error('no phone'))
    }
  }
}
export function BaseApp(o) {
  return o
}

// ---- @zos/media ---------------------------------------------------------------------------------------
export const id = { PLAYER: 'player', RECORDER: 'recorder' }
// a player that plays the app's sound files: 'sound <file>' when it starts, 'sound end <file>' when it is done
const LENGTH_MS = { 'raw/cue.mp3': 310, 'raw/alarm.mp3': 2270 }
export function create() {
  const listeners = {}
  let timer = 0
  const p = {
    event: { PREPARE: 'prepare', COMPLETE: 'complete', PLAY: 'play', STOP: 'stop' },
    source: { FILE: 'file' },
    addEventListener(ev, fn) {
      ;(listeners[ev] = listeners[ev] || []).push(fn)
    },
    setSource(type, o) {
      p.file = o.file
    },
    prepare() {
      ;(listeners.prepare || []).forEach((f) => f(true))
    },
    start() {
      const file = p.file
      sim().log.push('sound ' + file)
      const ms = LENGTH_MS[file.replace('assets://', '')] || 500
      timer = setTimeout(() => {
        timer = 0
        sim().log.push('sound end ' + file)
        ;(listeners.complete || []).forEach((f) => f())
      }, ms)
    },
    stop() {
      if (timer) clearTimeout(timer)
      timer = 0
    },
    release() {},
    getVolume() {
      return 60
    }
  }
  return p
}
