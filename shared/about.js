// Shown in About on the watch and on the phone settings page
export const VERSION = '1.0.0'
export const AUTHOR = 'Pavle'
export const AUTHOR_SITE = 'pavlemarinkovic.com'
export const AUTHOR_URL = 'https://pavlemarinkovic.com'
// where feedback goes: a mail with the version and the language in its subject
export const SUPPORT_EMAIL = 'pavle019@live.com'

export function feedbackMail(langLabel) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`RallyPal ${VERSION} · ${langLabel}`)}`
}
