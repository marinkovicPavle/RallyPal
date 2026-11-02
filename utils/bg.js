// Heart rate while RallyPal is not on screen (from SaunaPal).
//
// With "Off with wrist down" the screen goes off between points and Zepp OS closes a mini app a few
// seconds later; raising the wrist opens the match again (setWakeUpRelaunch). Meanwhile the background
// service (app-service/hr) records the heart rate into bg.json, and the match page adds it to the match
// when it opens. It needs the watch's "run in background" permission, asked once at the first match.

import { start as startService, stop as stopService } from '@zos/app-service'
import { queryPermission, requestPermission } from '@zos/app'
import { FILES, readJson, writeJson, removeFile } from './store'

const SERVICE = 'app-service/hr'
const BG_PERMISSION = 'device:os.bg_service'

export function hasBgPermission() {
  try {
    const r = queryPermission({ permissions: [BG_PERMISSION] })
    return r && r[0] === 2
  } catch (e) {
    return false
  }
}

// Asks once (the watch shows its own prompt); cb(granted)
export function askBgPermission(cb) {
  if (hasBgPermission()) return cb && cb(true)
  try {
    const r = requestPermission({
      permissions: [BG_PERMISSION],
      callback: (result) => cb && cb(!!(result && result[0] === 2))
    })
    if (r === 2) cb && cb(true)
  } catch (e) {
    cb && cb(false)
  }
}

export function startMonitor(m) {
  if (!hasBgPermission()) return false
  try {
    startService({ file: SERVICE, param: JSON.stringify({ id: m.id }), complete_func: () => {} })
    return true
  } catch (e) {
    return false
  }
}

export function stopMonitor() {
  try {
    stopService({ file: SERVICE, complete_func: () => {} })
  } catch (e) {}
}

// The page tells the service whether it is on screen (the service records only while it is not)
export function markAlive(now) {
  writeJson(FILES.alive, { at: now })
}

export function markGone() {
  writeJson(FILES.alive, { at: 0 })
}

// What the service recorded while the app was closed: { id, hr: [[sec, bpm]] }
export function takeBg(id) {
  const bg = readJson(FILES.bg, null)
  removeFile(FILES.bg)
  if (!bg || bg.id !== id) return null
  return bg
}
