// Draws the phone page (setting/index.js) as HTML, with stand-ins for the Zepp settings components, and
// optionally as a PNG, so its layout can be looked at before anything goes to the phone (as SaunaPal's
// settings-html.mjs). The real components look a little different (fonts, inputs).
//
// Usage: node .dev/tools/sim/phone.mjs <out.html|out.png> [--tab=setups|history|stats|settings] [--lang=en]
//        [--width=390] [--sample] [--open=N] [--ui=key:value,key:value]   (ui: what is open, e.g. uiSetup:padel1)
//        [--state=file.json]   (more storage keys, e.g. the Strava tokens and the status lines)
// Needs esbuild (ESBUILD=<path to its package>); a .png also needs playwright (the global one).

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..', '..')
const require = createRequire(import.meta.url)
const esbuild = require(process.env.ESBUILD || 'esbuild')

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`))
  return a ? a.slice(k.length + 3) : d
}
const out = process.argv[2] || 'phone.html'
const WIDTH = Number(arg('width', '390'))
const LANG = arg('lang', 'en')

const code = esbuild.buildSync({
  entryPoints: [path.join(root, 'setting', 'index.js')], bundle: true, write: false, format: 'iife',
  alias: { i18n: path.join(here, 'phone-i18n.js') }
}).outputFiles[0].text

const data = { uiTab: arg('tab', 'setups') }
;(arg('ui', '') || '').split(',').filter(Boolean).forEach((kv) => {
  const i = kv.indexOf(':')
  data[kv.slice(0, i)] = kv.slice(i + 1)
})

if (process.argv.includes('--sample')) Object.assign(data, await sample(), data)
if (arg('state', '')) Object.assign(data, JSON.parse(fs.readFileSync(arg('state'), 'utf8')))
// --open=N: the Nth newest match (from 0) open in History
if (arg('open', '') !== '') data.uiMatch = JSON.parse(data.history || '[]').sort((a, b) => b.start - a.start)[Number(arg('open'))].id

const storage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = v) }
let page = null
const node = (type) => (props, children) => ({ type, props: props || {}, children: [].concat(children || []).filter(Boolean) })
const ctx = { AppSettingsPage: (o) => (page = o), console, JSON, Math, Date, __phoneLang: LANG }
;['View', 'Text', 'Button', 'TextInput', 'Toggle', 'Select', 'Auth', 'Section', 'Link', 'Image', 'Slider'].forEach((n) => (ctx[n] = node(n)))
ctx.globalThis = ctx
vm.createContext(ctx)
vm.runInContext(code, ctx)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const css = (st) =>
  Object.entries(st || {})
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
    .join(';')

function html(n) {
  if (!n || typeof n !== 'object') return n ? esc(n) : ''
  const p = n.props
  const kids = n.children.map(html).join('')
  switch (n.type) {
    case 'View':
      return `<div style="${css(p.style)}">${kids}</div>`
    // Zepp draws Text inline, like a span
    case 'Text':
      return `<span style="${css(p.style)}">${kids}</span>`
    // Zepp buttons are white with a shadow unless they get a background
    // Zepp's own sign-in button: its real look is Zepp's; drawn here as a plain full-width button
    case 'Auth':
      return `<button style="width:100%;height:42px;border-radius:21px;border:1px solid #c7c7cc;background:white;font-size:15px;font-weight:bold;color:#1c1c1e">${esc(p.label || '')}</button>`
    case 'Button': {
      const st = { border: 'none', padding: '0 16px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', ...(p.style || {}) }
      if (st.background === 'transparent') st.background = 'none'
      return `<button style="${css(st)}">${esc(p.label || '')}</button>`
    }
    case 'TextInput':
      return `<div class="ti">${p.label ? `<div class="tl">${esc(p.label)}</div>` : ''}<div class="tv" style="${css(p.subStyle)}">${
        p.value ? esc(p.value) : `<span class="ph">${esc(p.placeholder || '')}</span>`
      }</div></div>`
    case 'Image':
      return `<img src="${esc(p.src)}" width="${p.width}" height="${p.height}" style="display:block">`
    case 'Link':
      return `<a href="${esc(p.source || '')}" style="text-decoration:none">${kids}</a>`
    default:
      return kids
  }
}

const body = html(page.build({ settingsStorage: storage }))
const doc = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font-family:-apple-system,"Inter",Roboto,sans-serif;background:#f2f2f7;width:${WIDTH}px}
.bar{background:#1f1f1f;color:#fff;height:56px;display:flex;align-items:center;justify-content:center;font-size:18px;position:relative}
.bar:before{content:"‹";position:absolute;left:16px;font-size:30px;top:8px}
button{font-family:inherit;cursor:pointer;box-sizing:border-box}
.ti{width:100%}.tl{font-size:15px;color:#1c1c1e;margin-bottom:6px}
.tv{border-bottom:1px solid #c7c7cc;padding:6px 0;font-size:14px;color:#333;min-height:20px}.ph{color:#aaa}
</style><div class="bar">RallyPal</div>${body}`

if (out.endsWith('.png')) {
  const tmp = path.join(os.tmpdir(), `rp-phone-${process.pid}.html`)
  fs.writeFileSync(tmp, doc)
  const { chromium } = require('/opt/node22/lib/node_modules/playwright')
  const browser = await chromium.launch()
  const pg = await browser.newPage({ viewport: { width: WIDTH, height: 800 }, deviceScaleFactor: 2 })
  await pg.goto(pathToFileURL(tmp).href)
  // layout problems: the page wider than the phone, a button or a pill whose text does not fit
  const problems = await pg.evaluate((W) => {
    const out = []
    if (document.documentElement.scrollWidth > W) out.push(`page is ${document.documentElement.scrollWidth}px wide`)
    document.querySelectorAll('button, div').forEach((el) => {
      // only boxes that hold text themselves (a button, a pill, a line); rows of pills may run 8px over
      const holdsText = el.tagName === 'BUTTON' || (el.children.length && Array.from(el.children).every((c) => c.tagName === 'SPAN'))
      if (holdsText && el.scrollWidth > el.clientWidth + 1) out.push(`text does not fit: "${el.textContent.slice(0, 50)}"`)
      if (el.tagName === 'BUTTON' && el.scrollHeight > el.clientHeight + 1) out.push(`button text wraps: "${el.textContent.slice(0, 50)}"`)
      // a label on two lines inside a button tall enough for both
      if (el.tagName === 'BUTTON' && el.textContent) {
        const r = document.createRange()
        r.selectNodeContents(el)
        const tops = new Set(Array.from(r.getClientRects()).map((x) => Math.round(x.top)))
        if (tops.size > 1) out.push(`button text on two lines: "${el.textContent.slice(0, 50)}"`)
      }
      // a button's text needs 8px of air on each side: phone fonts can be a little wider than this one
      if (el.tagName === 'BUTTON' && el.textContent) {
        const range = document.createRange()
        range.selectNodeContents(el)
        if (range.getBoundingClientRect().width + 16 > el.getBoundingClientRect().width) out.push(`button text tight: "${el.textContent.slice(0, 50)}"`)
      }
      const r = el.getBoundingClientRect()
      if (r.right > W + 1) out.push(`past the right edge: "${el.textContent.slice(0, 50)}"`)
    })
    return Array.from(new Set(out))
  }, WIDTH)
  problems.forEach((x) => console.log('PROBLEM ' + x))
  await pg.screenshot({ path: out, fullPage: true })
  await browser.close()
  fs.unlinkSync(tmp)
} else fs.writeFileSync(out, doc)
console.log('wrote ' + out)

// Made-up setups and about two months of matches, played by the real scoring engine (seed.js)
async function sample() {
  const tmp = path.join(os.tmpdir(), `rp-seed-${process.pid}.mjs`)
  esbuild.buildSync({ entryPoints: [path.join(here, 'seed.js')], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error' })
  const S = await import(pathToFileURL(tmp).href)
  fs.unlinkSync(tmp)
  const R = (sport, rules) => ({ ...S.defaultRules(sport), ...(rules || {}) })
  const setups = [
    { id: 'tennis1', sport: 'tennis', rules: R('tennis'), doubles: false, name: '', opponent: 'Marko', partner: '' },
    { id: 'tennis2', sport: 'tennis', rules: R('tennis', { deuce: 'noad', finalSet: 'super' }), doubles: false, name: '', opponent: 'Konstantinović', partner: '' },
    { id: 'padel1', sport: 'padel', rules: R('padel'), doubles: true, name: '', opponent: 'Luka & Ivan', partner: 'Ana' },
    { id: 'padel2', sport: 'padel', rules: R('padel', { format: 'total', total: 24 }), doubles: true, name: 'Americano Friday', opponent: '', partner: '' },
    { id: 'pickleball1', sport: 'pickleball', rules: R('pickleball'), doubles: true, name: '', opponent: '', partner: 'Mila' },
    { id: 'tabletennis1', sport: 'tabletennis', rules: R('tabletennis'), doubles: false, name: '', opponent: 'Nikola', partner: '' },
    { id: 'squash1', sport: 'squash', rules: R('squash'), doubles: false, name: '', opponent: 'Aleksandar', partner: '' },
    { id: 'badminton1', sport: 'badminton', rules: R('badminton'), doubles: false, name: '', opponent: 'Luka', partner: '' }
  ]
  const by = (id) => setups.filter((s) => s.id === id)[0]
  const day = (back, h) => {
    const d = new Date(2026, 9, 21, h || 18, 10)
    d.setDate(d.getDate() - back)
    return d.getTime()
  }
  const plan = [
    [1, 'tennis1', { want: 0, p: 0.56 }],
    [3, 'padel1', { want: 1, p: 0.48 }],
    [5, 'pickleball1', { want: 0, p: 0.58 }],
    [6, 'tennis1', { want: 1, p: 0.46 }],
    [8, 'tabletennis1', { want: 0, p: 0.57 }],
    [10, 'squash1', { want: 1, p: 0.46 }],
    [12, 'badminton1', { want: 0, p: 0.56 }],
    [14, 'padel2', { p: 0.55 }],
    [17, 'tennis2', { want: 0, p: 0.55 }],
    [19, 'tennis1', { want: 0, p: 0.57 }],
    [23, 'padel1', { want: 0, p: 0.55 }],
    [26, 'tennis1', { want: 1, p: 0.47 }],
    [30, 'tabletennis1', { want: 0, p: 0.56 }],
    [33, 'tennis1', { want: 0, p: 0.56 }]
  ]
  const history = plan.map(([back, id, o], i) => S.playedMatch(by(id), day(back, 17 + (i % 4)), { seed: 3 + i * 7, ...o }))
  return {
    settings: JSON.stringify({ values: { setups, myName: '' }, stamps: {} }),
    history: JSON.stringify(history),
    lastSync: String(day(0, 8))
  }
}
