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

/**
 * The crowdfunding: Dutch keeps the pun of "Geef een rondje" and counts in rounds of €5 ("Doel: 600
 * rondjes"); English, Spanish and French name the goal in euros instead, so nothing there reads like a
 * price per walk (Laurens, 5 okt 2026). The code passes both; these translations use the euros.
 */
const EUROS_NOT_ROUNDS: Record<string, string[]> = {
  'home.helpUs.rounds': ['{goal}', '{percent,plural}'],
  'support.goalRounds': ['{goal}'],
  'helpApp.goal': ['{goal}'],
}
/** Words for a walk, which never count money outside Dutch. */
const WALKS = /\b(rounds?|walks?|paseos?|balades?|promenades?)\b/i
/** The crowdfunding texts. */
const CROWDFUNDING = ['home.helpUs.', 'helpApp.', 'support.goalRounds', 'support.progress', 'support.onceGive', 'support.onceText', 'support.onceTitle']

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
        expect(signature(message), `${locale}: ${key}`).toEqual(EUROS_NOT_ROUNDS[key] ?? signature(source[key]))
      }
    })
    // /safety, after the walk: feedback about a hurt or stressed dog, or someone who felt unsafe, is stored
    // for our team to review (server/actions/walks.ts submitFeedback, `flagged`). Nobody is alerted, so
    // the text says where it goes ("komt meteen bij ons team"), not that the team knows at once.
    it(`${locale} promises no instant alert to the team after a walk (/safety)`, () => {
      expect(translated['safety.afterText'], locale).not.toMatch(/immediately|at once|al momento|enseguida|inmediatamente|immédiatement|tout de suite|prévenue/i)
    })
    it(`${locale} names the crowdfunding in euros, never in walks ("€5 = 1 round", "600 rounds")`, () => {
      const texts = Object.entries(translated).filter(([key]) => CROWDFUNDING.some((prefix) => key.startsWith(prefix)))
      expect(texts.length).toBeGreaterThan(5)
      for (const [key, message] of texts) {
        // The words people read, without the argument names ({round} is the amount of €5).
        const words = message.replace(/\{\s*\w+/g, '{')
        expect(words, `${locale}: ${key}`).not.toMatch(WALKS)
        expect(words, `${locale}: ${key}`).not.toMatch(/=\s*1\b/)
      }
    })
  }
})
