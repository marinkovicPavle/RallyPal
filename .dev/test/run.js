// Scoring tests (no watch needed): npm test
import assert from 'node:assert/strict'
import {
  SPORTS, OPTIONS, DOUBLES, defaultRules, sanitizeRules, sanitizeDoubles, isOfficial, paramsOf, modelOf
} from '../../shared/rules'
import { newMatch, addPoint, setServer, endMatch, undo, view, scoreText, duration, flow, pointPreview, flowMarks, idle } from '../../shared/match'
import { LANGS, langOfZepp, setLang, t } from '../../shared/i18n'
import { TEXT } from '../../setting/text'
import { DEFAULT_SETUPS, MAX_SETUPS, defaults, sanitize, sanitizeSetups, findSetup } from '../../shared/schema'
import { normalize, setValue, merge } from '../../shared/settings'
import { setupTitle, fittedTitle, setupExtra, matchNames, teamName, partnerName } from '../../shared/setups'
import { addHr, mergeHr, hrStats, makeRecord, matchOf, wonCount, restoreFrom, RESTORE_AGAIN_MS } from '../../shared/record'
import { trialOf, canEdit, counts, playable, trialLine, FREE_MATCHES, MIN_MATCH_SEC } from '../../shared/licence'
import { devHash, matchHash } from '../../shared/trialhash'
import { hrMaxOf, zoneOf, zonesFromCurve, zonePercents, records, newRecords } from '../../shared/insights'
import { createLicence } from '../../app-side/licence'
import { cardView, lastLine } from '../../shared/card'
import { clock, hm, prettyScore, dayLabel, percent, resultOf } from '../../shared/format'
import { keyRows, detailRows, resultLine } from '../../shared/stats'
import { createCore, errorStatus } from '../../app-side/core'
import { title, description, tcx, sameMatch, duplicateOf, multipart, SPORT_TYPE } from '../../shared/integrations'

let passed = 0
const pending = []
function test(name, fn) {
  try {
    const r = fn()
    if (r && r.then) {
      pending.push(
        r.then(
          () => passed++,
          (e) => {
            console.error('FAIL', name)
            throw e
          }
        )
      )
    } else passed++
  } catch (e) {
    console.error('FAIL', name)
    throw e
  }
}

const T0 = new Date(2026, 9, 20, 18, 0, 0).getTime()
let tick = 0

function mk(sport, rules, o = {}) {
  return newMatch({ id: 'x', sport, rules, doubles: o.doubles }, { first: o.first || 0, mine: o.mine || 0 }, T0)
}

// '0' = point to team 0 (you), '1' = point to team 1; returns what the last point did
function play(m, seq) {
  let last = null
  for (const ch of seq) last = addPoint(m, ch === '1' ? 1 : 0, T0 + ++tick * 1000)
  return last
}

const rep = (s, n) => s.repeat(n)
// tennis: games in a row where the server holds to love, starting with team `first`
function holds(n, first = 0) {
  let s = ''
  for (let i = 0; i < n; i++) s += rep(String((first + i) % 2), 4)
  return s
}
const lab = (v) => (v.label ? `${v.label.key}:${v.label.team}` : null)
const srv = (v) => `${v.server}${v.player}${v.side || '-'}`

// ---------------------------------------------------------------- rules

test('rules: defaults are the official rules', () => {
  assert.deepEqual(defaultRules('tennis'), { sets: 2, games: 6, deuce: 'ad', tiebreak: 7, finalSet: 'set' })
  assert.equal(defaultRules('padel').deuce, 'star')
  assert.equal(defaultRules('padel').format, 'match')
  assert.deepEqual(defaultRules('pickleball'), { to: 11, scoring: 'sideout', games: 1 })
  assert.deepEqual(defaultRules('tabletennis'), { to: 11, games: 3 })
  assert.deepEqual(defaultRules('squash'), { to: 11, games: 3 })
  assert.deepEqual(defaultRules('badminton'), { to: 21, games: 2 })
  assert.equal(SPORTS.length, 6)
})

test('rules: sanitize keeps valid values, also as strings, and falls back to official', () => {
  const r = sanitizeRules('tennis', { sets: '3', deuce: 'x', tiebreak: 0, games: 5 })
  assert.deepEqual(r, { sets: 3, games: 6, deuce: 'ad', tiebreak: 0, finalSet: 'set' })
  assert.deepEqual(sanitizeRules('squash', null), defaultRules('squash'))
  assert.equal(isOfficial('tennis', {}), true)
  assert.equal(isOfficial('tennis', { deuce: 'noad' }), false)
  assert.equal(isOfficial('padel', { deuce: 'star' }), true)
})

test('rules: singles and doubles per sport', () => {
  assert.equal(sanitizeDoubles('padel', false), true)
  assert.equal(sanitizeDoubles('squash', true), false)
  assert.equal(sanitizeDoubles('pickleball', undefined), false)
  assert.equal(sanitizeDoubles('pickleball', true), true)
  assert.equal(newMatch({ sport: 'pickleball' }, {}, T0).doubles, false)
  assert.equal(newMatch({ sport: 'padel', doubles: false }, {}, T0).doubles, true)
  assert.equal(newMatch({ sport: 'tennis', doubles: false }, { mine: 1 }, T0).mine, 0)
})

test('rules: models and parameters', () => {
  assert.equal(modelOf('tennis', {}), 'tennis')
  assert.equal(modelOf('padel', { format: 'total' }), 'total')
  assert.equal(modelOf('pickleball', {}), 'sideout')
  assert.equal(modelOf('pickleball', { scoring: 'rally' }), 'rally')
  assert.equal(modelOf('tabletennis', {}), 'tt')
  assert.equal(modelOf('squash', {}), 'squash')
  assert.equal(modelOf('badminton', {}), 'rally')
  assert.equal(paramsOf('badminton', { to: '15' }).cap, 21)
  assert.equal(paramsOf('badminton', { to: 11 }).cap, 15)
  assert.equal(paramsOf('tennis', { sets: 1, finalSet: 'super' }).superTb, false)
  assert.equal(paramsOf('tennis', { finalSet: 'super' }).superTb, true)
  assert.equal(paramsOf('nope', {}).model, 'tennis')
})

// ---------------------------------------------------------------- tennis and padel

test('tennis: love match, scores and what each point did', () => {
  const m = mk('tennis')
  assert.equal(play(m, '0'), 'point')
  assert.deepEqual(view(m).shown, ['15', '0'])
  assert.equal(play(m, '000'), 'game')
  assert.equal(play(m, rep('0', 20)), 'set')
  assert.equal(play(m, rep('0', 23)), 'point')
  assert.equal(play(m, '0'), 'match')
  const v = view(m)
  assert.equal(v.done, true)
  assert.equal(v.winner, 0)
  assert.equal(scoreText(v), '6-0 6-0')
  assert.deepEqual(v.won, [2, 0])
  assert.equal(v.server, null)
  assert.deepEqual(v.stats.serviceGames, [6, 6])
  assert.deepEqual(v.stats.held, [6, 0])
  assert.deepEqual(v.stats.breaks, [6, 0])
  assert.deepEqual(v.stats.streak, [48, 0])
  assert.equal(play(m, '1'), null, 'no points after the end')
  assert.equal(view(m).rallies, 48)
})

test('tennis: advantage, deuce and break point', () => {
  const m = mk('tennis')
  play(m, '000111')
  let v = view(m)
  assert.deepEqual(v.shown, ['40', '40'])
  assert.equal(v.label, null)
  play(m, '0')
  assert.deepEqual(view(m).shown, ['AD', '40'])
  assert.equal(view(m).label, null, 'game point on own serve has no label')
  play(m, '11')
  v = view(m)
  assert.deepEqual(v.shown, ['40', 'AD'])
  assert.equal(lab(v), 'break_point:1')
  play(m, '1')
  v = view(m)
  assert.deepEqual(v.games, [0, 1])
  assert.equal(v.server, 1)
  assert.deepEqual(v.stats.breakPoints, [0, 1])
  assert.deepEqual(v.stats.breaks, [0, 1])
  assert.deepEqual(v.stats.held, [0, 0])
})

test('tennis: no-ad golden point decides at 40-40', () => {
  const m = mk('tennis', { deuce: 'noad' })
  play(m, '000111')
  assert.equal(lab(view(m)), 'golden_point:2')
  play(m, '1')
  assert.deepEqual(view(m).games, [0, 1])
})

test('tennis: a deciding point that is also match point', () => {
  const m = mk('tennis', { sets: 1, deuce: 'noad' })
  play(m, '1111' + holds(8, 1) + '111000')
  const v = view(m)
  assert.deepEqual(v.games, [4, 5])
  assert.equal(v.server, 1)
  assert.equal(v.decisive, true)
  assert.equal(lab(v), 'match_point:1')
  play(m, '0')
  assert.deepEqual(view(m).games, [5, 5])
  assert.equal(view(m).decisive, false)
})

test('padel: star point after two advantages', () => {
  const m = mk('padel')
  play(m, '000111')
  assert.equal(view(m).label, null, 'first deuce plays an advantage')
  play(m, '01')
  assert.deepEqual(view(m).shown, ['40', '40'])
  assert.equal(view(m).label, null, 'second deuce plays an advantage')
  play(m, '1')
  assert.equal(lab(view(m)), 'break_point:1')
  play(m, '0')
  assert.equal(lab(view(m)), 'star_point:2', 'third deuce: one point decides')
  play(m, '0')
  assert.deepEqual(view(m).games, [1, 0])
})

test('padel: plain advantage can go on and on', () => {
  const m = mk('padel', { deuce: 'ad' })
  play(m, '000111' + rep('01', 30))
  assert.deepEqual(view(m).games, [0, 0])
  play(m, '00')
  assert.deepEqual(view(m).games, [1, 0])
})

test('tennis: tie-break at 6-6, its serve order and the next set', () => {
  const m = mk('tennis')
  play(m, holds(12))
  let v = view(m)
  assert.deepEqual(v.games, [6, 6])
  assert.equal(v.tb, 'tb')
  assert.equal(lab(v), 'tiebreak:2')
  const servers = []
  for (let i = 0; i < 7; i++) {
    const x = view(m)
    servers.push(x.server + x.side)
    play(m, '0')
  }
  // first point from the right by the player whose turn it is, then two points each
  assert.deepEqual(servers, ['0R', '1L', '1R', '0L', '0R', '1L', '1R'])
  v = view(m)
  assert.deepEqual(v.sets, [{ s: [7, 6], tb: [7, 0] }])
  assert.equal(scoreText(v), '7-6(0)')
  assert.equal(v.server, 1, 'the side that received first in the tie-break serves the next set')
  assert.deepEqual(v.stats.tiebreaks, [1, 0])
})

test('tennis: set point and match point', () => {
  const m = mk('tennis')
  play(m, rep('0', 20))
  assert.deepEqual(view(m).games, [5, 0])
  play(m, '000')
  assert.equal(lab(view(m)), 'set_point:0')
  play(m, '0' + rep('0', 20) + '000')
  assert.equal(lab(view(m)), 'match_point:0')
})

test('tennis: tie-break to 7 needs two clear points', () => {
  const m = mk('tennis')
  play(m, holds(12) + rep('01', 6))
  let v = view(m)
  assert.deepEqual(v.points, [6, 6])
  assert.equal(lab(v), 'tiebreak:2')
  play(m, '0')
  assert.equal(lab(view(m)), 'set_point:0')
  play(m, '10')
  assert.equal(lab(view(m)), 'set_point:0')
  play(m, '0')
  v = view(m)
  assert.deepEqual(v.sets[0], { s: [7, 6], tb: [9, 7] })
  assert.equal(scoreText(v), '7-6(7)')
})

test('tennis: tie-break to 10', () => {
  const m = mk('tennis', { tiebreak: 10 })
  play(m, holds(12) + rep('0', 9))
  assert.equal(view(m).tb, 'tb')
  play(m, '0')
  assert.deepEqual(view(m).sets[0], { s: [7, 6], tb: [10, 0] })
})

test('tennis: super tie-break instead of a third set', () => {
  const m = mk('tennis', { finalSet: 'super' })
  play(m, rep('0', 24) + rep('1', 24))
  let v = view(m)
  assert.equal(v.tb, 'super')
  assert.equal(lab(v), 'super_tiebreak:2')
  play(m, rep('1', 8) + rep('0', 8) + '0')
  assert.equal(lab(view(m)), 'match_point:0')
  assert.equal(scoreText(view(m)), '6-0 0-6 [9-8]')
  assert.equal(play(m, '0'), 'match')
  v = view(m)
  assert.equal(v.winner, 0)
  assert.equal(scoreText(v), '6-0 0-6 [10-8]')
})

test('tennis: one set only never plays a super tie-break', () => {
  const m = mk('tennis', { sets: 1, finalSet: 'super' })
  assert.equal(play(m, rep('1', 24)), 'match')
  assert.equal(view(m).winner, 1)
})

test('tennis: best of five', () => {
  const m = mk('tennis', { sets: 3 })
  play(m, rep('0', 24) + rep('1', 48))
  assert.equal(view(m).done, false)
  play(m, rep('0', 48))
  assert.equal(scoreText(view(m)), '6-0 0-6 0-6 6-0 6-0')
})

test('tennis: short sets to 4 with a tie-break at 4-4', () => {
  const m = mk('tennis', { games: 4 })
  play(m, holds(8))
  assert.equal(view(m).tb, 'tb')
  play(m, rep('1', 7))
  assert.deepEqual(view(m).sets[0], { s: [4, 5], tb: [0, 7] })
  const m2 = mk('tennis', { games: 4 })
  play(m2, rep('0', 16))
  assert.deepEqual(view(m2).sets[0], { s: [4, 0] })
})

test('tennis: no tie-break, the set goes on until two games clear', () => {
  const m = mk('tennis', { tiebreak: 0 })
  play(m, holds(12))
  let v = view(m)
  assert.equal(v.tb, null)
  assert.deepEqual(v.games, [6, 6])
  play(m, holds(2))
  assert.deepEqual(view(m).games, [7, 7])
  play(m, rep('0', 8))
  v = view(m)
  assert.deepEqual(v.sets[0], { s: [9, 7] })
})

test('tennis: server alternates by game and side by point', () => {
  const m = mk('tennis', {}, { first: 1 })
  assert.equal(srv(view(m)), '10R')
  play(m, '0')
  assert.equal(srv(view(m)), '10L')
  play(m, '000')
  assert.equal(srv(view(m)), '00R')
})

test('tennis doubles: the players of each pair take turns', () => {
  const m = mk('tennis', {}, { doubles: true, first: 0, mine: 1 })
  const seen = []
  for (let g = 0; g < 6; g++) {
    seen.push(srv(view(m)))
    play(m, '0000')
  }
  assert.deepEqual(seen, ['01R', '10R', '00R', '11R', '01R', '10R'])
})

test('tennis doubles: player order continues through the tie-break', () => {
  const m = mk('tennis', {}, { doubles: true })
  play(m, holds(12))
  // 13th game: each pair's 7th turn -> its first player again (0,1,0,1,0,1,0)
  assert.equal(srv(view(m)), '00R')
  play(m, '0')
  assert.equal(srv(view(m)), '10L')
  play(m, '00')
  assert.equal(srv(view(m)), '01L')
})

test('server changed by hand and undone', () => {
  const m = mk('tennis')
  assert.equal(setServer(m, 1, 0, T0 + 1000), true)
  assert.equal(view(m).server, 1)
  play(m, '1111')
  assert.equal(view(m).server, 0)
  assert.deepEqual(view(m).stats.held, [0, 1])
  const d = mk('tennis', {}, { doubles: true })
  setServer(d, 0, 1, T0)
  assert.equal(srv(view(d)), '01R')
  play(d, holds(2))
  assert.equal(srv(view(d)), '00R')
  const u = mk('tennis')
  setServer(u, 1, 0, T0)
  undo(u)
  assert.equal(view(u).server, 0)
  assert.equal(u.ev.length, 0)
})

// ---------------------------------------------------------------- padel rounds (Americano, Mexicano)

test('round to 24: every point counts, serve every 4 points, a draw is possible', () => {
  const m = mk('padel', { format: 'total' }, { first: 0, mine: 1 })
  const seen = []
  for (let i = 0; i < 12; i++) {
    const v = view(m)
    if (i % 4 === 0) seen.push(srv(v))
    play(m, String(i % 2))
  }
  // blocks of four: team 0 (partner first), team 1, team 0 (you)
  assert.deepEqual(seen, ['01R', '10R', '00R'])
  play(m, rep('01', 5) + '0')
  let v = view(m)
  assert.equal(v.left, 1)
  assert.equal(lab(v), 'last_point:2')
  assert.equal(play(m, '1'), 'match')
  v = view(m)
  assert.equal(v.done, true)
  assert.equal(v.draw, true)
  assert.equal(v.winner, null)
  assert.equal(scoreText(v), '12-12')
})

test('round to 21 has a winner, rounds of 16 and 32', () => {
  const m = mk('padel', { format: 'total', total: 21 })
  play(m, rep('0', 13) + rep('1', 8))
  assert.equal(view(m).winner, 0)
  assert.equal(scoreText(view(m)), '13-8')
  const s = mk('padel', { format: 'total', total: 16 })
  play(s, rep('1', 16))
  assert.equal(view(s).winner, 1)
  const l = mk('padel', { format: 'total', total: 32 })
  play(l, rep('1', 31))
  assert.equal(view(l).done, false)
})

test('round stopped by hand keeps the leader as winner', () => {
  const m = mk('padel', { format: 'total' })
  play(m, '0001')
  endMatch(m, T0 + 600000)
  const v = view(m)
  assert.equal(v.ended, true)
  assert.equal(v.winner, 0)
  assert.equal(scoreText(v), '3-1')
})

// ---------------------------------------------------------------- table tennis

test('table tennis: serve every 2 points, every point from 10-10, next game swaps', () => {
  const m = mk('tabletennis')
  const order = []
  for (let i = 0; i < 6; i++) {
    const v = view(m)
    order.push(`${v.server}${v.serveNo}/${v.serveOf}`)
    play(m, '0')
  }
  assert.deepEqual(order, ['01/2', '02/2', '11/2', '12/2', '01/2', '02/2'])
  const d = mk('tabletennis')
  play(d, rep('01', 10))
  let v = view(d)
  assert.deepEqual(v.points, [10, 10])
  assert.equal(`${v.server}${v.serveOf}`, '01')
  play(d, '0')
  v = view(d)
  assert.equal(v.server, 1)
  assert.equal(lab(v), 'game_point:0')
  play(d, '0')
  v = view(d)
  assert.deepEqual(v.sets[0], { s: [12, 10] })
  assert.equal(v.server, 1, 'who received first serves first in the next game')
  assert.equal(v.side, null)
})

test('table tennis: best of five to 11, match point, best of three and seven', () => {
  const m = mk('tabletennis')
  play(m, rep('0', 22) + rep('0', 10))
  assert.equal(lab(view(m)), 'match_point:0')
  play(m, '0')
  assert.equal(scoreText(view(m)), '11-0 11-0 11-0')
  const b3 = mk('tabletennis', { games: 2 })
  play(b3, rep('1', 22))
  assert.equal(view(b3).winner, 1)
  const b7 = mk('tabletennis', { games: 4 })
  play(b7, rep('1', 33))
  assert.equal(view(b7).done, false)
})

test('table tennis to 21: serve every 5', () => {
  const m = mk('tabletennis', { to: 21 })
  play(m, '000')
  let v = view(m)
  assert.equal(`${v.server}${v.serveNo}/${v.serveOf}`, '04/5')
  play(m, '00')
  assert.equal(view(m).server, 1)
  const d = mk('tabletennis', { to: 21 })
  play(d, rep('01', 20))
  v = view(d)
  assert.equal(`${v.server}${v.serveOf}`, '01')
})

// ---------------------------------------------------------------- squash

test('squash: winner serves, side changes on every point kept, hand-out serves from the right', () => {
  const m = mk('squash')
  const seen = [srv(view(m))]
  for (const ch of '00110') {
    play(m, ch)
    seen.push(srv(view(m)))
  }
  assert.deepEqual(seen, ['00R', '00L', '00R', '10R', '10L', '00R'])
  const g = mk('squash')
  play(g, rep('01', 10) + '0')
  assert.equal(view(g).done, false)
  play(g, '0')
  const v = view(g)
  assert.deepEqual(v.sets[0], { s: [12, 10] })
  assert.equal(srv(v), '00R', 'winner of the game serves first')
  const p15 = mk('squash', { to: 15, games: 2 })
  play(p15, rep('1', 30))
  assert.equal(scoreText(view(p15)), '0-15 0-15')
})

// ---------------------------------------------------------------- badminton

test('badminton singles: side by the server score, cap at 30', () => {
  const m = mk('badminton')
  assert.equal(srv(view(m)), '00R')
  play(m, '0')
  assert.equal(srv(view(m)), '00L')
  play(m, '1')
  assert.equal(srv(view(m)), '10L')
  const c = mk('badminton')
  play(c, rep('01', 29))
  assert.equal(lab(view(c)), 'game_point:2')
  play(c, '1')
  assert.deepEqual(view(c).sets[0], { s: [29, 30] })
  assert.equal(view(c).server, 1)
})

test('badminton: games to 15 (cap 21) and 11 (cap 15)', () => {
  const m = mk('badminton', { to: 15 })
  play(m, rep('01', 20) + '0')
  assert.deepEqual(view(m).sets[0], { s: [21, 20] })
  const e = mk('badminton', { to: 11 })
  play(e, rep('10', 14) + '1')
  assert.deepEqual(view(e).sets[0], { s: [14, 15] })
})

test('badminton doubles: who serves from which court (BWF example)', () => {
  // A (you) and B vs C and D; A serves first to C
  const m = mk('badminton', {}, { doubles: true })
  const seen = [srv(view(m))]
  for (const ch of '01011001') {
    play(m, ch)
    seen.push(srv(view(m)))
  }
  assert.deepEqual(seen, ['00R', '00L', '11L', '01R', '10R', '10L', '00L', '00R', '11R'])
})

// ---------------------------------------------------------------- pickleball

test('pickleball doubles: 0-0-2 start, second server and side out', () => {
  const m = mk('pickleball', {}, { doubles: true })
  const seen = [`${view(m).call} ${srv(view(m))}`]
  for (const ch of '01010') {
    play(m, ch)
    const v = view(m)
    seen.push(`${v.call} ${srv(v)}`)
  }
  assert.deepEqual(seen, ['0-0-2 00R', '1-0-2 00L', '0-1-1 10R', '0-1-2 11L', '1-1-2 11R', '1-1-1 01R'])
  assert.deepEqual(view(m).points, [1, 1])
})

test('pickleball singles: only the server scores, side by own score', () => {
  const m = mk('pickleball', {}, { doubles: false })
  assert.equal(`${view(m).call} ${srv(view(m))}`, '0-0 00R')
  play(m, '0')
  assert.equal(`${view(m).call} ${srv(view(m))}`, '1-0 00L')
  play(m, '1')
  assert.equal(`${view(m).call} ${srv(view(m))}`, '0-1 10R')
  assert.deepEqual(view(m).points, [1, 0])
  const g = mk('pickleball')
  play(g, rep('0', 10))
  assert.equal(lab(view(g)), 'match_point:0')
  play(g, '1')
  assert.equal(view(g).label, null, 'no game point for the side that is not serving')
  play(g, '1')
  assert.deepEqual(view(g).points, [10, 1])
})

test('pickleball: to 15 and 21, best of three, first serve swaps each game', () => {
  const m = mk('pickleball', { to: 15, games: 2 })
  play(m, rep('0', 15))
  const v = view(m)
  assert.deepEqual(v.sets[0], { s: [15, 0] })
  assert.equal(v.server, 1)
  assert.equal(v.done, false)
  const t = mk('pickleball', { to: 21 })
  play(t, rep('0', 21))
  assert.equal(view(t).done, true)
})

test('pickleball rally scoring: every rally scores', () => {
  const m = mk('pickleball', { scoring: 'rally' }, { doubles: true })
  play(m, '1')
  let v = view(m)
  assert.deepEqual(v.points, [0, 1])
  assert.equal(srv(v), '11L', 'odd score: the player in the left court serves')
  assert.equal(v.call, null)
  play(m, rep('1', 10))
  v = view(m)
  assert.equal(v.done, true)
  assert.equal(scoreText(v), '0-11')
})

test('point preview: what the next point gives each side, per sport', () => {
  const both = (m) => `${pointPreview(m, 1)}|${pointPreview(m, 0)}`
  const tn = mk('tennis')
  const seen = [both(tn)]
  for (const ch of '0011101') {
    play(tn, ch)
    seen.push(both(tn))
  }
  // (you-them) 0-0, 15-0, 30-0, 30-15, 30-30, 30-40, 40-40, 40-AD; written them|you
  assert.deepEqual(seen, ['15|15', '15|30', '15|40', '30|40', '40|40', 'game|40', 'AD|AD', 'game|40'])
  const na = mk('tennis', { deuce: 'noad' })
  play(na, '010101')
  assert.equal(both(na), 'game|game', 'no-ad: the point at 40-40 wins the game')
  const tb = mk('tennis')
  play(tb, holds(12))
  assert.equal(both(tb), '1|1', 'a tie-break counts 1, 2, 3')
  play(tb, '011')
  assert.equal(both(tb), '3|2')
  const tt = mk('tabletennis')
  play(tt, rep('0', 10))
  assert.equal(both(tt), '1|11')
  const pb = mk('pickleball', {}, { doubles: true })
  assert.equal(both(pb), 'serve|1', 'the side receiving only wins the serve')
  play(pb, '0')
  assert.equal(both(pb), 'serve|2')
  play(pb, '1')
  assert.equal(both(pb), '1|', 'side out to their first server: winning it only passes the serve to the partner')
  play(pb, '0')
  assert.equal(both(pb), '1|serve')
  const rally = mk('pickleball', { scoring: 'rally' })
  assert.equal(both(rally), '1|1')
  const am = mk('padel', { format: 'total' })
  play(am, '0011')
  assert.equal(both(am), '3|3')
  const done = mk('tennis', { sets: 1 })
  play(done, holds(6).replace(/1/g, '0'))
  assert.equal(pointPreview(done, 0), null, 'nothing after the match')
})

// ---------------------------------------------------------------- undo, ending, time

test('undo goes back one event at a time, also after the match is over', () => {
  const m = mk('tennis', { sets: 1 })
  const before = JSON.stringify(view(m))
  play(m, rep('1', 24))
  assert.equal(view(m).done, true)
  undo(m)
  assert.equal(view(m).done, false)
  assert.equal(lab(view(m)), 'match_point:1')
  while (undo(m));
  assert.equal(JSON.stringify(view(m)), before)
  assert.equal(undo(m), false)
})

test('match ended by hand', () => {
  const m = mk('tennis')
  play(m, rep('0', 9))
  assert.equal(endMatch(m, T0 + 1800000), true)
  let v = view(m)
  assert.equal(v.done, true)
  assert.equal(v.ended, true)
  assert.equal(v.winner, null)
  assert.equal(scoreText(v), '2-0')
  assert.equal(addPoint(m, 0, T0), null)
  assert.equal(endMatch(m, T0), false)
  undo(m)
  v = view(m)
  assert.equal(v.done, false)
  assert.deepEqual(v.shown, ['15', '0'])
})

test('time, duration and flow', () => {
  const m = newMatch({ sport: 'squash' }, { first: 0 }, T0)
  addPoint(m, 0, T0 + 30000)
  addPoint(m, 1, T0 + 75400)
  assert.deepEqual(m.ev, [['p', 0, 30], ['p', 1, 75]])
  assert.equal(duration(m, T0 + 100000, false), 100)
  assert.equal(duration(m, T0 + 100000, true), 75)
  assert.deepEqual(flow(m), [0, 1])
  assert.equal(m.id, 'm' + T0)
})

test('statistics: serve and return points', () => {
  const m = mk('tennis')
  play(m, '0101' + '00') // game 0 (you serve): 4-2 ... to you
  const v = view(m)
  assert.deepEqual(v.stats.points, [4, 2])
  assert.deepEqual(v.stats.servePoints, [6, 0])
  assert.deepEqual(v.stats.serveWon, [4, 0])
  assert.deepEqual(v.stats.returnWon, [0, 2])
})

// ---------------------------------------------------------------- random matches

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function* combos(options) {
  const keys = Object.keys(options)
  const idx = keys.map(() => 0)
  while (true) {
    const r = {}
    keys.forEach((k, i) => (r[k] = options[k][idx[i]]))
    yield r
    let i = 0
    while (i < keys.length && ++idx[i] === options[keys[i]].length) idx[i++] = 0
    if (i === keys.length) return
  }
}

const LABELS = new Set([
  'match_point', 'set_point', 'game_point', 'golden_point', 'star_point', 'break_point', 'tiebreak', 'super_tiebreak', 'last_point'
])

const seen = new Set()

function validSet(P, model, set) {
  const [a, b] = set.s
  const w = Math.max(a, b)
  const l = Math.min(a, b)
  if (model === 'tennis') {
    if (set.sup) return w >= 10 && w - l >= 2 && (w === 10 || w - l === 2)
    if (set.tb) {
      const tw = Math.max(...set.tb)
      const tl = Math.min(...set.tb)
      return w === P.games + 1 && l === P.games && tw >= P.tiebreak && tw - tl >= 2 && (tw === P.tiebreak || tw - tl === 2)
    }
    if (w < P.games || w - l < 2) return false
    return P.tiebreak ? w <= P.games + 1 : w === P.games || w - l === 2
  }
  if (model === 'total') return a + b === P.total
  if (P.cap && w === P.cap) return w - l >= 1
  return w >= P.to && w - l >= 2 && (w === P.to || w - l === 2)
}

// Plays one random match and checks every step against simple rules that do not use the engine's
// own serve or label code.
function randomMatch(sport, rules, doubles, r, opts) {
  const P = paramsOf(sport, rules)
  const m = newMatch({ sport, rules, doubles }, { first: r() < 0.5 ? 1 : 0, mine: r() < 0.5 ? 1 : 0 }, T0)
  const bias = 0.3 + r() * 0.4
  let v = view(m)
  const firstView = JSON.stringify(v)
  const lastTurn = [null, null] // player of each team's last serve turn (doubles)
  lastTurn[v.server] = v.player
  let gameServer = null // tennis: server of the previous game
  let gameFirst = null // pickleball rally: first server of the current game
  let manual = false
  let steps = 0
  while (!v.done) {
    assert.ok(++steps < 4000, `${sport} ${JSON.stringify(rules)} does not end`)
    assert.ok(v.server === 0 || v.server === 1)
    assert.ok(v.player === 0 || v.player === 1)
    if (!doubles) assert.equal(v.player, 0)
    assert.equal(v.side === null, P.model === 'tt')
    if (v.label) {
      assert.ok(LABELS.has(v.label.key) && [0, 1, 2].includes(v.label.team), JSON.stringify(v.label))
      seen.add(v.label.key)
    }
    if (opts.override && r() < 0.01) {
      const team = r() < 0.5 ? 1 : 0
      const player = doubles && r() < 0.5 ? 1 : 0
      setServer(m, team, player, T0)
      v = view(m)
      assert.equal(v.server, team)
      if (doubles) assert.equal(v.player, player)
      manual = true
      continue
    }
    const n = v.points[0] + v.points[1]
    const newGame = n === 0
    if (!manual && newGame) {
      // a tie-break counts as one game in the order
      if (P.model === 'tennis' && gameServer !== null) assert.equal(v.server, 1 - gameServer, 'games alternate')
      if (P.model === 'tennis') gameServer = v.server
      if (P.model === 'rally' && P.nextFirst === 'alternate' && gameFirst !== null) assert.equal(v.server, 1 - gameFirst)
      if (P.model === 'rally') gameFirst = v.server
    }
    if (!manual && P.model === 'total') assert.equal(v.server, (m.first + Math.floor(n / 4)) % 2)
    if (P.model === 'tt') {
      const per = P.to === 21 ? 5 : 2
      const before = 2 * (P.to - 1)
      assert.equal(v.serveOf, n < before ? per : 1)
    }

    const w = r() < bias ? 0 : 1
    const v0 = v
    const lvl = addPoint(m, w, T0 + steps * 9000)
    v = view(m)
    assert.equal(v.rallies, v0.rallies + 1)
    assert.equal(v.last, lvl)

    // every end of a match, set or game was announced
    const L = v0.label
    const has = (key) => L && L.key === key && (L.team === w || L.team === 2)
    if (lvl === 'match' && P.model !== 'total') {
      assert.equal(v.winner, w)
      assert.ok(has('match_point'), `${sport} unannounced match end`)
    }
    // a round ends on its last point, whoever wins it
    if (P.model === 'total') assert.equal(lvl === 'match', !!(L && L.key === 'last_point'))
    if (lvl === 'match' && P.model === 'total' && !v.draw) assert.equal(v.winner, v.points[0] > v.points[1] ? 0 : 1)
    if (lvl === 'set') assert.ok(has('set_point'), 'unannounced set')
    if (lvl === 'game' && P.model !== 'tennis') assert.ok(has('game_point'), 'unannounced game')
    if (lvl === 'game' && P.model === 'tennis' && !v0.tb && w !== v0.server)
      // a deciding point can also be set or match point for the server, which then wins the label
      assert.ok(has('break_point') || has('golden_point') || has('star_point') || (v0.decisive && L && L.team === 1 - w), 'unannounced break')
    // and every announcement holds
    if (has('match_point')) assert.equal(lvl, 'match')
    if (has('set_point')) assert.ok(lvl === 'set' || lvl === 'match')
    if (has('game_point')) assert.ok(lvl === 'game' || lvl === 'match')
    if (has('break_point')) assert.ok(lvl !== 'point')
    if (L && L.key === 'golden_point') assert.ok(lvl !== 'point')

    if (!v.done && !manual) {
      const sameGame = lvl === 'point'
      // winner serves next (badminton, squash, pickleball rally), also the next game for badminton and squash
      if (P.model === 'squash' || (P.model === 'rally' && (sameGame || P.nextFirst === 'winner'))) assert.equal(v.server, w)
      if (P.model === 'rally' && doubles && sameGame && w === v0.server) assert.equal(v.player, v0.player, 'same server')
      if (P.model === 'squash' && sameGame && w === v0.server) assert.notEqual(v.side, v0.side)
      if (P.model === 'sideout' && sameGame) {
        if (w !== v0.server) assert.deepEqual(v.points, v0.points, 'receivers do not score')
        else assert.equal(v.server, v0.server)
        if (w !== v0.server && doubles && v0.call.endsWith('-1')) assert.equal(v.player, 1 - v0.player)
      }
      if (P.model === 'tt' && sameGame) {
        const per = P.to === 21 ? 5 : 2
        const before = 2 * (P.to - 1)
        const n1 = v.points[0] + v.points[1]
        assert.equal(v.server !== v0.server, n1 >= before || n1 % per === 0, 'table tennis serve order')
      }
      if (P.model === 'tennis' && v.tb && sameGame) {
        const n1 = v.points[0] + v.points[1]
        assert.equal(v.server !== v0.server, n1 % 2 === 1, 'tie-break serve order')
      }
    }
    // table tennis doubles, deciding game: at 5 (10) the receivers change their order, so the next turn of
    // the receiving pair breaks the alternation; checked by its own test
    if (doubles && P.model === 'tt' && v.won[0] === P.win - 1 && v.won[1] === P.win - 1) {
      const half = P.to === 21 ? 10 : 5
      if (Math.max(v.points[0], v.points[1]) === half && Math.min(v.points[0], v.points[1]) < half) {
        lastTurn[0] = null
        lastTurn[1] = null
      }
    }
    // in doubles each team's serve turns alternate its players
    if (doubles && !manual && !v.done && ['tennis', 'tt', 'total'].includes(P.model)) {
      const turnStart = v.points[0] + v.points[1] === 0 || v.server !== v0.server
      if (turnStart) {
        if (lastTurn[v.server] !== null) assert.equal(v.player, 1 - lastTurn[v.server], `${sport} doubles order`)
        lastTurn[v.server] = v.player
      }
    }

    if (opts.undo && r() < 0.05) {
      undo(m)
      assert.equal(JSON.stringify(view(m)), JSON.stringify(v0), 'undo restores the previous screen')
      addPoint(m, w, T0 + steps * 9000)
      v = view(m)
    }
  }
  // final checks
  for (const set of v.sets) assert.ok(validSet(P, P.model, set), `${sport} ${JSON.stringify(rules)} bad set ${JSON.stringify(set)}`)
  const need = P.model === 'tennis' ? P.sets : P.model === 'total' ? 1 : P.win
  if (!v.draw) assert.equal(v.won[v.winner], need)
  assert.equal(v.won[0] + v.won[1], v.sets.length - (v.draw ? 1 : 0))
  const s = v.stats
  assert.equal(s.points[0] + s.points[1], v.rallies)
  assert.equal(s.servePoints[0] + s.servePoints[1], v.rallies)
  assert.equal(s.serveWon[0] + s.returnWon[0] + s.serveWon[1] + s.returnWon[1], v.rallies)
  if (P.model === 'tennis') {
    assert.ok(s.breaks[0] <= s.breakPoints[0] && s.breaks[1] <= s.breakPoints[1])
    assert.equal(s.held[0] + s.breaks[1], s.serviceGames[0])
    assert.equal(s.held[1] + s.breaks[0], s.serviceGames[1])
  }
  assert.ok(scoreText(v).length > 0)
  while (undo(m));
  assert.equal(JSON.stringify(view(m)), firstView, 'undo all the way back')
  return v
}

test('random: every rule combination in every sport, singles and doubles', () => {
  const r = rng(20261020)
  let count = 0
  for (const sport of SPORTS)
    for (const rules of combos(OPTIONS[sport]))
      for (const doubles of DOUBLES[sport])
        for (let k = 0; k < 2; k++) {
          randomMatch(sport, rules, doubles, r, { undo: k === 1 })
          count++
        }
  console.log(`  ${count} matches, one per rule combination`)
})

test('random: matches with undo and server changes by hand', () => {
  const r = rng(7)
  let count = 0
  for (let i = 0; i < 3000; i++) {
    const sport = SPORTS[i % SPORTS.length]
    const rules = {}
    for (const key in OPTIONS[sport]) rules[key] = OPTIONS[sport][key][Math.floor(r() * OPTIONS[sport][key].length)]
    const ds = DOUBLES[sport]
    randomMatch(sport, rules, ds[Math.floor(r() * ds.length)], r, { undo: true, override: true })
    count++
  }
  console.log(`  ${count} more matches`)
})

test('random: every label showed up', () => {
  assert.deepEqual([...LABELS].filter((k) => !seen.has(k)), [])
})


// ---------------------------------------------------------------- the app around the scoring

// keys a language may leave to English: the same in every language
const SAME_EVERYWHERE = new Set(['date.weekday', 'detail.vs', 'detail.time', 'detail.title', 'history.e', 'ok'])
const holes = (s) => (typeof s === 'string' ? (s.match(/\{\w+\}/g) || []).sort().join(',') : '')

test('languages: every language has every key, with the same {placeholders}', () => {
  const en = LANGS.en
  Object.keys(LANGS).forEach((code) => {
    if (code === 'en') return
    const L = LANGS[code]
    const extra = Object.keys(L).filter((k) => !(k in en))
    assert.deepEqual(extra, [], `${code}: keys English doesn't have`)
    const missing = Object.keys(en).filter((k) => !(k in L) && !SAME_EVERYWHERE.has(k))
    assert.deepEqual(missing, [], `${code}: missing keys`)
    Object.keys(L).forEach((k) => assert.equal(holes(L[k]), holes(en[k]), `${code} ${k}`))
    assert.equal(L.days.length, 7)
    assert.equal(L.months.length, 12)
  })
})

test('languages: the phone texts have every key in every language, with the same {placeholders}', () => {
  const en = TEXT.en
  Object.keys(TEXT).forEach((code) => {
    if (code === 'en') return
    const L = TEXT[code]
    // key1 and key2 are the forms of a counted text whose base key English has
    const extra = Object.keys(L).filter((k) => !(k in en) && !(/[12]$/.test(k) && k.slice(0, -1) in en))
    assert.deepEqual(extra, [], `${code}: keys English doesn't have`)
    const missing = Object.keys(en).filter((k) => !(k in L) && k !== 'ivl.keyHint')
    assert.deepEqual(missing, [], `${code}: missing keys`)
    assert.equal(L.months.length, 12)
  })
})

test('languages: chosen from the watch, English for the rest', () => {
  assert.equal(langOfZepp(2), 'en')
  assert.equal(langOfZepp(3), 'es')
  assert.equal(langOfZepp(7), 'de')
  assert.equal(langOfZepp(20), 'pt')
  assert.equal(langOfZepp(24), 'sr')
  assert.equal(langOfZepp(99), 'en')
  setLang('sr')
  assert.equal(t('result.won'), 'POBEDA')
  assert.equal(t('team.opponents'), 'PROTIVNICI')
  setLang('de')
  assert.equal(t('team.you'), 'DU')
  assert.equal(t('tab.serve'), 'AUFSCHLAG')
  assert.equal(t('team.opponent'), 'GEGNER')
  assert.equal(t('history.count', { n: 3, w: 2 }), 'Matches: 3 · gewonnen: 2')
  setLang('xx')
  assert.equal(t('team.you'), 'YOU')
  setLang('en')
})

test('settings: defaults, sanitizing and the newer change winning', () => {
  const d = defaults()
  assert.equal(d.setups.length, 6)
  assert.equal(d.serveDisplay, 'full')
  assert.equal(sanitize('screen', 'x'), 'wrist')
  assert.equal(sanitize('labels', 'true'), true)
  assert.equal(sanitize('myName', '  Pavle   Marinković  long name '), 'Pavle Marinković')
  const w = setValue(normalize(null), 'labels', false, 100)
  const p = setValue(normalize(null), 'screen', 'always', 200)
  const m = merge(w, p)
  assert.equal(m.merged.values.labels, false)
  assert.equal(m.merged.values.screen, 'always')
  assert.equal(m.watchChanged, true)
  assert.equal(m.phoneChanged, true)
})

test('setups: checked, unique ids, never empty', () => {
  assert.deepEqual(sanitizeSetups([]), DEFAULT_SETUPS)
  const list = sanitizeSetups([
    { id: 'a', sport: 'tennis', rules: { deuce: 'noad' }, opponent: ' Marko ' },
    { id: 'a', sport: 'padel' },
    { sport: 'chess' },
    { sport: 'squash', rules: { games: '2' } }
  ])
  assert.deepEqual(list.map((x) => x.id), ['a', 'padel1', 'squash1'])
  assert.equal(list[0].opponent, 'Marko')
  assert.equal(list[2].rules.games, 2)
  assert.equal(sanitizeSetups(Array.from({ length: 40 }, () => ({ sport: 'tennis' }))).length, MAX_SETUPS)
  assert.equal(findSetup({ setups: list }, 'nope').id, 'a')
})

test('setups: how they read on the watch', () => {
  const titles = DEFAULT_SETUPS.map((s) => setupTitle(s))
  assert.deepEqual(titles, [
    'Tennis · Best of 3', 'Padel · Star point', 'Pickleball · Doubles', 'Table tennis · Bo5', 'Squash · Bo5', 'Badminton · Best of 3'
  ])
  assert.equal(setupTitle({ sport: 'tennis', rules: { deuce: 'noad' } }), 'Tennis · No-ad')
  assert.equal(setupTitle({ sport: 'padel', rules: { deuce: 'noad', sets: 1 } }), 'Padel · 1 set, Golden point')
  assert.equal(setupTitle({ sport: 'padel', rules: { format: 'total', total: 24 } }), 'Padel · Americano 24')
  assert.equal(setupTitle({ sport: 'tennis', name: 'Sunday club' }), 'Sunday club')
  const tt = { sport: 'tabletennis', doubles: true }
  assert.equal(setupTitle(tt), 'Table tennis · Bo5, Doubles')
  assert.equal(fittedTitle(tt, (x) => x.length <= 20), 'Table tennis · Bo5')
  assert.equal(fittedTitle(tt, () => false), 'Table tennis')
  assert.equal(setupExtra({ opponent: 'Marko' }), 'Marko')
  assert.equal(setupExtra({ partner: 'Ana' }), 'with Ana')
  const names = matchNames({ opponent: 'Marko', partner: '' }, { myName: 'Pavle' })
  assert.equal(teamName(0, names), 'Pavle')
  assert.equal(teamName(1, names), 'Marko')
  assert.equal(teamName(1, {}), 'OPPONENT')
  assert.equal(teamName(1, {}, true), 'OPPONENTS')
  assert.equal(partnerName({}), 'PARTNER')
})

test('heart rate: one sample per 5 s keeping the highest, merged in order', () => {
  const m = {}
  addHr(m, 0, 100)
  addHr(m, 3, 120)
  addHr(m, 5, 110)
  addHr(m, 9, 20)
  assert.deepEqual(m.hr, [[0, 120], [5, 110]])
  mergeHr(m, [[2, 130], [5, 150], [20, 140], [25, 300]])
  assert.deepEqual(m.hr, [[0, 120], [2, 130], [5, 110], [20, 140]])
  assert.deepEqual(hrStats(m.hr), { avg: 125, max: 140 })
  assert.deepEqual(hrStats([]), { avg: null, max: null })
})

function finished(sport, seq, o = {}) {
  const m = mk(sport, o.rules, o)
  m.title = 'T'
  m.names = { me: '', opponent: o.opponent || '', partner: '' }
  // a rally every 20 seconds, so the match is long enough to count and go to Strava
  ;[...seq].forEach((ch, i) => addPoint(m, ch === '1' ? 1 : 0, T0 + (i + 1) * 20000))
  if (o.end) endMatch(m, T0 + 3600000)
  // heart rate through the match (makeRecord drops what comes after its end)
  const end = duration(m, 0, true)
  m.hr = Array.from({ length: 1500 }, (_, i) => [(i * end) / 1500, 100 + (i % 50)])
  return makeRecord(m, T0 + 3600000)
}

test('record: result, score, stats and a thinned curve; undo from the summary', () => {
  const rec = finished('tennis', rep('0', 48), { opponent: 'Marko' })
  assert.equal(rec.winner, 0)
  assert.equal(rec.score, '6-0 6-0')
  assert.equal(rec.curve.length, 600)
  assert.equal(rec.hrMax, 149)
  assert.equal(resultOf(rec), 'won')
  assert.equal(rec.dur, rec.ev[rec.ev.length - 1][2])
  const m = matchOf(rec)
  assert.equal(view(m).done, true)
  undo(m)
  const v = view(m)
  assert.equal(v.done, false)
  assert.deepEqual(v.games, [5, 0])
  assert.equal(wonCount([rec, { ...rec, winner: 1 }]), 1)
})

test('record: a match ended by hand, and its summary rows', () => {
  const rec = finished('pickleball', '0000111', { end: true })
  assert.equal(rec.ended, true)
  assert.equal(resultOf(rec), 'ended')
  assert.equal(resultLine(rec).text, 'MATCH ENDED')
  const rows = keyRows(rec)
  assert.equal(rows.length, 3)
  assert.equal(rows[0][1], `${rec.stats.points[0]} – ${rec.stats.points[1]}`)
  assert.equal(rows[2][0], 'Longest streak')
  const tennis = finished('tennis', rep('0', 48))
  assert.deepEqual(keyRows(tennis).map((r) => r[0]), ['Points won', 'On your serve', 'Break points'])
  assert.deepEqual(detailRows(tennis).map((r) => r[0]), [
    'Duration', 'Heart rate', 'Points won', 'On your serve', 'Break points', 'Longest streak'
  ])
  assert.equal(keyRows(tennis)[1][1], '100%')
  assert.equal(resultLine(tennis).tone, 'lime')
})

test('format: times, days and scores', () => {
  assert.equal(clock(72), '1:12')
  assert.equal(clock(4325), '1:12:05')
  assert.equal(hm(4325), '1:12')
  assert.equal(hm(2220), '0:37')
  assert.equal(prettyScore('6-4 6-7(5) [10-8]', '   '), '6–4   6–7(5)   10–8')
  assert.equal(percent(0, 0), '–')
  const now = new Date(2026, 9, 20, 18, 0).getTime()
  assert.equal(dayLabel(now - 3600000, now), 'Today')
  assert.equal(dayLabel(now - 86400000, now), 'Yesterday')
  assert.equal(dayLabel(new Date(2026, 9, 17, 10).getTime(), now), 'Sat 17')
  assert.equal(dayLabel(new Date(2026, 9, 2, 10).getTime(), now), 'Oct 2')
})

test('shortcut card: no match yet, the last match, a match being played', () => {
  const now = T0 + 3600000
  assert.deepEqual(cardView(null, [], now), { mode: 'idle', line1: '', line2: '', button: 'NEW MATCH' })
  const rec = finished('tennis', rep('0', 48), { opponent: 'Marko' })
  const idle = cardView(null, [rec], now)
  assert.equal(idle.line1, 'Last: won 6–0 6–0')
  assert.equal(idle.line2, 'Marko · Tennis · Today')
  const m = mk('tennis')
  play(m, '0000' + '11110')
  const live = cardView(m, [rec], now)
  assert.equal(live.mode, 'match')
  assert.equal(live.line1, 'In play: 1–1 · 15–0')
  assert.equal(live.button, 'CONTINUE')
  assert.equal(lastLine(finished('squash', '0', { end: true })), 'Last: 1–0')
})

test('phone: sync merges settings, keeps matches, deletes, restores in pages', () => {
  const store = {}
  const storage = { getItem: (k) => store[k], setItem: (k, v) => (store[k] = v) }
  const core = createCore(storage, () => 5000)
  const rec = finished('tennis', rep('0', 48))
  const watch = setValue(normalize(null), 'labels', false, 100)
  return core.sync({ settings: watch, items: [{ op: 'upsert', id: rec.id, rec }] }).then((res) => {
    assert.equal(res.settings.values.labels, false)
    assert.deepEqual(res.done.map((d) => d.op), ['upsert'])
    assert.equal(core.history().length, 1)
    core.setSetting('screen', 'always')
    return core.sync({ settings: watch, items: [] })
  }).then((res) => {
    assert.equal(res.settings.values.screen, 'always')
    const many = Array.from({ length: 25 }, (_, i) => ({ op: 'upsert', id: 'm' + i, rec: { ...rec, id: 'm' + i, start: rec.start + i } }))
    return core.sync({ settings: watch, items: many.concat([{ op: 'delete', id: rec.id }]) })
  }).then(() => core.restore({ page: 0 })).then((r) => {
    assert.equal(r.total, 25)
    assert.equal(r.list.length, 20)
    assert.equal(r.more, true)
    assert.equal(r.list[0].curve, undefined)
    return core.restore({ page: 1 })
  }).then((r) => {
    assert.equal(r.list.length, 5)
    assert.equal(r.more, false)
  })
})

test('phone: names changed and matches deleted on the phone go to the watch and stay', () => {
  const store = {}
  const storage = { getItem: (k) => store[k], setItem: (k, v) => (store[k] = v) }
  let now = 10000
  const core = createCore(storage, () => now)
  const a = { ...finished('tennis', rep('0', 48)), id: 'a', names: { opponent: '' } }
  const b = { ...a, id: 'b' }
  const watch = normalize(null)
  return core.sync({ settings: watch, items: [a, b].map((rec) => ({ op: 'upsert', id: rec.id, rec })), lang: 'de' }).then((res) => {
    assert.equal(store.watchLang, 'de')
    assert.deepEqual(res.edits, [])
    // what the phone page does: changes its copy and notes the change for the watch
    store.phoneEdits = JSON.stringify([{ id: 'a', op: 'names', names: { opponent: 'Marko' }, at: now }, { id: 'b', op: 'delete', at: now }])
    store.history = JSON.stringify(core.history().filter((x) => x.id !== 'b').map((x) => ({ ...x, names: { opponent: 'Marko' } })))
    // the watch sends both again (an older copy): the phone's names win, the deleted match stays deleted
    return core.sync({ settings: watch, items: [a, b].map((rec) => ({ op: 'upsert', id: rec.id, rec })) })
  }).then((res) => {
    assert.deepEqual(res.edits.map((e) => e.op), ['names', 'delete'])
    assert.deepEqual(core.history().map((x) => x.id), ['a'])
    assert.equal(core.history()[0].names.opponent, 'Marko')
    now += 61 * 86400000
    return core.sync({ settings: watch, items: [] })
  }).then((res) => {
    assert.deepEqual(res.edits, [], 'old edits are dropped')
  })
})

test('match flow: who won each rally and where sets or games ended', () => {
  const m = newMatch({ sport: 'tennis', rules: defaultRules('tennis') }, { first: 0 }, 0)
  ;(rep('0', 24) + rep('1', 3)).split('').forEach((w, i) => addPoint(m, Number(w), i * 1000))
  const f = flowMarks(m)
  assert.equal(f.wins.length, 27)
  assert.deepEqual(f.ends, [24], 'the first set ended after 24 rallies')
  const tt = newMatch({ sport: 'tabletennis', rules: defaultRules('tabletennis') }, { first: 0 }, 0)
  rep('0', 22).split('').forEach((w, i) => addPoint(tt, 0, i * 1000))
  assert.deepEqual(flowMarks(tt).ends, [11, 22])
  const am = newMatch({ sport: 'padel', rules: { ...defaultRules('padel'), format: 'total' } }, { first: 0 }, 0)
  rep('0', 5).split('').forEach((w, i) => addPoint(am, 0, i * 1000))
  assert.deepEqual(flowMarks(am).ends, [], 'a round has no sets')
})

// ---- phase 6: Strava and Intervals.icu --------------------------------------------------------------

test('integrations: the title has the result, the description the statistics, the file the heart rate', () => {
  setLang('en')
  const rec = finished('tennis', rep('0', 48), { opponent: 'Marko' })
  assert.equal(title(rec), 'Tennis · won 6–0 6–0 · vs Marko')
  const d = description(rec).split('\n')
  assert.equal(d[0], 'T')
  assert.equal(d[1], 'vs Marko')
  assert.equal(d[2], 'Score: 6–0 6–0')
  assert.ok(d.some((x) => x.startsWith('Heart rate: ')))
  assert.equal(d[d.length - 1], 'Recorded with RallyPal')
  const x = tcx(rec)
  assert.ok(x.indexOf('<HeartRateBpm><Value>') > 0)
  assert.equal((x.match(/<Trackpoint>/g) || []).length >= 600, true)
  assert.equal(tcx({ ...rec, curve: [] }), null, 'no curve, no file')
  setLang('sr')
  assert.equal(title({ ...rec, winner: 1 }), 'Tenis · poraz 6–0 6–0 · protiv: Marko')
  setLang('en')
  const made = { ...rec, title: setupTitle({ sport: 'tennis', rules: rec.rules }) }
  setLang('sr')
  assert.equal(description(made).split('\n')[0], 'Tenis · Najbolji od 3', 'a title the watch made follows the language')
  assert.equal(description({ ...rec, title: 'Petak' }).split('\n')[0], 'Petak', 'a name of its own stays')
  setLang('en')
  assert.equal(SPORT_TYPE.tabletennis, 'TableTennis')
  assert.equal(duplicateOf("rallypal-1.tcx duplicate of <a href='/activities/1234567'>Morning</a>"), '1234567')
  assert.ok(multipart('B', [['data_type', 'tcx']], { name: 'a.tcx', data: '<x/>' }).endsWith('--B--\r\n'))
})

test('integrations: a Zepp workout of the same match is found by the time it overlaps', () => {
  const rec = { id: 'm1', start: Date.UTC(2026, 9, 21, 16, 0), dur: 3600 }
  const iso = (min) => new Date(rec.start + min * 60000).toISOString()
  assert.equal(sameMatch(rec, [{ id: 1, start_date: iso(-90), elapsed_time: 3000 }]), null, 'a run before')
  assert.equal(sameMatch(rec, [{ id: 2, start_date: iso(-3), elapsed_time: 3900 }]).id, 2)
  assert.equal(sameMatch(rec, [{ id: 3, start_date: iso(50), elapsed_time: 1800 }]), null, 'only the end overlaps')
  assert.equal(sameMatch(rec, [{ id: 4, start_date: iso(300), elapsed_time: 60, external_id: 'rallypal-m1' }]).id, 4, 'one we sent')
})

// A fake Strava and Intervals.icu: answers by method and path, and keeps every call
function fakeNet(routes) {
  const calls = []
  return {
    calls,
    http(req) {
      calls.push(req)
      const path = req.url.replace(/^https:\/\/[^/]+/, '')
      const key = Object.keys(routes).filter((k) => {
        const [m, p] = k.split(' ')
        return m === req.method && path.indexOf(p) === 0
      }).sort((a, b) => b.length - a.length)[0]
      if (!key) return Promise.resolve({ status: 404, data: null })
      const r = routes[key]
      return Promise.resolve(typeof r === 'function' ? r(req, calls) : r)
    },
    wait: () => Promise.resolve()
  }
}

// the full version (only it sends to Strava and Intervals.icu)
function phone(net, extra) {
  const store = { stravaClientId: '123', stravaClientSecret: 'shh', licence: JSON.stringify({ licensed: true }), ...(extra || {}) }
  const storage = { getItem: (k) => store[k], setItem: (k, v) => (store[k] = v) }
  return { store, core: createCore(storage, () => Date.UTC(2026, 9, 21, 18, 0), net) }
}

const AUTH = JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_at: Date.UTC(2027, 0, 1) / 1000 })

test('strava: the sign-in code is traded for tokens and the line says who is connected', () => {
  const net = fakeNet({
    'POST /oauth/token': { status: 200, data: { access_token: 'a1', refresh_token: 'r1', expires_at: 2e9 } },
    'GET /api/v3/athlete': { status: 200, data: { firstname: 'Pavle' } }
  })
  const { store, core } = phone(net, { stravaCode: 'c0de' })
  return core.stravaCheck().then((ok) => {
    assert.equal(ok, true)
    assert.equal(JSON.parse(store.stravaAuth).refresh_token, 'r1')
    assert.equal(store.stravaCode, '')
    const s = JSON.parse(store.status).strava
    assert.deepEqual([s.ok, s.key, s.vars.name], [true, 'conn.connectedAs', 'Pavle'])
    assert.equal(JSON.parse(net.calls[0].body).code, 'c0de')
  })
})

test('strava: a refused sign-in and a missing app are said in words', () => {
  const net = fakeNet({ 'POST /oauth/token': { status: 401, data: { message: 'Bad' } } })
  const { store, core } = phone(net, { stravaCode: 'x' })
  return core.stravaCheck().then((ok) => {
    assert.equal(ok, false)
    assert.deepEqual([JSON.parse(store.status).strava.key, JSON.parse(store.status).strava.vars.code], ['err.signin', 401])
    const empty = phone(net, { stravaClientId: '' })
    return empty.core.stravaCheck().then(() => assert.equal(JSON.parse(empty.store.status).strava.key, 'conn.stravaNeed'))
  })
})

test('intervals: the check names the athlete, a wrong key says what to check', () => {
  const good = fakeNet({ 'GET /api/v1/athlete/i42': { status: 200, data: { id: 'i42', name: 'Pavle Marinković' } } })
  const a = phone(good, { intervalsKey: 'k', intervalsAthlete: 'i42' })
  return a.core.intervalsCheck().then(() => {
    const s = JSON.parse(a.store.status).intervals
    assert.deepEqual([s.ok, s.key, s.vars.name], [true, 'conn.connectedAs', 'Pavle'])
    assert.equal(good.calls[0].headers.Authorization, 'Basic QVBJX0tFWTpr')
    const bad = phone(fakeNet({ 'GET /api/v1/athlete/i42': { status: 403, data: null } }), { intervalsKey: 'k', intervalsAthlete: 'i42' })
    return bad.core.intervalsCheck().then(() => assert.equal(JSON.parse(bad.store.status).intervals.key, 'err.ivlAuth'))
  })
})

test('strava: a match goes as a file with heart rate, gets its sport and title, and is not sent twice', () => {
  const net = fakeNet({
    'GET /api/v3/athlete/activities': { status: 200, data: [] },
    'POST /api/v3/uploads': { status: 201, data: { id: 77, id_str: '77', activity_id: null, error: null } },
    'GET /api/v3/uploads/77': (req, calls) => ({ status: 200, data: { id: 77, activity_id: calls.filter((c) => c.url.endsWith('/uploads/77')).length > 1 ? 9001 : null } }),
    'PUT /api/v3/activities/9001': { status: 200, data: { id: 9001 } }
  })
  const { store, core } = phone(net, { stravaAuth: AUTH })
  const rec = finished('tennis', rep('0', 48), { opponent: 'Marko' })
  return core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec }], lang: 'en' }).then((res) => {
    assert.equal(net.calls.length, 0, 'the watch gets its answer before anything goes out')
    assert.equal(res.done.length, 1)
    return core.sendOutbox()
  }).then((r) => {
    assert.deepEqual(r, { sent: 1, failed: 0, waiting: 0 })
    const up = net.calls.filter((c) => c.method === 'POST')[0]
    assert.ok(up.headers['Content-Type'].startsWith('multipart/form-data; boundary='))
    assert.ok(up.body.indexOf('name="data_type"\r\n\r\ntcx') > 0)
    const put = JSON.parse(net.calls.filter((c) => c.method === 'PUT')[0].body)
    assert.deepEqual([put.sport_type, put.name], ['Tennis', 'Tennis · won 6–0 6–0 · vs Marko'])
    assert.equal(core.history()[0].sync.stravaId, '9001')
    assert.equal(JSON.parse(store.status).strava.key, 'conn.sent')
    assert.deepEqual(JSON.parse(store.outbox), [])
    const before = net.calls.length
    // the watch sends the same match again (an older copy without the Strava id): nothing new goes out
    return core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec: { ...rec, sync: { phone: 1 } } }] })
      .then(() => core.sendOutbox())
      .then(() => assert.equal(net.calls.length - before, 0, 'unchanged: no call'))
  })
})

test('strava: the Zepp workout of the same match is filled in instead of a second activity', () => {
  const rec = finished('padel', rep('0', 48), { opponent: 'Luka & Ivan' })
  const net = fakeNet({
    'GET /api/v3/athlete/activities': { status: 200, data: [{ id: 555, start_date: new Date(rec.start - 120000).toISOString(), elapsed_time: 4000 }] },
    'PUT /api/v3/activities/555': (req) => (JSON.parse(req.body).sport_type === 'Padel' ? { status: 422, data: {} } : { status: 200, data: { id: 555 } })
  })
  const { core } = phone(net, { stravaAuth: AUTH })
  return core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec }] }).then(() => core.sendOutbox()).then(() => {
    assert.equal(net.calls.filter((c) => c.url.indexOf('/uploads') > 0).length, 0, 'no upload')
    const puts = net.calls.filter((c) => c.method === 'PUT').map((c) => JSON.parse(c.body).sport_type)
    assert.deepEqual(puts, ['Padel', 'Workout'], 'a sport Strava refuses becomes Workout')
    assert.equal(core.history()[0].sync.stravaId, '555')
  })
})

test('strava: no heart rate, or a file Strava refuses, still gives the match as a manual activity', () => {
  const net = fakeNet({
    'GET /api/v3/athlete/activities': { status: 200, data: [] },
    'POST /api/v3/uploads': { status: 400, data: { message: 'Bad Request' } },
    'POST /api/v3/activities': { status: 201, data: { id: 31 } },
    'PUT /api/v3/activities/31': { status: 200, data: { id: 31 } }
  })
  const { core } = phone(net, { stravaAuth: AUTH })
  const a = { ...finished('squash', rep('0', 33)), id: 'a' }
  const b = { ...a, id: 'b', start: a.start + 7200000, curve: [] }
  return core.sync({ settings: normalize(null), items: [a, b].map((rec) => ({ op: 'upsert', id: rec.id, rec })) }).then(() => core.sendOutbox()).then((r) => {
    assert.equal(r.sent, 2)
    const manual = net.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/activities')).map((c) => JSON.parse(c.body))
    assert.equal(manual.length, 2)
    assert.equal(manual[0].sport_type, 'Squash')
    assert.equal(net.calls.filter((c) => c.url.endsWith('/uploads')).length, 1, 'b had no file to upload')
  })
})

test('strava: a failure keeps the match for the next try and the page counts it', () => {
  let down = true
  const net = fakeNet({
    'GET /api/v3/athlete/activities': { status: 200, data: [] },
    'POST /api/v3/activities': () => (down ? { status: 503, data: null } : { status: 201, data: { id: 8 } }),
    'PUT /api/v3/activities/8': { status: 200, data: { id: 8 } }
  })
  const { store, core } = phone(net, { stravaAuth: AUTH })
  const rec = { ...finished('badminton', rep('0', 42)), curve: [] }
  return core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec }] }).then(() => core.sendOutbox()).then((r) => {
    assert.equal(r.failed, 1)
    assert.equal(core.failedCount(), 1)
    const s = JSON.parse(store.status).strava
    assert.deepEqual([s.ok, s.key, s.vars.code], [false, 'err.http', 503])
    down = false
    return core.sendOutbox()
  }).then((r) => {
    assert.equal(r.sent, 1)
    assert.equal(core.failedCount(), 0)
  })
})

test('intervals: a match goes as a file with heart rate, then gets its sport, title and description', () => {
  const net = fakeNet({
    'POST /api/v1/athlete/i42/activities': { status: 200, data: { id: 'i9' } },
    'PUT /api/v1/activity/i9': { status: 200, data: { id: 'i9' } }
  })
  const { store, core } = phone(net, { stravaClientId: '', intervalsKey: 'k', intervalsAthlete: 'i42' })
  const rec = finished('tabletennis', rep('0', 33), { opponent: 'Nikola' })
  return core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec }] }).then(() => core.sendOutbox()).then(() => {
    const post = net.calls[0]
    assert.ok(post.url.indexOf('name=Table%20tennis') > 0)
    assert.ok(post.body.indexOf('filename="rallypal-') > 0)
    const put = JSON.parse(net.calls[1].body)
    assert.deepEqual([put.type, put.name], ['TableTennis', 'Table tennis · won 11–0 11–0 11–0 · vs Nikola'])
    assert.equal(core.history()[0].sync.intervalsId, 'i9')
    assert.equal(JSON.parse(store.status).intervals.key, 'conn.sent')
  })
})

// ---------------------------------------------------------------- fixes before the store (ROAST items 6, 8, 9, 10, 13)

test('serve: rally scoring in doubles, opponents first: the player you named serves your first serve (ROAST 10)', () => {
  for (const sport of ['badminton', 'pickleball']) {
    const rules = sport === 'pickleball' ? { scoring: 'rally' } : undefined
    const a = mk(sport, rules, { doubles: true, first: 1, mine: 1 })
    play(a, '110')
    assert.equal(srv(view(a)), '01L', sport + ': partner, from the left at 1')
    play(a, '0')
    assert.equal(srv(view(a)), '01R', sport + ': the same server moves right')
    const b = mk(sport, rules, { doubles: true, first: 1, mine: 0 })
    play(b, '0')
    assert.equal(srv(view(b)), '00L', sport + ': you')
    // serving first, nothing changes: the named player serves from the right
    const c = mk(sport, rules, { doubles: true, first: 0, mine: 1 })
    assert.equal(srv(view(c)), '01R')
  }
})

test('serve: pickleball, server changed by hand to the other side starts from the right (ROAST 10)', () => {
  const m = mk('pickleball', undefined, { doubles: true, first: 0 })
  // side out to them, they score (their server moves left), lose one (second server), side out back to you
  play(m, '1100')
  assert.equal(view(m).server, 0)
  setServer(m, 1, 0, T0 + 999000)
  const v = view(m)
  assert.equal(srv(v), '10R')
  assert.ok(v.call.endsWith('-1'), 'first server of the side: ' + v.call)
  setServer(m, 0, 1, T0 + 999000)
  assert.equal(srv(view(m)), '01R', 'you named the partner')
})

test('serve: table tennis doubles, deciding game: the receivers change order at 5 (ROAST 10)', () => {
  const m = mk('tabletennis', undefined, { doubles: true })
  play(m, rep('0', 11) + rep('1', 11) + rep('0', 11) + rep('1', 11))
  const turn = () => {
    const v = view(m)
    return `${v.server}${v.player}`
  }
  const cycle = []
  for (let i = 0; i < 4; i++) {
    cycle.push(turn())
    play(m, '01')
  }
  assert.deepEqual(view(m).points, [4, 4])
  assert.equal(turn(), cycle[0])
  play(m, '0')
  assert.equal(turn(), cycle[0], 'the server finishes the turn')
  const recv = 1 - Number(cycle[0][0])
  const swapped = cycle.map((x) => (Number(x[0]) === recv ? `${recv}${1 - Number(x[1])}` : x))
  play(m, '1')
  const after = [turn()]
  play(m, '01')
  after.push(turn())
  play(m, '01')
  after.push(turn())
  assert.deepEqual(after, swapped.slice(1, 4))
  // not in the other games
  const n = mk('tabletennis', undefined, { doubles: true })
  const order = []
  for (let i = 0; i < 5; i++) {
    order.push(`${view(n).server}${view(n).player}`)
    play(n, '01')
  }
  assert.equal(order[4], order[0])
})

test('change ends: tennis after odd games and every 6 points of a tie-break (ROAST 14)', () => {
  const m = mk('tennis')
  play(m, '000')
  assert.equal(view(m).changeEnds, false, 'inside a game')
  play(m, '0')
  assert.equal(view(m).changeEnds, true, 'after the first game')
  play(m, '1111')
  assert.equal(view(m).changeEnds, false, 'after the second game')
  play(m, '0')
  assert.equal(view(m).changeEnds, false, 'the next point clears it')
  play(m, '000')
  assert.equal(view(m).changeEnds, true, 'after the third game')
  // 6-6, then the tie-break: every 6 points
  const t = mk('tennis')
  play(t, holds(12))
  assert.equal(view(t).tb, 'tb')
  assert.equal(view(t).changeEnds, false, '12 games: even')
  play(t, '01010')
  assert.equal(view(t).changeEnds, false)
  play(t, '1')
  assert.equal(view(t).changeEnds, true, '6 points into the tie-break')
  play(t, '0000')
  assert.equal(view(t).sets.length, 1)
  assert.equal(view(t).changeEnds, true, 'after a 7-6 set (13 games)')
})

test('change ends: after each game, and halfway through the last game (ROAST 14)', () => {
  const tt = mk('tabletennis')
  play(tt, rep('0', 11))
  assert.equal(view(tt).changeEnds, true, 'table tennis: after the game')
  play(tt, '0')
  assert.equal(view(tt).changeEnds, false, 'not in the first games')
  const n = mk('tabletennis')
  play(n, rep('0', 11) + rep('1', 11) + rep('0', 11) + rep('1', 11) + '00001')
  assert.equal(view(n).changeEnds, false)
  play(n, '0')
  assert.deepEqual(view(n).points, [5, 1])
  assert.equal(view(n).changeEnds, true, 'deciding game: first to 5')
  play(n, '1111')
  play(n, '0')
  assert.equal(view(n).changeEnds, false, 'only once')
  const b = mk('badminton')
  play(b, rep('0', 21) + rep('1', 21) + rep('0', 10))
  assert.equal(view(b).changeEnds, false)
  play(b, '0')
  assert.equal(view(b).changeEnds, true, 'badminton third game: 11')
  const sq = mk('squash')
  play(sq, rep('0', 11))
  assert.equal(view(sq).changeEnds, false, 'squash: never')
  const p1 = mk('pickleball', undefined, { doubles: false })
  play(p1, rep('0', 6))
  assert.equal(view(p1).changeEnds, false, 'one game to 11: no change')
  const p15 = mk('pickleball', { to: 15, scoring: 'rally' }, { doubles: false })
  play(p15, rep('0', 8))
  assert.equal(view(p15).changeEnds, true, 'one game to 15: at 8')
  const am = mk('padel', { format: 'total', total: 16 })
  play(am, '0000')
  assert.equal(view(am).changeEnds, false, 'Americano: no change')
})

test('end by hand: the players say who won, or no result (ROAST 17)', () => {
  const m = mk('tennis')
  play(m, holds(5))
  endMatch(m, T0 + 600000, 1)
  let v = view(m)
  assert.deepEqual([v.done, v.ended, v.winner], [true, true, 1])
  const rec = makeRecord(m, T0 + 600000)
  assert.equal(resultOf(rec), 'lost')
  assert.equal(resultLine(rec).text, 'YOU LOST')
  undo(m)
  assert.equal(view(m).done, false, 'undo takes the ending back')
  endMatch(m, T0 + 600000)
  v = view(m)
  assert.deepEqual([v.ended, v.winner], [true, null])
  assert.equal(resultOf(makeRecord(m, T0 + 600000)), 'ended')
  // a round to a total keeps its winner by the points
  const am = mk('padel', { format: 'total', total: 24 })
  play(am, '0001')
  endMatch(am, T0 + 600000, 1)
  assert.equal(view(am).winner, 0)
})

test('record: a match left open and ended the next day ends a minute after its last point (ROAST 6)', () => {
  const m = mk('tennis')
  ;[0, 1, 0].forEach((w, i) => addPoint(m, w, T0 + (i + 1) * 30000))
  assert.equal(idle(m, T0 + 90000 + 60000), false)
  assert.equal(idle(m, T0 + 90000 + 1801000), true)
  m.hr = [[30, 120], [90, 130], [5000, 90], [57000, 80]]
  endMatch(m, T0 + 16 * 3600000)
  const rec = makeRecord(m, m.start + duration(m, 0, true) * 1000)
  assert.equal(rec.dur, 150)
  assert.equal(rec.end, T0 + 150000)
  assert.deepEqual(rec.curve.map((x) => x[0]), [30, 90])
  assert.equal(rec.hrMax, 130)
  // ended a few minutes after the last point: the real time stays
  const n = mk('tennis')
  addPoint(n, 0, T0 + 30000)
  endMatch(n, T0 + 330000)
  assert.equal(duration(n, 0, true), 330)
})

test('restore: the watch asks for what it is missing and goes on where it stopped (ROAST 8)', () => {
  const now = T0
  assert.equal(restoreFrom({}, 61, 1, now, 200), 0, 'never restored, even with a match of its own')
  assert.equal(restoreFrom({ restoredAt: now - 1000, restorePage: 2 }, 100, 40, now, 200), 2, 'cut short: goes on')
  assert.equal(restoreFrom({ restoredAt: now - 1000 }, 61, 1, now, 200), -1, 'just restored: not again at once')
  assert.equal(restoreFrom({ restoredAt: now - RESTORE_AGAIN_MS }, 61, 1, now, 200), 0, 'still missing later: asks again')
  assert.equal(restoreFrom({ restoredAt: now - RESTORE_AGAIN_MS }, 900, 200, now, 200), -1, 'has all it keeps')
})

test('send: a short match and a match in the trial stay off Strava (ROAST 13)', () => {
  const net = fakeNet({ 'GET /api/v3/athlete/activities': { status: 200, data: [] } })
  const short = { ...finished('tennis', rep('0', 12)), id: 's' }
  assert.ok(short.dur < MIN_MATCH_SEC)
  const a = phone(net, { stravaAuth: AUTH })
  const long = finished('tennis', rep('0', 48))
  const trialPhone = phone(net, { stravaAuth: AUTH, licence: '' })
  return a.core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: 's', rec: short }] })
    .then(() => assert.deepEqual(JSON.parse(a.store.outbox || '[]'), [], 'short: not queued'))
    .then(() => trialPhone.core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: long.id, rec: long }] }))
    .then(() => trialPhone.core.sendOutbox())
    .then((r) => {
      assert.deepEqual(r, { sent: 0, failed: 0, waiting: 0 })
      assert.equal(net.calls.length, 0)
    })
})

test('send: Intervals.icu keeps the activity id at once, so a failed update never adds a second one (ROAST 9)', () => {
  let putOk = false
  const net = fakeNet({
    'POST /api/v1/athlete/i42/activities': { status: 200, data: { id: 'i9' } },
    'PUT /api/v1/activity/i9': () => (putOk ? { status: 200, data: { id: 'i9' } } : { status: 503, data: null })
  })
  const { core } = phone(net, { stravaClientId: '', intervalsKey: 'k', intervalsAthlete: 'i42' })
  const rec = finished('squash', rep('0', 33))
  return core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec }] }).then(() => core.sendOutbox()).then((r) => {
    assert.equal(r.failed, 1)
    assert.equal(core.history()[0].sync.intervalsId, 'i9')
    putOk = true
    return core.sendOutbox()
  }).then((r) => {
    assert.equal(r.sent, 1)
    assert.equal(net.calls.filter((c) => c.method === 'POST').length, 1, 'one activity')
  })
})

test('send: a match deleted on the watch (UNDO) and saved again updates what was sent (ROAST 9)', () => {
  const net = fakeNet({
    'POST /api/v1/athlete/i42/activities': { status: 200, data: { id: 'i9' } },
    'PUT /api/v1/activity/i9': { status: 200, data: { id: 'i9' } }
  })
  const { core } = phone(net, { stravaClientId: '', intervalsKey: 'k', intervalsAthlete: 'i42' })
  const rec = finished('squash', rep('0', 33))
  const again = { ...rec, score: '11-0 11-0 10-0', sync: {} }
  return core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec }] }).then(() => core.sendOutbox())
    .then(() => core.sync({ settings: normalize(null), items: [{ op: 'delete', id: rec.id }] }))
    .then(() => core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: rec.id, rec: again }] }))
    .then(() => core.sendOutbox())
    .then(() => {
      assert.equal(net.calls.filter((c) => c.method === 'POST').length, 1, 'no second activity')
      assert.equal(net.calls.filter((c) => c.method === 'PUT').length, 2, 'the first one is updated')
    })
})

test('send: matches that keep failing wait for Retry now and never hold up newer ones (ROAST 9)', () => {
  const net = fakeNet({
    'GET /api/v3/athlete/activities': { status: 200, data: [] },
    'POST /api/v3/activities': (req) => (JSON.parse(req.body).start_date_local.endsWith('00') && JSON.parse(req.body).name.indexOf('Squash') === 0
      ? { status: 201, data: { id: 5 } } : { status: 500, data: null }),
    'PUT /api/v3/activities/5': { status: 200, data: { id: 5 } }
  })
  const { store, core } = phone(net, { stravaAuth: AUTH })
  const bad = [1, 2, 3, 4, 5, 6].map((i) => ({ ...finished('tennis', rep('0', 48)), id: 'b' + i, start: T0 - i * 86400000, curve: [] }))
  const good = { ...finished('squash', rep('0', 33)), id: 'g', curve: [] }
  return core.sync({ settings: normalize(null), items: bad.map((rec) => ({ op: 'upsert', id: rec.id, rec })) })
    .then(() => core.sync({ settings: normalize(null), items: [{ op: 'upsert', id: 'g', rec: good }] }))
    .then(() => core.sendOutbox(5))
    .then(() => core.sendOutbox(5))
    .then(() => {
      assert.ok(core.history().filter((x) => x.id === 'g')[0].sync.stravaId, 'the newer match went')
      for (let i = 0; i < 6; i++) store.outbox = JSON.stringify(JSON.parse(store.outbox).map((x) => ({ ...x, tries: 5 })))
      const before = net.calls.length
      return core.sendOutbox(5).then(() => {
        assert.equal(net.calls.length, before, 'failed five times: waits for Retry now')
        return core.sendOutbox(5, true)
      }).then(() => assert.ok(net.calls.length > before, 'Retry now tries them'))
    })
})

test('strava: Connect again after Strava took the access back uses the new sign-in (ROAST 9)', () => {
  const net = fakeNet({
    'POST /oauth/token': (req) => (JSON.parse(req.body).grant_type === 'authorization_code'
      ? { status: 200, data: { access_token: 'new', refresh_token: 'r2', expires_at: 2e9 } } : { status: 400, data: {} }),
    'GET /api/v3/athlete': (req) => (req.headers.Authorization === 'Bearer new' ? { status: 200, data: { firstname: 'Pavle' } } : { status: 401, data: {} })
  })
  const { store, core } = phone(net, { stravaAuth: AUTH, stravaCode: 'fresh' })
  return core.stravaCheck().then((ok) => {
    assert.equal(ok, true)
    assert.equal(store.stravaCode, '')
    assert.equal(JSON.parse(store.stravaAuth).access_token, 'new')
  })
})

test('strava: from 4 January 2027 the new API address goes first, the old one is the fallback (ROAST 5)', () => {
  const calls = []
  const make = (newUp) => ({
    http(req) {
      calls.push(req.url)
      if (req.url.startsWith('https://api-v3.strava.com')) return newUp ? Promise.resolve({ status: 200, data: { firstname: 'New' } }) : Promise.reject(new Error('no host'))
      return Promise.resolve({ status: 200, data: { firstname: 'Old' } })
    },
    wait: () => Promise.resolve()
  })
  const later = JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_at: Date.UTC(2028, 0, 1) / 1000 })
  const store = { stravaClientId: '1', stravaClientSecret: 's', stravaAuth: later }
  const storage = { getItem: (k) => store[k], setItem: (k, v) => (store[k] = v) }
  const before = createCore(storage, () => Date.UTC(2026, 11, 31), make(true))
  return before.stravaCheck().then(() => {
    assert.deepEqual(calls, ['https://www.strava.com/api/v3/athlete'], 'old address before the switch')
    calls.length = 0
    const down = createCore(storage, () => Date.UTC(2027, 0, 5), make(false))
    return down.stravaCheck()
  }).then((ok) => {
    assert.equal(ok, true)
    assert.deepEqual(calls, ['https://api-v3.strava.com/athlete', 'https://www.strava.com/api/v3/athlete'], 'new first, then old')
    assert.equal(store.stravaBase, 'https://www.strava.com/api/v3')
    calls.length = 0
    const up = createCore(storage, () => Date.UTC(2027, 0, 6), make(true))
    return up.stravaCheck()
  }).then(() => {
    assert.equal(calls[0], 'https://www.strava.com/api/v3/athlete', 'the one that answered goes first')
  })
})

test('strava: a sign-in made offline is kept for the next try (ROAST 9)', () => {
  const offline = { http: () => Promise.reject(new Error('no internet')), wait: () => Promise.resolve() }
  const { store, core } = phone(offline, { stravaCode: 'c0de' })
  return core.stravaCheck().then((ok) => {
    assert.equal(ok, false)
    assert.equal(store.stravaCode, 'c0de')
    assert.equal(JSON.parse(store.status).strava.key, 'err.offline')
  })
})

// ---------------------------------------------------------------- v2: heart rate zones and records

test('zones: the maximum, the zone of a heart rate, seconds per zone and percents (ROAST-v2 4)', () => {
  assert.equal(hrMaxOf({ hrMax: 0 }, 40), 180)
  assert.equal(hrMaxOf({ hrMax: 0 }, 0), 190, 'no age: 190')
  assert.equal(hrMaxOf({ hrMax: 175 }, 40), 175, 'the user\'s own')
  assert.equal(sanitize('hrMax', '400'), 0)
  assert.equal(sanitize('hrMax', '182'), 182)
  assert.equal(zoneOf(100, 200), 0)
  assert.equal(zoneOf(120, 200), 1)
  assert.equal(zoneOf(150, 200), 2, '75%: Z3')
  assert.equal(zoneOf(195, 200), 4)
  // 10 s at 100 (Z1), 10 s at 150 (Z3), 185 (Z5) then a gap of 5 minutes (only 60 s count), 120 (Z2) to the
  // end of the match; a reading of 30 is no heart rate
  const sec = zonesFromCurve([[0, 100], [10, 150], [20, 185], [320, 120], [330, 30]], 340, 200)
  assert.deepEqual(sec, [10, 20, 10, 0, 60])
  assert.equal(zonesFromCurve([], 100, 200), null)
  const pct = zonePercents([1, 1, 1, 0, 0])
  assert.equal(pct.reduce((a, b) => a + b, 0), 100)
  assert.equal(pct[3], 0)
})

test('records: longest match, point streak, wins in a row, matches in a week; celebrated from the 4th (ROAST-v2 5)', () => {
  const day = 86400000
  const mon = new Date(2026, 9, 19, 18, 0).getTime()
  const m = (i, dur, won, streak) => ({ id: 'r' + i, start: mon + i * day, dur, winner: won ? 0 : 1, stats: { streak: [streak, 1] } })
  const h = [m(0, 3000, true, 5), m(1, 4000, true, 7), m(2, 2000, false, 3), m(3, 3500, true, 4)]
  const r = records(h)
  assert.deepEqual([r.longest.value, r.streak.value, r.winRun.value, r.week.value], [4000, 7, 2, 4])
  assert.equal(r.longest.at, h[1].start)
  assert.deepEqual(newRecords(h.slice(0, 2), m(2, 9000, true, 9)), [], 'the first matches are not celebrated')
  const next = m(4, 5000, true, 2)
  assert.deepEqual(newRecords(h, next).map((x) => x.kind), ['longest', 'week'])
  assert.deepEqual(newRecords(h.concat([next]), next).map((x) => x.kind), ['longest', 'week'], 'the match already in the history')
})

// ---------------------------------------------------------------- free trial and KiezelPay (phase 5)

test('trial: 3 free matches of 5 minutes or more, then locked; what the trial can change', () => {
  setLang('en')
  assert.equal(FREE_MATCHES, 3)
  const tr0 = trialOf({})
  assert.deepEqual(tr0, { licensed: false, used: 0, left: 3, locked: false })
  assert.equal(trialLine(tr0), 'Free matches left: 3')
  const tr3 = trialOf({ trialIds: ['a', 'b', 'c'] })
  assert.equal(tr3.locked, true)
  assert.equal(trialLine(tr3), 'Free trial ended')
  assert.equal(trialOf({ used: 2 }).left, 1)
  assert.equal(trialOf({ licensed: true, trialIds: ['a', 'b', 'c'] }).locked, false)
  assert.equal(counts({ dur: 299 }), false)
  assert.equal(counts({ dur: 300 }), true)
  assert.equal(canEdit('vibePoint', tr0), true)
  assert.equal(canEdit('myName', tr0), false, 'names are the full version')
  assert.equal(canEdit('setups', tr0), false)
  assert.equal(canEdit('vibePoint', tr3), false, 'read-only after the trial')
  assert.equal(canEdit('lang', tr3), true)
  assert.equal(canEdit('myName', trialOf({ licensed: true })), true)
  const s = { id: 'x', sport: 'padel', rules: { ...defaultRules('padel'), deuce: 'noad' }, doubles: true, name: 'Friday', opponent: 'Luka', partner: 'Ana' }
  assert.deepEqual(playable(s, tr0), { ...s, rules: defaultRules('padel'), name: '', opponent: '', partner: '' })
  assert.equal(playable(s, trialOf({ licensed: true })), s)
})

function licenceIo(routes, extra) {
  const store = { ...(extra || {}) }
  const net = fakeNet(routes)
  const io = {
    get: (k) => store[k] || '',
    set: (k, v) => (store[k] = v),
    readJson: (k, f) => (store[k] ? JSON.parse(store[k]) : f),
    writeJson: (k, v) => (store[k] = JSON.stringify(v)),
    http: net.http,
    now: () => T0
  }
  return { store, net, io }
}

test('trial service: the phone sends hashes only and gets back what the watch used before a reinstall', () => {
  const key = 'u:WATCH1'
  const old = matchHash(key, 'm1')
  const { store, net, io } = licenceIo({ 'POST /v1/trial': (req) => {
    const b = JSON.parse(req.body)
    return { status: 200, data: { ids: [old].concat(b.ids).slice(0, 3) } }
  } })
  const lic = createLicence(io, 'APP')
  return lic.trial({ key, ids: ['m2'] }).then((r) => {
    const body = JSON.parse(net.calls[0].body)
    assert.equal(body.dev, devHash(key))
    assert.equal(body.dev.length, 64)
    assert.deepEqual(body.ids, [matchHash(key, 'm2')])
    assert.ok(net.calls[0].body.indexOf('WATCH1') < 0, 'the watch ID never leaves the phone')
    assert.deepEqual(r.ids, ['s:' + old, 'm2'])
    assert.equal(JSON.parse(store.licence).used, 2)
    assert.notEqual(devHash(key), devHash('u:WATCH2'))
  })
})

test('trial service: offline the watch keeps its own count', () => {
  const { io } = licenceIo({})
  io.http = () => Promise.reject(new Error('offline'))
  return createLicence(io, 'APP').trial({ key: 'u:W', ids: ['m1'] }).then((r) => assert.equal(r, null))
})

test('kiezelpay: a payment code, then licensed; a licensed watch unlocks a new phone', () => {
  let paid = false
  const { store, net, io } = licenceIo({ 'GET /api/v3/status': () => ({ status: 200, data: paid ? { status: 'licensed' } : { status: 'unlicensed', paymentCode: 482913 } }) })
  const lic = createLicence(io, '999')
  return lic.licence({ buy: true, used: 3, device: 8519936 }).then((r) => {
    assert.deepEqual(r, { licensed: false, code: '482913' })
    const url = net.calls[0].url
    assert.ok(url.indexOf('appid=999') > 0 && url.indexOf('platform=zepp') > 0 && url.indexOf('test=false') > 0)
    paid = true
    return lic.licence({ buy: true })
  }).then((r) => {
    assert.equal(r.licensed, true)
    assert.equal(lic.licensed(), true)
    // a new phone: the watch says it is unlocked
    const fresh = licenceIo({})
    const lic2 = createLicence(fresh.io, '999')
    lic2.fromWatch({ licensed: true })
    assert.equal(lic2.licensed(), true)
    assert.equal(JSON.parse(store.licence).code, '')
  })
})

test('kiezelpay: without the app ID the unlock screen hears that KiezelPay cannot be reached', () => {
  const { io, net } = licenceIo({})
  return createLicence(io, '').licence({ buy: true }).then(
    () => assert.fail('should not resolve'),
    (e) => {
      assert.ok(/app ID/.test(e.message))
      assert.equal(net.calls.length, 0)
    }
  )
})

test('sync: the answer carries the trial, the licence and how many matches the phone keeps', () => {
  const { core } = phone(fakeNet({ 'POST /v1/trial': { status: 200, data: { ids: [] } } }), { licence: '' })
  return core.sync({ settings: normalize(null), items: [], trial: { key: 'u:W', ids: [] }, used: 1 }).then((res) => {
    assert.equal(res.total, 0)
    assert.deepEqual(res.trial, { ids: [] })
    assert.deepEqual(res.licence, { licensed: false })
  })
})

test('errors: what the settings page says about each failure', () => {
  assert.equal(errorStatus({ what: 'Strava', status: 401 }, 'strava').key, 'err.stravaAuth')
  assert.equal(errorStatus({ what: 'Intervals.icu', status: 404 }, 'intervals').key, 'err.ivlAuth')
  assert.equal(errorStatus({ what: 'Strava', status: 429 }, 'strava').key, 'err.rate')
  assert.deepEqual(errorStatus({ what: 'Strava', status: 500 }, 'strava'), { key: 'err.http', vars: { what: 'Strava', code: 500 } })
})

await Promise.all(pending)
console.log(`${passed} tests passed`)
