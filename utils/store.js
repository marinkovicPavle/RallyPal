// JSON files in the app's /data folder. Files (not localStorage) because the background service reads
// what the pages wrote, and a file is always read fresh.

import { readFileSync, writeFileSync, rmSync } from '@zos/fs'

export const FILES = {
  settings: 'settings.json', // { values, stamps }
  active: 'match.json', // the match being played (saved after every point)
  hr: 'hr.json', // { id, hr: [[sec, bpm]] } its heart rate, saved less often (the file grows)
  history: 'history.json', // finished matches, newest first
  outbox: 'outbox.json', // [{ op: 'upsert' | 'delete', id }] waiting for the phone
  meta: 'meta.json', // { lastSetup, bgAsked, restoredAt, restorePage, licensed, trialIds, payCode }
  bg: 'bg.json', // heart rate the background service recorded while the app was closed
  alive: 'alive.json' // { at }: when the match page was last on screen
}

export function readJson(name, fallback) {
  try {
    const raw = readFileSync({ path: name, options: { encoding: 'utf8' } })
    if (raw === undefined || raw === null || raw === '') return fallback
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}

export function writeJson(name, value) {
  try {
    writeFileSync({ path: name, data: JSON.stringify(value), options: { encoding: 'utf8' } })
    return true
  } catch (e) {
    return false
  }
}

export function removeFile(name) {
  try {
    rmSync({ path: name })
  } catch (e) {}
}
