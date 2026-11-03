// RallyPal in the Zepp phone app (Profile > your watch > RallyPal), the phone half of phase 4.
// Four tabs (telefon-elementi.md): Setups (the setups the watch picks from), History (the phone copy of
// every match), Stats and Settings (the watch settings, the optional Strava and Intervals.icu
// connections, whose keys never leave the phone, and About). Everything is saved at once, with no Save
// button; the watch takes it on its next sync and the newer change wins (shared/settings.js).
// Zepp has no separate screens here, so whatever opens, opens in place under what was tapped.
// Until the app is unlocked a card at the top of Setups, Stats and Settings says how many free matches are
// left and how to unlock (shared/licence.js): the trial plays the six setups with the official rules, in
// singles or doubles; rule variants, own setups, names, Stats, Strava and Intervals.icu show a padlock.
// After the trial every setting but the language is read-only; the history stays.

import { SPORTS, OPTIONS, DOUBLES, defaultRules, sanitizeRules, sanitizeDoubles } from '../shared/rules'
import { MAX_SETUPS, newSetupId, clone } from '../shared/schema'
import { normalize, setValue } from '../shared/settings'
import { setupTitle, sportName } from '../shared/setups'
import { flowMarks } from '../shared/match'
import { clock, hm, timeOfDay, dayLabel, prettyScore, percent, resultOf } from '../shared/format'
import { VERSION, AUTHOR, AUTHOR_SITE, AUTHOR_URL, SUPPORT_EMAIL, feedbackMail } from '../shared/about'
import { t, setLang, LANGS, LANG_NAMES } from '../shared/i18n'
import { trialOf, canEdit, FREE_MATCHES, PRICE, PAY_URL, RESTORE_URL } from '../shared/licence'
import { ZONE_COLORS, zonePercents, records, RECORDS } from '../shared/insights'
import { recordLabel, recordValue, serveRows } from '../shared/stats'
import { TEXT } from './text'
import { MARKERS } from './markers'
import { gettext } from 'i18n'

// the app's colors on a white page: lime with black text for what is chosen (as the watch's buttons),
// black panels for the charts (lime is you, white the opponent, as on the watch)
const LIME = '#d4f02b'
const INK = '#1c1c1e'
const GRAY = '#8e8e93'
const DARK = '#3a3a3c'
const LINE = '#ececf0'
const SOFT = '#efeff4'
const PANEL = '#000000'
const PANEL_LINE = '#3a3a3c'
const GREEN = '#1e8e3e'
const RED = '#d93025'
const PURPLE = '#6f3dea'
const HEART = '#ff455a'
const HISTORY_PAGE = 20
// the domain Zepp's sign-in comes back to, as the SaunaPal guide has it; TO VERIFY on the first real
// connect (the guide says what to do when Strava names another one)
const STRAVA_CALLBACK_DOMAIN = 'zepp-os.zepp.com'

let code = 'en'

// a phone-only text (setting/text.js), English when the language leaves it out
function p(key, params) {
  let s = (TEXT[code] || {})[key]
  if (s === undefined) s = TEXT.en[key]
  if (s === undefined) return key
  if (!params || typeof s !== 'string') return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : String(params[k])))
}

// A counted text such as "1 won": a language that says one differently has a key1 text; Serbian also says
// 2 to 4 differently (key2), and 21, 31… as one
function pn(key, n) {
  let form = n === 1 ? '1' : ''
  if (code === 'sr') {
    const d = n % 10
    const h = n % 100
    form = d === 1 && h !== 11 ? '1' : d >= 2 && d <= 4 && (h < 12 || h > 14) ? '2' : ''
  }
  const own = form && (TEXT[code] || {})[key + form]
  return own ? own.replace(/\{n\}/g, String(n)) : p(key, { n })
}

// the same, with its words kept together on a line
function count(key, n) {
  return pn(key, n).replace(/ /g, '\u00a0')
}

// The phone's own language, as the page's .po files (setting/i18n) name it
function phoneLang() {
  try {
    return String(gettext('lang') || '')
  } catch (e) {
    return ''
  }
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key)
    if (raw === undefined || raw === null || raw === '') return fallback
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) {
    return fallback
  }
}

function upperFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// ---- building blocks ----------------------------------------------------------------------------
// Zepp draws a Text inline, like a span: two texts side by side run together, and margins above and
// below it do nothing. Every text sits in a View, a col() or a row(), which make it a block (as SaunaPal).

function txt(text, size, color, extra) {
  return Text({ style: { fontSize: `${size}px`, color, ...(extra || {}) } }, text)
}

function col(children, style) {
  return View({ style: { display: 'flex', flexDirection: 'column', ...(style || {}) } }, children.filter(Boolean))
}

function row(children, style) {
  return View({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', ...(style || {}) } }, children.filter(Boolean))
}

function header(title) {
  return View({ style: { padding: '22px 6px 8px' } }, [
    Text({ style: { fontSize: '13px', color: GRAY, fontWeight: 'bold', letterSpacing: '0.5px' } }, title)
  ])
}

function card(children, style) {
  return View({ style: { background: 'white', borderRadius: '14px', padding: '0 16px', marginBottom: '10px', overflow: 'hidden', ...(style || {}) } },
    children.filter(Boolean))
}

function note(text, color) {
  return View({ style: { padding: '10px 0' } }, [Text({ style: { fontSize: '13px', color: color || GRAY, lineHeight: '18px' } }, text)])
}

// A full-width block with a line above it; the line is pulled up by 1px, so the first one in a card is
// hidden by the card's edge
function block(children, style) {
  return View({ style: { width: '100%', padding: '11px 0', borderTop: `1px solid ${LINE}`, marginTop: '-1px', ...(style || {}) } }, children.filter(Boolean))
}

function label(text, sub) {
  return col([
    View({}, [Text({ style: { fontSize: '16px', color: INK, lineHeight: '22px' } }, text)]),
    sub ? View({ style: { marginTop: '2px' } }, [Text({ style: { fontSize: '12px', color: GRAY, lineHeight: '16px' } }, sub)]) : null
  ], { flex: 1, paddingRight: '12px' })
}

// The switch: lime with a black knob when on (Zepp's own Toggle has a fixed pink)
function toggle(text, value, onChange, sub) {
  const on = !!value
  return block([
    View({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '36px' },
      onClick: () => onChange(!on) }, [
      label(text, sub),
      View({ style: { width: '50px', height: '30px', borderRadius: '15px', background: on ? LIME : '#d1d1d6', position: 'relative', flex: 'none' } }, [
        View({ style: { position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '24px', height: '24px', borderRadius: '12px',
          background: on ? INK : 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' } }, [])
      ])
    ])
  ])
}

// One choice as a pill: lime with black text when chosen. `tag` is a small word after the label
// (OFFICIAL on the official rule).
function pill(text, on, onClick, tag) {
  return View({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', height: '34px', padding: '0 14px', borderRadius: '17px',
    margin: '0 8px 8px 0', background: on ? LIME : SOFT }, onClick }, [
    txt(text, 14, INK, { fontWeight: on ? 'bold' : 'normal' }),
    tag ? txt(tag, 9, on ? INK : GRAY, { fontWeight: 'bold', letterSpacing: '0.4px', marginLeft: '6px' }) : null
  ])
}

// a choice as pills under its name; options: [[value, label, tag]]
function pills(text, options, current, onPick, sub) {
  return block([
    Text({ style: { fontSize: '16px', color: INK, lineHeight: '22px', marginBottom: '8px' } }, text),
    View({ style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' } },
      options.map((o) => pill(o[1], String(o[0]) === String(current), () => onPick(o[0]), o[2]))),
    sub ? Text({ style: { fontSize: '12px', color: GRAY, lineHeight: '16px' } }, sub) : null
  ].filter(Boolean))
}

function input(text, value, placeholder, onChange, secret) {
  return block([TextInput({
    label: text,
    value: secret ? '' : value || '',
    placeholder: secret && value ? '••••••' + value.slice(-4) : placeholder,
    subStyle: { color: '#333333', fontSize: '14px' },
    labelStyle: { fontSize: '15px' },
    maxLength: 200,
    onChange: (x) => onChange(String(x || '').trim())
  })])
}

// main buttons are lime with black text, the others dark gray with white text
function button(text, onClick, kind) {
  const bg = kind === 'dark' ? '#2c2c2e' : kind === 'red' ? RED : kind === 'soft' ? SOFT : LIME
  const fg = kind === 'dark' || kind === 'red' ? 'white' : kind === 'soft' ? RED : INK
  return Button({
    label: text,
    style: { fontSize: '15px', height: '42px', borderRadius: '21px', background: bg, color: fg, fontWeight: 'bold', margin: '10px 0', width: '100%', boxShadow: 'none' },
    onClick
  })
}

// the serve marker of the sport, as on the watch, on a black tile (the table tennis ball is white)
function marker(sport, size) {
  const s = size || 36
  const img = Math.round(s * 0.72)
  return View({ style: { width: `${s}px`, height: `${s}px`, minWidth: `${s}px`, borderRadius: `${Math.round(s * 0.28)}px`, background: PANEL,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' } }, [
    Image({ src: MARKERS[sport] || MARKERS.tennis, width: img, height: img, alt: '' })
  ])
}

// a setting that is part of the full version: its value in gray and a padlock, nothing to change
function lockedLine(text, value) {
  return block([row([label(text), txt(value === undefined ? '' : String(value), 14, GRAY, { flex: 'none' }), txt('🔒', 13, GRAY, { marginLeft: '8px', flex: 'none' })],
    { justifyContent: 'space-between', minHeight: '36px' })])
}

// A sentence with {url} in it: the address is a link (a long press opens it on an iPhone)
function linked(sentence, url, size, color) {
  const style = { fontSize: `${size}px`, color, lineHeight: `${size + 6}px` }
  const parts = String(sentence).split('{url}')
  const out = []
  parts.forEach((x, i) => {
    if (x) out.push(Text({ style }, x))
    if (i < parts.length - 1) out.push(Link({ source: `https://${url}` }, [Text({ style: { ...style, color: PURPLE, fontWeight: 'bold', textDecoration: 'underline' } }, url)]))
  })
  return View({}, out)
}

function hex(n) {
  return '#' + ('000000' + n.toString(16)).slice(-6)
}

// Heart rate zones: one bar of five colors and the percent of each under it
function zonesView(sec) {
  const pct = zonePercents(sec)
  return col([
    row(sec.map((s, i) => (s ? View({ style: { flex: s, height: '12px', background: hex(ZONE_COLORS[i]), borderRadius: '3px', marginRight: '3px' } }, []) : null)),
      { alignItems: 'stretch' }),
    row(pct.map((x, i) => View({ style: { flex: 1, textAlign: 'center' } }, [txt(`${t('zone.n', { n: i + 1 })} ${x}%`, 11, sec[i] ? hex(ZONE_COLORS[i]) : GRAY,
      { fontWeight: 'bold' })])), { marginTop: '6px' })
  ])
}

function chip(symbol, symbolColor, text) {
  return row([
    symbol ? txt(symbol, 12, symbolColor, { marginRight: '4px' }) : null,
    txt(text, 12, DARK)
  ], { background: SOFT, borderRadius: '10px', padding: '3px 9px', marginRight: '6px', marginTop: '6px' })
}

function legendDot(color, text) {
  return row([
    View({ style: { width: '9px', height: '9px', borderRadius: '5px', background: color, marginRight: '5px' } }, []),
    txt(text, 12, '#c7c7cc')
  ], { marginRight: '14px', flex: 'none' })
}

// a black chart panel with its title on the left and a value on the right
function panel(title, right, children) {
  return col([
    row([txt(title, 11, GRAY, { fontWeight: 'bold', letterSpacing: '0.5px', flex: 1 }), right ? txt(right, 12, 'white', { fontWeight: 'bold' }) : null], { marginBottom: '10px' }),
    ...children
  ], { background: PANEL, borderRadius: '12px', padding: '12px 12px 10px', marginBottom: '8px' })
}

// ---- rules as words ------------------------------------------------------------------------------

function ruleName(sport, key) {
  if (key === 'games') return sport === 'tennis' || sport === 'padel' ? p('rule.games') : p('rule.match')
  return p('rule.' + key)
}

function optionName(sport, key, v) {
  if (key === 'format') return p('opt.format.' + v)
  if (key === 'sets') return p('opt.sets.' + v)
  if (key === 'deuce') return p(v === 'noad' && sport === 'padel' ? 'opt.deuce.golden' : 'opt.deuce.' + v)
  if (key === 'tiebreak') return p('opt.tiebreak.' + v)
  if (key === 'finalSet') return p('opt.finalSet.' + v)
  if (key === 'total' || key === 'to') return pn('opt.points', v)
  if (key === 'scoring') return p('opt.scoring.' + v)
  if (sport === 'tennis' || sport === 'padel') return pn('opt.games', v)
  return sport === 'pickleball' && v === 1 ? p('opt.oneGame') : p('opt.bestOf', { n: 2 * v - 1 })
}

// the rule rows a setup shows: only rows with a real choice, and only those its format uses
function ruleKeys(sport, rules) {
  return Object.keys(OPTIONS[sport]).filter((k) => {
    if (OPTIONS[sport][k].length < 2) return false
    if (rules.format === 'total') return k === 'format' || k === 'total'
    if (k === 'total') return false
    if (k === 'finalSet' && rules.sets === 1) return false
    return true
  })
}

// "Advantage · tie-break at 6–6", "Side-out scoring · games to 11 · 1 game"
function rulesLine(setup) {
  const s = setup.sport
  const r = sanitizeRules(s, setup.rules)
  const parts = []
  if (s === 'tennis' || s === 'padel') {
    if (r.format === 'total') return upperFirst(p('line.round', { n: r.total }))
    parts.push(optionName(s, 'deuce', r.deuce))
    parts.push(r.tiebreak === 7 ? p('line.tb', { g: r.games }) : r.tiebreak === 10 ? p('line.tb10', { g: r.games }) : p('line.noTb'))
    if (r.finalSet === 'super' && r.sets > 1) parts.push(p('line.superTb'))
    if (r.games === 4) parts.push(p('line.shortSets'))
  } else {
    if (s === 'pickleball') parts.push(p(r.scoring === 'rally' ? 'line.rally' : 'line.sideout'))
    parts.push(p('line.to', { n: r.to }))
    parts.push(optionName(s, 'games', r.games))
  }
  return upperFirst(parts.join(' · '))
}

// "vs Marko", "with Ana · vs Luka & Ivan"; with no names, Singles or Doubles
function playersLine(setup) {
  const d = sanitizeDoubles(setup.sport, setup.doubles)
  const parts = []
  if (d && setup.partner) parts.push(p('setup.with', { name: setup.partner }))
  if (setup.opponent) parts.push(p('setup.vs', { name: setup.opponent }))
  return parts.length ? parts.join(' · ') : p(d ? 'setup.doubles' : 'setup.singles')
}

// "6-4 6-7(5) [10-8]" -> [[6, 4], [6, 7], [10, 8, 'super']]
function scoreParts(score) {
  return String(score || '')
    .split(' ')
    .filter(Boolean)
    .map((x) => {
      const sup = x.charAt(0) === '['
      const m = x.replace(/[[\]]/g, '').replace(/\(.*\)/, '').split('-')
      const out = [Number(m[0]) || 0, Number(m[1]) || 0]
      if (sup) out.push('super')
      return out
    })
}

function monthKey(ts) {
  const d = new Date(ts)
  return d.getFullYear() * 12 + d.getMonth()
}

AppSettingsPage({
  state: { props: null },

  build(props) {
    this.state.props = props
    const storage = props.settingsStorage
    // the Language setting, or on Auto the watch's language (the phone's until the watch has synced)
    const chosen = this.values().lang
    const auto = storage.getItem('watchLang') || phoneLang()
    code = LANGS[chosen] ? chosen : LANGS[auto] ? auto : 'en'
    setLang(code)
    const tab = storage.getItem('uiTab') || 'setups'
    const tabs = View({ style: { display: 'flex', flexDirection: 'row', background: '#e3e3e8', borderRadius: '20px', padding: '3px', margin: '4px 0 6px' } },
      ['setups', 'history', 'stats', 'settings'].map((k) => this.tabButton(k, tab)))
    const body = tab === 'history' ? this.history() : tab === 'stats' ? this.stats() : tab === 'settings' ? this.settings() : this.setups()
    // the trial card heads Setups, Stats and Settings (History works the same in the trial)
    return View({ style: { padding: '12px 14px 40px', background: '#f2f2f7' } }, [tabs, tab !== 'history' ? this.trialCard() : null, ...body].filter(Boolean))
  },

  // ---- trial -------------------------------------------------------------------------------------

  // { licensed, used, code } as the side service last heard it from the watch and KiezelPay
  trial() {
    return trialOf(readJson(this.storage(), 'licence', {}))
  },

  trialCard() {
    const tr = this.trial()
    if (tr.licensed) return null
    const code = (readJson(this.storage(), 'licence', {}) || {}).code
    const step = (n, x) => row([txt(`${n}.`, 14, INK, { fontWeight: 'bold', width: '20px', minWidth: '20px' }),
      typeof x === 'string' ? txt(x, 14, INK, { lineHeight: '20px', flex: 1 }) : View({ style: { flex: 1 } }, [x])],
      { alignItems: 'flex-start', padding: '3px 0' })
    return View({ style: { background: 'white', borderRadius: '14px', padding: '14px 16px 10px', margin: '6px 0 4px', border: `2px solid ${LIME}` } }, [
      col([
        txt(tr.locked ? p('pay.ended') : p('pay.left', { n: tr.left, total: FREE_MATCHES }), 17, INK, { fontWeight: 'bold', lineHeight: '22px' }),
        txt(tr.locked ? p('pay.lockedBody') : p('pay.basics'), 13, GRAY, { lineHeight: '18px', marginTop: '4px' }),
        txt(p('pay.offer', { price: PRICE }), 14, INK, { lineHeight: '20px', marginTop: '10px', marginBottom: '6px' })
      ]),
      step(1, p('pay.step1', { unlock: t('set.unlock') })),
      step(2, linked(code ? p('pay.step2code', { code }) : p('pay.step2'), PAY_URL, 14, INK)),
      step(3, p('pay.step3')),
      View({ style: { marginTop: '6px' } }, [linked(p('pay.restore'), RESTORE_URL, 12, GRAY)]),
      note(p('link.hold'))
    ])
  },

  storage() {
    return this.state.props.settingsStorage
  },

  ui(key, value) {
    this.storage().setItem(key, value)
  },

  // each tab as wide as its word needs, so a long one (Einstellungen, Impostazioni) still fits
  tabButton(key, tab) {
    const on = key === tab
    const text = p('tab.' + key)
    return View({ style: { flex: text.length + 4 } }, [
      Button({
        label: text,
        style: { fontSize: '14px', height: '34px', borderRadius: '17px', width: '100%', margin: '0', padding: '0 4px', boxShadow: 'none',
          background: on ? LIME : 'transparent', color: on ? INK : DARK, fontWeight: on ? 'bold' : 'normal' },
        onClick: () => this.ui('uiTab', key)
      })
    ])
  },

  values() {
    return normalize(readJson(this.storage(), 'settings', null)).values
  },

  // stamped now, so the watch takes it on the next sync (the newer change wins)
  set(key, value) {
    const storage = this.storage()
    storage.setItem('settings', JSON.stringify(setValue(normalize(readJson(storage, 'settings', null)), key, value, Date.now())))
  },

  // ---- Setups ------------------------------------------------------------------------------------

  setups() {
    const list = this.values().setups
    const open = this.storage().getItem('uiSetup') || ''
    const full = this.trial().licensed
    const out = [header(p('setups.head')), View({ style: { padding: '0 6px 10px' } }, [txt(full ? p('setups.note') : p('pay.setups'), 13, GRAY, { lineHeight: '18px' })])]
    list.forEach((s, i) => out.push(this.setupCard(s, i, list, open === s.id)))
    if (!full) return out
    if (list.length < MAX_SETUPS) out.push(button(p('setup.add'), () => this.addSetup(), 'dark'))
    else out.push(note(pn('setup.max', MAX_SETUPS)))
    return out
  },

  saveSetups(list) {
    this.set('setups', list)
  },

  changeSetup(id, change) {
    this.saveSetups(this.values().setups.map((s) => (s.id === id ? { ...s, ...change } : s)))
  },

  addSetup() {
    const list = this.values().setups
    const s = { id: newSetupId(list, 'tennis'), sport: 'tennis', rules: defaultRules('tennis'), doubles: DOUBLES.tennis[0], name: '', opponent: '', partner: '' }
    this.saveSetups(list.concat([s]))
    this.ui('uiSetup', s.id)
    this.ui('uiDelete', '')
  },

  moveSetup(i, by) {
    const list = this.values().setups.slice()
    const j = i + by
    if (j < 0 || j >= list.length) return
    const x = list[i]
    list[i] = list[j]
    list[j] = x
    this.saveSetups(list)
  },

  // the first tap asks, the second deletes; one setup always stays
  deleteSetup(id) {
    if (this.storage().getItem('uiDelete') !== id) return this.ui('uiDelete', id)
    this.saveSetups(this.values().setups.filter((s) => s.id !== id))
    this.ui('uiDelete', '')
    this.ui('uiSetup', '')
  },

  setupCard(s0, i, list, isOpen) {
    // in the trial a setup plays the official rules without names: that is what it shows
    const s = this.trial().licensed ? s0 : { ...s0, rules: defaultRules(s0.sport), name: '', opponent: '', partner: '' }
    const head = View({
      style: { display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '13px 0' },
      onClick: () => {
        this.ui('uiSetup', isOpen ? '' : s.id)
        this.ui('uiDelete', '')
      }
    }, [
      marker(s.sport, 38),
      col([
        txt(setupTitle(s), 16, INK, { fontWeight: 'bold', lineHeight: '21px' }),
        txt(rulesLine(s), 13, GRAY, { lineHeight: '18px', marginTop: '1px' }),
        txt(playersLine(s), 13, DARK, { lineHeight: '18px' })
      ], { flex: 1, minWidth: 0, marginLeft: '12px' }),
      txt(isOpen ? '▴' : '▾', 14, GRAY, { marginLeft: '10px', flex: 'none' })
    ])
    return card([head, isOpen ? (this.trial().licensed ? this.setupEditor(s, i, list) : this.trialEditor(s)) : null],
      isOpen ? { border: `2px solid ${LIME}` } : null)
  },

  // A setup in the trial: singles or doubles can be chosen (until the trial ends); the rules show the
  // official ones with a padlock
  trialEditor(s) {
    const sport = s.sport
    const doubles = sanitizeDoubles(sport, s.doubles)
    const rules = defaultRules(sport)
    const tr = this.trial()
    const out = []
    if (DOUBLES[sport].length > 1) {
      const value = p(doubles ? 'setup.doubles' : 'setup.singles')
      out.push(tr.locked
        ? lockedLine(p('setup.players'), value)
        : pills(p('setup.players'), DOUBLES[sport].map((d) => [d ? 'd' : 's', p(d ? 'setup.doubles' : 'setup.singles')]), doubles ? 'd' : 's',
          (x) => this.changeSetup(s.id, { doubles: x === 'd' })))
    }
    ruleKeys(sport, rules).forEach((k) => out.push(lockedLine(ruleName(sport, k), optionName(sport, k, rules[k]))))
    out.push(note(p('pay.setups')))
    return col(out)
  },

  setupEditor(s, i, list) {
    const sport = s.sport
    const rules = sanitizeRules(sport, s.rules)
    const doubles = sanitizeDoubles(sport, s.doubles)
    const official = defaultRules(sport)
    const out = [
      pills(p('setup.sport'), SPORTS.map((x) => [x, sportName(x)]), sport, (x) => {
        if (x !== sport) this.changeSetup(s.id, { sport: x, rules: defaultRules(x), doubles: DOUBLES[x][0] })
      }, p('setup.officialNote'))
    ]
    if (DOUBLES[sport].length > 1) {
      out.push(pills(p('setup.players'), DOUBLES[sport].map((d) => [d ? 'd' : 's', p(d ? 'setup.doubles' : 'setup.singles')]), doubles ? 'd' : 's',
        (x) => this.changeSetup(s.id, { doubles: x === 'd' })))
    }
    ruleKeys(sport, rules).forEach((k) => {
      const opts = OPTIONS[sport][k].map((v) => [v, optionName(sport, k, v), v === official[k] ? p('setup.official') : ''])
      out.push(pills(ruleName(sport, k), opts, rules[k], (v) => this.changeSetup(s.id, { rules: { ...rules, [k]: v } })))
    })
    out.push(block([txt(p('setup.names'), 11, GRAY, { fontWeight: 'bold', letterSpacing: '0.5px' })], { padding: '16px 0 0' }))
    out.push(input(p('setup.name'), s.name, p('setup.nameHint'), (x) => this.changeSetup(s.id, { name: x })))
    out.push(input(p(doubles ? 'setup.opponents' : 'setup.opponent'), s.opponent, p(doubles ? 'setup.opponentsHint' : 'setup.opponentHint'),
      (x) => this.changeSetup(s.id, { opponent: x })))
    if (doubles) out.push(input(p('setup.partner'), s.partner, p('setup.partnerHint'), (x) => this.changeSetup(s.id, { partner: x })))
    out.push(note(p('setup.fit')))
    const asking = this.storage().getItem('uiDelete') === s.id
    const small = (text, onClick, kind) => View({ style: { flex: 1, marginRight: '8px' } }, [Button({
      label: text,
      style: { fontSize: '14px', height: '38px', borderRadius: '19px', width: '100%', margin: '0', boxShadow: 'none', fontWeight: 'bold',
        background: kind === 'red' ? RED : SOFT, color: kind === 'red' ? 'white' : kind === 'redText' ? RED : INK },
      onClick
    })])
    out.push(block([
      row([
        // while asking "Tap again to delete" the question has the whole row, so it fits in every language
        i > 0 && !asking ? small(p('setup.up'), () => this.moveSetup(i, -1)) : null,
        i < list.length - 1 && !asking ? small(p('setup.down'), () => this.moveSetup(i, 1)) : null,
        list.length > 1 ? small(asking ? p('setup.deleteAgain') : p('setup.delete'), () => this.deleteSetup(s.id), asking ? 'red' : 'redText') : null
      ], { marginRight: '-8px' })
    ], { padding: '12px 0 14px' }))
    return col(out)
  },

  // ---- History -----------------------------------------------------------------------------------

  matches() {
    const list = readJson(this.storage(), 'history', [])
    return (Array.isArray(list) ? list : []).filter((r) => r && r.id).sort((a, b) => b.start - a.start)
  },

  history() {
    const list = this.matches()
    if (!list.length) return [header(t('history.title')), card([note(p('hist.empty'))])]
    const storage = this.storage()
    const shown = Number(storage.getItem('uiHistoryCount') || HISTORY_PAGE)
    const open = storage.getItem('uiMatch') || ''
    const out = []
    let month = -1
    let items = []
    const flush = () => {
      if (items.length) out.push(card(items))
      items = []
    }
    list.slice(0, shown).forEach((r) => {
      if (monthKey(r.start) !== month) {
        flush()
        month = monthKey(r.start)
        out.push(this.monthHeader(list, r.start))
      }
      items.push(this.matchRow(r, open === r.id))
    })
    flush()
    if (list.length > shown) out.push(button(p('hist.more'), () => this.ui('uiHistoryCount', String(shown + HISTORY_PAGE)), 'dark'))
    return out
  },

  monthHeader(list, at) {
    const inMonth = list.filter((x) => monthKey(x.start) === monthKey(at))
    const won = inMonth.filter((x) => resultOf(x) === 'won').length
    const d = new Date(at)
    const name = upperFirst(p('months')[d.getMonth()]) + (d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`)
    return row([
      txt(name, 18, INK, { fontWeight: 'bold' }),
      txt(inMonth.length === 1 ? t('history.one', { w: won }) : t('history.count', { n: inMonth.length, w: won }), 13, GRAY, { marginLeft: '10px' })
    ], { alignItems: 'baseline', padding: '24px 6px 8px' })
  },

  // who the match was against: the opponent's name, else the setup's own name, else the sport
  who(r) {
    const n = r.names || {}
    if (n.opponent) return p('setup.vs', { name: n.opponent })
    return r.title || sportName(r.sport)
  },

  matchRow(r, isOpen) {
    const d = new Date(r.start)
    const res = resultOf(r)
    const letter = res === 'won' ? [t('history.w'), GREEN] : res === 'lost' ? [t('history.l'), RED] : res === 'draw' ? [t('history.d'), GRAY] : ['–', GRAY]
    const sub = [this.who(r), r.names && r.names.opponent ? sportName(r.sport) : timeOfDay(r.start)].join(' · ')
    const head = View({
      style: { display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 0' },
      onClick: () => {
        this.ui('uiMatch', isOpen ? '' : r.id)
        this.ui('uiDeleteMatch', '')
      }
    }, [
      col([
        txt(String(d.getDate()), 20, INK, { fontWeight: 'bold', lineHeight: '22px', textAlign: 'center' }),
        txt(t('days')[d.getDay()], 11, GRAY, { textAlign: 'center' })
      ], { width: '46px', flex: 'none', background: SOFT, borderRadius: '10px', padding: '6px 0', marginRight: '12px', alignSelf: 'flex-start' }),
      col([
        row([
          marker(r.sport, 22),
          txt(letter[0], 16, letter[1], { fontWeight: 'bold', marginLeft: '8px', width: '16px' }),
          txt(prettyScore(r.score) || '–', 16, INK, { fontWeight: 'bold', flex: 1, marginLeft: '4px' }),
          txt(hm(r.dur), 15, GRAY, { marginLeft: '8px', flex: 'none' })
        ]),
        txt(sub, 13, DARK, { marginTop: '4px', lineHeight: '18px' }),
        r.hrAvg ? row([chip('♥', HEART, t('stat.hrLine', { a: r.hrAvg, b: r.hrMax }))]) : null
      ], { flex: 1, minWidth: 0 }),
      txt(isOpen ? '▴' : '▾', 14, GRAY, { marginLeft: '10px', flex: 'none' })
    ])
    return View({ style: { borderTop: `1px solid ${LINE}`, marginTop: '-1px' } }, [head, isOpen ? this.matchDetails(r) : null].filter(Boolean))
  },

  matchDetails(r) {
    const out = []
    if (r.curve && r.curve.length > 2) out.push(this.hrChart(r))
    if (r.ev && r.ev.length) out.push(this.flowChart(r))
    // heart rate zones (v2), saved by the watch with the match
    if (r.zones && r.zones.sec && r.zones.sec.some((x) => x > 0)) out.push(panel(p('hist.zones'), `max ${r.zones.max}`, [zonesView(r.zones.sec)]))
    out.push(this.statRows(r))
    out.push(this.matchNames(r))
    const asking = this.storage().getItem('uiDeleteMatch') === r.id
    out.push(button(asking ? p('hist.deleteAgain') : p('hist.delete'), () => this.deleteMatch(r.id), asking ? 'red' : 'soft'))
    if (asking) out.push(View({ style: { marginTop: '-6px' } }, [note(p('hist.deleteNote'))]))
    return col(out, { padding: '0 0 10px' })
  },

  // heart rate through the match, as bars on a black panel
  hrChart(r) {
    const curve = r.curve
    const BARS = 60
    const H = 70
    const vals = []
    for (let i = 0; i < BARS; i++) {
      const from = Math.floor((i * curve.length) / BARS)
      const to = Math.max(from + 1, Math.floor(((i + 1) * curve.length) / BARS))
      const part = curve.slice(from, to).map((x) => x[1])
      vals.push(part.length ? Math.max(...part) : 0)
    }
    const real = vals.filter(Boolean)
    const lo = Math.max(40, Math.floor((Math.min(...real) - 10) / 10) * 10)
    const hi = Math.max(...real)
    const bars = vals.map((b) =>
      View({ style: { flex: 1, height: `${H}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginRight: '1px' } }, [
        b ? View({ style: { height: `${Math.max(2, Math.round(((b - lo) / (hi - lo || 1)) * H))}px`, background: HEART, borderRadius: '1px' } }, []) : null
      ].filter(Boolean))
    )
    const end = curve[curve.length - 1][0]
    return panel(p('hist.hr'), t('stat.hrLine', { a: r.hrAvg, b: r.hrMax }), [
      row(bars, { alignItems: 'flex-end', height: `${H}px` }),
      row([txt('0:00', 11, GRAY, { flex: 1 }), txt(clock(Math.round(end / 60) * 60), 11, GRAY)], { marginTop: '4px' })
    ])
  },

  // Who won the points through the match: the lead in points, up for you (lime) and down for the
  // opponent (white), cut where each set (or game) ended, with its score under it
  flowChart(r) {
    const f = flowMarks(r)
    const H = 76
    const half = H / 2
    let lead = 0
    const leads = f.wins.map((w) => (lead += w === 0 ? 1 : -1))
    const top = Math.max(1, ...leads.map(Math.abs))
    const cuts = f.ends.filter((e) => e < leads.length).concat([leads.length])
    const parts = scoreParts(r.score)
    const segs = []
    let from = 0
    cuts.forEach((to, i) => {
      if (to <= from) return
      const bars = leads.slice(from, to).map((l) => {
        const h = Math.max(1, Math.round((Math.abs(l) / top) * (half - 2)))
        return View({ style: { flex: 1, height: `${H}px`, position: 'relative' } }, [
          l ? View({ style: { position: 'absolute', left: '0', right: '0', [l > 0 ? 'bottom' : 'top']: `${half}px`, height: `${h}px`, background: l > 0 ? LIME : 'white' } }, []) : null
        ].filter(Boolean))
      })
      segs.push({ n: to - from, bars, score: parts[i] })
      from = to
    })
    const chart = row(segs.map((s, i) => View({ style: { flex: s.n, display: 'flex', flexDirection: 'row', height: `${H}px`,
      borderLeft: i ? `2px solid ${GRAY}` : 'none', position: 'relative' } }, [
      View({ style: { position: 'absolute', left: '0', right: '0', top: `${half}px`, borderTop: `1px solid ${PANEL_LINE}` } }, []),
      ...s.bars
    ])), { alignItems: 'stretch' })
    const scores = row(segs.map((s, i) => View({ style: { flex: s.n, textAlign: 'center', minWidth: '0' } }, [
      txt(s.score ? `${s.score[0]}–${s.score[1]}` : '', 11, s.score && s.score[0] > s.score[1] ? LIME : 'white', { fontWeight: 'bold' })
    ])), { marginTop: '6px' })
    const unit = r.sport === 'tennis' || r.sport === 'padel' ? 'set' : 'game'
    return panel(p('hist.flow'), null, [
      chart,
      scores,
      row([legendDot(LIME, p('hist.you')), legendDot('white', p('hist.opponent'))], { marginTop: '8px' }),
      View({ style: { marginTop: '6px' } }, [txt(p('hist.flowNote', { unit: p('hist.unit.' + unit) }), 11, GRAY, { lineHeight: '15px' })])
    ])
  },

  statRows(r) {
    const s = r.stats || {}
    const rows = [[t('stat.duration'), clock(r.dur)]]
    if (r.hrAvg) rows.push([t('stat.hr'), t('stat.hrValue', { a: r.hrAvg, b: r.hrMax })])
    const of = (a, b) => `${p('st.of', { a, b })} · ${percent(a, b)}`
    if (s.points) rows.push([t('stat.points'), `${s.points[0]} – ${s.points[1]}`])
    if (s.servePoints && s.servePoints[0]) rows.push([t('stat.serve'), of(s.serveWon[0], s.servePoints[0])])
    if (s.returnWon && s.servePoints && s.servePoints[1]) rows.push([p('st.return'), of(s.returnWon[0], s.servePoints[1])])
    if (s.serviceGames && s.serviceGames[0]) rows.push([p('st.held'), p('st.of', { a: s.held[0], b: s.serviceGames[0] })])
    if (s.breakPoints) rows.push([t('stat.breaks'), p('st.of', { a: s.breaks[0], b: s.breakPoints[0] })])
    if (s.streak) rows.push([t('stat.streak'), s.streak[0] === 1 ? t('stat.streakOne') : t('stat.streakValue', { n: s.streak[0] })])
    if (s.tiebreaks && s.tiebreaks[0] + s.tiebreaks[1]) rows.push([p('st.tiebreaks'), p('st.of', { a: s.tiebreaks[0], b: s.tiebreaks[0] + s.tiebreaks[1] })])
    serveRows(r).forEach((x) => rows.push(x))
    return col([
      View({ style: { padding: '8px 0 4px' } }, [txt(p('hist.stats'), 11, GRAY, { fontWeight: 'bold', letterSpacing: '0.5px' })]),
      ...rows.map((x) => row([txt(x[0], 14, DARK, { flex: 1 }), txt(x[1], 14, INK, { fontWeight: 'bold', textAlign: 'right' })],
        { padding: '7px 0', borderTop: `1px solid ${LINE}` }))
    ], { marginBottom: '6px' })
  },

  // the names of a played match; a change also changes Stats by opponent (and goes to the watch)
  matchNames(r) {
    const n = r.names || {}
    const out = [View({ style: { padding: '14px 0 0' } }, [txt(p('hist.names'), 11, GRAY, { fontWeight: 'bold', letterSpacing: '0.5px' })])]
    out.push(input(p(r.doubles ? 'setup.opponents' : 'setup.opponent'), n.opponent, p(r.doubles ? 'setup.opponentsHint' : 'setup.opponentHint'),
      (x) => this.renameMatch(r.id, { opponent: x })))
    if (r.doubles) out.push(input(p('setup.partner'), n.partner, p('setup.partnerHint'), (x) => this.renameMatch(r.id, { partner: x })))
    out.push(View({ style: { marginTop: '-4px' } }, [note(p('hist.namesNote'))]))
    return col(out)
  },

  // Changes to the history made here go to the watch with its next sync ('phoneEdits')
  editMatch(id, edit) {
    const storage = this.storage()
    const edits = readJson(storage, 'phoneEdits', []).filter((e) => !(e.id === id && e.op === edit.op))
    edits.push({ id, ...edit, at: Date.now() })
    storage.setItem('phoneEdits', JSON.stringify(edits))
  },

  renameMatch(id, change) {
    const storage = this.storage()
    const list = this.matches().map((r) => (r.id === id ? { ...r, names: { ...(r.names || {}), ...change } } : r))
    storage.setItem('history', JSON.stringify(list))
    const rec = list.filter((r) => r.id === id)[0]
    if (rec) this.editMatch(id, { op: 'names', names: rec.names })
  },

  deleteMatch(id) {
    const storage = this.storage()
    if (storage.getItem('uiDeleteMatch') !== id) return this.ui('uiDeleteMatch', id)
    storage.setItem('history', JSON.stringify(this.matches().filter((r) => r.id !== id)))
    this.editMatch(id, { op: 'delete' })
    this.ui('uiDeleteMatch', '')
    this.ui('uiMatch', '')
  },

  // ---- Stats -------------------------------------------------------------------------------------

  stats() {
    if (!this.trial().licensed) return [card([note(p('pay.stats'))])]
    const storage = this.storage()
    const range = storage.getItem('uiRange') || 'all'
    const now = new Date()
    const all = this.matches()
    const list = all.filter((r) => {
      const d = new Date(r.start)
      if (range === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      if (range === 'year') return d.getFullYear() === now.getFullYear()
      return true
    })
    const filter = View({ style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', padding: '8px 0 0' } },
      ['month', 'year', 'all'].map((k) => pill(p('f.' + k), k === range, () => this.ui('uiRange', k))))
    if (!all.length) return [filter, card([note(p('hist.empty'))])]
    if (!list.length) return [filter, card([note(p('st.empty'))])]
    return [filter, header(p('st.bySport')), ...this.bySport(list), header(p('st.byOpp')), this.byOpponent(list), header(p('st.form')), this.form(list),
      header(p('st.records')), this.recordsCard(list)]
  },

  // Records (v2, as SaunaPal): the longest match, the longest run of points, the most wins in a row and the
  // most matches in a week, with the day each was set
  recordsCard(list) {
    const rec = records(list)
    return card(RECORDS.map((k) => {
      const r = rec[k]
      return row([
        txt(recordLabel(k), 14, DARK, { flex: 1 }),
        r ? txt(k === 'winRun' ? '' : dayLabel(r.at, Date.now()), 12, GRAY, { marginRight: '10px' }) : null,
        txt(r ? recordValue(k, r.value) : '–', 15, INK, { fontWeight: 'bold' })
      ], { padding: '10px 0', borderTop: `1px solid ${LINE}`, marginTop: '-1px' })
    }))
  },

  bySport(list) {
    return SPORTS.filter((s) => list.some((r) => r.sport === s)).map((s) => {
      const ms = list.filter((r) => r.sport === s)
      const w = ms.filter((r) => resultOf(r) === 'won').length
      const l = ms.filter((r) => resultOf(r) === 'lost').length
      const dr = ms.filter((r) => resultOf(r) === 'draw').length
      const sum = [0, 0, 0, 0] // sets (or games) won and lost, games won and lost
      const pts = [0, 0]
      let total = true
      ms.forEach((r) => {
        const parts = scoreParts(r.score)
        const tennis = (s === 'tennis' || s === 'padel') && !(r.rules && r.rules.format === 'total')
        if (!(r.rules && r.rules.format === 'total')) total = false
        parts.forEach((x) => {
          if (x[0] !== x[1]) sum[x[0] > x[1] ? 0 : 1]++
          if (tennis && !x[2]) {
            sum[2] += x[0]
            sum[3] += x[1]
          }
        })
        if (r.stats && r.stats.points) {
          pts[0] += r.stats.points[0]
          pts[1] += r.stats.points[1]
        }
      })
      const tennisLike = s === 'tennis' || s === 'padel'
      const third = total
        ? p('st.points', { a: pts[0], b: pts[1] })
        : tennisLike
          ? `${p('st.sets', { a: sum[0], b: sum[1] })} · ${p('st.games', { a: sum[2], b: sum[3] })}`
          : `${p('st.games', { a: sum[0], b: sum[1] })} · ${p('st.points', { a: pts[0], b: pts[1] })}`
      return card([
        row([
          marker(s, 38),
          col([
            row([txt(sportName(s), 16, INK, { fontWeight: 'bold', flex: 1 }), txt(p('st.pct', { p: Math.round((100 * w) / ms.length) }), 14, INK, { fontWeight: 'bold' })]),
            View({ style: { marginTop: '2px' } }, [txt([count('st.matches', ms.length), count('st.won', w), count('st.lost', l),
              dr ? count('st.draws', dr) : ''].filter(Boolean).join(' · '), 13, DARK, { lineHeight: '18px' })]),
            View({ style: { marginTop: '2px' } }, [txt(third, 13, GRAY, { lineHeight: '18px' })])
          ], { flex: 1, minWidth: 0, marginLeft: '12px' })
        ], { padding: '13px 0' })
      ])
    })
  },

  byOpponent(list) {
    const storage = this.storage()
    const open = storage.getItem('uiOpp') || ''
    const by = {}
    list.forEach((r) => {
      const name = r.names && r.names.opponent
      if (!name) return
      const k = name.toLowerCase()
      if (!by[k]) by[k] = { name, ms: [] }
      by[k].ms.push(r)
    })
    const opps = Object.keys(by).map((k) => by[k]).sort((a, b) => b.ms.length - a.ms.length || b.ms[0].start - a.ms[0].start)
    const items = opps.map((o) => {
      const w = o.ms.filter((r) => resultOf(r) === 'won').length
      const l = o.ms.filter((r) => resultOf(r) === 'lost').length
      const isOpen = open === o.name
      const head = View({ style: { display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '11px 0' },
        onClick: () => this.ui('uiOpp', isOpen ? '' : o.name) }, [
        col([
          row([txt(o.name, 16, INK, { fontWeight: 'bold' }), txt(`${w}–${l}`, 16, w > l ? GREEN : w < l ? RED : GRAY, { fontWeight: 'bold', marginLeft: '10px' })]),
          row(o.ms.slice(0, 3).map((r) => this.resultChip(r)), { flexWrap: 'wrap' })
        ], { flex: 1, minWidth: 0 }),
        txt(isOpen ? '▴' : '▾', 14, GRAY, { marginLeft: '10px' })
      ])
      return View({ style: { borderTop: `1px solid ${LINE}`, marginTop: '-1px' } }, [
        head,
        isOpen ? col(o.ms.map((r) => row([
          txt(dayLabel(r.start, Date.now()), 13, GRAY, { width: '74px', flex: 'none' }),
          marker(r.sport, 18),
          txt(prettyScore(r.score), 13, INK, { marginLeft: '8px', flex: 1 }),
          this.resultChip(r, true)
        ], { padding: '5px 0' })), { padding: '0 0 10px' }) : null
      ].filter(Boolean))
    })
    return card([...items, note(p('st.oppNote'))])
  },

  // W 6–4 6–2 in a small green or red pill
  resultChip(r, letterOnly) {
    const res = resultOf(r)
    const c = res === 'won' ? GREEN : res === 'lost' ? RED : GRAY
    const letter = res === 'won' ? t('history.w') : res === 'lost' ? t('history.l') : res === 'draw' ? t('history.d') : '–'
    return row([txt(letterOnly ? letter : `${letter}  ${prettyScore(r.score)}`, 12, c, { fontWeight: 'bold' })],
      { background: res === 'won' ? '#e6f4ea' : res === 'lost' ? '#fdecea' : SOFT, borderRadius: '10px', padding: '3px 9px', marginRight: '6px', marginTop: '6px', flex: 'none' })
  },

  // the last ten as dots, oldest on the left; then points won on your serve, match by match
  form(list) {
    const last = list.slice(0, 10).reverse()
    const dots = row(last.map((r) => {
      const res = resultOf(r)
      return View({ style: { width: '22px', height: '22px', borderRadius: '11px', marginRight: '7px', flex: 'none',
        background: res === 'won' ? GREEN : res === 'lost' ? RED : '#c7c7cc' } }, [])
    }), { padding: '14px 0 4px' })
    const serve = list.slice(0, 20).reverse().filter((r) => r.stats && r.stats.servePoints && r.stats.servePoints[0])
    const H = 80
    const chart = serve.length
      ? panel(p('st.serveChart'), null, [
        row(serve.map((r) => {
          const pc = Math.round((100 * r.stats.serveWon[0]) / r.stats.servePoints[0])
          return View({ style: { flex: 1, height: `${H + 14}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', marginRight: '3px' } }, [
            txt(String(pc), 9, '#c7c7cc', { lineHeight: '12px', marginBottom: '2px' }),
            View({ style: { width: '100%', height: `${Math.max(2, Math.round((pc / 100) * H))}px`, background: resultOf(r) === 'won' ? LIME : '#8e8e93', borderRadius: '3px 3px 1px 1px' } }, [])
          ])
        }), { alignItems: 'flex-end' }),
        row([legendDot(LIME, t('home.won')), legendDot('#8e8e93', t('home.lost'))], { marginTop: '8px' })
      ])
      : null
    return card([
      dots,
      View({ style: { padding: '0 0 10px' } }, [txt(pn('st.last', last.length), 12, GRAY)]),
      chart ? View({ style: { padding: '0 0 8px' } }, [chart]) : null
    ])
  },

  // ---- Settings ----------------------------------------------------------------------------------

  settings() {
    const v = this.values()
    const storage = this.storage()
    const tr = this.trial()
    const onOff = (x) => (x ? t('on') : t('off'))
    // a setting that can't be changed now shows its value with a padlock
    const sw = (key, sub) => (canEdit(key, tr) ? toggle(t('set.' + key), v[key], (x) => this.set(key, x), sub) : lockedLine(t('set.' + key), onOff(v[key])))
    const choose = (key, opts, sub) => (canEdit(key, tr)
      ? pills(t('set.' + key), opts.map((x) => [x, t(`opt.${key}.${x}`)]), v[key], (x) => this.set(key, x), sub)
      : lockedLine(t('set.' + key), t(`opt.${key}.${v[key]}`)))
    return [
      this.languageCard(v),
      header(p('h.vibration')),
      card([
        View({ style: { padding: '10px 0 2px' } }, [txt(p('vibe.note'), 13, GRAY, { lineHeight: '18px' })]),
        sw('vibePoint'),
        sw('vibeGame'),
        sw('vibeSet'),
        sw('vibeMatch')
      ]),
      header(p('h.screen')),
      card([
        choose('serveDisplay', ['full', 'team']),
        sw('labels', p('labels.sub')),
        sw('changeEnds', p('ends.sub')),
        sw('restTimer', p('rest.sub')),
        sw('serveStats', p('serveStats.sub')),
        sw('tapPoints', p('tap.sub')),
        choose('screen', ['wrist', 'always'], p('screen.note'))
      ]),
      header(p('h.zones')),
      card(tr.licensed
        ? [input(p('zones.max'), v.hrMax ? String(v.hrMax) : '', p('zones.maxHint'), (x) => this.set('hrMax', Number(x) || 0)), note(p('zones.note'))]
        : [lockedLine(p('zones.max'), p('pay.full'))]),
      header(p('h.names')),
      card([tr.licensed
        ? input(p('myName'), v.myName, p('myName.hint', { you: t('team.you') }), (x) => this.set('myName', x))
        : lockedLine(p('myName'), p('pay.full'))]),
      header(p('h.strava')),
      card(tr.licensed ? this.strava(storage) : [note(p('pay.strava'))]),
      header(p('h.ivl')),
      card(tr.licensed ? this.intervals(storage) : [note(p('pay.ivl'))]),
      header(p('h.feedback')),
      card(this.feedback()),
      header(p('h.about')),
      card(this.about(storage))
    ]
  },

  // The Language setting heads Settings: the language in use; a tap opens the list, a pick closes it
  languageCard(v) {
    const storage = this.storage()
    const open = storage.getItem('uiLangOpen') === '1'
    const options = [['auto', `${t('opt.lang.auto')} · ${LANG_NAMES[code]}`]].concat(Object.keys(LANG_NAMES).map((k) => [k, LANG_NAMES[k]]))
    const current = options.filter((o) => o[0] === v.lang)[0] || options[0]
    const head = block([row([
      label(t('set.language')),
      Button({
        label: `${current[1]}  ${open ? '▴' : '▾'}`,
        style: { fontSize: '14px', height: '34px', lineHeight: '34px', padding: '0 14px', borderRadius: '17px', margin: '0', boxShadow: 'none',
          background: open ? LIME : SOFT, color: INK, fontWeight: 'bold' },
        onClick: () => this.ui('uiLangOpen', open ? '0' : '1')
      })
    ], { justifyContent: 'space-between' })], { padding: '8px 0' })
    if (!open) return card([head], { marginTop: '6px' })
    return card([head, View({ style: { padding: '0 0 10px' } }, options.map((o) => {
      const on = o[0] === v.lang
      return Button({
        label: on ? `✓  ${o[1]}` : o[1],
        style: { width: '100%', fontSize: '15px', height: '40px', lineHeight: '40px', padding: '0 14px', borderRadius: '10px', margin: '0 0 4px',
          textAlign: 'left', boxShadow: 'none', background: on ? LIME : SOFT, color: INK, fontWeight: on ? 'bold' : 'normal' },
        onClick: () => {
          this.ui('uiLangOpen', '0')
          if (!on) this.set('lang', o[0])
        }
      })
    }))], { marginTop: '6px' })
  },

  // Strava through the user's own Strava app (decision 37); the keys and tokens stay on the phone. The
  // sign-in is Zepp's own Auth component; the side service checks it and writes the line under it.
  strava(storage) {
    const id = (storage.getItem('stravaClientId') || '').trim()
    const secret = (storage.getItem('stravaClientSecret') || '').trim()
    const auth = readJson(storage, 'stravaAuth', null)
    const connected = !!(auth && (auth.access_token || auth.refresh_token))
    const guideOpen = storage.getItem('uiGuide') === '1'
    const items = [
      note(p('strava.note')),
      button(guideOpen ? p('strava.hideGuide') : p('strava.guide'), () => this.ui('uiGuide', guideOpen ? '' : '1'), 'dark'),
      guideOpen ? this.guide() : null,
      input('Client ID', id, p('strava.from'), (x) => storage.setItem('stravaClientId', x)),
      input('Client Secret', secret, p('strava.from'), (x) => storage.setItem('stravaClientSecret', x), true)
    ]
    if (id && secret) {
      items.push(View({ style: { padding: '10px 0 2px' } }, [
        Auth({
          label: connected ? p('strava.reconnect') : p('strava.connect'),
          authorizeUrl: 'https://www.strava.com/oauth/authorize',
          requestTokenUrl: 'https://www.strava.com/oauth/token',
          // activity:read_all finds the Zepp workout of the same match (decision 31)
          scope: 'read,activity:read_all,activity:write',
          clientId: id,
          clientSecret: secret,
          oAuthParams: { response_type: 'code', approval_prompt: 'auto' },
          onAccessToken: (token) => {
            let tk = token
            try {
              if (typeof tk === 'string') tk = JSON.parse(tk)
            } catch (e) {}
            if (tk && tk.access_token) {
              this.busy('strava')
              storage.setItem('stravaAuth', JSON.stringify({ access_token: tk.access_token, refresh_token: tk.refresh_token, expires_at: tk.expires_at || 0 }))
            }
          },
          // when Zepp hands over only the code, the side service trades it for the tokens
          onReturn: (res) => {
            const code = res && (res.code || (res.query && res.query.code))
            if (code && !readJson(storage, 'stravaAuth', null)) {
              this.busy('strava')
              storage.setItem('stravaCode', String(code))
            }
          }
        })
      ]))
    } else items.push(note(p('strava.needKeys')))
    items.push(this.statusLine('strava'))
    if (connected) {
      // one under the other: side by side "Check the connection" doesn't fit on a line in most languages
      items.push(button(p('strava.check'), () => this.command('strava', 'stravaCheck'), 'dark'))
      items.push(View({ style: { marginTop: '-4px' } }, [button(p('strava.disconnect'), () => {
        storage.setItem('stravaAuth', '')
        storage.setItem('stravaCode', '')
        const s = readJson(storage, 'status', {}) || {}
        delete s.strava
        storage.setItem('status', JSON.stringify(s))
      }, 'soft')]))
    }
    items.push(toggle(p('strava.send'), storage.getItem('stravaSend') !== 'false', (x) => storage.setItem('stravaSend', x ? 'true' : 'false')))
    if (connected) items.push(this.waitingLine(storage))
    return items
  },

  // the guide under its button, step by step, on a gray panel
  guide() {
    return View({ style: { background: SOFT, borderRadius: '12px', padding: '2px 12px', marginBottom: '4px' } }, [
      p('guide.intro'),
      p('guide.1'),
      p('guide.2', { domain: STRAVA_CALLBACK_DOMAIN }),
      p('guide.3'),
      p('guide.4', { connect: p('strava.connect') }),
      p('guide.5', { ok: p('conn.connectedAs', { name: '…' }) }),
      p('guide.fix')
    ].map((x) => note(x, DARK)))
  },

  intervals(storage) {
    const strava = !!readJson(storage, 'stravaAuth', null)
    return [
      note(p('ivl.note')),
      input(p('ivl.key'), storage.getItem('intervalsKey') || '', p('ivl.keyHint'), (x) => storage.setItem('intervalsKey', x), true),
      input(p('ivl.athlete'), storage.getItem('intervalsAthlete') || '', p('ivl.athleteHint'), (x) => storage.setItem('intervalsAthlete', x)),
      button(p('ivl.check'), () => this.command('intervals', 'intervalsCheck'), 'dark'),
      this.statusLine('intervals'),
      strava ? null : this.waitingLine(storage)
    ]
  },

  // Asks the side service to do something; the line under the button says it is on its way
  command(service, what) {
    if (service) this.busy(service)
    this.ui('cmd', JSON.stringify({ do: what, at: Date.now() }))
  },

  busy(service) {
    const storage = this.storage()
    const s = readJson(storage, 'status', {}) || {}
    s[service] = { busy: true, at: Date.now() }
    storage.setItem('status', JSON.stringify(s))
  },

  // Green when it works, red with what is wrong, and when it happened; "Checking…" until the side
  // service answers (no answer in a minute says so)
  statusLine(service) {
    const s = (readJson(this.storage(), 'status', {}) || {})[service]
    if (!s) return null
    if (s.busy) return note(Date.now() - (s.at || 0) > 60000 ? p('conn.noAnswer') : p('conn.checking'), s.at && Date.now() - s.at > 60000 ? RED : GRAY)
    const when = s.at ? ` (${dayLabel(s.at, Date.now())} ${timeOfDay(s.at)})` : ''
    const msg = p(s.key || 'conn.connected', { ...(s.vars || {}), connect: p('strava.connect') })
    return View({ style: { padding: '4px 0 6px' } }, [
      Text({ style: { fontSize: '14px', color: s.ok ? GREEN : RED, fontWeight: 'bold', lineHeight: '19px' } }, msg + when)
    ])
  },

  // matches that could not be sent, with a button to try again now
  waitingLine(storage) {
    const n = readJson(storage, 'outbox', []).filter((x) => x && x.tries > 0).length
    if (!n) return null
    return col([note(pn('pending', n), RED), button(p('retry'), () => this.command(null, 'retry'), 'dark')])
  },

  // a mail to us, with the version and the language in its subject (as the QR code on the watch). On an
  // iPhone a tap on a Link in the Zepp app opens nothing; a long press on a text link (not a button) opens
  // the iOS menu, so the address is a text link with a hint under it (Pavle's choice in SaunaPal, 21. 10.)
  feedback() {
    return [
      note(p('feedback.note')),
      View({ style: { padding: '2px 0 4px' } }, [
        Link({ source: feedbackMail(LANG_NAMES[code]) }, [
          Text({ style: { fontSize: '16px', color: PURPLE, fontWeight: 'bold', textDecoration: 'underline' } }, SUPPORT_EMAIL)
        ])
      ]),
      note(p('link.hold'))
    ]
  },

  about(storage) {
    const last = Number(storage.getItem('lastSync') || 0)
    const small = { fontSize: '13px', color: GRAY, lineHeight: '18px' }
    return [
      View({ style: { padding: '12px 0 4px' } }, [txt(p(this.trial().licensed ? 'about.versionFull' : 'about.version', { v: VERSION }), 15, INK, { fontWeight: 'bold' })]),
      note(last ? p('about.synced', { when: `${dayLabel(last, Date.now())} ${timeOfDay(last)}` }) : p('about.notSynced')),
      View({ style: { padding: '0 0 12px' } }, [
        Text({ style: small }, `${t('about.by', { name: AUTHOR })} (`),
        Link({ source: AUTHOR_URL }, [Text({ style: { ...small, color: PURPLE, textDecoration: 'underline' } }, AUTHOR_SITE)]),
        Text({ style: small }, ')')
      ])
    ]
  }
})
