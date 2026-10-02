// Safety quiz for walkers. Question and option texts live in messages under "quiz".
// The quiz must be passed (all correct) before a walker can request solo walks.

export const QUIZ: { id: string; options: number; correct: number }[] = [
  { id: 'heat', options: 3, correct: 1 },
  { id: 'leash', options: 3, correct: 0 },
  { id: 'treats', options: 3, correct: 2 },
  { id: 'otherDogs', options: 3, correct: 1 },
  { id: 'escaped', options: 3, correct: 0 },
  { id: 'bite', options: 3, correct: 2 },
  { id: 'stress', options: 3, correct: 1 },
  { id: 'overdue', options: 3, correct: 0 },
]

export function scoreQuiz(answers: Record<string, number>): { correct: number; total: number; passed: boolean; wrong: string[] } {
  const wrong = QUIZ.filter((q) => answers[q.id] !== q.correct).map((q) => q.id)
  return { correct: QUIZ.length - wrong.length, total: QUIZ.length, passed: wrong.length === 0, wrong }
}
