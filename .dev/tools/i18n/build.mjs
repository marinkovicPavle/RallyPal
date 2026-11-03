// Writes every language's watch texts (shared/lang/<code>.js) into the app's assets, raw/lang/<code>.json in
// common.r and common.s, which the watch reads (utils/lang.js). Characters outside ASCII are written as \u
// escapes, so the watch reads the file as plain ASCII. Run after the texts change; the tests check the files
// are up to date.
//
// Usage: node .dev/tools/i18n/build.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..', '..')
const require = createRequire(import.meta.url)
const esbuild = require(process.env.ESBUILD || 'esbuild')

export function asciiJson(value) {
  return JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4))
}

const out = path.join(root, '.dev', 'tools', 'i18n', '.lang.mjs')
esbuild.buildSync({ entryPoints: [path.join(root, 'shared', 'lang', 'all.js')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const all = (await import(pathToFileURL(out).href + '?' + Date.now())).default
fs.rmSync(out)
let n = 0
for (const shape of ['common.r', 'common.s']) {
  const dir = path.join(root, 'assets', shape, 'raw', 'lang')
  fs.mkdirSync(dir, { recursive: true })
  for (const code of Object.keys(all)) {
    fs.writeFileSync(path.join(dir, code + '.json'), asciiJson(all[code]))
    n++
  }
}
console.log(`${Object.keys(all).length} languages written to assets/common.r and common.s (${n} files)`)
