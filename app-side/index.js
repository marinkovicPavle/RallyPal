// Side service in the Zepp phone app. The watch talks to it with SYNC, RESTORE (utils/sync.js) and LICENCE
// (the unlock screen, utils/licence.js); the
// settings page asks it, through settings storage, to check the Strava and Intervals.icu connections.
// Matches go to Strava and Intervals.icu after the watch has its answer (core.sendOutbox).

import { BaseSideService, settingsLib } from '@zeppos/zml/base-side'
import { createCore } from './core'

function http(req) {
  return fetch({ url: req.url, method: req.method || 'GET', headers: req.headers || {}, body: req.body }).then((res) => {
    let data = res.body
    if (typeof data === 'string') {
      try {
        data = data ? JSON.parse(data) : null
      } catch (e) {}
    }
    return { status: res.status || 200, data }
  })
}

function wait(ms) {
  return new Promise((done) => (typeof setTimeout === 'function' ? setTimeout(done, ms) : done()))
}

const core = createCore(settingsLib, null, { http, wait })

// Sends what waits; a Strava upload still being processed is asked about again a little later.
// force: Retry now on the settings page, which also tries the matches that failed several times.
function send(round, force) {
  const n = round || 0
  return core.sendOutbox(5, force).then((r) => {
    if (r && r.waiting && n < 3) return wait(20000).then(() => send(n + 1))
    return r
  })
}

// The settings page writes a command into storage; the side service runs it and clears it
function runCommand(value) {
  let cmd = null
  try {
    cmd = value ? JSON.parse(value) : null
  } catch (e) {}
  if (!cmd || !cmd.do) return Promise.resolve()
  settingsLib.setItem('cmd', '')
  if (cmd.do === 'intervalsCheck') return core.intervalsCheck()
  if (cmd.do === 'stravaCheck') return core.stravaCheck()
  if (cmd.do === 'retry') return send(0, true)
  return Promise.resolve()
}

AppSideService(
  BaseSideService({
    onInit() {},

    onRequest(req, res) {
      const fail = (e) => res(null, { error: String((e && e.message) || e) })
      if (req.method === 'SYNC') {
        core.sync(req.params).then((r) => {
          res(null, r)
          send()
        }).catch(fail)
      } else if (req.method === 'RESTORE') core.restore(req.params).then((r) => res(null, r)).catch(fail)
      else if (req.method === 'LICENCE') core.licence(req.params).then((r) => res(null, r)).catch(fail)
      else res('unknown method')
    },

    onSettingsChange({ key, newValue }) {
      if (key === 'cmd') runCommand(newValue)
      // a new Strava sign-in: checked at once, so the settings page shows the result
      if ((key === 'stravaCode' || key === 'stravaAuth') && newValue) core.stravaCheck()
      // a match renamed on the phone page: its Strava and Intervals.icu titles follow
      if (key === 'phoneEdits') {
        core.resendEdited()
        send()
      }
    },

    onRun() {
      runCommand(settingsLib.getItem('cmd'))
      send()
    },

    onDestroy() {}
  })
)
