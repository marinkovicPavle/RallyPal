// Probe screen for RallyPal inside a Zepp racket workout. It answers what the docs do not:
// 1. In which workouts Zepp offers the extension (Padel and Pickleball are missing from the docs list).
// 2. Do taps on the top and bottom half land reliably (each tap is a point for that side)?
// 3. Can the four vibrations (point, game, set, match) be told apart, and is our sound heard?
// 4. Does the score survive wrist down, another workout page, or a restart of the screen by Zepp?
// 5. Do heart rate and workout time reach us (SPORT_DATA widgets, HeartRate sensor, getSportData)?
//
// The score and counters are saved on every tap, so a restart of the screen shows up as "start #2"
// with the score still there.

import { createWidget, widget, prop, align, text_style, sport_data, edit_widget_group_type } from '@zos/ui'
import { localStorage } from '@zos/storage'
import { getSportData } from '@zos/app-access'
import {
  Vibrator,
  HeartRate,
  VIBRATOR_SCENE_SHORT_STRONG,
  VIBRATOR_SCENE_DURATION
} from '@zos/sensor'
import { create, id } from '@zos/media'
import { getDeviceInfo } from '@zos/device'
import { px } from '@zos/utils'

const TICK_MS = 1000
const GAP_MS = 3000
const SPORT_EVERY_TICKS = 5
const STORE_KEY = 'rallypal-proba'
const SOUND_PATHS = ['assets://raw/cue.mp3', 'raw/cue.mp3']
// game: one long buzz; set: two pulses; match: three pulses and a beep
const GAME_MS = 600
const PULSE_MS = 220
const PULSE_GAP_MS = 450

const COLOR = {
  text: 0xffffff,
  muted: 0x9a9a9a,
  accent: 0xd4f02b,
  warn: 0xffb020,
  button: 0x343434,
  pressed: 0x1a1a1a,
  line: 0x282828
}
const { width: DEVICE_WIDTH } = getDeviceInfo()

function clock(ms) {
  const d = new Date(ms)
  const two = (n) => (n < 10 ? '0' : '') + n
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`
}

function fresh(now) {
  return { startedAt: now, lastTickAt: 0, them: 0, you: 0, starts: 0, pauses: 0, stops: 0, sounds: 0, soundOk: 0, last: '' }
}

function load(now) {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const saved = raw ? JSON.parse(raw) : null
    if (saved && typeof saved === 'object' && saved.startedAt) return saved
  } catch (e) {}
  return fresh(now)
}

// centered box of width w (design px) at y (design px), or at x when given
function box(w, y, h, x) {
  const width = px(w)
  const left = x === undefined ? Math.round((DEVICE_WIDTH - width) / 2) : px(x) - Math.round(width / 2)
  return { x: left, y: px(y), w: width, h: px(h) }
}

function text(options) {
  return createWidget(widget.TEXT, {
    color: COLOR.text,
    text_size: px(26),
    align_h: align.CENTER_H,
    align_v: align.CENTER_V,
    text_style: text_style.NONE,
    text: '',
    ...options
  })
}

// The watch delivers taps reliably only to BUTTON widgets, so each half gets an invisible one on top
function cover(b, onClick) {
  return createWidget(widget.BUTTON, { ...b, text: '', normal_src: 'blank.png', press_src: 'blank.png', click_func: onClick })
}

function button(b, label, onClick) {
  return createWidget(widget.BUTTON, {
    ...b,
    text: label,
    text_size: px(22),
    color: COLOR.text,
    radius: Math.round(b.h / 2),
    normal_color: COLOR.button,
    press_color: COLOR.pressed,
    click_func: onClick
  })
}

let vibrator = null
let player = null
let sound = null // { index }

function stopVibration() {
  try {
    if (vibrator) vibrator.stop()
  } catch (e) {}
}

function vibrate(mode, stopAfterMs) {
  try {
    if (!vibrator) vibrator = new Vibrator()
    vibrator.stop()
    vibrator.start({ mode })
    if (stopAfterMs) setTimeout(stopVibration, stopAfterMs)
  } catch (e) {}
}

function pulses(count) {
  for (let i = 0; i < count; i++) setTimeout(() => vibrate(VIBRATOR_SCENE_DURATION, PULSE_MS), i * PULSE_GAP_MS)
}

DataWidget({
  state: {},

  onInit() {
    const now = Date.now()
    this.state.s = load(now)
    this.state.s.starts++
    this.state.pausedAt = 0
    this.state.duration = '-'
    this.state.hr = 0
    this.note(now, `start #${this.state.s.starts}`)
  },

  build() {
    this.state.ui = this.createUi()
    this.startHeartRate()
    this.render()
    this.startTimer()
  },

  onResume() {
    const now = Date.now()
    const away = this.state.pausedAt ? Math.round((now - this.state.pausedAt) / 1000) : 0
    this.note(now, away ? `nazad posle ${away}s` : 'nazad')
    this.state.pausedAt = 0
    this.state.s.lastTickAt = now
    this.startTimer()
    this.onTick()
  },

  onPause() {
    const now = Date.now()
    this.state.pausedAt = now
    this.state.s.pauses++
    this.note(now, 'pauza (drugi ekran)')
  },

  onDestroy() {
    this.stopTimer()
    this.stopHeartRate()
    this.save()
  },

  startTimer() {
    if (!this.state.timer) this.state.timer = setInterval(() => this.onTick(), TICK_MS)
  },

  stopTimer() {
    if (this.state.timer) {
      clearInterval(this.state.timer)
      this.state.timer = null
    }
  },

  startHeartRate() {
    try {
      const sensor = new HeartRate()
      const onChange = () => {
        try {
          this.state.hr = sensor.getCurrent()
        } catch (e) {}
      }
      sensor.onCurrentChange(onChange)
      this.state.heart = { sensor, onChange }
      this.state.hr = sensor.getLast() || 0
    } catch (e) {
      this.state.hr = -1
    }
  },

  stopHeartRate() {
    try {
      if (this.state.heart) this.state.heart.sensor.offCurrentChange(this.state.heart.onChange)
    } catch (e) {}
  },

  onTick() {
    const s = this.state.s
    const now = Date.now()
    // a gap Zepp did not announce with onPause means the screen was stopped while it looked shown
    if (s.lastTickAt && now - s.lastTickAt > GAP_MS && !this.state.pausedAt) {
      s.stops++
      this.note(now, `tiho stalo ${Math.round((now - s.lastTickAt) / 1000)}s`)
    }
    s.lastTickAt = now
    this.state.ticks = (this.state.ticks || 0) + 1
    if (this.state.ticks % SPORT_EVERY_TICKS === 1) this.readDuration()
    this.render()
  },

  readDuration() {
    try {
      getSportData({ type: 'duration' }, (result) => {
        if (!result || result.code !== 0) {
          this.state.duration = `kod ${result ? result.code : '?'}`
          return
        }
        try {
          const item = JSON.parse(result.data)[0] || {}
          this.state.duration = item.duration || '-'
        } catch (e) {
          this.state.duration = 'json'
        }
      })
    } catch (e) {
      this.state.duration = 'api'
    }
  },

  point(side) {
    this.state.s[side]++
    vibrate(VIBRATOR_SCENE_SHORT_STRONG)
    this.save()
    this.render()
  },

  game() {
    vibrate(VIBRATOR_SCENE_DURATION, GAME_MS)
  },

  set() {
    pulses(2)
  },

  match() {
    pulses(3)
    this.state.s.sounds++
    this.playSound(0)
    this.save()
    this.render()
  },

  playSound(index) {
    try {
      if (!player) {
        player = create(id.PLAYER)
        player.addEventListener(player.event.PREPARE, (ok) => {
          if (!sound) return
          if (ok) {
            try {
              player.start()
              this.state.s.soundOk++
              this.note(Date.now(), `zvuk pušten (${sound.index + 1})`)
              sound = null
              return
            } catch (e) {}
          }
          this.nextSound()
        })
        player.addEventListener(player.event.COMPLETE, () => {
          try {
            player.stop()
          } catch (e) {}
        })
      }
      try {
        player.stop()
      } catch (e) {}
      sound = { index }
      player.setSource(player.source.FILE, { file: SOUND_PATHS[index] })
      player.prepare()
    } catch (e) {
      sound = { index }
      this.nextSound()
    }
  },

  nextSound() {
    const next = sound ? sound.index + 1 : SOUND_PATHS.length
    sound = null
    if (next < SOUND_PATHS.length) return this.playSound(next)
    this.note(Date.now(), 'zvuk greška')
  },

  note(now, message) {
    this.state.s.last = `${clock(now)} ${message}`
    this.save()
    this.render()
  },

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.state.s))
    } catch (e) {}
  },

  reset() {
    const now = Date.now()
    this.state.s = fresh(now)
    this.state.s.starts = 1
    this.note(now, 'reset')
  },

  createUi() {
    const mid = Math.round(DEVICE_WIDTH / 2)
    // heart rate and workout time from Zepp's own workout, like the real screen will have
    createWidget(widget.IMG, { x: mid - px(118), y: px(52), src: 'heart.png' })
    createWidget(widget.SPORT_DATA, {
      edit_id: 1,
      x: mid - px(88),
      y: px(40),
      w: px(90),
      h: px(46),
      category: edit_widget_group_type.SPORTS,
      default_type: sport_data.HR,
      text_size: px(30),
      text_color: COLOR.text,
      text_x: 0,
      text_y: 0,
      text_w: px(90),
      text_h: px(46),
      line_color: 0x000000
    })
    createWidget(widget.SPORT_DATA, {
      edit_id: 2,
      x: mid + px(8),
      y: px(40),
      w: px(120),
      h: px(46),
      category: edit_widget_group_type.SPORTS,
      default_type: sport_data.DURATION_NET,
      text_size: px(30),
      text_color: COLOR.muted,
      text_x: 0,
      text_y: 0,
      text_w: px(120),
      text_h: px(46),
      line_color: 0x000000
    })
    const ui = {
      sensors: text({ ...box(360, 88, 28), text_size: px(19), color: COLOR.muted }),
      themLabel: text({ ...box(200, 122, 32), text_size: px(24), color: COLOR.muted, text: 'THEM (tap)' }),
      them: text({ ...box(200, 152, 64), text_size: px(56), color: COLOR.accent }),
      youLabel: text({ ...box(200, 270, 32), text_size: px(24), color: COLOR.muted, text: 'YOU (tap)' }),
      you: text({ ...box(200, 300, 64), text_size: px(56), color: COLOR.accent }),
      counts: text({ ...box(340, 376, 28), text_size: px(19), color: COLOR.muted }),
      last: text({ ...box(320, 402, 28), text_size: px(19), color: COLOR.muted })
    }
    createWidget(widget.FILL_RECT, { ...box(400, 239, 2), color: COLOR.line })
    // invisible tap areas over each half, drawn after the texts so they get the touch
    cover(box(360, 112, 102), () => this.point('them'))
    cover(box(360, 266, 104), () => this.point('you'))
    button(box(96, 216, 48, 128), 'GEM', () => this.game())
    button(box(96, 216, 48, 240), 'SET', () => this.set())
    button(box(96, 216, 48, 352), 'MEČ', () => this.match())
    button(box(104, 428, 34), 'RESET', () => this.reset())
    return ui
  },

  render() {
    const ui = this.state.ui
    if (!ui) return
    const s = this.state.s
    const set = (w, value) => w.setProperty(prop.TEXT, String(value))
    const hr = this.state.hr === -1 ? 'greška' : this.state.hr || '-'
    set(ui.sensors, `senzor ${hr} · vreme ${this.state.duration}`)
    set(ui.them, s.them)
    set(ui.you, s.you)
    set(ui.counts, `start ${s.starts} · pauze ${s.pauses} · stalo ${s.stops} · zvuk ${s.soundOk}/${s.sounds}`)
    set(ui.last, s.last)
    ui.counts.setProperty(prop.COLOR, s.stops ? COLOR.warn : COLOR.muted)
  }
})
