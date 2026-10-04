import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import banned from './banned-phrases.json'

type Tree = { [key: string]: string | Tree }
type Locale = 'nl' | 'en' | 'es' | 'fr'

/**
 * The texts that nudge someone towards something: notifications (in the app, as a push and by
 * email) and seintjes, the next step and the first steps on Vandaag, Guus, the town challenge and
 * the week card. Not the whole file: "Welkom terug" when logging in, "nog # plekken" on a group
 * walk and "Geen streaks" on /progress are right where they are. A key that starts with one of
 * these is checked; keys added later under the same names are checked too.
 */
const PUSH_TEXTS = [
  'notifications.kinds.',
  'notifications.stopped',
  'email.kinds.',
  'email.reminderFooter',
  'pushAsk.',
  'profile.reminders',
  'profile.alerts',
  'today.',
  'challenges.',
  'discover.together',
  'discover.mine',
  'progress.week',
  'progress.activeWeeks',
  'walkDone.',
  // Not on the web yet: Guus and "één ding nu" are checked as soon as they get texts.
  'guus.',
  'nextStep.',
]
const NOT_YET = new Set(['guus.', 'nextStep.'])

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

/** Every way a message can read, with each {argument} and # as "2", every plural and select option. */
function readings(message: string): string[] {
  const walk = (elements: MessageFormatElement[]): string[] => {
    let texts = ['']
    for (const el of elements) {
      let options: string[]
      if (el.type === TYPE.literal) options = [el.value]
      else if (el.type === TYPE.pound || el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) options = ['2']
      else if (el.type === TYPE.plural || el.type === TYPE.select) options = Object.values(el.options).flatMap((o) => walk(o.value))
      else if (el.type === TYPE.tag) options = walk(el.children)
      else options = ['']
      texts = texts.flatMap((t) => options.map((o) => t + o))
      // A long message with many choices: keep one reading per choice instead of every combination.
      if (texts.length > 500) texts = [...new Set(texts)].slice(0, 500)
    }
    return texts
  }
  return [...new Set(walk(parse(message, { ignoreTag: false })))]
}

const patterns = (locale: Locale) => [...banned.all, ...banned[locale]].map((p) => new RegExp(p, 'iu'))

/** The banned phrases found in a text, if any. */
function pressure(text: string, locale: Locale): string[] {
  return patterns(locale)
    .filter((re) => re.test(text))
    .map((re) => re.source)
}

const all = { nl, en, es, fr } as Record<Locale, Tree>

describe('no pressure in texts that nudge', () => {
  for (const [locale, messages] of Object.entries(all) as [Locale, Tree][]) {
    it(`${locale}: no banned phrase in notifications, seintjes, the next step, the challenge or the week card`, () => {
      const flat = flatten(messages)
      const keys = Object.keys(flat).filter((key) => PUSH_TEXTS.some((p) => key.startsWith(p)))
      for (const prefix of PUSH_TEXTS) {
        if (!NOT_YET.has(prefix)) expect(keys.some((k) => k.startsWith(prefix)), `${locale}: nothing under ${prefix}`).toBe(true)
      }
      const found = keys.flatMap((key) => readings(flat[key]).flatMap((text) => pressure(text, locale).map((p) => `${key}: "${text}" (${p})`)))
      expect([...new Set(found)]).toEqual([])
    })
  }

  it('catches the texts that were taken out', () => {
    const old: [Locale, string][] = [
      ['nl', 'Het weekend komt eraan! Nog {left, plural, one {# rondje} other {# rondjes}} voor je weekdoel.'],
      ['nl', '{n, plural, one {Nog # dag} other {Nog # dagen}}'],
      ['nl', 'Fijn dat je er weer bent!'],
      ['nl', 'Nog maar weinig wandelaars bij jou in de buurt.'],
      ['nl', 'We missen je! Je raakt je streak kwijt.'],
      ['en', 'The weekend is coming! {left, plural, one {# more walk} other {# more walks}} for your weekly goal.'],
      ['en', 'Welcome back! Only {n} days left.'],
      ['es', '¡Llega el fin de semana! {left, plural, one {Te falta # paseo} other {Te faltan # paseos}} para tu objetivo semanal.'],
      ['es', '{n, plural, one {Queda # día} other {Quedan # días}}'],
      ['fr', 'Le week-end arrive ! Plus que {left, plural, one {# balade} other {# balades}} pour votre objectif.'],
      ['fr', 'Bon retour sur Rondje ! Vous allez perdre votre série.'],
    ]
    for (const [locale, message] of old) {
      expect(readings(message).every((text) => pressure(text, locale).length > 0), `${locale}: ${message}`).toBe(true)
    }
  })

  it('leaves calm texts alone', () => {
    const calm: [Locale, string][] = [
      ['nl', '{dogName} staat gewoon online, maar er wonen nog weinig wandelaars bij jou in de buurt.'],
      ['nl', '{done} van {goal, plural, one {# rondje} other {# rondjes}}'],
      ['en', '{dogName} is online, but few walkers live near you yet.'],
      ['es', '{dogName} está en línea, pero todavía viven pocos paseadores cerca de ti.'],
      ['fr', 'Peu de promeneurs habitent encore près de chez vous.'],
    ]
    for (const [locale, message] of calm) {
      expect(readings(message).flatMap((text) => pressure(text, locale)), `${locale}: ${message}`).toEqual([])
    }
  })

  it('is one list that every language and the iPhone app can read', () => {
    expect(Object.keys(banned).sort()).toEqual(['about', 'all', 'en', 'es', 'fr', 'nl'])
    for (const list of [banned.all, banned.nl, banned.en, banned.es, banned.fr]) {
      expect(list.length).toBeGreaterThan(0)
      for (const p of list) expect(() => new RegExp(p, 'iu'), p).not.toThrow()
    }
  })
})
