// The Hondenschool: five short lessons about walking safely, the same five as the iPhone app
// (ios/Rondje/Features/Lessons/LessonContent.swift), card for card. The texts live in messages under
// "school.lessons.<lesson>", Dutch as the source. Two sentences say where things are on the website
// instead of in the app: the "Hulp nodig" button and "Melden" after the walk.
//
// The lessons unlock nothing by themselves and give no points: the server-checked quiz stays the
// gate for asking, and the owner decides about walking alone. Lesson 1 works without an account.

export type DogMood = 'neutral' | 'happy' | 'sleepy' | 'uneasy'

/** The three dogs of the body-language lesson, the same as the app's IntroView looks. */
export type LessonDog = 'golden' | 'border' | 'brown'

export type LessonIcon = 'wave' | 'eye' | 'users' | 'sun' | 'help' | 'user' | 'id' | 'snow' | 'light' | 'alert'

export type LessonArt =
  | { kind: 'guus'; mood: DogMood }
  | { kind: 'dog'; dog: LessonDog; mood: DogMood }
  | { kind: 'icon'; icon: LessonIcon; tone?: 'sos' }

/**
 * One card: one idea or one question.
 * - info: `school.lessons.<lesson>.<key>` is the sentence.
 * - choice: `.q` the question, `.a<i>` the options, `.why<i>` one kind sentence for each wrong option,
 *   `.explain` what Guus says after the right one. Exactly one option is right.
 * - hold: something to do for real, like a hand on the pavement: `.text`, then `.after`.
 */
export type LessonCard =
  | { kind: 'info'; key: string; art: LessonArt }
  | { kind: 'choice'; key: string; options: number; correct: number; art?: LessonArt[] }
  | { kind: 'hold'; key: string; seconds: number }

export const LESSON_IDS = ['hello', 'body', 'meet', 'weather', 'help'] as const
export type LessonId = (typeof LESSON_IDS)[number]

export interface Lesson {
  id: LessonId
  icon: LessonIcon
  cards: LessonCard[]
}

/** The lesson anyone can do without an account. */
export const GUEST_LESSON: LessonId = 'hello'

export const LESSONS: Lesson[] = [
  {
    id: 'hello',
    icon: 'wave',
    cards: [
      { kind: 'info', key: 'sniff', art: { kind: 'guus', mood: 'happy' } },
      { kind: 'choice', key: 'first', options: 3, correct: 0 },
      { kind: 'info', key: 'ask', art: { kind: 'icon', icon: 'user' } },
      { kind: 'choice', key: 'away', options: 2, correct: 0 },
    ],
  },
  {
    id: 'body',
    icon: 'eye',
    cards: [
      { kind: 'info', key: 'signals', art: { kind: 'dog', dog: 'border', mood: 'uneasy' } },
      {
        kind: 'choice',
        key: 'space',
        options: 3,
        correct: 1,
        art: [
          { kind: 'dog', dog: 'golden', mood: 'happy' },
          { kind: 'dog', dog: 'border', mood: 'uneasy' },
          { kind: 'dog', dog: 'brown', mood: 'sleepy' },
        ],
      },
      { kind: 'choice', key: 'then', options: 3, correct: 0 },
      { kind: 'info', key: 'whole', art: { kind: 'icon', icon: 'eye' } },
    ],
  },
  {
    id: 'meet',
    icon: 'users',
    cards: [
      { kind: 'info', key: 'together', art: { kind: 'guus', mood: 'happy' } },
      { kind: 'info', key: 'id', art: { kind: 'icon', icon: 'id' } },
      { kind: 'choice', key: 'bring', options: 3, correct: 0 },
      { kind: 'choice', key: 'solo', options: 2, correct: 0 },
      { kind: 'choice', key: 'leash', options: 2, correct: 0 },
    ],
  },
  {
    id: 'weather',
    icon: 'sun',
    cards: [
      { kind: 'hold', key: 'hand', seconds: 7 },
      { kind: 'choice', key: 'hot', options: 3, correct: 0 },
      { kind: 'info', key: 'salt', art: { kind: 'icon', icon: 'snow' } },
      { kind: 'info', key: 'dark', art: { kind: 'icon', icon: 'light' } },
    ],
  },
  {
    id: 'help',
    icon: 'help',
    cards: [
      { kind: 'info', key: 'sos', art: { kind: 'icon', icon: 'alert', tone: 'sos' } },
      { kind: 'choice', key: 'loose', options: 3, correct: 0 },
      { kind: 'choice', key: 'bite', options: 2, correct: 0 },
      { kind: 'choice', key: 'otherDog', options: 2, correct: 0 },
      { kind: 'choice', key: 'late', options: 2, correct: 0 },
    ],
  },
]

export function isLessonId(value: unknown): value is LessonId {
  return typeof value === 'string' && (LESSON_IDS as readonly string[]).includes(value)
}

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}

/** Only real lesson ids, each once, in path order. */
export function cleanLessonIds(ids: unknown): LessonId[] {
  if (!Array.isArray(ids)) return []
  const wanted = new Set(ids.filter(isLessonId))
  return LESSON_IDS.filter((id) => wanted.has(id))
}

/** The first lesson on the path that is not done yet, or null when all five are. */
export function nextLesson(done: Iterable<string>): LessonId | null {
  const finished = new Set(done)
  return LESSON_IDS.find((id) => !finished.has(id)) ?? null
}

/** Every message key a lesson uses, below "school.lessons". For the tests and nothing else. */
export function lessonMessageKeys(lesson: Lesson): string[] {
  const base = `school.lessons.${lesson.id}`
  const keys = [`${base}.title`]
  for (const card of lesson.cards) {
    const at = `${base}.${card.key}`
    if (card.kind === 'info') keys.push(at)
    if (card.kind === 'hold') keys.push(`${at}.text`, `${at}.after`)
    if (card.kind === 'choice') {
      keys.push(`${at}.q`, `${at}.explain`)
      for (let i = 0; i < card.options; i++) {
        keys.push(`${at}.a${i}`)
        if (i !== card.correct) keys.push(`${at}.why${i}`)
      }
    }
  }
  return keys
}

/**
 * The lesson that teaches what a quiz question asks (web/src/lib/quiz.ts), so a miss in the quiz can
 * point to it. Every quiz question is covered by a lesson.
 */
export const QUIZ_LESSON: Record<string, LessonId> = {
  heat: 'weather',
  leash: 'meet',
  treats: 'meet',
  otherDogs: 'help',
  escaped: 'help',
  bite: 'help',
  stress: 'body',
  overdue: 'help',
}
