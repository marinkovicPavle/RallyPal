// Times, dates and scores as the screens write them.

import { t } from './i18n'

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

// 47:12, 1:12:05
export function clock(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

// 1:12, 0:37: hours and minutes, as History lists a match
export function hm(sec) {
  const m = Math.round(Math.max(0, sec || 0) / 60)
  return `${Math.floor(m / 60)}:${pad(m % 60)}`
}

export function timeOfDay(ts) {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dayStart(ts) {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function shortDate(ts) {
  const d = new Date(ts)
  return t('date.short', { month: t('months')[d.getMonth()], d: d.getDate() })
}

// Today, Yesterday, Sat 18 (this week), Oct 2
export function dayLabel(ts, now) {
  const days = Math.round((dayStart(now) - dayStart(ts)) / 86400000)
  if (days <= 0) return t('day.today')
  if (days === 1) return t('day.yesterday')
  const d = new Date(ts)
  if (days < 7) return t('date.weekday', { day: t('days')[d.getDay()], d: d.getDate() })
  return shortDate(ts)
}

// "6-4 6-7(5) [10-8]" (match.js scoreText) as the screens show it: "6–4 6–7(5) 10–8"; sep between sets
export function prettyScore(score, sep) {
  if (!score) return ''
  return score
    .split(' ')
    .map((s) => s.replace(/[[\]]/g, '').replace('-', '–'))
    .join(sep || ' ')
}

export function percent(won, of) {
  return of ? `${Math.round((100 * won) / of)}%` : '–'
}

// won / lost / draw / ended, from the wearer's side
export function resultOf(rec) {
  if (rec.draw) return 'draw'
  if (rec.winner === 0) return 'won'
  if (rec.winner === 1) return 'lost'
  return 'ended'
}
