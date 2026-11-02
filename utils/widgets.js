// Reusable screens in the style of the approved drawing (nacrt2.py): a scrolling list of gray rows, a
// choice, a confirm screen like "Leave RallyPal?", the two-button question of "Who serves first?" and
// the key guide. Each returns the { keys, hints } object that nav.js expects.

import { scrollTo } from '@zos/page'
import { showToast } from '@zos/interaction'
import {
  ROUND, KEYS, C, CX, MX, px, sy, mid, around, at, text, rect, outline, circle, button, pillButton, cover, newScreen,
  setContentBottom, chord, textWidth, fitSize, W
} from './ui'
import { hasRole } from './keys'
import { t } from '../shared/i18n'
import { ZONE_COLORS, zonePercents } from '../shared/insights'

const L = ROUND
  ? { titleY: 58, top: 110, w: 348, rowH: 56, gap: 8, tail: 150 }
  : { titleY: 30, top: 80, w: 350, rowH: 56, gap: 8, tail: 24 }

export const LIST = L

export function screen(bg) {
  newScreen(bg)
  try {
    scrollTo({ y: 0 })
  } catch (e) {}
}

export function toast(msg) {
  try {
    showToast({ content: msg })
  } catch (e) {}
}

// A screen title centered on design y, always whole: on a round screen it may only be as wide as the
// circle there, so a long title gets smaller and then breaks into two lines. Returns the design y under it.
// margin: design units kept free at both ends (more next to the key tabs)
export function heading(label, color, cy, size, margin) {
  const c = color === undefined ? C.white : color
  const s = String(label)
  const big = size || 26
  const mg = margin === undefined ? 14 : margin
  const room = (y, sz) => px(Math.min(400, chord(Math.round(y - sz * 0.6), Math.round(sz * 1.2), mg)))
  for (let sz = big; sz >= Math.min(big, 22); sz -= 2) {
    if (textWidth(s, px(sz)) <= room(cy, sz)) {
      at(MX, cy, 400, s, sz, c)
      return cy + sz
    }
  }
  // two lines; the break that leaves both lines the most room
  const words = s.split(' ')
  for (let sz = Math.min(big, 24); sz >= 16; sz -= 2) {
    const lh = Math.round(sz * 1.25)
    const c1 = cy - lh / 2
    const c2 = cy + lh / 2
    let best = null
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ')
      const b = words.slice(i).join(' ')
      const use = Math.max(textWidth(a, px(sz)) / room(c1, sz), textWidth(b, px(sz)) / room(c2, sz))
      if (!best || use < best.use) best = { a, b, use }
    }
    if (best && best.use <= 1) {
      at(MX, c1, 400, best.a, sz, c)
      at(MX, c2, 400, best.b, sz, c)
      return c2 + sz
    }
  }
  at(MX, cy, 400, s, 16, c, 'mm', { min: 12 })
  return cy + 16
}

// ---- lists -----------------------------------------------------------------------------------------

// row: { label, sub, subColor, value, valueColor, color, center, accent, onTap }, { note, size, h, color }
// or { header }. label + sub: two lines (the settings rows); label + value: one line, value on the right;
// center: one centered label (the menu rows).
function drawRow(r, y) {
  if (r.header) {
    at(MX, y + 14, L.w, r.header, 17, C.gray)
    return y + 34
  }
  if (r.note) {
    const h = r.h || 60
    text(mid(L.w - 30, y, h), r.note, r.size || 17, r.color || C.gray, { wrap: true })
    return y + h + L.gap
  }
  const h = r.h || L.rowH
  const b = mid(r.w || L.w, y, h)
  rect(b, r.bg === undefined ? C.pill : r.bg, r.radius || (r.center ? h / 2 : 20))
  if (r.accent) outline(b, r.accent, r.radius || (r.center ? h / 2 : 20), 3)
  const pad = px(22)
  const x = b.x + pad
  const tw = b.w - 2 * pad
  const color = r.color || C.white
  if (r.center) {
    text({ x, y: b.y, w: tw, h: b.h }, r.label, r.size || 23, color, { min: 17 })
  } else if (r.sub !== undefined) {
    text({ x, y: b.y + px(h / 2 - 25), w: tw, h: px(28) }, r.label, 21, color, { align: 'left', min: 17 })
    text({ x, y: b.y + px(h / 2 + 1), w: tw, h: px(24) }, r.sub, 16, r.subColor || C.lime, { align: 'left', min: 13 })
  } else {
    const has = r.value !== undefined && r.value !== ''
    const vw = has ? Math.min(Math.ceil(textWidth(r.value, px(19))) + 2, Math.round(tw * 0.5)) : 0
    text({ x, y: b.y, w: tw - (has ? vw + px(10) : 0), h: b.h }, r.label, 21, color, { align: 'left', min: 16 })
    if (has) text({ x: x + tw - vw, y: b.y, w: vw, h: b.h }, r.value, 19, r.valueColor || C.lgray, { align: 'right', min: 15 })
  }
  if (r.onTap) cover(b, r.onTap)
  return y + h + L.gap
}

// A scrolling list. opts: { title, rows, start, under: design y the rows may start at }
export function list(opts) {
  screen()
  const under = opts.title ? heading(opts.title, C.white, L.titleY) + 18 : 0
  let y = Math.max(opts.start || L.top - L.rowH / 2, under)
  ;(opts.rows || []).forEach((r) => {
    if (r) y = drawRow(r, y)
  })
  setContentBottom(y + L.tail)
  return y
}

// opts: { title, options: [[value, label]], current, onPick }
export function choice(opts) {
  const rows = opts.options.map((o) => {
    const on = String(o[0]) === String(opts.current)
    return { label: o[1], center: true, color: on ? C.lime : C.white, accent: on ? C.lime : null, onTap: () => opts.onPick(o[0]) }
  })
  list({ title: opts.title, rows })
  return { keys: {}, hints: {} }
}

// Like "Leave RallyPal?" on the drawing. opts: { title, body, ok, okColor, cancel, onOk, onCancel }
// Only the BACK key works here (cancel): a key pressed by mistake must not end or delete anything.
export function confirm(opts, nav) {
  const R = ROUND
  screen()
  const under = heading(opts.title, C.white, R ? 110 : 60, 30)
  const by = Math.max(R ? 150 : 96, under + 8)
  const bh = (R ? 262 : 250) - by
  text(mid(R ? 340 : 340, by, bh), opts.body, 22, C.gray, { wrap: true })
  const ok = () => opts.onOk()
  const cancel = () => (opts.onCancel ? opts.onCancel() : nav.back())
  const x = MX
  pillButton(around(x, R ? 314 : 300, 220, 62), opts.ok, 26, ok, opts.okColor)
  if (opts.cancel) button(around(x, R ? 392 : 380, 150, 50), opts.cancel, 22, C.dark, C.darkDown, cancel)
  // the upper right key is the main button, its tab in the button's color (red for END); BACK cancels
  return { keys: { primary: ok, back: cancel }, hints: { primary: [opts.okColor === C.red ? C.red : C.tab] } }
}

// "Who serves first?": a line above, the question and two (or three) big gray buttons; the upper one
// is on the upper right key, the lower one on the lower right key (round) or the lower key.
// opts: { top, question, options: [{ label, onPick, chosen }], back }. The BACK key may be the lower
// button, so a swipe from the left edge does opts.back.
// "Who serves first?": the options as big gray buttons, picked with a tap. On watches with 4 keys or more
// the upper left and lower left keys move a lime outline over them and the upper right key picks the
// outlined one, starting on the option marked chosen (decision 34, item 1). BACK goes back everywhere.
export function question(opts, nav) {
  const R = ROUND
  screen()
  const n = opts.options.length
  const keys = { gesture: opts.back, back: opts.back }
  const hints = {}
  const cursor = KEYS >= 4 && !!nav
  const loc = nav ? nav.local() : {}
  if (loc.sel === undefined) {
    loc.sel = 0
    opts.options.forEach((o, i) => {
      if (o.chosen) loc.sel = i
    })
  }
  const marked = (o, i) => (cursor ? i === loc.sel : !!o.chosen)
  // the outline is drawn over the button, so a cover on top keeps the tap
  const draw = (o, i, b, size, h) => {
    pillButton(b, o.label, size, o.onPick)
    if (marked(o, i)) {
      outline(b, C.lime, h / 2, 3)
      cover(b, o.onPick)
    }
  }
  if (n === 2) {
    if (R) {
      if (opts.top) at(240, 92, 340, opts.top, 24, C.gray)
      heading(opts.question, C.white, 140, 34, 26)
    } else {
      heading(opts.question, C.white, 40, 30)
      if (opts.top) at(195, 224, 340, opts.top, 20, C.gray)
    }
    const ys = R ? [238, 342] : [134, 314]
    const h = R ? 84 : 80
    opts.options.forEach((o, i) => draw(o, i, around(MX, ys[i], R ? 340 : 330, h), 36, h))
  } else {
    heading(opts.question, C.white, R ? 110 : 36, 30)
    const ys = R ? [190, 270, 350] : [116, 214, 312]
    const h = R ? 64 : 72
    opts.options.forEach((o, i) => draw(o, i, around(MX, ys[i], R ? 320 : 330, h), 28, h))
  }
  if (cursor) {
    const move = (d) => () => {
      const sel = Math.max(0, Math.min(n - 1, loc.sel + d))
      if (sel === loc.sel) return
      loc.sel = sel
      nav.redraw()
    }
    keys.primary = () => opts.options[loc.sel].onPick()
    keys.tertiary = move(-1)
    keys.secondary = move(1)
    hints.primary = [C.lime]
    hints.tertiary = [C.tab]
    hints.secondary = [C.tab]
  } else if (KEYS >= 2) {
    // fewer keys: a name is picked with a tap; the upper key does nothing here rather than leave the app
    keys.primary = () => {}
  }
  return { keys, hints }
}

// What the keys do in a match: shown from Settings > About > Keys.
export function keyGuide(onOk) {
  const R = ROUND
  screen()
  const under = heading(t('keys.title'), C.white, R ? 66 : 30, 26)
  // the tabs next to the keys have the colors of the buttons they press (decision 34)
  let y = Math.max(R ? 90 : 52, under + 2)
  text(mid(R ? 320 : 340, y, 50), t('keys.colors'), 17, C.gray, { wrap: true })
  y += 56
  const rows = []
  if (KEYS >= 4) rows.push([C.white, t('keys.ur')], [C.lime, t('keys.lr')], [C.purple, t('keys.ul')], [C.tab, t('keys.ll')])
  else if (KEYS >= 2) rows.push([C.white, t('keys.upper')], [C.lime, t('keys.lower')])
  else rows.push([C.tab, t('keys.one')])
  const w = R ? 320 : 330
  const x0 = MX - w / 2
  rows.forEach((r) => {
    circle(px(x0 + 10), sy(y + 17), px(9), r[0])
    text({ x: px(x0 + 30), y: sy(y), w: px(w - 30), h: px(34) }, r[1], 19, C.white, { align: 'left', min: 14 })
    y += 38
  })
  // up to three lines: German needs them on round screens
  text(mid(R ? 320 : 340, y + 2, 74), t('keys.halves'), 17, C.gray, { wrap: true })
  y += 80
  const ok = () => onOk()
  const by = Math.max(y + 30, R ? 396 : 380)
  pillButton(around(MX, by, 160, 54), t('ok'), 24, ok)
  setContentBottom(by + 27 + (R ? 60 : 20))
  return { keys: { back: ok }, hints: {} }
}


// Heart rate zones as one bar of five colors, and with labels the percent of each under it. Returns the
// design y under it.
export function zonesBar(y, sec, width, labels) {
  const bw = width || (ROUND ? 320 : 340)
  const total = sec.reduce((a, b) => a + b, 0)
  if (!total) return y
  const x0 = CX - px(bw / 2)
  const full = px(bw)
  let sum = 0
  let left = 0
  const last = sec.reduce((k, s, i) => (s > 0 ? i : k), -1)
  sec.forEach((s, i) => {
    if (!s) return
    sum += s
    const right = Math.round((full * sum) / total)
    const w = right - left - (i === last ? 0 : px(6))
    if (w > 0) rect({ x: x0 + left, y: sy(y), w, h: px(labels ? 14 : 8) }, ZONE_COLORS[i], 3)
    left = right
  })
  if (!labels) return y + 8
  y += 20
  const pct = zonePercents(sec)
  const cw = bw / 5
  pct.forEach((p, i) => {
    text({ x: x0 + px(i * cw), y: sy(y), w: px(cw), h: px(24) }, `${t('zone.n', { n: i + 1 })} ${p}%`, 15, sec[i] ? ZONE_COLORS[i] : C.dim, { min: 11 })
  })
  return y + 26
}
