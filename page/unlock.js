// Unlock screen (from SaunaPal): a QR code of the payment page, the KiezelPay payment code and where to
// enter it. The phone gets the code from KiezelPay; the screen asks again every few seconds and, once the
// payment is through, says thank you and goes back by itself. Opened from UNLOCK on the start screen
// (after the 3 free matches), from Settings and from a locked row. BACK and the swipe go back.

import { BasePage } from '@zeppos/zml/base-page'
import { ROUND, C, mid, px, text, setText, setColor, qrCode } from '../utils/ui'
import { screen, heading } from '../utils/widgets'
import { createNav, goPage, parseParams } from '../utils/nav'
import { preview } from '../utils/feedback'
import { askPhone } from '../utils/licence'
import { loadMeta } from '../utils/data'
import { PRICE, PAY_URL, RESTORE_URL } from '../shared/licence'
import { t } from '../shared/i18n'

const ASK_EVERY_MS = 8000
const CLOSE_AFTER_MS = 2500

Page(
  BasePage({
    state: {},

    onInit(params) {
      const p = parseParams(params)
      this.state.from = p.from === 'settings' ? 'settings' : 'index'
    },

    build() {
      const st = this.state
      st.nav = createNav(() => this.close())
      st.nav.show((n) => this.main(n))
      this.ask()
      st.timer = setInterval(() => this.ask(), ASK_EVERY_MS)
    },

    onDestroy() {
      const st = this.state
      st.gone = true
      if (st.timer) clearInterval(st.timer)
      if (st.closeTimer) clearTimeout(st.closeTimer)
      if (st.nav) st.nav.destroy()
    },

    close() {
      goPage(this.state.from)
    },

    ask() {
      const st = this.state
      if (st.busy || st.unlocked) return
      st.busy = true
      askPhone(this, true).then((r) => {
        st.busy = false
        if (st.gone) return
        if (r.licensed) return this.unlocked()
        if (r.code) {
          setText(st.code, r.code)
          setColor(st.code, C.lime)
        }
        setText(st.status, r.ok ? (r.code ? t('unlock.waiting') : t('unlock.noCode')) : r.phone ? t('unlock.kpayDown') : t('sync.fail'))
        setColor(st.status, r.ok ? C.gray : C.red)
      })
    },

    unlocked() {
      const st = this.state
      st.unlocked = true
      if (st.timer) clearInterval(st.timer)
      st.timer = null
      preview('match')
      st.nav.show((n) => this.thanks(n))
      st.closeTimer = setTimeout(() => !st.gone && this.close(), CLOSE_AFTER_MS)
    },

    main(nav) {
      const st = this.state
      const R = ROUND
      screen()
      const under = heading(t('unlock.title'), C.white, R ? 58 : 30, 26)
      let y = Math.max(R ? 92 : 56, under + 8)
      // a QR code of the payment page, so it opens on the phone without typing; the code is still typed there
      qrCode(mid(128, y, 128), `https://${PAY_URL}`, px(8))
      y += 134
      text(mid(R ? 360 : 350, y, 30), t('unlock.scan', { url: PAY_URL }), 20, C.lgray)
      y += 30
      const code = loadMeta().payCode || ''
      st.code = text(mid(R ? 340 : 350, y, 68), code || '·  ·  ·', 56, code ? C.lime : C.gray)
      y += 68
      text(mid(R ? 380 : 350, y, 30), t('unlock.price', { price: PRICE }), 21, C.white)
      y += 30
      text(mid(R ? 330 : 350, y, 24), t('unlock.restore', { url: RESTORE_URL }), 16, C.gray)
      y += 24
      st.status = text(mid(R ? 260 : 350, y, 24), t('unlock.getting'), 16, C.gray)
      return { keys: { back: () => this.close() }, hints: {} }
    },

    thanks(nav) {
      const R = ROUND
      screen()
      text(mid(360, R ? 170 : 140, 84), t('unlock.done'), 56, C.lime)
      text(mid(360, R ? 258 : 228, 40), t('unlock.thanks'), 30, C.white)
      text(mid(R ? 330 : 350, R ? 306 : 276, 56), t('unlock.open'), 19, C.gray, { wrap: true })
      return { keys: { back: () => this.close() }, hints: {} }
    }
  })
)
