// RallyPal's language on the watch: the Language setting (decision 39), or with Automatic the watch's own
// language (decision 24). Only that language is read, from the app's assets (raw/lang/<code>.json, written by
// .dev/tools/i18n/build.mjs), and English besides it only if a text is missing, so a page doesn't carry all
// 17 (as SaunaPal). Imported by utils/ui.js, so every page, the card and the screens use it from their first
// line of text; Settings calls applyLang() again after a change.

import { getLanguage } from '@zos/settings'
import { openAssetsSync, statAssetsSync, readSync, closeSync, O_RDONLY } from '@zos/fs'
import { setLang, setLoader, langOfZepp, isLang, LANGS } from '../shared/i18n'
import { FILES, readJson } from './store'

export function watchLang() {
  try {
    return langOfZepp(getLanguage())
  } catch (e) {
    return 'en'
  }
}

// The asset files are plain ASCII (the build writes other characters as \u escapes): bytes to a string in
// a few big steps
function readAsset(path) {
  const st = statAssetsSync({ path })
  if (!st || !st.size) return ''
  const fd = openAssetsSync({ path, flag: O_RDONLY })
  if (fd === undefined || fd === null || fd < 0) return ''
  const buf = new ArrayBuffer(st.size)
  try {
    readSync({ fd, buffer: buf })
  } finally {
    closeSync(fd)
  }
  const bytes = new Uint8Array(buf)
  const parts = []
  for (let i = 0; i < bytes.length; i += 1024) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 1024)))
  return parts.join('')
}

// a language's table, read the first time it is needed; only it and English stay in memory
setLoader((c) => {
  Object.keys(LANGS).forEach((k) => {
    if (k !== 'en' && k !== c) delete LANGS[k]
  })
  return JSON.parse(readAsset(`raw/lang/${c}.json`))
})

export function applyLang() {
  const saved = readJson(FILES.settings, null)
  const chosen = saved && saved.values ? saved.values.lang : null
  setLang(chosen && isLang(chosen) ? chosen : watchLang())
}

applyLang()
