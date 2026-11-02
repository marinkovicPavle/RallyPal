// Physical buttons (from SaunaPal). Each screen says what its primary / secondary / tertiary / back action
// is; this file maps them to the keys the watch has and draws a tab next to each key that does something,
// in the color of the button on the screen it presses (decision 34). Only the point keys of the match get
// a word inside their tab, in the tab's color: what the point gives (decision 35). BACK that only goes
// back gets no tab.
//
// 4-5 keys (T-Rex 3 Pro: SELECT upper right, BACK lower right, UP upper left, DOWN lower left):
//   primary = SELECT, back = BACK, tertiary = UP, secondary = DOWN
// 2-3 keys: primary = upper key, secondary = lower key (BACK too when the screen has a secondary)
// 1 key:    primary = the key; everything else by touch

import {
  onKey, offKey, onGesture, offGesture, KEY_SELECT, KEY_BACK, KEY_UP, KEY_DOWN, KEY_HOME, KEY_SHORTCUT,
  KEY_EVENT_CLICK, GESTURE_RIGHT
} from '@zos/interaction'
import { W, K, ROUND, KEYS, px, sy, rect, ring, at, textWidth, C } from './ui'

const ANGLE = KEYS >= 4
  ? { primary: 60, back: 120, secondary: 240, tertiary: 300 }
  : KEYS >= 2
    ? { primary: 60, secondary: 120 }
    : { primary: 90 }

// square screens: the middle of each bar (design y), level with the two score rows of the match
const SIDE_Y = KEYS >= 2 ? { primary: 134, secondary: 314 } : { primary: 225 }
const BAR_H = 76

// where the small word of a tab goes (round, design units): inside the arcs, clear of them
const LABEL_AT = KEYS >= 4
  ? { primary: [402, 104], back: [402, 380], secondary: [106, 374], tertiary: [106, 110] }
  : KEYS >= 2
    ? { primary: [402, 104], secondary: [402, 380] }
    : { primary: [404, 240] }

export const TAB = { inset: 5, width: 8, half: 11 }
// the words next to the tabs stay inside this radius (design units): 10 short of the arcs' inner edge
const WORD_R = 240 - TAB.inset - TAB.width - 10

function roleOf(key) {
  if (KEYS >= 4) {
    if (key === KEY_SELECT) return 'primary'
    if (key === KEY_DOWN) return 'secondary'
    if (key === KEY_UP) return 'tertiary'
    if (key === KEY_BACK) return 'back'
    return null
  }
  if (KEYS >= 2) {
    if (key === KEY_SELECT || key === KEY_HOME || key === KEY_UP) return 'primary'
    if (key === KEY_SHORTCUT || key === KEY_DOWN) return 'secondary'
    if (key === KEY_BACK) return 'backOrSecondary'
    return null
  }
  if (key === KEY_SELECT || key === KEY_HOME || key === KEY_BACK || key === KEY_SHORTCUT) return 'primary'
  return null
}

// handlers: { primary, secondary, tertiary, back } (functions or null). Returns true when handled.
// Only CLICK counts (the watch sends PRESS, RELEASE, CLICK for every press, SaunaPal).
export function bindKeys(getHandlers) {
  try {
    onKey({
      callback: (key, ev) => {
        const h = getHandlers() || {}
        let role = roleOf(key)
        if (role === 'backOrSecondary') role = h.secondary ? 'secondary' : 'back'
        if (!role || !h[role]) return false
        if (ev !== KEY_EVENT_CLICK) return false
        h[role]()
        return true
      }
    })
  } catch (e) {}
}

export function unbindKeys() {
  try {
    offKey()
  } catch (e) {}
}

// Swipe from the left edge = back
export function bindBackGesture(fn) {
  try {
    onGesture({
      callback: (g) => {
        if (g === GESTURE_RIGHT && fn) return fn() !== false
        return false
      }
    })
  } catch (e) {}
}

export function unbindGesture() {
  try {
    offGesture()
  } catch (e) {}
}

export function hasRole(role) {
  return ROUND ? role in ANGLE : role in SIDE_Y
}

// Draws a colored tab next to each key that does something on this screen.
// map: { role: [color, word?, [x, y]?] }; [x, y] moves the word (round, design units)
export function drawHints(map) {
  Object.keys(map || {}).forEach((role) => {
    const spec = map[role]
    if (!spec || !hasRole(role)) return
    const color = spec[0]
    const word = spec[1]
    if (ROUND) {
      const a = ANGLE[role]
      ring(color, TAB.width, TAB.inset, a - TAB.half, a + TAB.half)
      if (word) {
        // centered on its point like the drawing, but moved in so no letter comes near the arc
        const p = spec[2] || LABEL_AT[role]
        const ww = Math.ceil(textWidth(word, px(15)) / K) + 2
        const half = Math.sqrt(Math.max(0, WORD_R * WORD_R - Math.pow(Math.abs(p[1] - 240) + 8, 2)))
        if (p[0] > 240) at(Math.min(p[0] + ww / 2, 240 + half), p[1], 140, word, 15, color, 'rm')
        else at(Math.max(p[0] - ww / 2, 240 - half), p[1], 140, word, 15, color, 'lm')
      }
    } else {
      const y = SIDE_Y[role]
      rect({ x: W - px(7), y: sy(y - BAR_H / 2), w: px(7), h: px(BAR_H) }, color, 3)
      if (word) at(384, y + BAR_H / 2 + 13, 90, word, 14, color, 'rm')
    }
  })
}
