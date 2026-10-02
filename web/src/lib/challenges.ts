// Monthly challenges for everyone together, like "Utrecht walks 50 rounds in October".
// The goal grows with the town: a quarter more than last month, at least 10 (25 for everyone).
// Only totals are shown, never who walked.

import { citySlug } from './cities'
import { localParts, seasonOf } from './progress'
import { zonedToUtc } from './time'

export interface ChallengeWalk {
  city: string
  walkerId: string
  dogId: string
  distanceM: number
  startedAt: Date
}

export interface Tally {
  walks: number
  km: number
  dogs: number
  walkers: number
  /** Walks by the person looking. */
  mine: number
}

export interface Challenge extends Tally {
  goal: number
  done: boolean
}

export interface MonthChallenges {
  /** YYYY-MM in local time. */
  month: string
  season: 'winter' | 'spring' | 'summer' | 'autumn'
  startsAt: Date
  endsAt: Date
  /** The town in the person's profile, or null when it has no name. */
  city: (Challenge & { name: string; slug: string }) | null
  all: Challenge
}

const pad = (n: number) => String(n).padStart(2, '0')

/** First moment of this month, of the next one and of the previous one, in local time. */
export function monthBounds(now: Date): { start: Date; end: Date; previous: Date; month: string } {
  const { year, month } = localParts(now)
  const at = (y: number, m: number) => zonedToUtc(`${y}-${pad(m)}-01`, '00:00')
  return {
    start: at(year, month),
    end: month === 12 ? at(year + 1, 1) : at(year, month + 1),
    previous: month === 1 ? at(year - 1, 12) : at(year, month - 1),
    month: `${year}-${pad(month)}`,
  }
}

export function goalFor(previousWalks: number, minimum: number): number {
  return Math.max(minimum, Math.ceil((previousWalks * 1.25) / 10) * 10)
}

export function tally(walks: ChallengeWalk[], viewerId: string): Tally {
  return {
    walks: walks.length,
    km: Math.round(walks.reduce((m, w) => m + w.distanceM, 0) / 1000),
    dogs: new Set(walks.map((w) => w.dogId)).size,
    walkers: new Set(walks.map((w) => w.walkerId)).size,
    mine: walks.filter((w) => w.walkerId === viewerId).length,
  }
}

/** This month's challenges from the walks of this month and last month (by the dog's town). */
export function challengesFrom(walks: ChallengeWalk[], viewer: { userId: string; city: string }, now: Date): MonthChallenges {
  const { start, end, previous, month } = monthBounds(now)
  const inRange = (w: ChallengeWalk, from: Date, to: Date) => w.startedAt >= from && w.startedAt < to
  const current = walks.filter((w) => inRange(w, start, end))
  const before = walks.filter((w) => inRange(w, previous, start))

  const challenge = (these: ChallengeWalk[], previousCount: number, minimum: number): Challenge => {
    const t = tally(these, viewer.userId)
    const goal = goalFor(previousCount, minimum)
    return { ...t, goal, done: t.walks >= goal }
  }

  const slug = citySlug(viewer.city)
  const inCity = (w: ChallengeWalk) => citySlug(w.city) === slug
  return {
    month,
    season: seasonOf(now),
    startsAt: start,
    endsAt: end,
    city: slug ? { name: viewer.city.trim(), slug, ...challenge(current.filter(inCity), before.filter(inCity).length, 10) } : null,
    all: challenge(current, before.length, 25),
  }
}
