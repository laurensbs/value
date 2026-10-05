import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { cleanLessonIds, GUEST_LESSON, LESSON_IDS, LESSONS, lessonMessageKeys, nextLesson, QUIZ_LESSON } from './lessons'
import { QUIZ } from './quiz'

type Tree = { [key: string]: string | Tree }
type Locale = 'nl' | 'en' | 'es' | 'fr'
const all: Record<Locale, Tree> = { nl, en, es, fr } as Record<Locale, Tree>

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

const used = LESSONS.flatMap(lessonMessageKeys)

describe('the Hondenschool lessons', () => {
  it('are the five lessons of the iPhone app, in path order, and lesson 1 is the one without an account', () => {
    expect(LESSONS.map((l) => l.id)).toEqual(['hello', 'body', 'meet', 'weather', 'help'])
    expect(LESSON_IDS).toEqual(LESSONS.map((l) => l.id))
    expect(GUEST_LESSON).toBe(LESSONS[0].id)
  })

  it('are bite-sized: 4 to 6 cards, one idea or one question each', () => {
    for (const lesson of LESSONS) {
      expect(lesson.cards.length, lesson.id).toBeGreaterThanOrEqual(4)
      expect(lesson.cards.length, lesson.id).toBeLessThanOrEqual(6)
      expect(new Set(lesson.cards.map((c) => c.key)).size, `${lesson.id}: card keys`).toBe(lesson.cards.length)
    }
  })

  it('every question has exactly one right answer among two or three, and pictures for all options or none', () => {
    for (const lesson of LESSONS) {
      for (const card of lesson.cards) {
        if (card.kind !== 'choice') continue
        expect(card.options, `${lesson.id}.${card.key}`).toBeGreaterThanOrEqual(2)
        expect(card.options, `${lesson.id}.${card.key}`).toBeLessThanOrEqual(3)
        expect(card.correct).toBeGreaterThanOrEqual(0)
        expect(card.correct).toBeLessThan(card.options)
        if (card.art) expect(card.art.length, `${lesson.id}.${card.key}`).toBe(card.options)
      }
    }
  })

  it('covers every quiz question, so a miss in the quiz can point to the right lesson', () => {
    expect(Object.keys(QUIZ_LESSON).sort()).toEqual(QUIZ.map((q) => q.id).sort())
    for (const lesson of Object.values(QUIZ_LESSON)) expect(LESSON_IDS).toContain(lesson)
  })

  for (const locale of ['nl', 'en', 'es', 'fr'] as Locale[]) {
    const flat = flatten(all[locale])

    it(`${locale}: has every lesson text, and nothing left over`, () => {
      const missing = used.filter((key) => !flat[key]?.trim())
      expect(missing).toEqual([])
      const extra = Object.keys(flat).filter((key) => key.startsWith('school.lessons.') && !used.includes(key))
      expect(extra).toEqual([])
    })

    it(`${locale}: the texts use the app's name through {app}, never written out, and no long dashes`, () => {
      const school = Object.entries(flat).filter(([key]) => key.startsWith('school.') || ['quiz.honest', 'quiz.lessonLink', 'quiz.schoolFirst'].includes(key))
      expect(school.length).toBeGreaterThan(used.length)
      for (const [key, text] of school) {
        expect(text, key).not.toMatch(/Rondje|Woofmigo/)
        expect(text, key).not.toContain('—')
      }
      expect(flat['school.lessons.meet.id']).toContain('{app}')
    })

    it(`${locale}: the hand on the pavement takes as long as the card says`, () => {
      const hold = LESSONS.flatMap((l) => l.cards.map((c) => ({ lesson: l.id, card: c }))).filter(({ card }) => card.kind === 'hold')
      expect(hold.length).toBeGreaterThan(0)
      for (const { lesson, card } of hold) {
        if (card.kind !== 'hold') continue
        expect(flat[`school.lessons.${lesson}.${card.key}.text`]).toContain(String(card.seconds))
      }
    })

    it(`${locale}: after lesson 1 the wall only says what an account adds: nothing about saving or losing`, () => {
      const wall = ['school.wallTitle', 'school.wallText', 'school.wallSignup', 'school.wallLogin', 'school.done', 'school.doneCount'].map((k) => flat[k])
      for (const text of wall) {
        expect(text).toBeTruthy()
        expect(text).not.toMatch(/bewaar|opslaan|kwijt|verlies|\bsave|\blose|\bkeep\b|guard|perd|sauvegard|conserv/i)
      }
    })
  }

  it('walking alone takes what rules.ts asks (canRequestSolo): the owner\'s trust, the ID seen in person, the quiz, and live location on', () => {
    const solo = LESSONS.find((l) => l.id === 'meet')!.cards.find((c) => c.key === 'solo')!
    expect(solo.kind === 'choice' && solo.correct).toBe(0)
    const needs: Record<Locale, RegExp[]> = {
      nl: [/vertrouwen/, /\bID\b.*in het echt/, /quiz/, /live locatie/],
      en: [/trusts you/, /\bID\b in person/, /quiz/, /live location/],
      es: [/confía en ti/, /documento en persona/, /test/, /ubicación en directo/],
      fr: [/confiance/, /pièce d'identité en personne/, /quiz/, /localisation en direct/],
    }
    for (const locale of ['nl', 'en', 'es', 'fr'] as Locale[]) {
      const answer = flatten(all[locale])['school.lessons.meet.solo.a0']
      for (const need of needs[locale]) expect(answer, locale).toMatch(need)
    }
  })

  it('the quiz says honestly what it is, and never that it cannot be guessed', () => {
    const flat = flatten(all.nl)
    expect(flat['quiz.honest']).toBe('De quiz leert je de regels; de eigenaar beslist of je alleen mag.')
    for (const locale of ['nl', 'en', 'es', 'fr'] as Locale[]) {
      for (const [key, text] of Object.entries(flatten(all[locale]))) expect(text, key).not.toMatch(/niet te raden|can'?t be guessed|cannot be guessed/i)
    }
  })
})

describe('lesson ids from outside (localStorage, a form)', () => {
  it('keeps only real lessons, each once, in path order', () => {
    expect(cleanLessonIds(['meet', 'hello', 'meet', 'nope', 3, null])).toEqual(['hello', 'meet'])
    expect(cleanLessonIds('hello')).toEqual([])
    expect(cleanLessonIds(undefined)).toEqual([])
  })

  it('the next lesson is the first one not done yet', () => {
    expect(nextLesson([])).toBe('hello')
    expect(nextLesson(['hello', 'meet'])).toBe('body')
    expect(nextLesson(LESSON_IDS)).toBeNull()
  })
})
