// Stand-in for the Zepp phone app's 'i18n' module: the .po files say only which language the phone is in.
// globalThis.__phoneLang sets it (English by default).
export function gettext(key) {
  return key === 'lang' ? globalThis.__phoneLang || 'en' : key
}
