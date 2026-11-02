// How a setup reads on the watch: "Tennis · Best of 3", "Tennis · No-ad", "Padel · Star point",
// "Pickleball · Doubles". The words name what differs from the official rules; with the official
// rules, the sport's usual short name for them. A name given on the phone replaces all of it.

import { defaultRules, sanitizeRules, sanitizeDoubles } from './rules'
import { t } from './i18n'

export function sportName(sport) {
  return t('sport.' + sport)
}

function ruleWords(setup) {
  const s = setup.sport
  const r = sanitizeRules(s, setup.rules)
  const d = sanitizeDoubles(s, setup.doubles)
  const def = defaultRules(s)
  const words = []
  if (s === 'tennis' || s === 'padel') {
    if (r.format === 'total') return [t('setup.total', { n: r.total })]
    if (r.sets !== def.sets) words.push(r.sets === 1 ? t('setup.oneSet') : t('setup.bestOf', { n: 2 * r.sets - 1 }))
    if (r.games !== def.games) words.push(t('setup.shortSets'))
    if (r.deuce !== def.deuce) {
      const k = r.deuce === 'noad' ? (s === 'padel' ? 'setup.golden' : 'setup.noad') : r.deuce === 'star' ? 'setup.star' : 'setup.advantage'
      words.push(t(k))
    }
    if (r.tiebreak !== def.tiebreak) words.push(r.tiebreak === 10 ? t('setup.tb10') : t('setup.noTb'))
    if (r.finalSet !== def.finalSet && r.sets > 1) words.push(t('setup.superTb'))
    if (s === 'tennis' && d) words.push(t('setup.doubles'))
    if (!words.length) words.push(s === 'padel' ? t('setup.star') : t('setup.bestOf', { n: 2 * r.sets - 1 }))
    return words
  }
  if (s === 'pickleball') {
    if (!d) words.push(t('setup.singles'))
    if (r.to !== def.to) words.push(t('setup.to', { n: r.to }))
    if (r.scoring !== def.scoring) words.push(t('setup.rally'))
    if (r.games !== def.games) words.push(t('setup.bestOf', { n: 2 * r.games - 1 }))
    if (!words.length) words.push(t('setup.doubles'))
    return words
  }
  if (s === 'tabletennis' || s === 'squash') {
    words.push(t('setup.bo', { n: 2 * r.games - 1 }))
    if (r.to !== def.to) words.push(t('setup.to', { n: r.to }))
    if (d) words.push(t('setup.doubles'))
    return words
  }
  // badminton
  if (r.to !== def.to) words.push(t('setup.to', { n: r.to }))
  if (d) words.push(t('setup.doubles'))
  if (!words.length) words.push(t('setup.bestOf', { n: 2 * r.games - 1 }))
  return words
}

// words: how many rule words follow the sport (2; fewer where a screen is short of room, 0: only the sport)
export function setupTitle(setup, words) {
  if (!setup) return ''
  if (setup.name) return setup.name
  const n = words === undefined ? 2 : words
  return n ? `${sportName(setup.sport)} · ${ruleWords(setup).slice(0, n).join(', ')}` : sportName(setup.sport)
}

// The longest title that fits(title) accepts: two rule words, then one, then only the sport
export function fittedTitle(setup, fits) {
  for (let n = 2; n > 0; n--) {
    const s = setupTitle(setup, n)
    if (fits(s)) return s
  }
  return setupTitle(setup, 0)
}

// What the setup list shows on the right: the opponent, or the partner
export function setupExtra(setup) {
  if (!setup) return ''
  if (setup.opponent) return setup.opponent
  return setup.partner ? t('setup.with', { name: setup.partner }) : ''
}

// The names a match keeps from its setup (the setup can change later)
export function matchNames(setup, values) {
  return {
    me: (values && values.myName) || '',
    opponent: (setup && setup.opponent) || '',
    partner: (setup && setup.partner) || ''
  }
}

// Score row names: the wearer's name or YOU, the opponent's or OPPONENT (OPPONENTS in doubles)
export function teamName(team, names, doubles) {
  const n = names || {}
  if (team === 0) return n.me || t('team.you')
  return n.opponent || t(doubles ? 'team.opponents' : 'team.opponent')
}

export function partnerName(names) {
  return (names && names.partner) || t('team.partner')
}
