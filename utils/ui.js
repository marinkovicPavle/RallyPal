// Layout and widget helpers (from SaunaPal). Screens are designed twice: round at 480 x 480 and square
// at 390 x 450 (the numbers of nacrt2.py), and every number is scaled to the real screen (round 360 to
// 480, square 320 x 380 to 432 x 514).
//
// A page draws one "screen" at a time: newScreen() deletes everything drawn before, then the helpers
// below create widgets. Values that change while the screen is up are updated with setText / setColor.

import { getDeviceInfo, SCREEN_SHAPE_ROUND } from '@zos/device'
import { createWidget, deleteWidget, widget, prop, align, text_style, getTextLayout } from '@zos/ui'
import './lang'

const info = getDeviceInfo()
export const W = info.width
export const H = info.height
export const ROUND = info.screenShape === SCREEN_SHAPE_ROUND || (info.screenShape === undefined && W === H)
export const KEYS = Math.max(1, Number(info.keyNumber) || (ROUND ? 2 : 1))
export const DESIGN_W = ROUND ? 480 : 390
export const DESIGN_H = ROUND ? 480 : 450
export const K = W / DESIGN_W
// square screens taller than the design keep the design centered vertically
const OY = ROUND ? 0 : Math.max(0, Math.round((H - DESIGN_H * K) / 2))
export const CX = Math.round(W / 2)
// the middle of the design, in design units
export const MX = ROUND ? 240 : 195

// the colors of the approved drawing (variant A, tennis ball)
export const C = {
  white: 0xffffff,
  gray: 0x969696,
  lgray: 0xc8c8c8,
  dim: 0x5f5f5f,
  dark: 0x282828,
  darkDown: 0x1a1a1a,
  pill: 0x343434,
  pillDown: 0x4a4a4a,
  lime: 0xd4f02b,
  limeDown: 0x9db21f,
  // the purple of the icon: UNDO and History (decision 34)
  purple: 0x6f3dea,
  purpleDown: 0x4f2ba8,
  red: 0xff5a50,
  redDown: 0xb33f38,
  heart: 0xff455a,
  tab: 0x6e6e6e,
  black: 0x000000
}

let drawn = []

// Drawn right after the background of every new screen, so it stays under the screen's own widgets.
// The watch gives a tap to the topmost widget under the finger, so anything that is not a button
// (the key tabs: an arc takes the box of its whole circle) must be drawn before the buttons.
let underlay = null
let underlayDrawn = false

export function setUnderlay(fn) {
  underlay = fn
  if (fn) underlayDrawn = false
}

export function underlayWasDrawn() {
  return underlayDrawn
}

let contentBottom = 0

export function newScreen(bg) {
  drawn.forEach((w) => {
    try {
      deleteWidget(w)
    } catch (e) {}
  })
  drawn = []
  contentBottom = 0
  if (bg !== undefined && bg !== C.black) {
    keep(createWidget(widget.FILL_RECT, { x: 0, y: 0, w: W, h: H, color: bg }))
  }
  if (underlay) {
    underlayDrawn = true
    underlay()
  }
}

function keep(w) {
  drawn.push(w)
  return w
}

export function px(n) {
  return Math.round(n * K)
}

export function sy(n) {
  return Math.round(OY + n * K)
}

export function pick(r, s) {
  return ROUND ? r : s
}

// spec: { r: [x, y, w, h], s: [x, y, w, h] } in design units, or a plain [x, y, w, h] used for both
export function box(spec) {
  const b = Array.isArray(spec) ? spec : ROUND ? spec.r : spec.s
  return { x: px(b[0]), y: sy(b[1]), w: px(b[2]), h: px(b[3]) }
}

// Horizontally centered box: width w at design y, height h
export function mid(w, y, h) {
  const ww = px(w)
  return { x: Math.round((W - ww) / 2), y: sy(y), w: ww, h: px(h) }
}

// Box of a pill centered on design point (x, y)
export function around(x, y, w, h) {
  return { x: px(x - w / 2), y: sy(y - h / 2), w: px(w), h: px(h) }
}

// Usable width (design units) for a row at design y..y+h; follows the circle on round screens
export function chord(y, h, margin) {
  const m = margin === undefined ? 14 : margin
  if (!ROUND) return DESIGN_W - 2 * m
  const r = DESIGN_W / 2
  const far = Math.max(Math.abs(y - r), Math.abs(y + h - r))
  if (far >= r) return 120
  const half = Math.sqrt(r * r - far * far)
  return Math.max(120, Math.round(2 * half - 2 * m))
}

// Width in pixels of one line of text, as the watch lays it out (an estimate where it cannot say)
export function textWidth(value, sizePx) {
  try {
    const r = getTextLayout(String(value), { text_size: sizePx, text_width: 0, wrapped: 0 })
    if (r && r.width > 0) return r.width
  } catch (e) {}
  return String(value).length * sizePx * 0.62
}

// The largest size (design units, down to min) at which one line fits wPx
export function fitSize(value, size, wPx, min) {
  let s = size
  const least = min === undefined ? Math.round(size * 0.85) : min
  while (s > least && textWidth(value, px(s)) > wPx) s--
  return s
}

// opts: { align: 'left' | 'right', wrap, min (smallest size a one-line text may shrink to) }
export function text(b, value, size, color, opts) {
  const o = opts || {}
  const v = value === undefined || value === null ? '' : String(value)
  // a one-line text wider than its box gets smaller (down to 85%, or opts.min) instead of being cut
  const s = !o.wrap && v ? px(fitSize(v, size, b.w, o.min)) : px(size)
  return keep(
    createWidget(widget.TEXT, {
      ...b,
      text: v,
      text_size: s,
      color: color === undefined ? C.white : color,
      align_h: o.align === 'left' ? align.LEFT : o.align === 'right' ? align.RIGHT : align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: o.wrap ? text_style.WRAP : text_style.ELLIPSIS
    })
  )
}

// A one-line text anchored like the drawing: at design point (x, y), centered ('mm'), starting there
// ('lm') or ending there ('rm'); w is the room it has (design units)
export function at(x, y, w, value, size, color, anchor, opts) {
  const h = Math.round(size * 1.4)
  const a = anchor || 'mm'
  const x0 = a === 'lm' ? x : a === 'rm' ? x - w : x - w / 2
  const b = { x: px(x0), y: sy(y - h / 2), w: px(w), h: px(h) }
  return text(b, value, size, color, { ...(opts || {}), align: a === 'lm' ? 'left' : a === 'rm' ? 'right' : undefined })
}

export function setText(w, value) {
  try {
    if (w) w.setProperty(prop.TEXT, String(value))
  } catch (e) {}
}

export function setColor(w, color) {
  try {
    if (w) w.setProperty(prop.COLOR, color)
  } catch (e) {}
}

export function show(w, visible) {
  try {
    if (w) w.setProperty(prop.VISIBLE, !!visible)
  } catch (e) {}
}

// Shapes keep their props so a later change can resend all of them (prop.MORE)
function shape(type, props) {
  const w = keep(createWidget(type, props))
  return {
    w,
    p: props,
    set(patch) {
      Object.keys(patch).forEach((k) => (this.p[k] = patch[k]))
      try {
        w.setProperty(prop.MORE, { ...this.p })
      } catch (e) {}
    },
    show(v) {
      show(w, v)
    }
  }
}

export function rect(b, color, radius) {
  return shape(widget.FILL_RECT, { ...b, radius: radius ? px(radius) : 0, color })
}

export function outline(b, color, radius, width) {
  return shape(widget.STROKE_RECT, { ...b, radius: radius ? px(radius) : 0, line_width: px(width || 3), color })
}

export function circle(x, y, r, color) {
  return shape(widget.CIRCLE, { center_x: x, center_y: y, radius: r, color })
}

// Arc near the edge of a round screen (angles: 0 = 12 o'clock, clockwise)
export function ring(color, width, inset, from, to) {
  const d = W - 2 * px(inset)
  return shape(widget.ARC, {
    x: px(inset),
    y: px(inset),
    w: d,
    h: d,
    start_angle: from - 90,
    end_angle: to - 90,
    color,
    line_width: px(width)
  })
}

export function button(b, label, size, bg, down, onClick, fg) {
  return keep(
    createWidget(widget.BUTTON, {
      ...b,
      text: label,
      text_size: px(fitSize(label, size, b.w - Math.round(b.h * 0.6))),
      color: fg === undefined ? C.white : fg,
      radius: Math.round(b.h / 2),
      normal_color: bg,
      press_color: down,
      click_func: () => onClick && onClick()
    })
  )
}

// The pill buttons of the drawing: lime with black text (the main action) or gray with white text
export function limeButton(b, label, size, onClick) {
  return button(b, label, size, C.lime, C.limeDown, onClick, C.black)
}

export function purpleButton(b, label, size, onClick) {
  return button(b, label, size, C.purple, C.purpleDown, onClick, C.white)
}

export function pillButton(b, label, size, onClick, fg) {
  return button(b, label, size, C.pill, C.pillDown, onClick, fg)
}

// The watch delivers taps reliably only to BUTTON widgets, and on a T-Rex 3 Pro a label or icon drawn
// over a button kept the touch even with setEnable(false) (SaunaPal). So a tappable area with labels gets
// an invisible BUTTON drawn last, on top of them: transparent images, nothing to see.
export function cover(b, onClick) {
  return keep(
    createWidget(widget.BUTTON, {
      ...b,
      text: '',
      normal_src: 'blank.png',
      press_src: 'blank.png',
      click_func: () => onClick && onClick()
    })
  )
}

// A QR code on a white rounded square; b: the square, pad: the white edge around the code (pixels)
export function qrCode(b, content, pad) {
  return keep(createWidget(widget.QRCODE, { content, x: b.x + pad, y: b.y + pad, w: b.w - 2 * pad, h: b.h - 2 * pad,
    bg_x: b.x, bg_y: b.y, bg_w: b.w, bg_h: b.h, bg_radius: px(12) }))
}

export function img(x, y, src) {
  return keep(createWidget(widget.IMG, { x, y, src }))
}

// images are not scaled with the screen: the sizes of the files (.dev/tools/assets.py)
export const HEART = ROUND ? { w: 22, h: 20 } : { w: 20, h: 18 }
export const ICON = ROUND ? 26 : 24
export const CARET = ROUND ? { w: 14, h: 9 } : { w: 12, h: 7 }
const MARKER_SIZES = [16, 20, 24, 28]

// The serve marker of a sport (decision 23) in the file size nearest to design diameter d; returns its size
export function markerSize(d) {
  const want = px(d)
  let best = MARKER_SIZES[0]
  MARKER_SIZES.forEach((s) => {
    if (Math.abs(s - want) < Math.abs(best - want)) best = s
  })
  return best
}

// centered on pixel point (x, y)
export function marker(sport, x, y, d) {
  const s = markerSize(d)
  return img(Math.round(x - s / 2), Math.round(y - s / 2), `srv-${sport}-${s}.png`)
}

// Round button with an icon (history.png / settings.png) on a gray pill
export function iconButton(b, icon, onClick, color) {
  const bg = rect(b, color || C.pill, b.h / 2 / K)
  img(b.x + Math.round((b.w - ICON) / 2), b.y + Math.round((b.h - ICON) / 2), `${icon}.png`)
  cover(b, onClick)
  return bg
}

// Page height when content runs below the screen (lists): the page scrolls
export function setContentBottom(designY) {
  contentBottom = sy(designY)
  // a 1 px widget at the bottom makes the page that tall
  rect({ x: 0, y: contentBottom - 1, w: 1, h: 1 }, C.black)
}
