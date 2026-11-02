// RallyPal's language: the Language setting (decision 39), or with Automatic the watch's own language
// (decision 24). Imported by utils/ui.js, so every page, the card and the screens use it from their first
// line of text; Settings calls applyLang() again after a change.

import { getLanguage } from '@zos/settings'
import { setLang, langOfZepp, LANGS } from '../shared/i18n'
import { FILES, readJson } from './store'

export function watchLang() {
  try {
    return langOfZepp(getLanguage())
  } catch (e) {
    return 'en'
  }
}

export function applyLang() {
  const saved = readJson(FILES.settings, null)
  const chosen = saved && saved.values ? saved.values.lang : null
  setLang(chosen && LANGS[chosen] ? chosen : watchLang())
}

applyLang()
