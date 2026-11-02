// The six languages (decision 24) and Serbian (Pavle, 21. 10.). Unless the Language setting names one
// (decision 39), the watch takes its own language (utils/lang.js); a language RallyPal doesn't have falls
// back to English, and so does a key a language leaves out.

import en from './lang/en'
import es from './lang/es'
import it from './lang/it'
import de from './lang/de'
import fr from './lang/fr'
import pt from './lang/pt'
import sr from './lang/sr'

export const LANGS = { en, sr, es, it, de, fr, pt }
// each language by its own name, for the Language setting
export const LANG_NAMES = { en: 'English', sr: 'Srpski', es: 'Español', it: 'Italiano', de: 'Deutsch', fr: 'Français', pt: 'Português' }

// @zos/settings getLanguage() -> language (Zepp docs, "Multilingual Mapping")
const ZEPP = { 2: 'en', 3: 'es', 6: 'fr', 7: 'de', 10: 'it', 15: 'pt', 20: 'pt', 24: 'sr' }

let code = 'en'
let cur = en

export function langOfZepp(n) {
  return ZEPP[n] || 'en'
}

export function setLang(c) {
  code = LANGS[c] ? c : 'en'
  cur = LANGS[code]
}

export function lang() {
  return code
}

// t('history.count', { n: 3, w: 2 }) -> "3 matches · 2 won"
export function t(key, params) {
  let s = cur[key]
  if (s === undefined) s = en[key]
  if (s === undefined) return key
  if (!params || typeof s !== 'string') return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : String(params[k])))
}
