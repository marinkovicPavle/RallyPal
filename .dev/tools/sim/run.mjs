// Screen simulator (from SaunaPal): runs the real page code against fake Zepp OS modules (zos.js) on
// several screen sizes and in every language, plays whole matches of every sport, and writes the widget
// tree of every screen for render.py, which draws them and lists layout problems.
//
// Usage: node .dev/tools/sim/run.mjs <out-dir> [device-name | language ...]
// Needs esbuild (npm i -D esbuild, or ESBUILD=<path to its package>). Then:
// python3 .dev/tools/sim/render.py <out-dir>

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..', '..')
const require = createRequire(import.meta.url)
const esbuild = require(process.env.ESBUILD || 'esbuild')

const OUT = process.argv[2] || path.join(here, 'out')
// the app's language files, as the watch reads them from its assets (utils/lang.js)
const ASSETS = {}
const LANG_DIR = path.join(root, 'assets', 'common.r', 'raw', 'lang')
fs.readdirSync(LANG_DIR).forEach((f) => (ASSETS['raw/lang/' + f] = fs.readFileSync(path.join(LANG_DIR, f), 'latin1')))
const ONLY = process.argv.slice(3)

export const DEVICES = [
  { name: 'trex3pro', w: 480, h: 480, round: true, keys: 5 },
  { name: 'round466', w: 466, h: 466, round: true, keys: 2 },
  { name: 'round416', w: 416, h: 416, round: true, keys: 1 },
  { name: 'round360', w: 360, h: 360, round: true, keys: 2 },
  { name: 'sq390x450', w: 390, h: 450, round: false, keys: 2 },
  { name: 'sq432x514', w: 432, h: 514, round: false, keys: 1 },
  { name: 'sq320x380', w: 320, h: 380, round: false, keys: 1 }
]
// @zos/settings getLanguage() numbers
const LANGS = { en: 2, sr: 24, es: 3, it: 10, de: 7, fr: 6, pt: 15, nl: 16, pl: 9, cs: 22, uk: 18, ru: 4, sv: 29, nb: 27, da: 28, fi: 26, ja: 11 }

const KEY = { SELECT: 1, BACK: 2, UP: 3, DOWN: 4, HOME: 5, SHORTCUT: 6 }
const EV = { CLICK: 1, LONG_PRESS: 2, PRESS: 4, RELEASE: 5 }

// ---- bundling ------------------------------------------------------------------------------------

const bundles = {}
function bundle(entry) {
  if (bundles[entry]) return bundles[entry]
  const zos = path.join(here, 'zos.js')
  const r = esbuild.buildSync({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    logLevel: 'error',
    alias: Object.fromEntries(
      ['ui', 'device', 'router', 'interaction', 'page', 'display', 'app', 'user', 'sensor', 'fs', 'alarm', 'app-service',
        'notification', 'storage', 'media', 'settings']
        .map((m) => ['@zos/' + m, zos])
        .concat([['@zeppos/zml/base-page', zos], ['@zeppos/zml/base-app', zos]])
    )
  })
  bundles[entry] = r.outputFiles[0].text
  return bundles[entry]
}

let S = null
async function loadLib() {
  const file = path.join(OUT, '_seed.mjs')
  esbuild.buildSync({ entryPoints: [path.join(here, 'seed.js')], bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error' })
  S = await import(pathToFileURL(file).href + '?' + Date.now())
}

function memoryStorage() {
  const m = {}
  return { getItem: (k) => m[k], setItem: (k, v) => (m[k] = v) }
}

// ---- touch ------------------------------------------------------------------------------------------

const pngSize = {}
const CUR = { round: true }
function imgSize(src) {
  const file = path.join(root, 'assets', CUR.round ? 'common.r' : 'common.s', src)
  if (!(file in pngSize)) {
    try {
      const b = fs.readFileSync(file)
      pngSize[file] = [b.readUInt32BE(16), b.readUInt32BE(20)]
    } catch (e) {
      pngSize[file] = [0, 0]
    }
  }
  return pngSize[file]
}

function boxOf(w) {
  const p = w.props
  if (w.type === 'CIRCLE') return [p.center_x - p.radius, p.center_y - p.radius, 2 * p.radius, 2 * p.radius]
  if (w.type === 'IMG') {
    const [iw, ih] = imgSize(p.src)
    return [p.x, p.y, p.w || iw, p.h || ih]
  }
  return [p.x, p.y, p.w, p.h]
}

function centerOf(w) {
  const [x, y, bw, bh] = boxOf(w)
  return [x + bw / 2, y + bh / 2]
}

// only buttons take taps (T-Rex 3 Pro); a label over a button keeps the touch, so covers go on top
function tappable(w) {
  return !!w && w.type === 'BUTTON'
}

function topAt(widgets, x, y) {
  for (let i = widgets.length - 1; i >= 0; i--) {
    const [bx, by, bw, bh] = boxOf(widgets[i])
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return widgets[i]
  }
  return null
}

function blocked(widgets) {
  const out = []
  widgets.forEach((w) => {
    if (!tappable(w)) return
    const [x, y] = centerOf(w)
    const top = topAt(widgets, x, y)
    if (top !== w && boxOf(top).join() !== boxOf(w).join()) {
      out.push(`tap blocked: "${w.props.text || w.type}" is under ${top.type} ${top.props.text || top.props.src || ''}`.trim())
    }
  })
  return out
}

// ---- one simulated watch ----------------------------------------------------------------------------

class Watch {
  constructor(device, start, lang) {
    this.device = device
    this.lang = lang || 'en'
    this.now = start
    this.files = {}
    this.timers = []
    this.nextTimer = 1
    this.shots = []
    this.page = null
    this.bpm = 128
    this.phoneOn = true
    this.bgPermission = false
    this.allLog = []
    this.phoneCore = S.createCore(memoryStorage(), () => this.now)
  }

  sim() {
    const self = this
    return {
      device: this.device,
      widgets: [],
      nextId: 1,
      files: this.files,
      warnings: [],
      log: [],
      requests: [],
      alarms: {},
      nextAlarm: 1,
      hrListeners: [],
      onKey: null,
      onGesture: null,
      nav: null,
      scroll: 0,
      lang: LANGS[this.lang],
      uuid: 'SIMWATCH' + this.device.name.toUpperCase(),
      assets: ASSETS,
      get bgPermission() {
        return self.bgPermission
      },
      set bgPermission(v) {
        self.bgPermission = v
      },
      get bpm() {
        return self.bpm
      },
      phone: (req) => self.answer(req)
    }
  }

  answer(req) {
    if (!this.phoneOn) throw new Error('no phone')
    if (req.method === 'SYNC') return this.phoneCore.sync(req.params)
    if (req.method === 'RESTORE') return this.phoneCore.restore(req.params)
    // KiezelPay as the phone would hear it: a payment code until this.paid
    if (req.method === 'LICENCE') return Promise.resolve(this.paid ? { licensed: true, code: '' } : { licensed: false, code: '482913' })
    throw new Error('unknown ' + req.method)
  }

  context(state, extra) {
    const self = this
    const RealDate = Date
    class FakeDate extends RealDate {
      constructor(...a) {
        if (a.length) super(...a)
        else super(self.now)
      }
      static now() {
        return self.now
      }
    }
    const ctx = {
      __sim: state,
      getApp: () => ({ _options: { globalData: {} } }),
      setInterval: (fn, ms) => self.addTimer(fn, ms, true),
      clearInterval: (id) => self.clearTimer(id),
      setTimeout: (fn, ms) => self.addTimer(fn, ms, false),
      clearTimeout: (id) => self.clearTimer(id),
      Date: FakeDate,
      console,
      Promise,
      JSON,
      Math,
      ...extra
    }
    ctx.globalThis = ctx
    vm.createContext(ctx)
    return ctx
  }

  newState() {
    const state = this.sim()
    const all = this.allLog
    state.log.push = function (...a) {
      all.push(...a)
      return Array.prototype.push.apply(this, a)
    }
    return state
  }

  open(name, params) {
    if (this.page && this.page.onDestroy) this.call('onDestroy')
    this.timers = []
    const state = this.newState()
    this.state = state
    let opts = null
    const ctx = this.context(state, { Page: (o) => (opts = o), App: () => {}, AppService: () => {} })
    vm.runInContext(bundle(`page/${name}.js`), ctx, { filename: name })
    this.page = opts
    this.name = name
    this.call('onInit', params === undefined ? '' : JSON.stringify(params))
    if (!state.nav) this.call('build')
    return this
  }

  // the shortcut card as the card list shows it: build, then focus (onResume)
  card() {
    if (this.page && this.page.onDestroy) this.call('onDestroy')
    this.timers = []
    const d = this.device
    const state = this.newState()
    const margin = d.round ? Math.round(d.w * 0.07) : Math.round(d.w * 0.04)
    state.card = { w: d.w - 2 * margin, h: Math.round(d.h / 2), margin, radius: Math.round(d.w * (d.round ? 0.075 : 0.07)) }
    this.state = state
    let opts = null
    const ctx = this.context(state, { AppWidget: (o) => (opts = o) })
    vm.runInContext(bundle('app-widget/index.js'), ctx, { filename: 'card' })
    this.page = opts
    this.name = 'card'
    this.call('onInit')
    this.call('build')
    this.call('onResume')
    return this
  }

  call(fn, ...a) {
    const p = this.page
    if (p && p[fn]) return p[fn].apply(p, a)
  }

  addTimer(fn, ms, repeat) {
    const id = this.nextTimer++
    this.timers.push({ id, fn, ms: Math.max(1, ms || 0), at: this.now + Math.max(1, ms || 0), repeat })
    return id
  }

  clearTimer(id) {
    this.timers = this.timers.filter((t) => t.id !== id)
  }

  async settle() {
    for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r))
    this.followNav()
  }

  followNav() {
    const nav = this.state.nav
    if (!nav) return
    this.state.nav = null
    if (nav.how === 'replace' || nav.how === 'push') {
      const name = nav.url.replace('page/', '')
      this.open(name, nav.params ? JSON.parse(nav.params) : undefined)
      this.followNav()
    } else if (nav.how === 'exit') {
      this.exited = true
      if (this.page && this.page.onDestroy) this.call('onDestroy')
      this.page = null
    }
  }

  async advance(sec) {
    for (let i = 0; i < sec; i++) {
      this.now += 1000
      const due = this.timers.filter((t) => t.at <= this.now)
      for (const t of due) {
        if (t.repeat) t.at += t.ms
        else this.clearTimer(t.id)
        t.fn()
        if (this.state.nav) break
      }
      if (this.state.nav) await this.settle()
    }
    await this.settle()
  }

  visible() {
    return this.state.widgets.filter((w) => !w.deleted && w.props.visible !== false)
  }

  where() {
    return `[${this.device.name}/${this.lang}/${this.name}]`
  }

  shows(label) {
    return this.visible().some((w) => w.props.text === label)
  }

  find(label) {
    const ws = this.visible().filter((w) => w.props.text === label)
    if (!ws.length) throw new Error(`${this.where()} no "${label}". On screen: ${this.visible().map((w) => w.props.text).filter(Boolean).join(' | ')}`)
    return ws[ws.length - 1]
  }

  async press(w, what) {
    CUR.round = this.device.round
    const [x, y] = centerOf(w)
    await this.tapAt(x, y, what)
  }

  async tapAt(x, y, what) {
    const top = topAt(this.visible(), x, y)
    if (!tappable(top)) {
      throw new Error(`${this.where()} tap on ${what || `${x},${y}`} lands on ${top ? top.type + ' ' + (top.props.text || top.props.src || '') : 'nothing'}`)
    }
    top.props.click_func()
    await this.settle()
  }

  async tap(label) {
    await this.press(this.find(label), `"${label}"`)
  }

  // a setup in the list, under whichever of its titles fits there
  async tapSetup(id) {
    const s = setups().filter((x) => x.id === id)[0]
    const names = [2, 1, 0].map((n) => S.setupTitle(s, n))
    const label = names.filter((n) => this.visible().some((w) => w.props.text === n))[0]
    if (!label) throw new Error(`${this.where()} no setup ${id}`)
    await this.tap(label)
  }

  async tapImg(src) {
    const ws = this.visible().filter((w) => w.type === 'IMG' && w.props.src === src)
    if (!ws.length) throw new Error(`${this.where()} no image ${src}`)
    await this.press(ws[ws.length - 1], src)
  }

  // the n-th tappable row of a list (an invisible cover), from the top
  async tapRow(n) {
    const covers = this.visible()
      .filter((w) => w.type === 'BUTTON' && w.props.normal_src === 'blank.png')
      .sort((a, b) => a.props.y - b.props.y)
    if (!covers[n]) throw new Error(`${this.where()} no row ${n}`)
    await this.press(covers[n], 'row ' + n)
  }

  async key(name) {
    if (!this.state.onKey) throw new Error(this.where() + ' no key handler')
    this.state.onKey(KEY[name], EV.PRESS)
    this.state.onKey(KEY[name], EV.RELEASE)
    const handled = this.state.onKey(KEY[name], EV.CLICK)
    await this.settle()
    return handled
  }

  async swipeBack() {
    if (this.state.onGesture) this.state.onGesture(4)
    await this.settle()
  }

  match() {
    const raw = this.files['match.json']
    return raw ? JSON.parse(raw) : null
  }

  // a point for team 0 (you) or 1, then some seconds of play
  async point(team, gap) {
    if (this.name !== 'match') throw new Error(this.where() + ' not in a match')
    this.call('point', team)
    await this.settle()
    if (this.name === 'match') await this.advance(gap || 18)
  }

  shot(label) {
    const s = this.state
    CUR.round = this.device.round
    const c = this.name === 'card' ? s.card : null
    const card = c && { x: c.margin, y: Math.round((this.device.h - c.h) / 2), w: c.w, h: c.h, radius: c.radius }
    this.shots.push({
      label: `${this.lang} · ${label}`,
      page: this.name,
      scroll: s.scroll || 0,
      card,
      widgets: this.visible().map((w) => {
        const p = { ...w.props }
        delete p.click_func
        if (card) {
          if ('x' in p) p.x += card.x
          if ('y' in p) p.y += card.y
          if ('center_x' in p) p.center_x += card.x
          if ('center_y' in p) p.center_y += card.y
        }
        return { type: w.type, props: p }
      }),
      warnings: s.warnings.concat(blocked(this.visible()))
    })
    s.warnings.length = 0
  }
}

// ---- made-up data -------------------------------------------------------------------------------------

const T0 = new Date(2026, 9, 20, 18, 0, 0).getTime()
const DAY = 86400000

function setups() {
  const R = S.defaultRules
  return [
    { id: 'tennis', sport: 'tennis', rules: R('tennis'), doubles: false, name: '', opponent: 'Marko', partner: '' },
    { id: 'tsuper', sport: 'tennis', rules: { ...R('tennis'), deuce: 'noad', finalSet: 'super' }, doubles: false, name: '', opponent: 'Konstantinović', partner: '' },
    { id: 'padel', sport: 'padel', rules: R('padel'), doubles: true, name: '', opponent: 'Luka & Ivan', partner: 'Ana' },
    { id: 'pickle', sport: 'pickleball', rules: R('pickleball'), doubles: true, name: '', opponent: '', partner: 'Mila' },
    { id: 'tt', sport: 'tabletennis', rules: R('tabletennis'), doubles: true, name: '', opponent: '', partner: 'Nikola' },
    { id: 'squash', sport: 'squash', rules: R('squash'), doubles: false, name: '', opponent: 'Aleksandar', partner: '' },
    { id: 'badm', sport: 'badminton', rules: R('badminton'), doubles: false, name: '', opponent: 'Luka', partner: '' },
    { id: 'amer', sport: 'padel', rules: { ...R('padel'), format: 'total', total: 24 }, doubles: true, name: 'Americano Friday', opponent: '', partner: '' },
    { id: 'bo5', sport: 'tennis', rules: { ...R('tennis'), sets: 3 }, doubles: false, name: '', opponent: 'Đorđe Petrović', partner: '' }
  ]
}

// the walk-through shows the full version; the free trial has a walk of its own (trialWalk)
function seed(w, withHistory) {
  w.files['settings.json'] = JSON.stringify({ values: { setups: setups() }, stamps: {} })
  w.files['meta.json'] = JSON.stringify({ onboarded: T0, licensed: true })
  if (!withHistory) return
  const list = setups()
  const by = (id) => list.filter((x) => x.id === id)[0]
  const hist = [
    S.playedMatch(by('tsuper'), T0 - 3 * DAY, { want: 0 }),
    S.playedMatch(by('padel'), T0 - 5 * DAY, { want: 1, p: 0.45 }),
    S.playedMatch(by('pickle'), T0 - 7 * DAY, { want: 0 }),
    S.playedMatch(by('badm'), T0 - 11 * DAY, { want: 0 }),
    S.playedMatch(by('tt'), T0 - 15 * DAY, { want: 1, p: 0.45 }),
    S.playedMatch(by('squash'), T0 - 18 * DAY, { stopAfter: 23 }),
    S.playedMatch(by('bo5'), T0 - 22 * DAY, { want: 0, p: 0.5, seed: 3 })
  ]
  w.files['history.json'] = JSON.stringify(hist.sort((a, b) => b.start - a.start))
  w.files['meta.json'] = JSON.stringify({ onboarded: T0, restoredAt: T0 - 30 * DAY, bgAsked: T0 - 30 * DAY, licensed: true })
  w.bgPermission = true
  return hist
}

// ---- the walk-through ---------------------------------------------------------------------------------

const tt = (k, p) => S.t(k, p)

// exactly one QR code on the screen, and its content passes ok
function qrOnScreen(w, ok) {
  const qr = w.visible().filter((x) => x.type === 'QRCODE')
  if (qr.length !== 1) throw new Error(`${w.where()} ${qr.length} QR codes`)
  if (!ok(qr[0].props.content)) throw new Error(`${w.where()} QR code "${qr[0].props.content}"`)
}
const title = (id) => S.setupTitle(setups().filter((x) => x.id === id)[0])

// plays random points (you win a point with chance p) until when(view) is true or the match is over;
// returns the view it stopped at
async function playUntil(w, r, when, p) {
  for (let i = 0; i < 2000; i++) {
    const v = S.view(w.match())
    if (when(v)) return v
    await w.point(r() < (p === undefined ? 0.55 : p) ? 0 : 1)
    if (w.name !== 'match') return null
  }
  throw new Error(w.where() + ' playUntil never got there')
}

// picks the setup from the list on the start screen and starts it: who serves first, in doubles who of you
async function startMatch(w, id, first, mine, shots) {
  const s = setups().filter((x) => x.id === id)[0]
  const names = S.matchNames(s, {})
  await w.tapImg('caret.png')
  await w.tapSetup(id)
  await w.tap(tt('home.newMatch'))
  if (shots) w.shot('Who serves first? · ' + id)
  await w.tap(S.teamName(first, names, s.doubles))
  if (s.doubles) {
    if (shots) w.shot('Who serves for your team?')
    await w.tap(mine ? S.partnerName(names) : S.teamName(0, names))
  }
  if (w.name !== 'match') throw new Error(w.where() + ' the match did not start')
}

async function walk(device, lang) {
  S.setLang(lang)
  const w = new Watch(device, T0, lang)
  const r = S.rng(7)
  const K = device.keys
  seed(w, false)
  w.open('history')
  w.shot('History, empty')
  w.open('index')
  w.shot('Start, first time')
  w.card()
  w.shot('Card, no match yet')
  w.open('index')
  await w.tapImg('caret.png')
  w.shot('Match setups')
  await w.tapSetup('tennis')
  await w.tap(tt('home.newMatch'))
  w.shot('Who serves first?')
  if (K >= 4) {
    // the left keys move the outline, the upper right key picks, BACK goes back (decision 34, item 1)
    await w.key('DOWN')
    w.shot('Who serves first?, outline moved by a key')
    await w.key('BACK')
    if (!w.shows(tt('home.newMatch'))) throw new Error(w.where() + ' BACK on "Who serves first?" did not go back')
    await w.tap(tt('home.newMatch'))
    await w.key('SELECT')
    if (w.name !== 'match' || S.view(w.match()).server !== 1) throw new Error(w.where() + ' SELECT did not pick the opponent')
  } else await w.tap('Marko')
  if (w.allLog.indexOf('requestPermission') < 0) throw new Error(w.where() + ' no background permission asked')
  w.shot('Match, 0-0')
  // a tap on the upper half is their point, on the lower half yours
  await w.tapAt(device.w / 2, Math.round(device.h * 0.12), 'upper half')
  await w.tapAt(device.w / 2, Math.round(device.h * 0.9), 'lower half')
  let v = S.view(w.match())
  if (v.points[0] !== 1 || v.points[1] !== 1) throw new Error(w.where() + ' halves gave ' + v.points)
  await w.tap(tt('match.undo'))
  v = S.view(w.match())
  if (v.points[0] !== 0 || v.points[1] !== 1) throw new Error(w.where() + ' UNDO did not undo')
  if (K >= 2) {
    // keys: upper their point, lower yours (5 keys: BACK, 2 keys: the lower key)
    await w.key('SELECT')
    await w.key(K >= 4 ? 'BACK' : 'DOWN')
    v = S.view(w.match())
    if (v.points[0] !== 1 || v.points[1] !== 2) throw new Error(w.where() + ' keys gave ' + v.points)
  }
  v = await playUntil(w, r, (x) => x.label && x.label.key === 'break_point')
  w.shot('Match, break point')
  w.card()
  w.shot('Card, match in play')
  w.open('index')
  w.followNav()
  if (w.name !== 'match') throw new Error(w.where() + ' the start screen did not go back to the match')
  await playUntil(w, r, (x) => x.label && x.label.key === 'set_point')
  w.shot('Match, set point')
  // the end of the set: the rest between sets counts down, then a vibration and the usual label (ROAST 16)
  await playUntil(w, r, (x) => x.sets.length >= 1)
  const restText = () => w.visible().filter((x) => /\d:\d\d$/.test(String(x.props.text || '')) && String(x.props.text).indexOf(tt('label.rest')) === 0)[0]
  if (!restText()) throw new Error(w.where() + ' no rest countdown between sets')
  await w.advance(30)
  w.shot('Match, rest between sets')
  await w.advance(95)
  if (restText()) throw new Error(w.where() + ' the rest did not end')
  await playUntil(w, r, (x) => x.sets.length >= 1 && (x.games[0] + x.games[1] >= 3))
  w.shot('Match, second set')
  await w.tap(tt('match.menu'))
  w.shot('Menu')
  await w.tap(tt('menu.server'))
  w.shot('Change server')
  await w.swipeBack()
  await w.tap(tt('menu.leave'))
  w.shot('Leave RallyPal?')
  await w.tap(tt('leave.stay'))
  await w.tap(tt('menu.end'))
  w.shot('End match?')
  await w.swipeBack()
  await w.tap(tt('menu.new'))
  w.shot('New match?')
  await w.swipeBack()
  await w.tap(tt('menu.back'))
  if (w.name !== 'match') throw new Error(w.where() + ' menu Back')
  w.shot('Match again after the menu')
  await playUntil(w, r, (x) => x.label && x.label.key === 'match_point', 0.75)
  w.shot('Match, match point')
  await playUntil(w, r, () => false, 0.8)
  if (w.name !== 'summary') throw new Error(w.where() + ' no summary after the match')
  w.shot('Summary, won')
  if (K >= 2) {
    // a key pressed again right after the match point does nothing
    await w.key('SELECT')
    if (w.name !== 'summary') throw new Error(w.where() + ' the key guard let a key through')
  }
  // a quick second tap on the lower half lands on UNDO and does nothing either
  await w.tap(tt('match.undo'))
  if (w.name !== 'summary') throw new Error(w.where() + ' the guard let a tap through')
  await w.advance(2)
  // undo: the upper left key where there is one, the button everywhere
  if (K >= 4) await w.key('UP')
  else await w.tap(tt('match.undo'))
  if (w.name !== 'match' || S.view(w.match()).done) throw new Error(w.where() + ' undo from the summary')
  w.shot('Back in the match after undo')
  await playUntil(w, r, () => false, 0.9)
  if (w.name !== 'summary') throw new Error(w.where() + ' no summary after the match again')
  if (K >= 4) {
    // the button does it too
    await w.advance(2)
    await w.tap(tt('match.undo'))
    if (w.name !== 'match') throw new Error(w.where() + ' UNDO button')
    await playUntil(w, r, () => false, 0.9)
  }
  await w.advance(2)
  await w.tap(tt('sum.done'))
  w.shot('Start, last match')
  w.card()
  w.shot('Card, last match')

  // doubles: padel with names, the partner serving, star point, the server changed by hand, ended by hand
  w.open('index')
  await startMatch(w, 'padel', 0, 1, true)
  w.shot('Padel doubles, partner serves')
  await playUntil(w, r, (x) => x.label && (x.label.key === 'star_point' || x.label.key === 'golden_point'), 0.5)
  w.shot('Padel, star point')
  await w.tap(tt('match.menu'))
  await w.tap(tt('menu.server'))
  w.shot('Change server, doubles')
  await w.tap(S.partnerName({ partner: 'Ana' }))
  await w.tap(tt('match.menu'))
  await w.tap(tt('menu.end'))
  await w.tap(tt('end.ok'))
  // who won a match ended by hand (ROAST 17)
  w.shot('Who won?')
  await w.tap(tt('won.none'))
  if (w.name !== 'summary') throw new Error(w.where() + ' End match')
  w.shot('Summary, ended by hand')
  await w.advance(2)
  await w.tap(tt('sum.rematch'))
  w.shot('Rematch: who serves first?')
  await w.swipeBack()

  // pickleball doubles: the score call
  await startMatch(w, 'pickle', 0, 0)
  await playUntil(w, r, (x) => x.points[0] + x.points[1] >= 5)
  w.shot('Pickleball, score call')
  await w.tap(tt('match.menu'))
  await w.tap(tt('menu.new'))
  await w.tap(tt('new.ok'))
  if (w.name !== 'index') throw new Error(w.where() + ' New match')

  // table tennis doubles: serve n of m
  await startMatch(w, 'tt', 1, 0)
  await playUntil(w, r, (x) => x.server === 0)
  w.shot('Table tennis doubles')
  // the end of the first game: change ends
  await playUntil(w, r, (x) => x.changeEnds)
  w.shot('Match, change ends')
  // with the rest countdown after it ("CHANGE ENDS 1:00")
  if (!w.visible().some((x) => String(x.props.text || '').indexOf(tt('label.change_ends')) === 0)) throw new Error(w.where() + ' no CHANGE ENDS')
  await w.tap(tt('match.menu'))
  await w.tap(tt('menu.end'))
  await w.tap(tt('end.ok'))
  // a retirement: the opponents won
  await w.tap(S.teamName(1, { opponent: '' }, true))
  if (JSON.parse(w.files['history.json'])[0].winner !== 1) throw new Error(w.where() + ' the winner of a match ended by hand')
  w.shot('Summary, opponents won by retirement')
  await w.advance(2)
  await w.tap(tt('sum.done'))
  w.shot('Start, table tennis doubles chosen')

  // squash, badminton
  for (const id of ['squash', 'badm']) {
    await startMatch(w, id, 0, 0)
    await playUntil(w, r, (x) => x.points[0] + x.points[1] >= 6 && x.server === 0)
    w.shot(id === 'squash' ? 'Squash' : 'Badminton')
    await playUntil(w, r, () => false, 0.85)
    await w.advance(2)
    await w.tap(tt('sum.done'))
  }

  // a round to 24 points (Americano): points to play, a draw
  await startMatch(w, 'amer', 0, 0)
  w.shot('Americano, start')
  for (let i = 0; i < 24; i++) await w.point(i % 2)
  if (w.name !== 'summary') throw new Error(w.where() + ' Americano did not end')
  w.shot('Summary, draw')
  await w.advance(2)
  await w.tap(tt('sum.done'))

  // History with older matches (one lost, one ended by hand, a five-setter)
  seed(w, true)
  w.open('index')
  await w.tapImg('history.png')
  w.shot('History')
  // the first row is Records (v2)
  await w.tapRow(0)
  w.shot('Records')
  if (!w.shows(tt('rec.longest'))) throw new Error(w.where() + ' no records')
  await w.swipeBack()
  await w.tapRow(1)
  w.shot('Match details')
  await w.tap(tt('detail.delete'))
  w.shot('Delete match?')
  await w.tap(tt('detail.delete'))
  if (w.name !== 'history') throw new Error(w.where() + ' delete')
  w.shot('History after delete')
  const hist = JSON.parse(w.files['history.json'])
  const long = hist.filter((x) => x.rules.sets === 3)[0]
  const lost = hist.filter((x) => x.winner === 1)[0]
  w.open('summary', { id: long.id })
  w.shot('Summary, five sets')
  w.open('summary', { id: lost.id })
  w.shot('Summary, lost')
  w.open('history', { id: long.id })
  w.shot('Details, five sets')

  // Settings
  w.open('index')
  await w.tapImg('settings.png')
  w.shot('Settings')
  await w.tap(tt('set.vibration'))
  w.shot('Vibration')
  await w.tap(tt('set.vibeSet'))
  await w.tap(tt('set.vibeSet'))
  await w.swipeBack()
  await w.tap(tt('set.serveDisplay'))
  w.shot('Serve display')
  await w.tap(tt('opt.serveDisplay.team'))
  await w.tap(tt('set.labels'))
  w.shot('Settings, changed')
  await w.tap(tt('set.screen'))
  w.shot('Screen in a match')
  await w.tap(tt('opt.screen.always'))
  // Language (decision 39): another language at once, then Automatic again
  await w.tap(tt('set.language'))
  w.shot('Language')
  const other = lang === 'de' ? 'fr' : 'de'
  await w.tap(S.LANG_NAMES[other])
  w.shot('Settings in another language')
  S.setLang(other)
  const langRow = S.t('set.language')
  const auto = `${S.t('opt.lang.auto')} · ${S.LANG_NAMES[lang]}`
  S.setLang(lang)
  await w.tap(langRow)
  await w.tap(auto)
  if (!w.shows(tt('set.phone'))) throw new Error(w.where() + ' Automatic did not bring the language back')
  await w.tap(tt('set.phone'))
  w.shot('Phone & sync')
  await w.tap(tt('set.syncNow'))
  await w.swipeBack()
  // Feedback: a QR code of a mail to us, with the version and the language in its subject
  await w.tap(tt('set.feedback'))
  w.shot('Feedback')
  qrOnScreen(w, (c) => c.indexOf('mailto:pavle019@live.com?subject=RallyPal') === 0 && c.indexOf(encodeURIComponent(S.LANG_NAMES[lang])) > 0)
  await w.swipeBack()
  await w.tap(tt('set.about'))
  w.shot('About')
  await w.tap(tt('about.keys'))
  w.shot('Keys')
  await w.tap(tt('ok'))
  // the author's row opens a QR code of the site
  await w.tap(tt('about.by', { name: 'Pavle' }))
  w.shot('Site')
  qrOnScreen(w, (c) => c === 'https://pavlemarinkovic.com')
  await w.swipeBack()
  await w.swipeBack()
  await w.swipeBack()
  if (w.name !== 'index') throw new Error(w.where() + ' back from Settings')
  // the changed settings in a match: only who serves, no labels, the screen kept on
  await startMatch(w, 'tennis', 1, 0)
  if (w.allLog.indexOf('brightTime') < 0) throw new Error(w.where() + ' "Always on" did not keep the screen on')
  await playUntil(w, r, (x) => x.games[0] + x.games[1] >= 3)
  w.shot('Match, only who serves, no labels')
  // "Points by tap" off: a tap on a half does nothing on watches with keys; a one-key watch keeps the taps
  const set = JSON.parse(w.files['settings.json'])
  set.values.tapPoints = false
  set.stamps.tapPoints = w.now
  w.files['settings.json'] = JSON.stringify(set)
  w.open('match')
  const before = S.view(w.match()).rallies
  const top = w.visible().filter((x) => x.type === 'BUTTON' && x.props.y === 0)
  if (K >= 2 && top.length) throw new Error(w.where() + ' taps still give points with "Keys only"')
  if (K < 2 && !top.length) throw new Error(w.where() + ' a one-key watch lost its taps')
  if (K >= 2) {
    await w.key('SELECT')
    if (S.view(w.match()).rallies !== before + 1) throw new Error(w.where() + ' the key no longer gives the point')
  }
  return w
}

// The free trial: the free matches line, the setups with the official rules and no names, Settings with
// "Unlock RallyPal", UNLOCK after the third match, the unlock screen with its code, and the thank-you
async function trialWalk(device, lang) {
  S.setLang(lang)
  const w = new Watch(device, T0, lang)
  w.files['settings.json'] = JSON.stringify({ values: { setups: setups() }, stamps: {} })
  w.files['meta.json'] = JSON.stringify({ onboarded: T0, restoredAt: T0 - DAY, bgAsked: T0 - DAY, trialIds: ['m1'] })
  w.bgPermission = true
  w.open('index')
  if (!w.shows(tt('trial.left', { n: 2 }))) throw new Error(w.where() + ' no free matches line')
  w.shot('Start, free trial')
  await w.tapImg('caret.png')
  w.shot('Match setups, free trial')
  if (w.shows('Marko')) throw new Error(w.where() + ' names show in the trial')
  await w.swipeBack()
  await w.tapImg('settings.png')
  w.shot('Settings, free trial')
  await w.tap(tt('set.unlock'))
  if (w.name !== 'unlock') throw new Error(w.where() + ' "Unlock RallyPal" did not open the unlock screen')
  // the phone's answer with the code
  await w.settle()
  w.shot('Unlock, code')
  if (!w.shows('482913')) throw new Error(w.where() + ' no payment code')
  qrOnScreen(w, (c) => c === 'https://kzl.io/code')
  await w.swipeBack()
  if (w.name !== 'settings') throw new Error(w.where() + ' BACK from the unlock screen')
  // the last free match: the summary says it was the last one
  w.files['meta.json'] = JSON.stringify({ onboarded: T0, restoredAt: T0 - DAY, bgAsked: T0 - DAY, trialIds: ['m1', 'm2'] })
  w.open('index')
  await w.tap(tt('home.newMatch'))
  await w.tap(tt('team.opponent'))
  if (w.name !== 'match') throw new Error(w.where() + ' the trial match did not start')
  await playUntil(w, S.rng(3), () => false)
  if (w.name !== 'summary') throw new Error(w.where() + ' no summary after the trial match')
  if (w.allLog.indexOf('toast: ' + tt('trial.lastMatch')) < 0) throw new Error(w.where() + ' no "last free match" message')
  w.shot('Summary, last free match')
  await w.advance(2)
  await w.tap(tt('home.unlock'))
  if (w.name !== 'unlock') throw new Error(w.where() + ' UNLOCK on the summary')
  // the free matches are used up: UNLOCK in NEW MATCH's place, settings read-only
  w.files['meta.json'] = JSON.stringify({ onboarded: T0, restoredAt: T0 - DAY, bgAsked: T0 - DAY, trialIds: ['m1', 'm2', 'm3'] })
  w.open('index')
  w.shot('Start, trial ended')
  if (!w.shows(tt('home.unlock'))) throw new Error(w.where() + ' no UNLOCK after the trial')
  await w.tap(tt('home.unlock'))
  if (w.name !== 'unlock') throw new Error(w.where() + ' UNLOCK did not open the unlock screen')
  await w.settle()
  w.paid = true
  await w.advance(9)
  w.shot('Unlocked')
  if (!w.shows(tt('unlock.done'))) throw new Error(w.where() + ' no thank-you after paying')
  await w.advance(3)
  if (w.name !== 'index' || w.shows(tt('home.unlock'))) throw new Error(w.where() + ' still locked after paying')
  return w
}

// A match picked up at a score (ROAST 18): START FROM with − and +, back to "Who serves first?", the match
async function fromWalk(device, lang) {
  S.setLang(lang)
  const w = new Watch(device, T0, lang)
  seed(w, false)
  w.files['meta.json'] = JSON.stringify({ onboarded: T0, licensed: true, restoredAt: T0 - DAY, bgAsked: T0 - DAY })
  w.bgPermission = true
  w.open('index')
  await w.tap(tt('home.newMatch'))
  await w.tap(tt('from.button'))
  if (!w.shows(tt('from.title'))) throw new Error(w.where() + ' no START FROM')
  const plus = () => w.visible().filter((x) => x.type === 'BUTTON' && x.props.text === '+').sort((a, b) => a.props.y - b.props.y || a.props.x - b.props.x)
  // sets: you 1; games: you 3, opponent 2
  await w.press(plus()[0], 'sets +')
  for (let i = 0; i < 3; i++) await w.press(plus()[2], 'games +')
  for (let i = 0; i < 2; i++) await w.press(plus()[3], 'games +')
  w.shot('Start from a score')
  await w.tap(tt('ok'))
  w.shot('Who serves first?, from a score')
  if (!w.shows(tt('from.line', { score: '1–0 · 3–2' }))) throw new Error(w.where() + ' the score above the question')
  await w.tap('Marko')
  const v = S.view(w.match())
  if (v.won[0] !== 1 || v.games[0] !== 3 || v.games[1] !== 2 || v.server !== 1) throw new Error(w.where() + ' the match did not start from 1-0 3-2')
  w.shot('Match from a score')
  return w
}

// Serve statistics (ROAST 20): FAULT, 2ND SERVE, ACE and DOUBLE FAULT under the score in tennis
async function serveWalk(device, lang) {
  S.setLang(lang)
  const w = new Watch(device, T0, lang)
  seed(w, false)
  const set = JSON.parse(w.files['settings.json'])
  set.values.serveStats = true
  w.files['settings.json'] = JSON.stringify(set)
  w.files['meta.json'] = JSON.stringify({ onboarded: T0, licensed: true, restoredAt: T0 - DAY, bgAsked: T0 - DAY })
  w.bgPermission = true
  w.open('index')
  await w.tap(tt('home.newMatch'))
  await w.tap(tt('team.you'))
  w.shot('Match, serve stats')
  await w.tap(tt('serve.ace'))
  await w.tap(tt('serve.fault'))
  w.shot('Match, second serve')
  await w.tap(tt('serve.df'))
  await w.tap(tt('serve.fault'))
  await w.tap(tt('serve.second'))
  if (w.shows(tt('serve.second'))) throw new Error(w.where() + ' FAULT did not toggle back')
  const sv = S.view(w.match()).stats.serve
  if (!sv || sv.aces[0] !== 1 || sv.doubleFaults[0] !== 1) throw new Error(w.where() + ' serve stats ' + JSON.stringify(sv))
  return w
}

// The setup in 3 steps on a new install (ROAST-v2 9): the sport, singles or doubles, how points are given
async function obWalk(device, lang) {
  S.setLang(lang)
  const w = new Watch(device, T0, lang)
  w.bgPermission = true
  w.open('index')
  if (!w.shows(tt('sport.badminton'))) throw new Error(w.where() + ' no setup in 3 steps on a new install')
  w.shot('Setup step 1, sport')
  await w.tap(tt('sport.badminton'))
  w.shot('Setup step 2, players')
  await w.tap(tt('setup.doubles'))
  if (device.keys >= 2) {
    w.shot('Setup step 3, points')
    await w.tap(tt('opt.tapPoints.off'))
  }
  if (!w.shows(tt('home.newMatch'))) throw new Error(w.where() + ' not back on the start screen')
  w.shot('Start after the setup')
  const set = JSON.parse(w.files['settings.json'])
  const badm = set.values.setups.filter((x) => x.sport === 'badminton')[0]
  if (!badm.doubles) throw new Error(w.where() + ' doubles not saved')
  if (device.keys >= 2 && set.values.tapPoints !== false) throw new Error(w.where() + ' keys only not saved')
  // not again on the next start
  w.open('index')
  if (w.shows(tt('ob.skip'))) throw new Error(w.where() + ' the setup came again')
  return w
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  await loadLib()
  const devices = DEVICES.filter((d) => !ONLY.some((x) => DEVICES.some((y) => y.name === x)) || ONLY.indexOf(d.name) >= 0)
  const langs = Object.keys(LANGS).filter((l) => !ONLY.some((x) => x in LANGS) || ONLY.indexOf(l) >= 0)
  let failed = 0
  for (const d of devices) {
    const shots = []
    for (const lang of langs) {
      try {
        const w = await walk(d, lang)
        shots.push(...w.shots)
        const tw = await trialWalk(d, lang)
        shots.push(...tw.shots)
        const fw = await fromWalk(d, lang)
        shots.push(...fw.shots)
        const sw = await serveWalk(d, lang)
        shots.push(...sw.shots)
        const ow = await obWalk(d, lang)
        shots.push(...ow.shots)
      } catch (e) {
        failed++
        console.error(`${d.name} ${lang}: FAILED`, e.stack || e)
      }
    }
    fs.writeFileSync(path.join(OUT, d.name + '.json'), JSON.stringify({ device: d, shots }))
    const warn = shots.reduce((n, s) => n + s.warnings.length, 0)
    console.log(`${d.name}: ${shots.length} screens${warn ? `, ${warn} warnings` : ''}`)
  }
  if (failed) process.exit(1)
}

main()
