// RallyPal's languages: English, Serbian, Spanish, Italian, German, French and Portuguese (decisions 24 and
// 43), and since 1.0 also Dutch, Polish, Czech, Ukrainian, Russian, Swedish, Norwegian, Danish, Finnish and
// Japanese, as SaunaPal (ROAST-v2 item 7). Unless the Language setting names one (decision 39), the watch
// takes its own language (utils/lang.js); a language RallyPal doesn't have falls back to English, and so does
// a key a language leaves out.
//
// The tables are registered, not imported here: the phone page, the side service and the tests register all
// of them (shared/lang/all.js); the watch reads only the language it speaks (and English if a key is missing)
// from its assets, raw/lang/<code>.json, written by .dev/tools/i18n/build.mjs (utils/lang.js), so a page
// doesn't carry 17 languages.

// each language by its own name, in the order of the Language setting
export const LANG_NAMES = {
  en: 'English',
  sr: 'Srpski',
  es: 'Español',
  it: 'Italiano',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  cs: 'Čeština',
  uk: 'Українська',
  ru: 'Русский',
  sv: 'Svenska',
  nb: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
  ja: '日本語'
}
export const LANG_CODES = Object.keys(LANG_NAMES)

// @zos/settings getLanguage() -> language (Zepp docs, "Multilingual Mapping")
const ZEPP = { 2: 'en', 3: 'es', 4: 'ru', 6: 'fr', 7: 'de', 9: 'pl', 10: 'it', 11: 'ja', 15: 'pt', 16: 'nl', 18: 'uk', 20: 'pt', 22: 'cs',
  24: 'sr', 26: 'fi', 27: 'nb', 28: 'da', 29: 'sv' }

// the tables registered so far, by language
export const LANGS = {}
let loader = null
let code = 'en'
let cur = {}

export function registerLang(c, table) {
  LANGS[c] = table
}

// fn(code) -> table: how the watch reads a language it hasn't registered yet
export function setLoader(fn) {
  loader = fn
}

export function isLang(c) {
  return !!LANG_NAMES[c]
}

function table(c) {
  if (!LANGS[c] && loader) {
    let tbl = null
    try {
      tbl = loader(c)
    } catch (e) {}
    if (tbl && typeof tbl === 'object') LANGS[c] = tbl
  }
  return LANGS[c]
}

export function langOfZepp(n) {
  return ZEPP[n] || 'en'
}

export function setLang(c) {
  code = isLang(c) ? c : 'en'
  cur = table(code) || table('en') || {}
  if (!LANGS[code]) code = 'en'
}

export function lang() {
  return code
}

// t('history.count', { n: 3, w: 2 }) -> "3 matches · 2 won"
export function t(key, params) {
  let s = cur[key]
  if (s === undefined && code !== 'en') s = (table('en') || {})[key]
  if (s === undefined) return key
  if (!params || typeof s !== 'string') return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : String(params[k])))
}
