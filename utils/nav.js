// Screens inside one page, and moving between pages (from SaunaPal).
//
// A page keeps a small stack of screens (a list, then a choice on top of it, ...). Each screen is a
// function that draws itself and returns what the keys do and which tabs to show:
//   (nav) => ({ keys: { primary, secondary, tertiary, back, gesture }, hints: { role: [color, word] } })
// BACK and a swipe from the left edge go one screen back; at the first screen they call onExit. A screen
// whose BACK key does something else (the match: your point) says what the swipe does with keys.gesture.
//
// Pages are switched with replace() so the router stack is always one page deep and every page is
// built fresh from the saved files.

import { replace, exit } from '@zos/router'
import { getScrollTop, scrollTo } from '@zos/page'
import { bindKeys, unbindKeys, bindBackGesture, unbindGesture, drawHints } from './keys'
import { setUnderlay, underlayWasDrawn } from './ui'

export function goPage(name, params) {
  try {
    replace({ url: 'page/' + name, params: params ? JSON.stringify(params) : '' })
  } catch (e) {}
}

export function quit() {
  try {
    exit()
  } catch (e) {}
}

export function parseParams(p) {
  if (!p) return {}
  if (typeof p === 'object') return p
  try {
    return JSON.parse(p) || {}
  } catch (e) {
    return {}
  }
}

function scrollTop() {
  try {
    return getScrollTop() || 0
  } catch (e) {
    return 0
  }
}

export function createNav(onExit) {
  const stack = []
  // what a screen keeps between its drawings (the outlined option of a question)
  const locals = []
  const scrolls = []
  const lastHints = []
  let current = { keys: {} }
  let bound = false
  // tabs a screen announced before drawing itself (nav.preHints)
  let early = null

  const nav = {
    // replaces the screen on top (or shows the first one)
    show(screen) {
      if (stack.length) stack[stack.length - 1] = screen
      else stack.push(screen)
      locals[stack.length - 1] = {}
      nav.redraw()
    },

    push(screen) {
      scrolls[stack.length - 1] = scrollTop()
      stack.push(screen)
      locals[stack.length - 1] = {}
      nav.redraw()
    },

    // one screen back; a list comes back at the place it was scrolled to
    back() {
      if (stack.length > 1) {
        stack.pop()
        nav.redraw()
        const y = scrolls[stack.length - 1]
        if (y) {
          try {
            scrollTo({ y })
          } catch (e) {}
        }
        return true
      }
      if (onExit) onExit()
      return true
    },

    // drops every screen and shows this one
    reset(screen) {
      stack.splice(0)
      stack.push(screen)
      nav.redraw()
    },

    // back to the first screen of the page
    root() {
      stack.splice(1)
      nav.redraw()
    },

    depth() {
      return stack.length
    },

    local() {
      const i = stack.length - 1
      if (!locals[i]) locals[i] = {}
      return locals[i]
    },

    // The key tabs go under the screen (see setUnderlay). A screen says which tabs it wants only after
    // drawing, so the tabs from its last drawing are used; when they changed, it is drawn once more.
    redraw(again) {
      if (!bound) bind()
      const screen = stack[stack.length - 1]
      if (!screen) return
      let want = screen.hints || lastHints[stack.length - 1] || {}
      early = null
      setUnderlay(() => drawHints(early || want))
      let res
      try {
        res = screen(nav)
      } finally {
        setUnderlay(null)
      }
      // the screen moved somewhere else itself (nav.back() inside it): that drawing already set everything
      if (stack[stack.length - 1] !== screen) return
      current = res || { keys: {} }
      if (early) want = early
      const hints = current.hints || {}
      screen.hints = hints
      lastHints[stack.length - 1] = hints
      if (!underlayWasDrawn()) return
      if (!again && JSON.stringify(hints) !== JSON.stringify(want)) nav.redraw(true)
    },

    // A screen whose tabs change as it is used (the match: what the next point gives) says them before it
    // draws, so they are drawn right the first time
    preHints(hints) {
      early = hints
    },

    // replaces the handlers of the current screen without drawing it again
    setKeys(keys) {
      current.keys = keys || {}
    },

    destroy() {
      unbindKeys()
      unbindGesture()
    }
  }

  function bind() {
    bound = true
    bindKeys(() => {
      const k = current.keys || {}
      return { ...k, back: k.back || (() => nav.back()) }
    })
    bindBackGesture(() => {
      const k = current.keys || {}
      if (k.gesture) k.gesture()
      else if (k.back) k.back()
      else nav.back()
      return true
    })
  }

  return nav
}
