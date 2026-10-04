import { describe, expect, it } from 'vitest'
import { QUIZ } from './quiz'
import { freshQuiz, parseQuizProgress, readQuizStore, saveQuizProgress, type QuizProgress } from './quiz-progress'

const AT = '/profile/quiz'
const ids = QUIZ.map((q) => q.id)
const right = (n: number) => Object.fromEntries(QUIZ.slice(0, n).map((q) => [q.id, q.correct]))

/** Three right, the fourth missed and its explanation on screen: where someone leaves for a lesson. */
function leftForLesson(): QuizProgress {
  const fourth = QUIZ[3]
  return { at: AT, queue: ids.slice(3), answers: right(3), round: 3, choice: (fourth.correct + 1) % fourth.options, checked: true }
}

describe('where someone is in the quiz', () => {
  it('comes back exactly as it was left, for the same quiz page', () => {
    const left = leftForLesson()
    expect(parseQuizProgress(JSON.stringify(left), AT)).toEqual(left)
  })

  it('starts fresh from another way into the quiz', () => {
    expect(parseQuizProgress(JSON.stringify(leftForLesson()), '/profile/quiz?next=%2Fdogs')).toBeNull()
  })

  it('ignores anything that does not add up', () => {
    const left = leftForLesson()
    const broken: unknown[] = [
      'not json',
      { ...left, queue: [] },
      { ...left, queue: ['heat', 'heat'] },
      { ...left, queue: ['nope'] },
      // An answer that was not right is never kept.
      { ...left, answers: { ...left.answers, heat: (QUIZ[0].correct + 1) % QUIZ[0].options } },
      // A question that is neither to go nor answered.
      { ...left, queue: ids.slice(4) },
      { ...left, round: -1 },
      { ...left, choice: 7 },
      { ...left, checked: true, choice: null },
    ]
    for (const value of broken) expect(parseQuizProgress(typeof value === 'string' ? value : JSON.stringify(value), AT), JSON.stringify(value)).toBeNull()
    expect(parseQuizProgress(null, AT)).toBeNull()
  })

  it('the start is all eight questions, nothing answered', () => {
    expect(freshQuiz(AT)).toEqual({ at: AT, queue: ids, answers: {}, round: 0, choice: null, checked: false })
  })

  it('without storage (blocked, or no browser) it still keeps the progress while the page is open', () => {
    expect(readQuizStore()).toBeNull()
    saveQuizProgress(leftForLesson())
    expect(parseQuizProgress(readQuizStore(), AT)).toEqual(leftForLesson())
    saveQuizProgress(null)
    expect(readQuizStore()).toBeNull()
  })
})
