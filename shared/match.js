// A match as plain data: the setup plus a list of events. Everything shown on the watch (score,
// who serves and from which side, labels, statistics) is worked out by replaying the events, so
// undo is just dropping the last event, a saved match picks up exactly where it was, and the whole
// thing is tested with node.
//
// Teams: 0 is the watch wearer (and partner), 1 the opponents. Players inside a team: 0 and 1
// (for team 0: 0 = you, 1 = partner).
// Events: ['p', winner, sec]           a rally won by team `winner`
//         ['s', team, player, sec]     server changed by hand (menu)
//         ['e', sec]                   match ended by hand before anyone won
//         ['e', winner, sec]           ... and the players said who won (retirement, court time over)
// sec = seconds since the start of the match

import { isSport, sanitizeRules, sanitizeDoubles, paramsOf } from './rules'

const TENNIS_POINTS = ['0', '15', '30', '40']
const TOTAL_SERVE_BLOCK = 4
const SUPER_TIEBREAK = 10
// A match left open and ended much later (the next day) ends a minute after its last point, so Strava
// doesn't get a 16-hour workout (ROAST item 6). The heart rate stops after IDLE_HR_S without a point.
export const IDLE_END_S = 600
export const END_GRACE_S = 60
export const IDLE_HR_S = 1800

// setup: { id, sport, rules, doubles }, choice: { first: team serving first, mine: who of team 0 serves first }
export function newMatch(setup, choice, now) {
  const sport = isSport(setup.sport) ? setup.sport : 'tennis'
  const doubles = sanitizeDoubles(sport, setup.doubles)
  return {
    v: 1,
    id: 'm' + now,
    start: now,
    setup: setup.id || null,
    sport,
    rules: sanitizeRules(sport, setup.rules),
    doubles,
    first: choice && choice.first ? 1 : 0,
    mine: doubles && choice && choice.mine ? 1 : 0,
    ev: []
  }
}

function secOf(m, now) {
  return Math.max(0, Math.round((now - m.start) / 1000))
}

// Returns what the point did ('point' | 'game' | 'set' | 'match') for the vibration, or null when
// the match is already over.
export function addPoint(m, winner, now) {
  const st = replay(m)
  if (st.done) return null
  const w = winner ? 1 : 0
  pointTo(st, w)
  m.ev.push(['p', w, secOf(m, now)])
  return st.last
}

export function setServer(m, team, player, now) {
  if (replay(m).done) return false
  m.ev.push(['s', team ? 1 : 0, player ? 1 : 0, secOf(m, now)])
  return true
}

// winner: 0 or 1 when the players say who won a match ended by hand (ROAST item 17), else no result
export function endMatch(m, now, winner) {
  if (replay(m).done) return false
  const last = lastSec(m)
  let sec = secOf(m, now)
  if (sec - last > IDLE_END_S) sec = last + END_GRACE_S
  m.ev.push(winner === 0 || winner === 1 ? ['e', winner, sec] : ['e', sec])
  return true
}

// seconds from the start to the last event (0 before the first point)
export function lastSec(m) {
  const e = m.ev.length ? m.ev[m.ev.length - 1] : null
  return e ? e[e.length - 1] : 0
}

// true when no point was played for IDLE_HR_S: the heart rate is no longer recorded
export function idle(m, now) {
  return secOf(m, now) - lastSec(m) > IDLE_HR_S
}

export function undo(m) {
  if (!m.ev.length) return false
  m.ev.pop()
  return true
}

// seconds played: up to the last event once the match is over
export function duration(m, now, done) {
  if (done) return lastSec(m)
  return secOf(m, now)
}

// What the next point gives `team`, for the word next to its key (decision 35): the score it would show
// ('15', '30', '40', 'AD', or the new number in a tie-break, a count or a round), 'game' when it wins the
// game in tennis and padel, 'serve' when it only wins the serve (pickleball, classic scoring). Null when
// the match is over.
export function pointPreview(m, team) {
  const st = replay(m)
  if (st.done) return null
  const w = team ? 1 : 0
  const next = clone(st)
  pointTo(next, w)
  const won = next.last !== 'point'
  if (st.model === 'tennis') {
    if (st.tb) return String(st.p[w] + 1)
    return won ? 'game' : shownPoints(next)[w]
  }
  // a won rally on the other side's serve only brings the serve, or in doubles their second server: no label
  if (st.model === 'sideout' && !won && next.p[w] === st.p[w]) return next.srv === w ? 'serve' : ''
  return String(st.p[w] + 1)
}

// winners of the rallies in order, for the flow chart
export function flow(m) {
  return m.ev.filter((e) => e[0] === 'p').map((e) => e[1])
}

// The flow of a finished match for the phone's chart: who won each rally, and after which rally a set
// ended (tennis and padel) or a game (the other sports); a round to a total has no breaks
export function flowMarks(m) {
  const st = init(m)
  const wins = []
  const ends = []
  for (let i = 0; i < m.ev.length; i++) {
    const e = m.ev[i]
    if (e[0] === 'p') {
      pointTo(st, e[1])
      wins.push(e[1])
      if (st.model !== 'total' && (st.last === (st.model === 'tennis' ? 'set' : 'game') || st.last === 'match')) ends.push(wins.length)
    } else if (e[0] === 's') applyServer(st, e[1], e[2])
    else if (e[0] === 'e') endNow(st, e.length > 2 ? e[1] : null)
  }
  return { wins, ends }
}

export function replay(m) {
  const st = init(m)
  for (let i = 0; i < m.ev.length; i++) {
    const e = m.ev[i]
    if (e[0] === 'p') pointTo(st, e[1])
    else if (e[0] === 's') applyServer(st, e[1], e[2])
    else if (e[0] === 'e') endNow(st, e.length > 2 ? e[1] : null)
  }
  return st
}

function init(m) {
  const P = paramsOf(m.sport, m.rules)
  const st = {
    P,
    model: P.model,
    sport: m.sport,
    doubles: !!m.doubles,
    first: m.first,
    pstart: [m.mine, 0],
    done: false,
    winner: null,
    draw: false,
    ended: false,
    last: null,
    sets: [], // finished sets (tennis) or games (other sports): { s: [a, b], tb?: [a, b], sup?: true }
    won: [0, 0], // sets or games won
    g: [0, 0], // games in the current set (tennis)
    p: [0, 0], // points in the current game, tie-break or round
    tb: null, // 'tb' | 'super' while a tie-break is played
    gi: 0, // games played so far; a tie-break counts as one (tennis, table tennis)
    // who serves
    shift: 0, // flipped when the server is changed by hand (tennis, table tennis, round)
    pshift: [0, 0],
    turns: [0, 0], // serve turns each team had, for the order of players in doubles
    lastSrv: -1,
    srv: m.first, // serving team (rally, squash, sideout)
    gf: m.first, // team that served first in the current game
    pos: [m.mine, 0], // player of each team standing in the right court
    // rally scoring in doubles when the opponents serve first: who of your team serves your first serve
    // (m.mine) is placed when your team first gets the serve, by the score then (ROAST item 10)
    pend: P.model === 'rally' && m.doubles && m.first === 1 ? 0 : -1,
    mine: m.mine,
    swapped: false, // table tennis doubles: the receivers' order changed in the deciding game
    ends: false, // the players change ends before the next rally
    rest: 0, // seconds of rest before the next rally (ROAST item 16)
    midRest: false, // ... the interval halfway through a badminton game was given
    midEnds: false, // ... done halfway through the last game
    num: 1, // pickleball server number
    sp: 0, // pickleball serving player
    side: 'R', // squash serving side
    s: {
      pts: [0, 0], // rallies won
      sp: [0, 0], // rallies on own serve
      sw: [0, 0], // ... won
      sg: [0, 0], // service games (tennis)
      held: [0, 0],
      bpc: [0, 0], // break points had
      bpw: [0, 0], // ... won
      tbw: [0, 0], // tie-breaks won
      best: [0, 0], // longest run of points
      run: [-1, 0]
    }
  }
  if (st.model === 'sideout') startSideoutGame(st)
  return st
}

function startSideoutGame(st) {
  // in doubles the side serving first has only one server: "0-0-2"
  st.num = st.doubles ? 2 : 1
  st.sp = st.doubles ? st.pos[st.srv] : 0
}

// Who serves the next rally: { team, player, side: 'R' | 'L' | null, ... }
function serverOf(st) {
  const P = st.P
  const n = st.p[0] + st.p[1]
  if (st.model === 'tennis') {
    const gameTeam = (st.first + st.gi + st.shift) % 2
    // tie-break: first point by the player whose turn it is, then two points each
    const team = st.tb && Math.floor((n + 1) / 2) % 2 === 1 ? 1 - gameTeam : gameTeam
    return turn(st, team, n === 0, n % 2 ? 'L' : 'R')
  }
  if (st.model === 'tt') {
    const per = P.to === 21 ? 5 : 2
    const before = 2 * (P.to - 1) // from 10-10 (20-20) the serve changes every point
    const gameTeam = (st.first + st.gi + st.shift) % 2
    const block = n < before ? Math.floor(n / per) : before / per + n - before
    const r = turn(st, (gameTeam + block) % 2, n === 0, null)
    r.serveNo = n < before ? (n % per) + 1 : 1
    r.serveOf = n < before ? per : 1
    return r
  }
  if (st.model === 'total') {
    const team = (st.first + Math.floor(n / TOTAL_SERVE_BLOCK) + st.shift) % 2
    return turn(st, team, n === 0, n % 2 ? 'L' : 'R')
  }
  if (st.model === 'squash') return { team: st.srv, player: 0, side: st.side }
  if (st.model === 'rally') {
    const team = st.srv
    const odd = st.p[team] % 2 === 1
    return { team, player: st.doubles ? (odd ? 1 - st.pos[team] : st.pos[team]) : 0, side: odd ? 'L' : 'R' }
  }
  return { team: st.srv, player: st.sp, side: st.sp === st.pos[st.srv] ? 'R' : 'L', num: st.num }
}

// A team's serve turns alternate its two players in doubles.
function turn(st, team, newGame, side) {
  const fresh = newGame || st.lastSrv !== team
  const k = fresh ? st.turns[team] : st.turns[team] - 1
  const player = st.doubles ? (st.pstart[team] + k + st.pshift[team]) % 2 : 0
  return { team, player, side, fresh }
}

function pointTo(st, w) {
  if (st.done) return
  const sv = serverOf(st)
  const before = Math.max(st.p[0], st.p[1])
  st.last = 'point'
  st.ends = false
  st.rest = 0
  count(st, sv.team, w)
  if (sv.fresh) st.turns[sv.team]++
  st.lastSrv = sv.team
  if (st.model === 'tennis') tennisPoint(st, sv.team, w)
  else if (st.model === 'total') totalPoint(st, w)
  else if (st.model === 'sideout') sideoutPoint(st, w)
  else rallyPoint(st, sv.team, w)
  changeEnds(st, before)
  restAfter(st, before)
}

// The rest the rules allow before the next rally, in seconds (ROAST item 16):
//   tennis, padel  120 between sets, 90 at a change of ends, none after the first game of a set or in a
//                  tie-break
//   table tennis   60 between games
//   badminton      120 between games, 60 when the leading side first reaches 11 (8 in games to 15, 6 in 11)
//   pickleball     120 between games
//   squash         90 between games
//   a round to a total: none
function restAfter(st, before) {
  if (st.done || st.model === 'total') return
  if (st.model === 'tennis') {
    if (st.last === 'set') st.rest = 120
    else if (st.last === 'game' && st.ends && st.g[0] + st.g[1] > 1) st.rest = 90
    return
  }
  if (st.last === 'game') {
    st.midRest = false
    st.rest = st.model === 'tt' ? 60 : st.model === 'squash' ? 90 : 120
    return
  }
  if (st.sport !== 'badminton' || st.midRest) return
  const half = Math.ceil(st.P.to / 2)
  if (before < half && Math.max(st.p[0], st.p[1]) >= half) {
    st.midRest = true
    st.rest = 60
  }
}

// Whether the players change ends now (ROAST item 14), by the rules of each sport:
//   tennis, padel  after every odd game of the match (a tie-break counts as one game), and every 6 points
//                  in a tie-break
//   table tennis, badminton, pickleball  after every game, and in the last possible game when a side first
//                  reaches half of the game (5 of 11 in table tennis, 11 of 21 in badminton, 6 of 11 in
//                  pickleball); a single pickleball game to 15 or 21 changes at 8 or 11
//   squash and a round to a total: no change of ends
function changeEnds(st, before) {
  if (st.done || st.model === 'squash' || st.model === 'total') return
  if (st.model === 'tennis') {
    if (st.last === 'game' || st.last === 'set') st.ends = st.gi % 2 === 1
    else if (st.tb) st.ends = (st.p[0] + st.p[1]) % 6 === 0
    return
  }
  if (st.last === 'game') {
    st.ends = true
    return
  }
  const P = st.P
  if (st.midEnds || st.won[0] !== P.win - 1 || st.won[1] !== P.win - 1) return
  if (P.win === 1 && P.to < 15) return
  const half = st.model === 'tt' ? (P.to === 21 ? 10 : 5) : Math.ceil(P.to / 2)
  if (before < half && Math.max(st.p[0], st.p[1]) >= half) {
    st.midEnds = true
    st.ends = true
  }
}

function count(st, server, w) {
  const s = st.s
  s.pts[w]++
  s.sp[server]++
  if (w === server) s.sw[server]++
  if (s.run[0] === w) s.run[1]++
  else s.run = [w, 1]
  if (s.run[1] > s.best[w]) s.best[w] = s.run[1]
}

// a: points of the team that just scored, b: the other team
function gameWon(a, b, adv) {
  return a >= 4 && (a - b >= 2 || (a - b === 1 && b >= 3 && b - 2 > adv))
}

function tennisPoint(st, sv, w) {
  const P = st.P
  const l = 1 - w
  if (!st.tb) {
    const r = 1 - sv
    if (gameWon(st.p[r] + 1, st.p[sv], P.adv)) {
      st.s.bpc[r]++
      if (w === r) st.s.bpw[r]++
    }
    st.p[w]++
    if (gameWon(st.p[w], st.p[l], P.adv)) {
      st.s.sg[sv]++
      if (w === sv) st.s.held[sv]++
      winGame(st, w)
    }
    return
  }
  st.p[w]++
  const to = st.tb === 'super' ? SUPER_TIEBREAK : P.tiebreak
  if (st.p[w] >= to && st.p[w] - st.p[l] >= 2) {
    st.s.tbw[w]++
    st.g[w]++
    winSet(st, w, st.p.slice())
  }
}

function winGame(st, w) {
  const P = st.P
  const l = 1 - w
  st.last = 'game'
  st.g[w]++
  st.p = [0, 0]
  st.gi++
  if (st.g[w] >= P.games && st.g[w] - st.g[l] >= 2) winSet(st, w, null)
  else if (P.tiebreak && st.g[w] === P.games && st.g[l] === P.games) st.tb = 'tb'
}

function winSet(st, w, tbPoints) {
  const P = st.P
  st.last = 'set'
  if (st.tb === 'super') st.sets.push({ s: tbPoints, sup: true })
  else if (tbPoints) st.sets.push({ s: st.g.slice(), tb: tbPoints })
  else st.sets.push({ s: st.g.slice() })
  st.won[w]++
  st.g = [0, 0]
  st.p = [0, 0]
  if (st.tb) st.gi++
  st.tb = null
  if (st.won[w] === P.sets) finish(st, w)
  else if (P.superTb && st.won[0] === P.sets - 1 && st.won[1] === P.sets - 1) st.tb = 'super'
}

function totalPoint(st, w) {
  st.p[w]++
  if (st.p[0] + st.p[1] < st.P.total) return
  st.sets.push({ s: st.p.slice() })
  const lead = st.p[0] - st.p[1]
  if (lead) {
    st.won[lead > 0 ? 0 : 1]++
    finish(st, lead > 0 ? 0 : 1)
  } else {
    st.done = true
    st.draw = true
    st.last = 'match'
  }
}

function rallyPoint(st, sv, w) {
  const P = st.P
  if (st.model === 'squash') {
    if (w === sv) st.side = st.side === 'R' ? 'L' : 'R'
    else {
      st.srv = w
      st.side = 'R'
    }
  } else if (st.model === 'rally') {
    // the serving pair swaps courts when it scores; the receivers never move
    if (w === sv) {
      if (st.doubles) st.pos[w] ^= 1
    } else st.srv = w
  }
  st.p[w]++
  // the first serve of your team, opponents having served first: the player you named serves it, from
  // the court the score gives
  if (st.pend === w && st.srv === w) {
    st.pos[w] = st.p[w] % 2 === 1 ? 1 - st.mine : st.mine
    st.pend = -1
  }
  if (st.model === 'tt') ttSwap(st, w)
  const a = st.p[w]
  const b = st.p[1 - w]
  if (a >= P.to && (a - b >= 2 || (P.cap && a >= P.cap))) winRallyGame(st, w)
}

// Table tennis doubles, the last possible game: when a pair first reaches 5 points (10 in games to 21) the
// receiving pair changes its order of receiving, so the next server of that pair changes (ROAST item 10)
function ttSwap(st, w) {
  const P = st.P
  if (!st.doubles || st.swapped) return
  if (st.won[0] !== P.win - 1 || st.won[1] !== P.win - 1) return
  const half = P.to === 21 ? 10 : 5
  if (st.p[w] !== half || st.p[1 - w] >= half) return
  st.swapped = true
  const next = serverOf(st)
  st.pshift[1 - next.team] ^= 1
}

function sideoutPoint(st, w) {
  if (w === st.srv) {
    st.p[w]++
    st.pos[w] ^= 1
    if (st.p[w] >= st.P.to && st.p[w] - st.p[1 - w] >= 2) winRallyGame(st, w)
  } else if (st.doubles && st.num === 1) {
    st.num = 2
    st.sp = 1 - st.sp
  } else {
    // side out: the new side starts with the player in the right court
    st.srv = w
    st.num = 1
    st.sp = st.doubles ? st.pos[w] : 0
  }
}

function winRallyGame(st, w) {
  const P = st.P
  st.last = 'game'
  st.sets.push({ s: st.p.slice() })
  st.won[w]++
  st.p = [0, 0]
  st.gi++
  if (st.won[w] === P.win) return finish(st, w)
  if (st.model === 'squash') {
    st.srv = w
    st.side = 'R'
  } else if (st.model === 'rally') {
    st.srv = P.nextFirst === 'winner' ? w : 1 - st.gf
    st.gf = st.srv
  } else if (st.model === 'sideout') {
    st.srv = 1 - st.gf
    st.gf = st.srv
    startSideoutGame(st)
  }
}

function finish(st, w) {
  st.done = true
  st.winner = w
  st.last = 'match'
}

function endNow(st, winner) {
  if (st.done) return
  st.done = true
  st.ended = true
  st.last = 'match'
  st.ends = false
  // a round stopped by the clock still has a winner
  if (st.model === 'total') {
    const lead = st.p[0] - st.p[1]
    if (lead) st.winner = lead > 0 ? 0 : 1
    else st.draw = true
  } else if (winner === 0 || winner === 1) st.winner = winner
}

// Server changed by hand: the next rally is served by `team` (and `player` in doubles); the order
// then continues from there by the rules.
function applyServer(st, team, player) {
  if (st.done) return
  st.last = null
  st.ends = false
  st.rest = 0
  const n = st.p[0] + st.p[1]
  if (st.model === 'tennis' || st.model === 'tt' || st.model === 'total') {
    if (serverOf(st).team !== team) st.shift ^= 1
    if (st.doubles && serverOf(st).player !== player) st.pshift[team] ^= 1
  } else if (st.model === 'squash') {
    if (st.srv !== team) {
      st.srv = team
      st.side = 'R'
    }
    if (n === 0) st.gf = team
  } else if (st.model === 'rally') {
    st.srv = team
    if (n === 0) st.gf = team
    if (st.doubles) st.pos[team] = st.p[team] % 2 === 1 ? 1 - player : player
    if (team === st.pend) st.pend = -1
  } else {
    const switched = st.srv !== team
    if (switched) st.num = 1
    st.srv = team
    if (n === 0) {
      st.gf = team
      if (st.doubles) st.pos[team] = player
      startSideoutGame(st)
      st.sp = st.doubles ? player : 0
    } else if (switched) {
      // like a side out: the side that now serves starts from the right court, with the player named
      // (the watch names the first player for the opponents) standing there (ROAST item 10)
      if (st.doubles) st.pos[team] = player
      st.sp = st.doubles ? player : 0
    } else st.sp = st.doubles ? player : 0
  }
}

function clone(st) {
  return JSON.parse(JSON.stringify(st))
}

// Label for the next rally: { key, team } with team 0, 1 or 2 (both)
//   match_point > set_point > golden_point / star_point > break_point > tiebreak / super_tiebreak
//   game_point for sports without sets; last_point for a round to a total
function labelOf(st) {
  if (st.done) return null
  if (st.model === 'total') return st.P.total - st.p[0] - st.p[1] === 1 ? { key: 'last_point', team: 2 } : null
  const lv = [0, 1].map((t) => {
    const c = clone(st)
    pointTo(c, t)
    return c.last
  })
  const who = (k) => (lv[0] === k && lv[1] === k ? 2 : lv[0] === k ? 0 : lv[1] === k ? 1 : -1)
  let t = who('match')
  if (t >= 0) return { key: 'match_point', team: t }
  if (st.model !== 'tennis') {
    t = who('game')
    return t >= 0 ? { key: 'game_point', team: t } : null
  }
  t = who('set')
  if (t >= 0) return { key: 'set_point', team: t }
  if (st.tb) return { key: st.tb === 'super' ? 'super_tiebreak' : 'tiebreak', team: 2 }
  if (who('game') === 2) return { key: st.P.deuce === 'star' ? 'star_point' : 'golden_point', team: 2 }
  const r = 1 - serverOf(st).team
  return lv[r] === 'game' ? { key: 'break_point', team: r } : null
}

// golden or star point: the next rally decides the game
function decisive(st) {
  const [a, b] = st.p
  return !st.done && st.model === 'tennis' && !st.tb && a === b && a >= 3 && a - 2 > st.P.adv
}

function shownPoints(st) {
  const [a, b] = st.p
  if (st.model !== 'tennis' || st.tb) return [String(a), String(b)]
  if (a >= 3 && b >= 3) {
    if (a === b) return ['40', '40']
    return a > b ? ['AD', '40'] : ['40', 'AD']
  }
  return [TENNIS_POINTS[a], TENNIS_POINTS[b]]
}

// Everything the screens need, from the events.
export function view(m) {
  const st = replay(m)
  const sv = st.done ? null : serverOf(st)
  const s = st.s
  return {
    sport: m.sport,
    model: st.model,
    doubles: st.doubles,
    done: st.done,
    winner: st.winner,
    draw: st.draw,
    ended: st.ended,
    sets: st.sets,
    won: st.won,
    games: st.model === 'tennis' ? st.g : null,
    points: st.p,
    shown: shownPoints(st),
    tb: st.tb,
    server: sv ? sv.team : null,
    player: sv ? sv.player : null,
    side: sv ? sv.side : null,
    serveNo: sv && sv.serveNo ? sv.serveNo : null,
    serveOf: sv && sv.serveOf ? sv.serveOf : null,
    call: sv && st.model === 'sideout' ? callOf(st, sv) : null,
    left: st.model === 'total' ? st.P.total - st.p[0] - st.p[1] : null,
    label: labelOf(st),
    changeEnds: !!st.ends && !st.done,
    rest: st.done ? 0 : st.rest,
    decisive: decisive(st),
    last: st.last,
    rallies: s.pts[0] + s.pts[1],
    stats: {
      points: s.pts,
      servePoints: s.sp,
      serveWon: s.sw,
      returnWon: [s.sp[1] - s.sw[1], s.sp[0] - s.sw[0]],
      serviceGames: st.model === 'tennis' ? s.sg : null,
      held: st.model === 'tennis' ? s.held : null,
      breakPoints: st.model === 'tennis' ? s.bpc : null,
      breaks: st.model === 'tennis' ? s.bpw : null,
      tiebreaks: st.model === 'tennis' ? s.tbw : null,
      streak: s.best
    }
  }
}

// pickleball score call: server's score, receiver's score and (doubles) server number
function callOf(st, sv) {
  const own = st.p[sv.team]
  const other = st.p[1 - sv.team]
  return st.doubles ? `${own}-${other}-${sv.num}` : `${own}-${other}`
}

function setText(set) {
  const [a, b] = set.s
  if (set.sup) return `[${a}-${b}]`
  if (set.tb) return `${a}-${b}(${Math.min(set.tb[0], set.tb[1])})`
  return `${a}-${b}`
}

// Score from team 0's side, e.g. "6-4 6-7(5) [10-8]", "11-7 9-11 11-5", "13-11"; a match that is
// still going or was ended by hand also shows the unfinished set or game.
export function scoreText(v) {
  const parts = v.sets.map(setText)
  if (!v.done || v.ended) {
    if (v.tb === 'super' && (v.points[0] || v.points[1])) parts.push(`[${v.points[0]}-${v.points[1]}]`)
    else if (v.games && (v.games[0] || v.games[1])) parts.push(`${v.games[0]}-${v.games[1]}`)
    else if (!v.games && (v.points[0] || v.points[1])) parts.push(`${v.points[0]}-${v.points[1]}`)
  }
  return parts.join(' ')
}
