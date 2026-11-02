// Scoring rules of the six sports. For every option the first value is the official rule and the
// default; the phone offers the others as variants. Plain data only, so the watch, the phone and the
// tests all read the same rules.

export const SPORTS = ['tennis', 'padel', 'pickleball', 'tabletennis', 'squash', 'badminton']

// sets / games: how many the winner needs (2 = best of 3)
export const OPTIONS = {
  tennis: {
    sets: [2, 1, 3],
    games: [6, 4],
    deuce: ['ad', 'noad'],
    tiebreak: [7, 10, 0],
    finalSet: ['set', 'super']
  },
  padel: {
    format: ['match', 'total'],
    sets: [2, 1, 3],
    games: [6, 4],
    deuce: ['star', 'noad', 'ad'],
    tiebreak: [7, 10, 0],
    finalSet: ['set', 'super'],
    total: [24, 16, 21, 32]
  },
  pickleball: { to: [11, 15, 21], scoring: ['sideout', 'rally'], games: [1, 2] },
  tabletennis: { to: [11, 21], games: [3, 2, 4] },
  squash: { to: [11, 15], games: [3, 2] },
  badminton: { to: [21, 15, 11], games: [2] }
}

// singles (false) or doubles (true), first value is the default
export const DOUBLES = {
  tennis: [false, true],
  padel: [true],
  pickleball: [true, false],
  tabletennis: [false, true],
  squash: [false],
  badminton: [false, true]
}

// advantages played at deuce before the deciding point (ad: never decided by one point)
const ADVANTAGES = { ad: 99, noad: 0, star: 2 }
// badminton: at 29-29 (21 points) the next point wins
const BADMINTON_CAP = { 21: 30, 15: 21, 11: 15 }

export function isSport(sport) {
  return SPORTS.indexOf(sport) >= 0
}

export function defaultRules(sport) {
  const options = OPTIONS[sport]
  const rules = {}
  for (const key in options) rules[key] = options[key][0]
  return rules
}

// values stored by the phone may come back as strings
export function sanitizeRules(sport, rules) {
  const options = OPTIONS[sport]
  const out = {}
  for (const key in options) {
    const value = rules ? rules[key] : undefined
    const hit = options[key].filter((v) => String(v) === String(value))
    out[key] = hit.length ? hit[0] : options[key][0]
  }
  return out
}

export function sanitizeDoubles(sport, doubles) {
  const allowed = DOUBLES[sport]
  return allowed.indexOf(!!doubles) >= 0 ? !!doubles : allowed[0]
}

// the trial only allows the official rules
export function isOfficial(sport, rules) {
  const clean = sanitizeRules(sport, rules)
  const official = defaultRules(sport)
  for (const key in official) if (clean[key] !== official[key]) return false
  return true
}

// What the scoring engine needs, with the model that decides how points, games and serve work:
//   tennis   games and sets (tennis, padel)
//   total    one round to a total number of points (padel Americano / Mexicano)
//   sideout  only the serving side scores (pickleball classic)
//   rally    every rally scores, winner serves (badminton, pickleball rally)
//   tt       every rally scores, serve changes every 2 points (table tennis)
//   squash   every rally scores, winner serves, side changes on every point kept
export function paramsOf(sport, rules) {
  const s = isSport(sport) ? sport : 'tennis'
  const r = sanitizeRules(s, rules)
  if (s === 'tennis' || s === 'padel') {
    if (r.format === 'total') return { model: 'total', total: r.total }
    return {
      model: 'tennis',
      sets: r.sets,
      games: r.games,
      deuce: r.deuce,
      adv: ADVANTAGES[r.deuce],
      tiebreak: r.tiebreak,
      superTb: r.finalSet === 'super' && r.sets > 1
    }
  }
  if (s === 'pickleball') {
    if (r.scoring === 'rally') return { model: 'rally', to: r.to, cap: 0, win: r.games, nextFirst: 'alternate' }
    return { model: 'sideout', to: r.to, win: r.games }
  }
  if (s === 'tabletennis') return { model: 'tt', to: r.to, win: r.games }
  if (s === 'squash') return { model: 'squash', to: r.to, win: r.games }
  return { model: 'rally', to: r.to, cap: BADMINTON_CAP[r.to], win: r.games, nextFirst: 'winner' }
}

export function modelOf(sport, rules) {
  return paramsOf(sport, rules).model
}
