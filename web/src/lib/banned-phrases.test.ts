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
  // The sign-up page (/aanmelden): an invitation, never a push.
  'join.',
  'email.kinds.',
  'email.reminderFooter',
  'pushAsk.',
  'profile.reminders',
  'profile.alerts',
  // The home page asks for help and shows new dogs: warm, never a countdown or guilt.
  'home.helpUs.',
  'landing.dogs.',
  'today.',
  'challenges.',
  'progress.week',
  'progress.activeWeeks',
  'walkDone.',
  // "Help ons via Whydonate" in the apps and on /support: an invitation, never pressure or guilt.
  'helpApp.',
  'support.onceGive',
  'support.faq.appVia',
  // The Hondenschool: the lessons, the path, the wall after lesson 1, and the new lines around the quiz.
  'school.',
  'quiz.honest',
  'quiz.lessonLink',
  'quiz.schoolFirst',
  'profileHub.schoolText',
  'safety.schoolText',
  'safety.schoolLink',
  // "Eén ding nu" on Vandaag (lib/next-step.ts). Guus is not on the web yet: checked as soon as he gets texts.
  'nextStep.',
  // Changed terms (art. 19): a calm notice and one "Akkoord", never a countdown or pressure.
  'termsUpdate.',
  'request.reasons.needs-terms',
  'request.reasons.terms-changed',
  'guus.',
]
const NOT_YET = new Set(['guus.'])
/** The Hondenschool texts, which also get the "lessons" patterns (no points to earn, no XP, no hearts). */
const LESSON_TEXTS = ['school.', 'quiz.honest', 'quiz.lessonLink', 'quiz.schoolFirst', 'profileHub.schoolText', 'safety.schoolText', 'safety.schoolLink']

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

const patterns = (locale: Locale, lesson = false) =>
  [...banned.all, ...banned[locale], ...(lesson ? [...banned.lessons.all, ...banned.lessons[locale]] : [])].map((p) => new RegExp(p, 'iu'))

/** The banned phrases found in a text, if any. `lesson`: a Hondenschool text, with the extra lesson patterns. */
function pressure(text: string, locale: Locale, lesson = false): string[] {
  return patterns(locale, lesson)
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
      const found = keys.flatMap((key) => {
        const lesson = LESSON_TEXTS.some((p) => key.startsWith(p))
        return readings(flat[key]).flatMap((text) => pressure(text, locale, lesson).map((p) => `${key}: "${text}" (${p})`))
      })
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

  it('in a lesson: no points to earn, no XP and no hearts', () => {
    const game: [Locale, string][] = [
      ['nl', 'Verdien 10 punten met deze les!'],
      ['nl', 'Punten verdienen met de Hondenschool'],
      ['nl', 'Je hebt 3 hartjes.'],
      ['en', 'Earn 10 XP for this lesson.'],
      ['en', 'Earn points with every lesson.'],
      ['en', 'You have 3 hearts.'],
      ['es', '¡Gana 10 puntos con esta lección!'],
      ['es', 'Te quedan corazones.'],
      ['fr', 'Gagnez des points à chaque leçon.'],
      ['fr', 'Il vous reste des cœurs.'],
    ]
    for (const [locale, message] of game) {
      expect(readings(message).every((text) => pressure(text, locale, true).length > 0), `${locale}: ${message}`).toBe(true)
    }
    // Only in lessons: on the progress pages walks do give points.
    expect(pressure('Zo verdien je punten', 'nl')).toEqual([])
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
    expect(Object.keys(banned).sort()).toEqual(['about', 'all', 'en', 'es', 'fr', 'lessons', 'nl'])
    expect(Object.keys(banned.lessons).sort()).toEqual(['about', 'all', 'en', 'es', 'fr', 'nl'])
    const { lessons } = banned
    for (const list of [banned.all, banned.nl, banned.en, banned.es, banned.fr, lessons.all, lessons.nl, lessons.en, lessons.es, lessons.fr]) {
      expect(list.length).toBeGreaterThan(0)
      for (const p of list) expect(() => new RegExp(p, 'iu'), p).not.toThrow()
    }
  })
})
