// Shortcut card (approved drawing 13; the list of cards next to the watch face). Without a match: the
// last result and NEW MATCH, which opens "Who serves first?" for the last setup. While a match is being
// played: its score and CONTINUE.
//
// The watch draws the card's background itself; the card draws only its content. A card gets taps only
// (no keys, no swipes), and only buttons take them reliably: a tap anywhere on the card opens the app
// (an invisible button over the card). It opens the app at most once per focus and reads no sensors.
//
// Coordinates are relative to the card's top left corner. The card is as wide as the system makes it
// (getAppWidgetSize); its height is set here.

import { getAppWidgetSize, setAppWidgetSize } from '@zos/ui'
import { push } from '@zos/router'
import { W, K, ROUND, C, px, newScreen, text, limeButton, img, cover } from '../utils/ui'
import { loadHistory, loadActive } from '../utils/data'
import { cardView } from '../shared/card'

const CARD_H = ROUND ? 254 : 240
const PAD = 30
// the icon in real pixels (images are not scaled with the screen): a smaller file on small screens
const SMALL = K < 0.9
const ICON = SMALL ? (ROUND ? 26 : 24) : ROUND ? 32 : 28
const ICON_SRC = SMALL ? 'icon-card-small.png' : 'icon-card.png'

function cardSize() {
  let s = {}
  try {
    s = getAppWidgetSize() || {}
  } catch (e) {}
  const w = s.w || W - 2 * (s.margin || px(ROUND ? 46 : 12))
  return { w, h: px(CARD_H) }
}

AppWidget({
  state: { size: null, opening: false },

  build() {
    try {
      setAppWidgetSize({ h: px(CARD_H) })
    } catch (e) {}
    this.state.size = cardSize()
    this.draw()
  },

  onResume() {
    try {
      this.state.opening = false
      this.draw()
    } catch (e) {
      console.log('card resume', e)
    }
  },

  // one push per focus, even if a tap arrives twice
  open(params) {
    if (this.state.opening) return
    this.state.opening = true
    try {
      push({ url: 'page/index', params: params ? JSON.stringify(params) : '' })
    } catch (e) {}
  },

  draw() {
    const { w, h } = this.state.size
    const view = cardView(loadActive(), loadHistory(), Date.now())
    newScreen()
    img(px(42) - Math.round(ICON / 2), px(40) - Math.round(ICON / 2), ICON_SRC)
    const tx = px(42) + Math.round(ICON / 2) + px(12)
    text({ x: tx, y: px(24), w: w - tx - px(PAD), h: px(32) }, 'RallyPal', 22, C.white, { align: 'left' })
    const tw = w - 2 * px(PAD)
    if (view.line1) text({ x: px(PAD), y: px(78), w: tw, h: px(32) }, view.line1, 22, C.white, { align: 'left', min: 16 })
    if (view.line2) text({ x: px(PAD), y: px(113), w: tw, h: px(26) }, view.line2, 18, C.gray, { align: 'left', min: 14 })
    cover({ x: 0, y: 0, w, h }, () => this.open(null))
    const bw = px(240)
    const go = view.mode === 'match' ? null : { go: 1 }
    limeButton({ x: Math.round((w - bw) / 2), y: Math.min(px(169), h - px(58) - px(20)), w: bw, h: px(58) }, view.button, 24, () => this.open(go))
  }
})
