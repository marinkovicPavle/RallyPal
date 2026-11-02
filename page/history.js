// History (approved drawing 9): the matches, newest first, with the sport's marker, W or L, the score,
// the opponent and the day, and the duration. A tap opens the details (drawing 10): the statistics and
// DELETE, which asks first and deletes the match on the phone too.

import { BasePage } from '@zeppos/zml/base-page'
import { ROUND, C, K, MX, px, sy, around, at, text, rect, outline, cover, marker, markerSize, textWidth, chord,
  setContentBottom } from '../utils/ui'
import { screen, heading, confirm, toast } from '../utils/widgets'
import { createNav, goPage, parseParams } from '../utils/nav'
import { loadHistory, getMatch, deleteMatch } from '../utils/data'
import { syncWithPhone } from '../utils/sync'
import { wonCount } from '../shared/record'
import { detailRows, resultLine } from '../shared/stats'
import { sportName } from '../shared/setups'
import { hm, dayLabel, shortDate, timeOfDay, prettyScore, resultOf } from '../shared/format'
import { t } from '../shared/i18n'

// the watch keeps up to 200 matches; the list shows the newest ones (all of them are on the phone)
const MAX_ROWS = 40

// the numbers of the drawing (nacrt2.py history and detail)
const L = ROUND
  ? { titleY: 60, countY: 94, top: 146, step: 66, w: 364, h: 58, tail: 150 }
  : { titleY: 30, countY: 62, top: 112, step: 66, w: 350, h: 58, tail: 24 }
const DT = ROUND
  ? { titleY: 58, lineY: 90, scoreY: 132, resY: 168, rowY: 208, step: 34, labelX: 84, valueX: 396, del: [420, 108, 40] }
  : { titleY: 30, lineY: 62, scoreY: 102, resY: 136, rowY: 174, step: 34, labelX: 30, valueX: 360, del: [404, 120, 40] }
const TONE = { lime: C.lime, red: C.red, gray: C.lgray }
const LETTER = { won: ['history.w', C.lime], lost: ['history.l', C.red], draw: ['history.d', C.lgray], ended: ['history.e', C.gray] }

Page(
  BasePage({
    state: {},

    onInit(params) {
      this.state.params = parseParams(params)
    },

    build() {
      const st = this.state
      st.nav = createNav(() => goPage('index'))
      st.nav.show((n) => this.listScreen(n))
      if (st.params.id && getMatch(st.params.id)) st.nav.push((n) => this.detail(n, st.params.id))
    },

    onDestroy() {
      this.state.gone = true
      if (this.state.nav) this.state.nav.destroy()
    },

    listScreen(nav) {
      const history = loadHistory()
      const now = Date.now()
      screen()
      heading(t('history.title'), C.white, L.titleY, 26)
      if (!history.length) {
        text({ x: px(MX - 160), y: sy(ROUND ? 170 : 130), w: px(320), h: px(120) }, t('history.empty'), 22, C.gray, { wrap: true })
        return { keys: {}, hints: {} }
      }
      const n = history.length
      const w = wonCount(history)
      at(MX, L.countY, 340, n === 1 ? t('history.one', { w }) : t('history.count', { n, w }), 18, C.gray)
      let y = L.top
      history.slice(0, MAX_ROWS).forEach((rec) => {
        this.row(rec, y, now, () => nav.push((nn) => this.detail(nn, rec.id)))
        y += L.step
      })
      y += 10 - L.h / 2
      if (n > MAX_ROWS) {
        text({ x: px(MX - 170), y: sy(y), w: px(340), h: px(48) }, t('history.more', { n: MAX_ROWS }), 16, C.gray, { wrap: true })
        y += 52
      }
      at(MX, y + 12, 340, t('history.hint'), 16, C.gray)
      setContentBottom(y + 24 + L.tail)
      return { keys: {}, hints: {} }
    },

    // marker · W · score ... duration, and under it the opponent (or the sport) and the day
    row(rec, y, now, onTap) {
      const b = around(MX, y, L.w, L.h)
      rect(b, C.pill, 22)
      const left = b.x
      const right = b.x + b.w - px(20)
      const ms = markerSize(20)
      marker(rec.sport, left + px(28), sy(y), 20)
      const lx = left + px(28) + Math.round(ms / 2) + px(10)
      const lh = px(28)
      const top = sy(y - 11) - Math.round(lh / 2)
      const letter = LETTER[resultOf(rec)]
      text({ x: lx, y: top, w: px(26), h: lh }, t(letter[0]), 20, letter[1], { align: 'left', min: 16 })
      const dur = hm(rec.dur)
      const dw = Math.ceil(textWidth(dur, px(18))) + 2
      text({ x: right - dw, y: top, w: dw, h: lh }, dur, 18, C.gray, { align: 'right' })
      const sx = lx + px(30)
      text({ x: sx, y: top, w: right - dw - px(10) - sx, h: lh }, prettyScore(rec.score) || '0–0', 20, C.white, { align: 'left', min: 15 })
      const who = (rec.names && rec.names.opponent) || sportName(rec.sport)
      const sh = px(22)
      text({ x: lx, y: sy(y + 13) - Math.round(sh / 2), w: right - lx, h: sh }, `${who} · ${dayLabel(rec.start, now)}`, 16, C.gray, {
        align: 'left',
        min: 13
      })
      cover(b, onTap)
    },

    detail(nav, id) {
      const rec = getMatch(id)
      if (!rec) {
        nav.back()
        return { keys: {}, hints: {} }
      }
      const R = ROUND
      screen()
      heading(t('detail.title', { sport: sportName(rec.sport), date: shortDate(rec.start) }), C.white, DT.titleY, 26)
      const from = timeOfDay(rec.start)
      const to = timeOfDay(rec.end)
      const opp = rec.names && rec.names.opponent
      at(MX, DT.lineY, this.room(DT.lineY, 18), opp ? t('detail.vs', { name: opp, from, to }) : t('detail.time', { from, to }), 18, C.gray, 'mm', {
        min: 14
      })
      let s = prettyScore(rec.score, '   ')
      const sr = this.room(DT.scoreY, 32)
      if (textWidth(s, px(28)) > px(sr)) s = prettyScore(rec.score, ' ')
      at(MX, DT.scoreY, sr, s || '0–0', 32, C.white, 'mm', { min: 20 })
      const r = resultLine(rec)
      at(MX, DT.resY, 300, r.text, 20, TONE[r.tone])
      let y = DT.rowY
      detailRows(rec).forEach((row) => {
        // on a round screen the rows get narrower towards the bottom
        const inset = R ? Math.max(0, Math.round((DT.valueX - DT.labelX - this.room(y, 21)) / 2)) : 0
        const x0 = DT.labelX + inset
        const x1 = DT.valueX - inset
        const vw = Math.min(Math.ceil(textWidth(row[1], px(21)) / K) + 4, Math.round((x1 - x0) * 0.55))
        const h = 30
        text({ x: px(x0), y: sy(y - h / 2), w: px(x1 - x0 - vw - 8), h: px(h) }, row[0], 21, C.gray, { align: 'left', min: 15 })
        text({ x: px(x1 - vw), y: sy(y - h / 2), w: px(vw), h: px(h) }, row[1], 21, C.white, { align: 'right', min: 15 })
        y += DT.step
      })
      const [dy, dw, dh] = DT.del
      const b = around(MX, dy, Math.max(dw, Math.ceil(textWidth(t('detail.delete'), px(17)) / K) + 44), dh)
      outline(b, C.red, dh / 2, 2)
      text(b, t('detail.delete'), 17, C.red, { min: 13 })
      cover(b, () => nav.push((n) => this.confirmDelete(n, rec)))
      return { keys: {}, hints: {} }
    },

    confirmDelete(nav, rec) {
      const what = `${sportName(rec.sport)} ${prettyScore(rec.score)}`.trim()
      return confirm(
        {
          title: t('delete.title'),
          body: t('delete.body', { what }),
          ok: t('detail.delete'),
          okColor: C.red,
          cancel: t('cancel'),
          onOk: () => {
            deleteMatch(rec.id)
            toast(t('deleted'))
            nav.root()
            syncWithPhone(this, {})
          }
        },
        nav
      )
    },

    room(y, size) {
      const h = Math.round(size * 1.4)
      return Math.min(ROUND ? 380 : 350, chord(y - h / 2, h, 16))
    }
  })
)
