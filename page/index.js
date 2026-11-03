// Start screen (approved drawing 1 and 14): RallyPal, the setup chip, the last result, NEW MATCH and the
// History and Settings buttons. A tap on the chip opens the list of setups (drawing 2); NEW MATCH asks who
// serves first (drawing 3), in doubles also who of your team, and starts the match.
// A match being played always comes first. NEW MATCH on the shortcut card opens this page with { go: 1 },
// REMATCH on the summary with { rematch: setup id }: both go straight to "Who serves first?".
// In the free trial a line under the name says how many free matches are left, and the setups play the
// official rules without names (shared/licence.js); after the trial UNLOCK takes NEW MATCH's place.

import { BasePage } from '@zeppos/zml/base-page'
import {
  ROUND, KEYS, C, W, K, MX, px, sy, around, at, text, rect, outline, img, cover, marker, markerSize, limeButton, pillButton, iconButton, textWidth,
  fitSize, chord, CARET
} from '../utils/ui'
import { screen, heading, question, toast } from '../utils/widgets'
import { createNav, goPage, quit, parseParams } from '../utils/nav'
import { settingsValues, loadHistory, loadMeta, saveMeta, loadActive, saveActive } from '../utils/data'
import { askBgPermission, startMonitor } from '../utils/bg'
import { syncWithPhone } from '../utils/sync'
import { trial } from '../utils/licence'
import { newMatch, fromRows, cleanFrom } from '../shared/match'
import { findSetup } from '../shared/schema'
import { modelOf } from '../shared/rules'
import { setupTitle, fittedTitle, setupExtra, matchNames, teamName, partnerName } from '../shared/setups'
import { lastLine } from '../shared/card'
import { playable, trialLine } from '../shared/licence'
import { t } from '../shared/i18n'

Page(
  BasePage({
    state: { nav: null, setupId: null, starting: false, params: {}, from: null },

    onInit(params) {
      this.state.params = parseParams(params)
    },

    build() {
      // a match being played always comes first
      if (loadActive()) return goPage('match')
      const st = this.state
      const nav = createNav(() => quit())
      st.nav = nav
      const v = settingsValues()
      const meta = loadMeta()
      st.setupId = findSetup(v, st.params.rematch || meta.lastSetup).id
      // after the free trial NEW MATCH on the card and REMATCH open the unlock screen
      if ((st.params.go || st.params.rematch) && trial().locked) return goPage('unlock')
      nav.show((n) => this.home(n))
      if (st.params.go || st.params.rematch) nav.push((n) => this.whoServes(n))
      syncWithPhone(this, { restore: true }).then((res) => {
        // the answer can come after this page was left; it must not draw over the next one
        if (!res.ok || st.starting || st.gone) return
        if ((res.restored || res.settingsChanged || res.historyChanged || res.trialChanged) && nav.depth() === 1) {
          st.setupId = findSetup(settingsValues(), st.setupId).id
          nav.show((n) => this.home(n))
        }
      })
    },

    onDestroy() {
      this.state.gone = true
      if (this.state.nav) this.state.nav.destroy()
    },

    // the chosen setup as it plays: in the trial with the official rules and no names
    setup() {
      return playable(findSetup(settingsValues(), this.state.setupId), trial())
    },

    // the settings, without the wearer's name in the trial (names are the full version)
    values() {
      const v = settingsValues()
      return trial().licensed ? v : { ...v, myName: '' }
    },

    unlock() {
      goPage('unlock')
    },

    home(nav) {
      const R = ROUND
      const setup = this.setup()
      const last = loadHistory()[0]
      screen()
      at(MX, R ? 72 : 50, 300, 'RallyPal', R ? 36 : 34, C.lime)
      const tr = trial()
      if (!tr.licensed) at(MX, R ? 112 : 88, R ? 300 : 340, trialLine(tr), R ? 19 : 18, tr.locked ? C.red : C.lgray, 'mm', { min: 14 })
      this.chip(R ? 169 : 142, setup, () => nav.push((n) => this.setupList(n)))
      if (last) {
        let line = lastLine(last)
        if (last.names && last.names.opponent) line += ' · ' + last.names.opponent
        at(MX, R ? 228 : 200, R ? 380 : 350, line, R ? 19 : 17, C.gray, 'mm', { min: 14 })
      }
      const go = tr.locked ? () => this.unlock() : () => nav.push((n) => this.whoServes(n))
      const history = () => goPage('history')
      const settings = () => goPage('settings')
      limeButton(around(MX, R ? 296 : 266, R ? 270 : 260, R ? 70 : 66), tr.locked ? t('home.unlock') : t('home.newMatch'), R ? 30 : 28, go)
      const iy = R ? 384 : 356
      iconButton(around(MX - 44, iy, 64, 64), 'history', history, C.purple)
      iconButton(around(MX + 44, iy, 64, 64), 'settings', settings)
      // each tab in the color of its button (decision 34); BACK leaves the app
      const hints = { primary: [C.lime] }
      if (KEYS >= 4) {
        hints.tertiary = [C.tab]
        hints.secondary = [C.purple]
      } else if (KEYS >= 2) {
        hints.secondary = [C.purple]
      }
      return {
        keys: { primary: go, secondary: KEYS >= 2 ? history : null, tertiary: KEYS >= 4 ? settings : null, back: () => quit() },
        hints
      }
    },

    // The setup chip: serve marker, "Tennis · Best of 3", caret; as wide as its text needs
    chip(cy, setup, onTap) {
      const R = ROUND
      const h = R ? 54 : 52
      const md = 22
      const ms = markerSize(md)
      const pad = 20
      let size = R ? 23 : 22
      const fixed = pad + ms / K + 10 + 12 + CARET.w / K + pad
      const max = Math.min(R ? 400 : 350, chord(cy - h / 2, h, 10))
      const label = fittedTitle(setup, (s) => textWidth(s, px(17)) <= px(max - fixed) - px(4))
      size = fitSize(label, size, px(max - fixed), 17)
      const lw = Math.ceil(textWidth(label, px(size)) / K) + 2
      const w = Math.max(R ? 284 : 286, Math.min(max, fixed + lw))
      const b = around(MX, cy, w, h)
      rect(b, C.pill, h / 2)
      const x0 = b.x + px(pad)
      marker(setup.sport, x0 + ms / 2, b.y + b.h / 2, md)
      const tx = x0 + ms + px(10)
      const cw = CARET.w
      text({ x: tx, y: b.y, w: b.x + b.w - px(pad) - cw - px(12) - tx, h: b.h }, label, size, C.white, { align: 'left', min: 17 })
      img(b.x + b.w - px(pad) - cw, b.y + Math.round((b.h - CARET.h) / 2), 'caret.png')
      cover(b, onTap)
    },

    setupList(nav) {
      const R = ROUND
      const v = settingsValues()
      const tr = trial()
      const list = v.setups.map((s) => playable(s, tr))
      screen()
      heading(t('setups.title'), C.white, R ? 62 : 30, 26)
      let y = R ? 114 : 82
      const step = R ? 64 : 62
      // on a round screen the first row keeps clear of the upper right tab
      const w = R ? 336 : 350
      list.forEach((s) => {
        const b = around(MX, y, w, 54)
        const on = s.id === this.state.setupId
        rect(b, C.pill, 27)
        if (on) outline(b, C.lime, 27, 3)
        const x0 = b.x + px(22)
        const ms = markerSize(20)
        marker(s.sport, x0 + ms / 2, b.y + b.h / 2, 20)
        const tx = x0 + ms + px(12)
        const right = b.x + b.w - px(22)
        const extra = setupExtra(s)
        const full = setupTitle(s)
        const ew = extra ? Math.min(Math.ceil(textWidth(extra, px(17))) + 2, Math.round((right - tx) * 0.4)) : 0
        const lw = right - tx - (ew ? ew + px(10) : 0)
        if (!extra || textWidth(full, px(16)) <= lw - px(4)) {
          const label = extra ? full : fittedTitle(s, (x) => textWidth(x, px(16)) <= lw - px(4))
          text({ x: tx, y: b.y, w: lw, h: b.h }, label, 21, C.white, { align: 'left', min: 16 })
          if (extra) text({ x: right - ew, y: b.y, w: ew, h: b.h }, extra, 17, C.gray, { align: 'right', min: 13 })
        } else {
          // a long name and an opponent: the opponent goes under the name
          const label = fittedTitle(s, (x) => textWidth(x, px(15)) <= right - tx - px(4))
          text({ x: tx, y: b.y + px(3), w: right - tx, h: px(27) }, label, 19, C.white, { align: 'left', min: 15 })
          text({ x: tx, y: b.y + px(28), w: right - tx, h: px(22) }, extra, 15, C.gray, { align: 'left', min: 12 })
        }
        cover(b, () => {
          this.state.setupId = s.id
          saveMeta({ lastSetup: s.id })
          nav.back()
        })
        y += step
      })
      at(MX, y - 10, 340, t('setups.phone'), 16, C.gray)
      const bottom = y + (R ? 130 : 20)
      rect({ x: 0, y: sy(bottom) - 1, w: 1, h: 1 }, C.black)
      return { keys: {}, hints: {} }
    },

    // the setup above "Who serves first?", as long as it fits
    topLine(setup) {
      return fittedTitle(setup, (x) => textWidth(x, px(ROUND ? 21 : 18)) <= px(330))
    },

    whoServes(nav) {
      const setup = this.setup()
      const names = matchNames(setup, this.values())
      const pick = (first) => {
        if (setup.doubles) nav.push((n) => this.whoOfUs(n, first))
        else this.begin({ first, mine: 0 })
      }
      const from = this.from()
      return question(
        {
          top: from ? t('from.line', { score: this.fromText(from) }) : this.topLine(setup),
          extra: { label: from ? t('from.change') : t('from.button'), onTap: () => nav.push((n) => this.fromScore(n)) },
          question: t('serve.first'),
          options: [
            { label: teamName(1, names, setup.doubles), onPick: () => pick(1) },
            { label: teamName(0, names), onPick: () => pick(0) }
          ],
          back: () => nav.back()
        },
        nav
      )
    },

    // doubles: who of your team serves your team's first serve
    whoOfUs(nav, first) {
      const setup = this.setup()
      const names = matchNames(setup, this.values())
      return question(
        {
          top: this.topLine(setup),
          question: t('serve.team'),
          options: [
            { label: partnerName(names), onPick: () => this.begin({ first, mine: 1 }) },
            { label: teamName(0, names), onPick: () => this.begin({ first, mine: 0 }) }
          ],
          back: () => nav.back()
        },
        nav
      )
    },

    // the score the next match is picked up at (ROAST item 18), checked against the chosen setup
    from() {
      const st = this.state
      if (!st.from) return null
      return cleanFrom(newMatch(this.setup(), { first: 0 }, 0), st.from)
    },

    // "1–0 · 3–2": sets and games, games and points, or the points of a round
    fromText(f) {
      return ['sets', 'games', 'points'].filter((k) => f[k]).map((k) => `${f[k][0]}–${f[k][1]}`).join(' · ')
    },

    // START FROM: a row for each part of the score with − and + for you and the opponent, and OK
    fromScore(nav) {
      const st = this.state
      const R = ROUND
      const setup = this.setup()
      const m = newMatch(setup, { first: 0 }, 0)
      const rows = fromRows(setup.sport, setup.rules)
      const draft = nav.local()
      if (!draft.v) {
        draft.v = {}
        rows.forEach(([k]) => (draft.v[k] = (st.from && st.from[k] ? st.from[k] : [0, 0]).slice()))
      }
      const names = matchNames(setup, this.values())
      screen()
      heading(t('from.title'), C.white, R ? 58 : 30, 26)
      const cx = R ? [150, 330] : [105, 285]
      let y = R ? (rows.length > 1 ? 112 : 160) : rows.length > 1 ? 74 : 130
      rows.forEach(([k, max]) => {
        at(MX, y, 300, t('from.' + k), 18, C.gray)
        ;[0, 1].forEach((team) => {
          at(cx[team], y + 28, 170, teamName(team, names, setup.doubles), 16, team === 0 ? C.lime : C.white, 'mm', { min: 12 })
          const cy = y + 66
          const step = (d) => () => {
            const next = JSON.parse(JSON.stringify(draft.v))
            next[k][team] = Math.max(0, Math.min(max, next[k][team] + d))
            // a set or game that would already be over doesn't count as a start
            const zero = Object.keys(next).every((x) => !next[x][0] && !next[x][1])
            if (!zero && !cleanFrom(m, next)) return
            draft.v = next
            nav.redraw()
          }
          pillButton(around(cx[team] - 56, cy, 48, 46), '−', 28, step(-1))
          at(cx[team], cy, 56, String(draft.v[k][team]), 30, C.white)
          pillButton(around(cx[team] + 56, cy, 48, 46), '+', 28, step(1))
        })
        y += R ? 124 : 118
      })
      const ok = () => {
        st.from = cleanFrom(m, draft.v)
        nav.back()
      }
      limeButton(around(MX, R ? 404 : 392, 170, 54), t('ok'), 24, ok)
      return { keys: { primary: ok }, hints: { primary: [C.lime] } }
    },

    begin(choice) {
      const st = this.state
      if (st.starting) return
      if (trial().locked) return this.unlock()
      st.starting = true
      const v = this.values()
      const setup = this.setup()
      const now = Date.now()
      const m = newMatch(setup, { ...choice, from: this.from() }, now)
      st.from = null
      // serve statistics (full version, tennis and padel)
      if (v.serveStats && trial().licensed && modelOf(setup.sport, setup.rules) === 'tennis') m.serveStats = true
      m.title = setupTitle(setup)
      m.names = matchNames(setup, v)
      saveActive(m)
      saveMeta({ lastSetup: setup.id })
      let started = false
      const go = () => {
        if (started) return
        started = true
        startMonitor(m)
        goPage('match', { fresh: 1 })
      }
      // the first match asks for the background permission (heart rate while the screen is off)
      if (!loadMeta().bgAsked) {
        saveMeta({ bgAsked: now })
        askBgPermission(() => go())
        // if the watch never answers, start anyway (only the heart rate with the screen off is missing)
        setTimeout(go, 15000)
      } else go()
    }
  })
)
