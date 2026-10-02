import type { challengesJson, progressJson } from '@/server/progress-json'

/** The same progress the iPhone app gets from /api/v1/progress, with texts in the viewer's language. */
export type ProgressData = Awaited<ReturnType<typeof progressJson>>
/** The same challenges the iPhone app gets from /api/v1/challenges. */
export type ChallengesData = Awaited<ReturnType<typeof challengesJson>>
export type BadgeData = ProgressData['badges'][number]
