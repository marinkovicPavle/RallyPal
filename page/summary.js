// The end of a match (approved drawing 7): the result, the score, three statistics, the heart rate and
// REMATCH / DONE. Opened right after the match ({ id, fresh: 1 }): it vibrates for the match and sends
// the match to the phone.
// UNDO (the button under REMATCH / DONE on every watch, and the upper left key on watches with 4 keys or
// more) undoes the last point, or the ending of a match ended by hand, and goes back to the match: a match
// point given to the wrong side can be fixed. Only right after the match (decision 33).

import { BasePage } from '@zeppos/zml/base-page'
import { ROUND, KEYS, C, K, MX, px, sy, around, at, text, img, marker, markerSize, limeButton, pillButton, purpleButton, textWidth, fitSize,
  chord, HEART } from '../utils/ui'
import { screen, toast } from '../utils/widgets'
import { createNav, goPage, parseParams } from '../utils/nav'
import { pointBuzz } from '../utils/feedback'
import { getMatch, deleteMatch, loadOutbox, loadActive, saveActive, saveHr } from '../utils/data'
import { startMonitor } from '../utils/bg'
import { syncWithPhone } from '../utils/sync'
import { trial, wasCounted } from '../utils/licence'
import { trialLine } from '../shared/licence'
import { undo } from '../shared/match'
import { matchOf } from '../shared/record'
import { keyRows, resultLine } from '../shared/stats'
import { clock, prettyScore } from '../shared/format'
import { sportName } from '../shared/setups'
import { t } from '../shared/i18n'

// a key pressed again by habit, or a second quick tap on the lower half, right after the match point must
// not undo it, start a rematch or close the summary: keys and buttons wait this long
const GUARD_MS = 1200

// the numbers of the drawing (nacrt.py summary); square laid out the same way
const D = ROUND
  ? {
      resY: 72, resSize: 34, markerD: 28, scoreY: 128, scoreSize: 34, subY: 168, subSize: 22,
      rowY: 214, rowStep: 36, labelX: 96, valueX: 384, labelSize: 24, valueSize: 26,
      hrY: 326, hrSize: 24, btnY: 378, rematch: [176, 132], done: [306, 104], btnH: 52, btnSize: 21,
      undoY: 438, undoW: 104, undoH: 38, undoSize: 17
    }
  : {
      resY: 40, resSize: 32, markerD: 26, scoreY: 92, scoreSize: 32, subY: 128, subSize: 20,
      rowY: 170, rowStep: 34, labelX: 36, valueX: 354, labelSize: 22, valueSize: 24,
      hrY: 276, hrSize: 22, btnY: 334, rematch: [133, 160], done: [281, 112], btnH: 58, btnSize: 22,
      undoY: 404, undoW: 120, undoH: 44, undoSize: 19
    }

const TONE = { lime: C.lime, red: C.red, gray: C.lgray }

Page(
  BasePage({
    state: {},

    onInit(params) {
      const st = this.state
      st.params = parseParams(params)
      st.rec = st.params.id ? getMatch(st.params.id) : null
      st.openedAt = Date.now()
    },

    build() {
      const st = this.state
      if (!st.rec) return goPage('index')
      st.nav = createNav(() => this.done())
      st.nav.show((n) => this.main(n))
      if (st.params.fresh) {
        pointBuzz('match')
        // in the free trial: how many free matches are left, or that this was the last one (as SaunaPal)
        const c = wasCounted(st.rec.id)
        if (c.counted) toast(c.last ? t('trial.lastMatch') : trialLine(trial()))
      }
      syncWithPhone(this, { onlyId: st.rec.id })
    },

    onDestroy() {
      this.state.gone = true
      if (this.state.nav) this.state.nav.destroy()
    },

    done() {
      goPage('index')
    },

    // after the last free match the lime button is UNLOCK (as SaunaPal) and opens the unlock screen
    rematch() {
      const rec = this.state.rec
      if (trial().locked) return goPage('unlock')
      goPage('index', { rematch: rec.setup || rec.sport })
    },

    // The match again without its last event; the record goes (the phone deletes it too if it has it)
    undoLast() {
      const st = this.state
      if (!st.params.fresh || st.undoing || loadActive()) return
      st.undoing = true
      const m = matchOf(st.rec)
      undo(m)
      const hr = m.hr || []
      delete m.hr
      const sent = !loadOutbox().some((x) => x.id === m.id && x.op === 'upsert')
      deleteMatch(m.id, sent)
      saveActive(m)
      saveHr(m.id, hr)
      startMonitor(m)
      goPage('match')
    },

    main(nav) {
      const st = this.state
      const rec = st.rec
      const R = ROUND
      screen()
      this.result(rec)
      this.score(rec)
      const sroom = this.room(D.subY, D.subSize)
      let sub = [rec.title, clock(rec.dur)].filter((x) => x).join(' · ')
      if (textWidth(sub, px(16)) > px(sroom - 6)) sub = `${sportName(rec.sport)} · ${clock(rec.dur)}`
      at(MX, D.subY, sroom, sub, D.subSize, C.gray, 'mm', { min: 15 })
      let y = D.rowY
      const span = D.valueX - D.labelX
      keyRows(rec).forEach((r) => {
        const vw = Math.min(Math.ceil(textWidth(r[1], px(D.valueSize)) / K) + 4, Math.round(span * 0.45))
        const lh = Math.round(D.valueSize * 1.4)
        text({ x: px(D.labelX), y: sy(y - lh / 2), w: px(span - vw - 10), h: px(lh) }, r[0], D.labelSize, C.gray, { align: 'left', min: 16 })
        text({ x: px(D.valueX - vw), y: sy(y - lh / 2), w: px(vw), h: px(lh) }, r[1], D.valueSize, C.white, { align: 'right', min: 18 })
        y += D.rowStep
      })
      if (rec.hrAvg) this.heartLine(rec)
      const [rx, rw] = D.rematch
      const [dx, dw] = D.done
      // keys and buttons wait a moment (see GUARD_MS)
      const guard = (fn) => () => {
        if (Date.now() - st.openedAt >= GUARD_MS) fn()
      }
      const done = () => this.done()
      const rematch = () => this.rematch()
      const canUndo = !!st.params.fresh
      // REMATCH, or UNLOCK once the free matches are used up; a longer word makes the button wider to the left
      const lime = trial().locked ? t('home.unlock') : t('sum.rematch')
      // as wide as the word needs, up to the edge of the screen (the text gets smaller after that)
      const lw = Math.min(R ? 164 : 196, Math.max(rw, Math.ceil(textWidth(lime, px(D.btnSize)) / K) + 32))
      limeButton(around(rx + (rw - lw) / 2, D.btnY, lw, D.btnH), lime, D.btnSize, guard(rematch))
      pillButton(around(dx, D.btnY, dw, D.btnH), t('sum.done'), D.btnSize, guard(done))
      if (canUndo) {
        const label = t('match.undo')
        const uw = Math.max(D.undoW, Math.ceil(textWidth(label, px(D.undoSize)) / K) + 32)
        purpleButton(around(MX, D.undoY, uw, D.undoH), label, D.undoSize, guard(() => this.undoLast()))
      }
      if (KEYS >= 4) {
        const hints = { primary: [C.lime] }
        if (canUndo) hints.tertiary = [C.purple]
        return {
          keys: { primary: guard(rematch), back: guard(done), tertiary: canUndo ? guard(() => this.undoLast()) : null, gesture: done },
          hints
        }
      }
      if (KEYS >= 2) {
        return { keys: { primary: guard(rematch), secondary: guard(done), gesture: done }, hints: { primary: [C.lime], secondary: [C.tab] } }
      }
      return { keys: { primary: guard(done), gesture: done }, hints: { primary: [C.tab] } }
    },

    // the width (design units) a line at design y has on this screen
    room(y, size) {
      const h = Math.round(size * 1.4)
      return Math.min(ROUND ? 400 : 360, chord(y - h / 2, h, 16))
    },

    // serve marker and YOU WON, centered together
    result(rec) {
      const r = resultLine(rec)
      const ms = markerSize(D.markerD)
      const gap = px(12)
      const room = px(this.room(D.resY, D.resSize)) - ms - gap
      const size = fitSize(r.text, D.resSize, room - px(6), 20)
      const tw = Math.min(room, Math.ceil(textWidth(r.text, px(size))) + px(6))
      const x0 = Math.round(px(MX) - (ms + gap + tw) / 2)
      marker(rec.sport, x0 + ms / 2, sy(D.resY), D.markerD)
      const h = px(Math.round(D.resSize * 1.4))
      text({ x: x0 + ms + gap, y: sy(D.resY) - Math.round(h / 2), w: tw, h }, r.text, size, TONE[r.tone], { align: 'left', min: 20 })
    },

    // "6–4   3–6   10–7": three spaces between sets while they fit, one space when the match was long
    score(rec) {
      const room = px(this.room(D.scoreY, D.scoreSize))
      let s = prettyScore(rec.score, '   ')
      if (textWidth(s, px(D.scoreSize - 6)) > room) s = prettyScore(rec.score, ' ')
      at(MX, D.scoreY, this.room(D.scoreY, D.scoreSize), s || '0–0', D.scoreSize, C.white, 'mm', { min: 20 })
    },

    heartLine(rec) {
      const s = t('stat.hrLine', { a: rec.hrAvg, b: rec.hrMax })
      const gap = px(10)
      const room = px(this.room(D.hrY, D.hrSize)) - HEART.w - gap
      const size = fitSize(s, D.hrSize, room - px(6), 17)
      const tw = Math.min(room, Math.ceil(textWidth(s, px(size))) + px(6))
      const x0 = Math.round(px(MX) - (HEART.w + gap + tw) / 2)
      img(x0, sy(D.hrY) - Math.round(HEART.h / 2), 'heart.png')
      const h = px(Math.round(D.hrSize * 1.4))
      text({ x: x0 + HEART.w + gap, y: sy(D.hrY) - Math.round(h / 2), w: tw, h }, s, size, C.white, { align: 'left', min: 17 })
    }
  })
)
