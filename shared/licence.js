// The free trial and the full version, the same on the watch and the phone (decisions 18 to 20, as SaunaPal).
// RallyPal is free to download with 3 free matches; $2.99 once (paid through KiezelPay) unlocks it for good.
// The trial plays the six ready setups with the official rules, in singles or doubles, with the score,
// serve, vibration, labels, summary and history; own setups, rule variants, player names, Stats, Strava and
// Intervals.icu are the full version. After the trial no new match starts and the settings are read-only,
// while the history stays. A match shorter than MIN_MATCH_SEC is not counted (nor sent to Strava).

import { defaultRules } from './rules'
import { t } from './i18n'

export const FREE_MATCHES = 3
// a match counts toward the trial, and goes to Strava and Intervals.icu, from this long (ROAST item 13)
export const MIN_MATCH_SEC = 300
export const PRICE = '$2.99'
export const PAY_URL = 'kzl.io/code'
export const RESTORE_URL = 'kzl.io/unlock'

// The KiezelPay app ID of the RallyPal product (created 2. 11. 2026). Test mode lets a purchase go
// through without paying; it must be false in the build for the Zepp store.
export const KPAY_APP_ID = '2025865549'
export const KPAY_TEST = false

// Remembers the matches each watch used, so reinstalling the app doesn't reset the trial. The same
// Cloudflare service as SaunaPal (it only stores hashes); RallyPal hashes with its own prefixes
// (shared/trialhash.js), so a watch's RallyPal and SaunaPal counts never mix.
export const TRIAL_URL = 'https://saunapal-trial.svadba-media.workers.dev/v1/trial'

// Settings that can be changed during the trial; the rest keep what they have until the app is unlocked
export const FREE_KEYS = ['vibePoint', 'vibeGame', 'vibeSet', 'vibeMatch', 'serveDisplay', 'labels', 'screen', 'lang']
// ... and after it: the app must stay readable
export const ALWAYS_KEYS = ['lang']

// meta: { licensed, trialIds: [ids of the counted matches] } on the watch; { licensed, used } on the phone
export function trialOf(meta) {
  const m = meta || {}
  const used = Math.min(FREE_MATCHES, Array.isArray(m.trialIds) ? m.trialIds.length : Number(m.used) || 0)
  const licensed = m.licensed === true
  return { licensed, used, left: licensed ? 0 : FREE_MATCHES - used, locked: !licensed && used >= FREE_MATCHES }
}

export function canEdit(key, tr) {
  return tr.licensed || ALWAYS_KEYS.indexOf(key) >= 0 || (!tr.locked && FREE_KEYS.indexOf(key) >= 0)
}

// a finished match long enough to count toward the trial and to go to Strava and Intervals.icu
export function counts(rec) {
  return !!rec && (Number(rec.dur) || 0) >= MIN_MATCH_SEC
}

// What a setup plays in the trial: its sport, singles or doubles, the official rules and no names
export function trialSetup(setup) {
  if (!setup) return setup
  return { ...setup, rules: defaultRules(setup.sport), name: '', opponent: '', partner: '' }
}

// The setup a match plays: as made on the phone in the full version, trialSetup() in the trial
export function playable(setup, tr) {
  return tr && tr.licensed ? setup : trialSetup(setup)
}

// "Free matches left: 2", "Free trial ended"; nothing once unlocked
export function trialLine(tr) {
  if (tr.licensed) return ''
  return tr.locked ? t('trial.ended') : t('trial.left', { n: tr.left })
}
