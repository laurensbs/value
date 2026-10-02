import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

/** Arguments ({name}, plurals) and rich-text tags (<terms>) a message uses. */
function signature(message: string): string[] {
  const found = new Set<string>()
  const walk = (elements: MessageFormatElement[]) => {
    for (const el of elements) {
      if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) found.add(`{${el.value}}`)
      if (el.type === TYPE.plural || el.type === TYPE.select) {
        found.add(`{${el.value},${el.type === TYPE.plural ? 'plural' : 'select'}}`)
        for (const option of Object.values(el.options)) walk(option.value)
      }
      if (el.type === TYPE.tag) {
        found.add(`<${el.value}>`)
        walk(el.children)
      }
    }
  }
  walk(parse(message, { ignoreTag: false }))
  return [...found].sort()
}

const source = flatten(nl as Tree)

describe('interface translations', () => {
  it('every Dutch message parses', () => {
    for (const [key, message] of Object.entries(source)) expect(() => signature(message), key).not.toThrow()
  })

  for (const [locale, messages] of Object.entries({ en, es, fr })) {
    const translated = flatten(messages as Tree)
    it(`${locale} has exactly the Dutch keys`, () => {
      expect(Object.keys(translated).filter((k) => !(k in source)), 'extra').toEqual([])
      expect(Object.keys(source).filter((k) => !(k in translated)), 'missing').toEqual([])
    })
    it(`${locale} keeps every placeholder and tag`, () => {
      for (const [key, message] of Object.entries(translated)) {
        if (!(key in source)) continue
        expect(signature(message), `${locale}: ${key}`).toEqual(signature(source[key]))
      }
    })
  }
})
