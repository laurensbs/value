// Interview question sets for calls and visits (Mom Test style: ask about what people did, not what
// they would do). The texts are in messages/<locale>.json under marketing.interviews.<audience>;
// this file only says which sets exist and how many questions each has.

export const INTERVIEWS = {
  shelter: 9,
  owner: 8,
  walker: 8,
  vet: 7,
  students: 7,
} as const

export type InterviewAudience = keyof typeof INTERVIEWS

export const INTERVIEW_AUDIENCES = Object.keys(INTERVIEWS) as InterviewAudience[]

/** The message keys of one set's questions, in order: q1, q2, … */
export function questionKeys(audience: InterviewAudience): string[] {
  return Array.from({ length: INTERVIEWS[audience] }, (_, i) => `q${i + 1}`)
}

export interface InterviewText {
  title: string
  who: string
  goal: string
  questions: string[]
  listen: string
}

/** One set as plain text for the clipboard: a title, numbered questions, and what to listen for. */
export function interviewText(set: InterviewText, listenLabel: string): string {
  return [set.title, set.goal, '', ...set.questions.map((q, i) => `${i + 1}. ${q}`), '', `${listenLabel}: ${set.listen}`].join('\n')
}
