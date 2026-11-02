// What the trial service gets instead of the real IDs (as SaunaPal, with RallyPal's own prefixes, so the
// two apps never share a count on the same service). Match IDs are start times, so they are hashed together
// with the watch key: without the watch's own ID nobody can turn a hash back into a time.

import { sha256 } from './sha256'

export function devHash(key) {
  return sha256('rallypal-watch|' + key)
}

export function matchHash(key, id) {
  return sha256('rallypal-match|' + key + '|' + id).slice(0, 16)
}
