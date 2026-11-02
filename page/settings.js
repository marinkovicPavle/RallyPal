// Watch settings (approved drawing 11): the same settings as on the phone, except the setups and names,
// which are typed on the phone. Feedback and the author's site are QR codes for the phone. Every change is saved with its time and goes to the phone on the next
// sync; the newer change wins. Strava and Intervals.icu are set up on the phone.
// Until the app is unlocked, "Unlock RallyPal" heads the list; after the free trial every setting but the
// language is read-only, and a tap on one opens the unlock screen.

import { BasePage } from '@zeppos/zml/base-page'
import { ROUND, C, MX, mid, at, text, qrCode, px } from '../utils/ui'
import { LIST, list, choice, toast, keyGuide, screen, heading } from '../utils/widgets'
import { createNav, goPage } from '../utils/nav'
import { preview } from '../utils/feedback'
import { settingsValues, saveSetting } from '../utils/data'
import { syncWithPhone } from '../utils/sync'
import { trial } from '../utils/licence'
import { canEdit, trialLine, PRICE } from '../shared/licence'
import { VIBES, settingMeta } from '../shared/schema'
import { VERSION, AUTHOR, AUTHOR_SITE, AUTHOR_URL, SUPPORT_EMAIL, feedbackMail } from '../shared/about'
import { t, lang, LANG_NAMES } from '../shared/i18n'
import { applyLang, watchLang } from '../utils/lang'

// the vibration a switched-on setting plays once, so it can be felt
const BUZZ = { vibePoint: 'point', vibeGame: 'game', vibeSet: 'set', vibeMatch: 'match' }

Page(
  BasePage({
    state: {},

    build() {
      const st = this.state
      st.nav = createNav(() => goPage('index'))
      st.nav.show((n) => this.main(n))
    },

    onDestroy() {
      this.state.gone = true
      if (this.state.nav) this.state.nav.destroy()
    },

    option(key, value) {
      return t(`opt.${key}.${value}`)
    },

    // "Point · Game · Set · Match": the vibrations that are on
    vibeLine(v) {
      const on = VIBES.filter((k) => v[k]).map((k) => t('set.' + k))
      return on.length ? on.join(' · ') : t('set.vibeNone')
    },

    unlock() {
      goPage('unlock', { from: 'settings' })
    },

    // a row of a setting that can't be changed now (after the free trial) shows its value in gray and
    // opens the unlock screen
    guard(key, row) {
      if (canEdit(key, trial())) return row
      return { ...row, subColor: C.gray, onTap: () => this.unlock() }
    },

    main(nav) {
      const v = settingsValues()
      const tr = trial()
      const rows = [
        tr.licensed
          ? null
          : { label: t('set.unlock'), color: C.lime, sub: t('set.unlockSub', { price: PRICE, trial: trialLine(tr) }), subColor: C.lgray, onTap: () => this.unlock() },
        this.guard('vibePoint', { label: t('set.vibration'), sub: this.vibeLine(v), onTap: () => nav.push((n) => this.vibration(n)) }),
        this.guard('serveDisplay', { label: t('set.serveDisplay'), sub: this.option('serveDisplay', v.serveDisplay), onTap: () => this.pick(nav, 'serveDisplay') }),
        this.guard('labels', {
          label: t('set.labels'),
          sub: v.labels ? t('opt.labels.on') : t('off'),
          subColor: v.labels ? C.lime : C.gray,
          onTap: () => {
            saveSetting('labels', !settingsValues().labels)
            nav.redraw()
          }
        }),
        this.guard('screen', { label: t('set.screen'), sub: this.option('screen', v.screen), onTap: () => this.pick(nav, 'screen') }),
        { label: t('set.language'), sub: this.langName(v.lang), onTap: () => nav.push((n) => this.language(n)) },
        { label: t('set.phone'), sub: t('set.phoneSub'), subColor: C.gray, onTap: () => nav.push((n) => this.phone(n)) },
        { label: t('set.feedback'), sub: t('set.feedbackSub'), subColor: C.gray, onTap: () => nav.push((n) => this.feedback(n)) },
        { label: t('set.about'), sub: t('set.aboutSub'), subColor: C.gray, onTap: () => nav.push((n) => this.about(n)) }
      ]
      list({ title: t('settings.title'), rows })
      return { keys: {}, hints: {} }
    },

    pick(nav, key) {
      const s = settingMeta(key)
      nav.push(() =>
        choice({
          title: t('set.' + key).toUpperCase(),
          current: settingsValues()[key],
          options: s.options.map((o) => [o, this.option(key, o)]),
          onPick: (x) => {
            saveSetting(key, x)
            nav.back()
          }
        })
      )
    },

    // "Automatic · English": Automatic follows the watch's own language
    langName(code) {
      return code && code !== 'auto' ? LANG_NAMES[code] : `${t('opt.lang.auto')} · ${LANG_NAMES[watchLang()]}`
    },

    // Language (decision 39): the screens change at once
    language(nav) {
      const s = settingMeta('lang')
      return choice({
        title: t('set.language').toUpperCase(),
        current: settingsValues().lang,
        options: s.options.map((o) => [o, this.langName(o)]),
        onPick: (x) => {
          saveSetting('lang', x)
          applyLang()
          nav.back()
        }
      })
    },

    vibration(nav) {
      const v = settingsValues()
      const rows = VIBES.map((k) => ({
        label: t('set.' + k),
        value: v[k] ? t('on') : t('off'),
        valueColor: v[k] ? C.lime : C.gray,
        onTap: () => {
          const on = !settingsValues()[k]
          saveSetting(k, on)
          if (on) preview(BUZZ[k])
          nav.redraw()
        }
      }))
      list({ title: t('set.vibration').toUpperCase(), rows })
      return { keys: {}, hints: {} }
    },

    phone(nav) {
      const rows = [
        { note: t('set.phoneNote'), h: 96, size: 18 },
        { label: t('set.syncNow'), onTap: () => this.syncNow() }
      ]
      list({ title: t('set.phone').toUpperCase(), rows })
      return { keys: {}, hints: {} }
    },

    about(nav) {
      const rows = [
        { label: t('about.keys'), onTap: () => nav.push(() => keyGuide(() => nav.back())) },
        { label: t('about.version'), value: trial().licensed ? t('about.full', { v: VERSION }) : VERSION, valueColor: C.gray },
        { label: t('about.by', { name: AUTHOR }), sub: AUTHOR_SITE, onTap: () => nav.push((n) => this.site(n)) }
      ]
      list({ title: t('about.title'), rows })
      return { keys: {}, hints: {} }
    },

    // a QR code of Pavle's site, so it opens on the phone
    site(nav) {
      return this.qrScreen(AUTHOR_SITE, C.lime, AUTHOR_URL, t('site.scan'))
    },

    // a QR code that opens a mail to us on the phone, and the address for writing by hand
    feedback(nav) {
      return this.qrScreen(t('feedback.title'), C.white, feedbackMail(LANG_NAMES[lang()]), t('feedback.scan'), SUPPORT_EMAIL)
    },

    // BACK and the swipe go back (nav.js)
    qrScreen(title, color, content, line, email) {
      const R = ROUND
      screen()
      const under = heading(title, color, LIST.titleY)
      let y = Math.max(R ? 100 : 60, under + 10)
      const size = R ? 160 : 156
      qrCode(mid(size, y, size), content, px(8))
      y += size + 12
      text(mid(340, y, 48), line, 18, C.gray, { wrap: true })
      if (email) at(MX, y + 66, R ? 360 : 350, email, 21, C.lime)
      return { keys: {}, hints: {} }
    },

    syncNow() {
      toast(t('sync.busy'))
      syncWithPhone(this, { restore: true }).then((res) => {
        // the answer can come after Settings was left; it must not draw over the next page
        if (this.state.gone) return
        if (!res.ok) return toast(t('sync.fail'))
        toast(res.restored ? t('sync.restored', { n: res.restored }) : t('sync.ok'))
        this.state.nav.redraw()
      })
    }
  })
)
