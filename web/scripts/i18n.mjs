// Translation helper. Dutch (messages/nl.json) is the source of truth.
//   node scripts/i18n.mjs missing <locale>          → flat JSON of keys <locale> lacks, with the Dutch text
//   node scripts/i18n.mjs merge <locale> <file>     → merge a flat or nested JSON file into messages/<locale>.json
//   node scripts/i18n.mjs set nl <file>             → same, for adding new Dutch keys
// Keys are written in Dutch key order. Run `npm test` afterwards: src/i18n/messages.test.ts checks
// parity, placeholders and rich-text tags.
import { readFileSync, writeFileSync } from 'node:fs'

const [command, locale, file] = process.argv.slice(2)
const read = (l) => JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'))

function flatten(tree, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, path, out)
    else out[path] = value
  }
  return out
}

function unflatten(flat) {
  const tree = {}
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.')
    let node = tree
    for (const part of parts.slice(0, -1)) node = node[part] ??= {}
    node[parts.at(-1)] = value
  }
  return tree
}

function write(l, flat) {
  // Order keys like Dutch; keys Dutch lacks (only possible for nl itself) go last.
  const order = Object.keys(flatten(read('nl')))
  const sorted = {}
  for (const key of order) if (key in flat) sorted[key] = flat[key]
  for (const key of Object.keys(flat)) if (!(key in sorted)) sorted[key] = flat[key]
  writeFileSync(`messages/${l}.json`, JSON.stringify(unflatten(sorted), null, 2) + '\n')
}

if (command === 'missing') {
  const source = flatten(read('nl'))
  const target = flatten(read(locale))
  const missing = Object.fromEntries(Object.entries(source).filter(([k]) => !(k in target)))
  console.log(JSON.stringify(missing, null, 1))
} else if (command === 'merge' || command === 'set') {
  const incoming = flatten(JSON.parse(readFileSync(file, 'utf8')))
  const current = flatten(read(locale))
  write(locale, { ...current, ...incoming })
  console.log(`${locale}: ${Object.keys(incoming).length} keys merged`)
} else {
  console.error('usage: node scripts/i18n.mjs missing <locale> | merge <locale> <file> | set nl <file>')
  process.exit(1)
}
