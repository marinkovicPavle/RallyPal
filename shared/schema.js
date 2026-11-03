// Every RallyPal setting with its default and allowed values. The watch settings page, the phone settings
// page and the sync all read this one list. Setups (decision 7 and the Setups tab) are one setting: a list
// made on the phone; the watch only picks one of them.

import { SPORTS, DOUBLES, defaultRules, isSport, sanitizeRules, sanitizeDoubles } from './rules'

export const MAX_SETUPS = 30
export const NAME_MAX = 16

// six ready setups, one per sport with the official rules, so the app works without any setting up
export const DEFAULT_SETUPS = SPORTS.map((s) => ({
  id: s,
  sport: s,
  rules: defaultRules(s),
  doubles: DOUBLES[s][0],
  name: '',
  opponent: '',
  partner: ''
}))

// kind: bool, enum (options), name (text, phone only), setups
export const SETTINGS = [
  { key: 'vibePoint', group: 'vibration', kind: 'bool', def: true },
  { key: 'vibeGame', group: 'vibration', kind: 'bool', def: true },
  { key: 'vibeSet', group: 'vibration', kind: 'bool', def: true },
  { key: 'vibeMatch', group: 'vibration', kind: 'bool', def: true },
  { key: 'serveDisplay', group: 'display', kind: 'enum', def: 'full', options: ['full', 'team'] },
  { key: 'labels', group: 'display', kind: 'bool', def: true },
  // a label and a vibration when the players change ends (ROAST item 14)
  { key: 'changeEnds', group: 'display', kind: 'bool', def: true },
  // false: points only with the keys, a tap on the screen does nothing (ROAST item 15); watches with 2+ keys
  { key: 'tapPoints', group: 'display', kind: 'bool', def: true },
  // a countdown of the rest the rules allow between games and sets, and a vibration at its end (ROAST item 16)
  { key: 'restTimer', group: 'display', kind: 'bool', def: true },
  // FAULT, ACE and DOUBLE FAULT under the score in tennis and padel, for serve statistics (ROAST item 20)
  { key: 'serveStats', group: 'display', kind: 'bool', def: false },
  { key: 'screen', group: 'display', kind: 'enum', def: 'wrist', options: ['wrist', 'always'] },
  // auto: the watch's own language (decision 39)
  { key: 'lang', group: 'display', kind: 'enum', def: 'auto', options: ['auto', 'en', 'sr', 'es', 'it', 'de', 'fr', 'pt', 'nl', 'pl', 'cs', 'uk', 'ru', 'sv', 'nb', 'da', 'fi', 'ja'] },
  // shown instead of YOU; typed on the phone
  { key: 'myName', group: 'names', kind: 'name', def: '' },
  // heart rate zones are counted from this maximum; 0: 220 minus the age from the Zepp profile (typed on the phone)
  { key: 'hrMax', group: 'zones', kind: 'int', def: 0, min: 120, max: 230 },
  { key: 'setups', group: 'setups', kind: 'setups', def: DEFAULT_SETUPS }
]

export const VIBES = ['vibePoint', 'vibeGame', 'vibeSet', 'vibeMatch']

export function settingMeta(key) {
  for (let i = 0; i < SETTINGS.length; i++) if (SETTINGS[i].key === key) return SETTINGS[i]
  return null
}

export function clone(v) {
  return v === undefined ? v : JSON.parse(JSON.stringify(v))
}

export function defaults() {
  const out = {}
  SETTINGS.forEach((s) => (out[s.key] = clone(s.def)))
  return out
}

export function cleanName(v) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : ''
}

// Brings a stored value back inside the schema; anything unknown falls back to the default
export function sanitize(key, value) {
  const s = settingMeta(key)
  if (!s) return undefined
  if (value === undefined || value === null) return clone(s.def)
  if (s.kind === 'bool') return value === true || value === 'true'
  if (s.kind === 'enum') {
    for (let i = 0; i < s.options.length; i++) if (String(s.options[i]) === String(value)) return s.options[i]
    return s.def
  }
  if (s.kind === 'name') return cleanName(value)
  if (s.kind === 'int') {
    const n = Math.round(Number(value))
    return n >= s.min && n <= s.max ? n : s.def
  }
  if (s.kind === 'setups') return sanitizeSetups(value)
  return clone(s.def)
}

// A list from the phone: every setup checked, ids unique, never empty
export function sanitizeSetups(list) {
  const out = []
  const seen = {}
  if (Array.isArray(list)) {
    list.forEach((x) => {
      if (!x || out.length >= MAX_SETUPS || !isSport(x.sport)) return
      let id = typeof x.id === 'string' && x.id ? x.id.slice(0, 24) : ''
      if (!id || seen[id]) id = newSetupId(out, x.sport)
      seen[id] = true
      out.push({
        id,
        sport: x.sport,
        rules: sanitizeRules(x.sport, x.rules),
        doubles: sanitizeDoubles(x.sport, x.doubles),
        name: cleanName(x.name),
        opponent: cleanName(x.opponent),
        partner: cleanName(x.partner)
      })
    })
  }
  return out.length ? out : clone(DEFAULT_SETUPS)
}

export function newSetupId(list, sport) {
  const ids = {}
  list.forEach((x) => (ids[x.id] = true))
  let n = 1
  while (ids[sport + n]) n++
  return sport + n
}

export function findSetup(values, id) {
  const list = (values && values.setups) || DEFAULT_SETUPS
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i]
  return list[0]
}
