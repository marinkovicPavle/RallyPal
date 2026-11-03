// The match being played (approved drawing 4, square 15): heart rate and time on top, the opponent's row,
// UNDO and MENU, your row, and a label at the bottom (SET POINT, BREAK POINT, the pickleball call).
// Keys (decision 27): upper right their point, lower right yours, upper left undo, lower left menu; a tap
// on the upper or lower half of the screen gives that side the point. Each key's tab has the color of what
// it presses (decision 34): the opponent's white box, your lime box, the purple UNDO, the gray MENU; the
// point tabs say what the point gives (decision 35). The menu (drawing 5) changes the
// server, ends the match, starts a new one or leaves (drawing 6) with the match kept.
//
// The match is its events (shared/match.js), saved after every point (decision 28), so the page can close
// at any moment (screen off, leaving) and open again exactly where the match is.

import { HeartRate } from '@zos/sensor'
import { setWakeUpRelaunch, setPageBrightTime, resetPageBrightTime, pauseDropWristScreenOff, resetDropWristScreenOff } from '@zos/display'
import {
  ROUND, KEYS, C, W, H, MX, px, sy, around, at, text, setText, rect, img, cover, marker, markerSize, pillButton, purpleButton, textWidth,
  fitSize, HEART
} from '../utils/ui'
import { screen, heading, confirm, question, toast, LIST } from '../utils/widgets'
import { createNav, goPage, quit } from '../utils/nav'
import { pointBuzz, endsBuzz, restBuzz, stopAll } from '../utils/feedback'
import { trial } from '../utils/licence'
import { loadActive, saveActive, clearActive, putMatch, settingsValues, loadHr, saveHr } from '../utils/data'
import { startMonitor, stopMonitor, markAlive, markGone, takeBg } from '../utils/bg'
import { countMatch } from '../utils/licence'
import { view, addPoint, undo, setServer, endMatch, duration, pointPreview, idle, lastSec } from '../shared/match'
import { makeRecord, addHr, mergeHr } from '../shared/record'
import { hrMaxOf, zonesFromCurve } from '../shared/insights'
import { getProfile } from '@zos/user'
import { teamName, partnerName } from '../shared/setups'
import { clock } from '../shared/format'
import { t } from '../shared/i18n'

const SAVE_HR_MS = 30000
const ALIVE_MS = 10000
const KEEP_ON_MS = 4 * 60 * 60 * 1000

// the numbers of the drawing (nacrt.py score_row, nacrt2.py sq_score_row)
const D = ROUND
  ? {
      hrHeart: [176, 62], hrX: 196, hrSize: 28, dur: [300, 62], durSize: 28,
      rows: [158, 322], nameX: 78, nameDy: -16, nameSize: 26, nameMax: 150, sideDy: 18, sideSize: 17, sideMax: 150,
      markerD: 24, setsX0: 218, setSize: 32, gamesSize: 44, box: [378, 84, 76], ptsSize: 48,
      midY: 240, line: [40, 440], btn: [178, 302, 108, 50], btnSize: 22, labelY: 420, labelSize: 26
    }
  : {
      hrHeart: [140, 44], hrX: 158, hrSize: 26, dur: [246, 44], durSize: 26,
      rows: [134, 314], nameX: 46, nameDy: -16, nameSize: 25, nameMax: 130, sideDy: 16, sideSize: 16, sideMax: 130,
      markerD: 22, setsX0: 166, setSize: 30, gamesSize: 42, box: [314, 80, 72], ptsSize: 46,
      midY: 224, line: [24, 366], btn: [137, 253, 104, 48], btnSize: 21, labelY: 402, labelSize: 25
    }

Page({
  state: {},

  onInit() {
    const st = this.state
    st.m = loadActive()
    if (!st.m) {
      st.gone = true
      return
    }
    st.v = settingsValues()
    st.bpm = 0
    st.live = {}
    const now = Date.now()
    st.hr = loadHr(st.m.id)
    // what the background service recorded while the app was closed
    const bg = takeBg(st.m.id)
    if (bg) {
      const tmp = { hr: st.hr }
      mergeHr(tmp, bg.hr)
      st.hr = tmp.hr
    }
    st.hrSavedAt = now
    st.aliveAt = now
    markAlive(now)
    startMonitor(st.m)
    try {
      setWakeUpRelaunch({ relaunch: true })
    } catch (e) {}
    if (st.v.screen === 'always') {
      try {
        setPageBrightTime({ brightTime: KEEP_ON_MS })
        pauseDropWristScreenOff({ duration: KEEP_ON_MS })
      } catch (e) {}
    }
    this.startSensor()
  },

  build() {
    const st = this.state
    if (!st.m) return goPage('index')
    st.nav = createNav(() => this.openMenu())
    // a match that was won but not saved yet (the app closed right after the last point)
    if (view(st.m).done) return this.finish('summary')
    st.nav.show((n) => this.matchScreen(n))
    st.timer = setInterval(() => this.tick(), 1000)
  },

  onDestroy() {
    const st = this.state
    if (st.timer) clearInterval(st.timer)
    this.stopSensor()
    if (st.nav) st.nav.destroy()
    stopAll()
    try {
      resetPageBrightTime()
      resetDropWristScreenOff()
    } catch (e) {}
    if (st.m && !st.gone) {
      saveActive(st.m)
      saveHr(st.m.id, st.hr)
      markGone()
    }
  },

  // ---- heart rate --------------------------------------------------------------------------------

  startSensor() {
    const st = this.state
    try {
      st.hrSensor = new HeartRate()
      st.onHr = () => {
        try {
          st.bpm = st.hrSensor.getCurrent()
        } catch (e) {}
      }
      st.hrSensor.onCurrentChange(st.onHr)
      st.bpm = st.hrSensor.getCurrent() || 0
    } catch (e) {}
  },

  stopSensor() {
    const st = this.state
    try {
      if (st.hrSensor && st.onHr) st.hrSensor.offCurrentChange(st.onHr)
    } catch (e) {}
  },

  tick() {
    const st = this.state
    if (st.gone) return
    const now = Date.now()
    const sec = duration(st.m, now, false)
    if (st.bpm && !idle(st.m, now)) addHr({ hr: st.hr }, sec, st.bpm)
    const L = st.live
    if (L.hr) setText(L.hr, st.bpm ? String(st.bpm) : '--')
    if (L.dur) setText(L.dur, clock(sec))
    // the rest countdown: the label counts down; at its end a vibration and the usual label again
    if (st.restOn) {
      const left = this.restLeft(view(st.m), now)
      if (left > 0) setText(L.label, this.restText(view(st.m), left))
      else if (st.restBuzzed !== lastSec(st.m)) {
        st.restBuzzed = lastSec(st.m)
        st.restOn = false
        restBuzz()
        st.nav.redraw()
      }
    }
    if (now - st.hrSavedAt >= SAVE_HR_MS) {
      st.hrSavedAt = now
      saveHr(st.m.id, st.hr)
    }
    if (now - st.aliveAt >= ALIVE_MS) {
      st.aliveAt = now
      markAlive(now)
    }
  },

  // ---- actions -----------------------------------------------------------------------------------

  point(team) {
    const st = this.state
    if (st.gone) return
    const res = addPoint(st.m, team, Date.now())
    if (!res) return
    saveActive(st.m)
    if (res === 'match') return this.finish('summary')
    pointBuzz(res)
    if (st.v.changeEnds !== false && view(st.m).changeEnds) endsBuzz()
    st.nav.redraw()
  },

  undoPoint() {
    const st = this.state
    if (st.gone || !undo(st.m)) return
    saveActive(st.m)
    st.nav.redraw()
  },

  openMenu() {
    const st = this.state
    st.live = {}
    st.nav.push((n) => this.menu(n))
  },

  // Saves the match (ended by hand when it is not over) and opens the summary, or the start screen for
  // "New match". A match without a single point is not kept. winner: who won a match ended by hand.
  finish(next, winner) {
    const st = this.state
    if (st.gone) return
    const now = Date.now()
    endMatch(st.m, now, winner)
    st.gone = true
    stopMonitor()
    markGone()
    if (!view(st.m).rallies) {
      clearActive()
      toast(t('empty'))
      return goPage('index')
    }
    st.m.hr = st.hr
    // the match ends at its last point (or a minute after it, when it was ended much later)
    const rec = makeRecord(st.m, st.m.start + duration(st.m, now, true) * 1000)
    // heart rate zones, from the maximum set then (ROAST-v2 item 4)
    const max = hrMaxOf(st.v, age())
    const zones = zonesFromCurve(rec.curve, rec.dur, max)
    if (zones) rec.zones = { max, sec: zones }
    putMatch(rec)
    countMatch(rec)
    clearActive()
    if (next === 'index') goPage('index')
    else goPage('summary', { id: rec.id, fresh: 1 })
  },

  leave() {
    const st = this.state
    saveActive(st.m)
    saveHr(st.m.id, st.hr)
    markGone()
    st.gone = true
    quit()
  },

  // ---- the match screen --------------------------------------------------------------------------

  matchScreen(nav) {
    const st = this.state
    const m = st.m
    const v = view(m)
    const R = ROUND
    // the point words change with every point: the tabs are known before the screen draws them
    const hints = this.keyHints()
    nav.preHints(hints)
    screen()
    const live = {}
    // heart rate and time
    img(px(D.hrHeart[0]) - Math.round(HEART.w / 2), sy(D.hrHeart[1]) - Math.round(HEART.h / 2), 'heart.png')
    live.hr = at(D.hrX, D.hrHeart[1], 80, st.bpm ? String(st.bpm) : '--', D.hrSize, C.white, 'lm')
    live.dur = at(D.dur[0], D.dur[1], 130, clock(duration(m, Date.now(), false)), D.durSize, C.gray)
    // the opponents above, you below (decision 8)
    this.row(1, D.rows[0], v)
    this.row(0, D.rows[1], v)
    const left = this.restLeft(v, Date.now())
    st.restOn = left > 0
    const label = st.restOn ? this.restText(v, left) : this.labelText(v)
    if (label) {
      const lh = Math.round(D.labelSize * 1.4)
      const room = R ? Math.min(380, chordAt(D.labelY, lh)) : 360
      // a countdown changes its digits every second: its size fits the widest of them from the start
      const size = st.restOn
        ? Math.min(...['0:00', '4:44', '8:88'].map((d) => fitSize(this.restText(v, 0).replace(/\S+$/, d), D.labelSize, px(room), 12)))
        : D.labelSize
      live.label = at(MX, D.labelY, room, label, size, C.lime, 'mm', { min: Math.min(15, size) })
    }
    // a tap on a half of the screen is that side's point; the buttons in the middle stay free. "Points by
    // tap" off: only the keys give points (a watch with one key always keeps the taps)
    const [ux, mx, bw, bh] = D.btn
    const gapTop = sy(D.midY - bh / 2) - px(6)
    const gapBottom = sy(D.midY + bh / 2) + px(6)
    if (st.v.tapPoints !== false || KEYS < 2) {
      cover({ x: 0, y: 0, w: W, h: gapTop }, () => this.point(1))
      cover({ x: 0, y: gapBottom, w: W, h: H - gapBottom }, () => this.point(0))
    }
    // the line through the middle, broken where the buttons are
    const ly = sy(D.midY) - px(1)
    const l0 = D.line[0]
    const l1 = D.line[1]
    rect({ x: px(l0), y: ly, w: px(ux - bw / 2 - 8 - l0), h: px(2) }, C.dark)
    rect({ x: px(mx + bw / 2 + 8), y: ly, w: px(l1 - mx - bw / 2 - 8), h: px(2) }, C.dark)
    purpleButton(around(ux, D.midY, bw, bh), t('match.undo'), D.btnSize, () => this.undoPoint())
    pillButton(around(mx, D.midY, bw, bh), t('match.menu'), D.btnSize, () => this.openMenu())
    st.live = live
    const them = () => this.point(1)
    const me = () => this.point(0)
    const back = () => this.undoPoint()
    const menu = () => this.openMenu()
    if (KEYS >= 4) return { keys: { primary: them, back: me, tertiary: back, secondary: menu, gesture: menu }, hints }
    if (KEYS >= 2) return { keys: { primary: them, secondary: me, gesture: menu }, hints }
    return { keys: { primary: menu, gesture: menu }, hints }
  },

  // Each tab in the color of what its key presses (decision 34); the point keys say what the point gives
  // that side (decision 35). One key: the key opens the menu.
  keyHints() {
    const m = this.state.m
    const gives = (team) => {
      const p = pointPreview(m, team)
      return p === 'game' ? t('tab.game') : p === 'serve' ? t('tab.serve') : p || ''
    }
    if (KEYS >= 4) return { primary: [C.white, gives(1)], back: [C.lime, gives(0)], tertiary: [C.purple], secondary: [C.tab] }
    if (KEYS >= 2) return { primary: [C.white, gives(1)], secondary: [C.lime, gives(0)] }
    return { primary: [C.tab] }
  },

  // One team's row: serve marker, name and serve side, sets (gray) and games (white), points in the box
  row(team, y, v) {
    const st = this.state
    const name = teamName(team, st.m.names, st.m.doubles)
    const nh = Math.round(D.nameSize * 1.4)
    const ns = fitSize(name, D.nameSize, px(D.nameMax), 16)
    const nameW = Math.ceil(textWidth(name, px(ns)))
    text({ x: px(D.nameX), y: sy(y + D.nameDy - nh / 2), w: nameW + 4, h: px(nh) }, name, ns, C.white, { align: 'left', min: 16 })
    let sideW = 0
    if (v.server === team) {
      const ms = markerSize(D.markerD)
      marker(v.sport, px(D.nameX - 8) - ms / 2, sy(y + D.nameDy), D.markerD)
      const side = this.sideText(v)
      if (side) {
        const ss = fitSize(side, D.sideSize, px(D.sideMax), 13)
        sideW = Math.ceil(textWidth(side, px(ss)))
        const sh = Math.round(D.sideSize * 1.4)
        text({ x: px(D.nameX), y: sy(y + D.sideDy - sh / 2), w: sideW + 2, h: px(sh) }, side, ss, C.lime, { align: 'left', min: 13 })
      }
    }
    this.counts(team, y, v, px(D.nameX) + Math.max(nameW, sideW) + px(12))
    const [bx, bw, bh] = D.box
    const b = around(bx, y, bw, bh)
    rect(b, team === 1 ? C.white : C.lime, 18)
    text(b, v.shown[team], D.ptsSize, C.black, { min: 30 })
  },

  // Sets won before (gray) and games in this set (white) between the name and the box, as on the drawing
  // when they fit; nearer the name and then smaller when they don't; as the last resort only the games
  // (or for sports without sets the games won).
  counts(team, y, v, minLeft) {
    const tennis = v.model === 'tennis'
    let items = v.sets.map((s) => ({ s: String(s.s[team]), big: false }))
    if (tennis && v.tb !== 'super') items.push({ s: String(v.games[team]), big: true })
    if (v.model === 'total' || !items.length) return
    const right = px(D.box[0] - D.box[1] / 2 - 10)
    const gap = px(12)
    let ss = D.setSize
    let gs = D.gamesSize
    const place = () => {
      const ws = items.map((it) => Math.ceil(textWidth(it.s, px(it.big ? gs : ss))))
      const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)
      let start = Math.max(minLeft, px(D.setsX0) - Math.round(ws[0] / 2))
      if (start + total > right) start = Math.max(minLeft, right - total)
      return start + total <= right ? { ws, start } : null
    }
    let fit = place()
    while (!fit && ss > 22) {
      ss -= 2
      gs -= 3
      fit = place()
    }
    if (!fit) {
      items = tennis ? items.slice(-1) : [{ s: String(v.won[team]), big: true }]
      ss = D.setSize
      gs = D.gamesSize
      fit = place()
    }
    if (!fit) return
    let x = fit.start
    items.forEach((it, i) => {
      const size = it.big ? gs : ss
      const h = px(Math.round(size * 1.4))
      text({ x, y: sy(y) - Math.round(h / 2), w: fit.ws[i] + 2, h }, it.s, size, it.big ? C.white : C.gray, { min: size })
      x += fit.ws[i] + gap
    })
  },

  // "serve right", in doubles "you · right" / "Ana · right", table tennis "serve 1 of 2"
  sideText(v) {
    const st = this.state
    if (st.v.serveDisplay !== 'full') return ''
    const names = st.m.names || {}
    const who = v.doubles && v.server === 0 ? (v.player === 0 ? t('who.you') : names.partner || t('who.partner')) : null
    if (v.model === 'tt') {
      const n = v.serveNo
      const of = v.serveOf
      if (who) return of > 1 ? t('side.whoCount', { who, n, m: of }) : t('side.who', { who })
      return of > 1 ? t('side.count', { n, m: of }) : t('side.one')
    }
    if (!v.side) return who ? t('side.who', { who }) : ''
    const right = v.side === 'R'
    if (who) return t(right ? 'side.whoRight' : 'side.whoLeft', { who })
    return t(right ? 'side.right' : 'side.left')
  },

  // the bottom line: SET POINT, MATCH POINT...; pickleball the score call ("7-5-2"); a round to a
  // total the points still to play
  // seconds of rest still to go (full version, "Rest timer" on), 0 when none
  restLeft(v, now) {
    const st = this.state
    if (!v.rest || st.v.restTimer === false || !trial().licensed) return 0
    return Math.max(0, v.rest - (duration(st.m, now, false) - lastSec(st.m)))
  },

  // "REST 1:24", or "CHANGE ENDS 1:24" at a change of ends
  restText(v, left) {
    const st = this.state
    const word = v.changeEnds && st.v.changeEnds !== false ? t('label.change_ends') : t('label.rest')
    return `${word} ${clock(left)}`
  },

  labelText(v) {
    const st = this.state
    const ends = v.changeEnds && st.v.changeEnds !== false ? t('label.change_ends') : ''
    const base = this.pointLabel(v)
    return ends && base ? `${ends} · ${base}` : ends || base
  },

  pointLabel(v) {
    const st = this.state
    const lab = v.label && st.v.labels ? t('label.' + v.label.key) : ''
    if (v.model === 'sideout') return lab ? `${v.call} · ${lab}` : v.call || ''
    if (v.model === 'total') return lab || t('label.left', { n: v.left })
    return lab
  },

  // ---- menu and its screens ----------------------------------------------------------------------

  menu(nav) {
    const R = ROUND
    screen()
    heading(t('menu.title'), C.white, R ? 62 : 30, 30)
    const rows = [
      [t('menu.server'), C.white, () => nav.push((n) => this.changeServer(n))],
      [t('menu.end'), C.red, () => nav.push((n) => this.confirmEnd(n))],
      [t('menu.new'), C.white, () => nav.push((n) => this.confirmNew(n))],
      [t('menu.leave'), C.white, () => nav.push((n) => this.confirmLeave(n))],
      [t('menu.back'), C.gray, () => nav.back()]
    ]
    let y = R ? 116 : 84
    const step = R ? 64 : 66
    rows.forEach((r) => {
      const b = around(MX, y, R ? 324 : 340, 54)
      rect(b, C.pill, 27)
      text({ x: b.x + px(20), y: b.y, w: b.w - px(40), h: b.h }, r[0], 23, r[1], { min: 17 })
      cover(b, r[2])
      y += step
    })
    return { keys: {}, hints: {} }
  },

  changeServer(nav) {
    const st = this.state
    const m = st.m
    const v = view(m)
    const names = m.names || {}
    const set = (team, player) => {
      if (setServer(m, team, player, Date.now())) saveActive(m)
      nav.root()
    }
    const them = { label: teamName(1, names, m.doubles), chosen: v.server === 1, onPick: () => set(1, v.server === 1 ? v.player : 0) }
    const you = { label: teamName(0, names), chosen: v.server === 0 && v.player === 0, onPick: () => set(0, 0) }
    const options = [them]
    if (m.doubles) options.push({ label: partnerName(names), chosen: v.server === 0 && v.player === 1, onPick: () => set(0, 1) })
    options.push(you)
    return question({ question: t('serve.now'), options, back: () => nav.back() }, nav)
  },

  // End match, then who won (ROAST item 17): a retirement or the court time running out still counts.
  // A round to a total has its winner by the points; a match without a point has none to ask about.
  confirmEnd(nav) {
    const v = view(this.state.m)
    const ask = v.model !== 'total' && v.rallies > 0
    const onOk = ask ? () => nav.push((n) => this.whoWon(n)) : () => this.finish('summary')
    return confirm({ title: t('end.title'), body: t('end.body'), ok: t('end.ok'), okColor: C.red, cancel: t('cancel'), onOk }, nav)
  },

  whoWon(nav) {
    const m = this.state.m
    const names = m.names || {}
    return question(
      {
        question: t('won.title'),
        options: [
          { label: teamName(1, names, m.doubles), onPick: () => this.finish('summary', 1) },
          { label: teamName(0, names), onPick: () => this.finish('summary', 0) },
          { label: t('won.none'), onPick: () => this.finish('summary', null) }
        ],
        back: () => nav.back()
      },
      nav
    )
  },

  confirmNew(nav) {
    return confirm(
      { title: t('new.title'), body: t('new.body'), ok: t('new.ok'), cancel: t('cancel'), onOk: () => this.finish('index') },
      nav
    )
  },

  confirmLeave(nav) {
    return confirm(
      { title: t('leave.title'), body: t('leave.body'), ok: t('leave.ok'), cancel: t('leave.stay'), onOk: () => this.leave() },
      nav
    )
  }
})

// the wearer's age from the Zepp profile (0 when the watch doesn't say)
function age() {
  try {
    return Number(getProfile().age) || 0
  } catch (e) {
    return 0
  }
}

// width (design units) of the circle at a text line centered on design y, with a margin
function chordAt(cy, h) {
  const r = 240
  const far = Math.max(Math.abs(cy - h / 2 - r), Math.abs(cy + h / 2 - r))
  return far >= r ? 120 : Math.round(2 * Math.sqrt(r * r - far * far) - 28)
}
