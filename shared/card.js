// What the shortcut card shows (drawn by app-widget/index.js). Plain data, so it is tested with node.
//   idle:  the last match ("Last: won 6–4 3–6 10–7", "Marko · Tennis · Today") and NEW MATCH
//   match: a match is being played: its score and CONTINUE

import { view, scoreText } from './match'
import { t } from './i18n'
import { prettyScore, dayLabel, resultOf } from './format'
import { sportName } from './setups'

export function lastLine(rec) {
  const score = prettyScore(rec.score)
  const r = resultOf(rec)
  return r === 'ended' ? t('home.lastPlain', { score }) : t('home.last', { result: t('home.' + r), score })
}

export function cardView(active, history, now) {
  if (active) {
    const v = view(active)
    let score = prettyScore(scoreText(v))
    if (!v.done && v.model === 'tennis' && !v.tb) score = (score || '0–0') + ` · ${v.shown[0]}–${v.shown[1]}`
    const n = active.names || {}
    const who = n.opponent || sportName(active.sport)
    return {
      mode: 'match',
      line1: t('card.inPlay', { score: score || '0–0' }),
      line2: who === sportName(active.sport) ? who : `${who} · ${sportName(active.sport)}`,
      button: t('card.continue')
    }
  }
  const last = history && history[0]
  if (!last) return { mode: 'idle', line1: '', line2: '', button: t('home.newMatch') }
  const bits = []
  if (last.names && last.names.opponent) bits.push(last.names.opponent)
  bits.push(sportName(last.sport), dayLabel(last.start, now))
  return { mode: 'idle', line1: lastLine(last), line2: bits.join(' · '), button: t('home.newMatch') }
}
