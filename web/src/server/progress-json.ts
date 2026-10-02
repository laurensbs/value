import 'server-only'
import { getFormatter, getTranslations } from 'next-intl/server'
import type { MonthChallenges } from '@/lib/challenges'
import { BADGES, recentKey, STEP_POINTS, tierColor } from '@/lib/progress'
import type { Progress } from './progress'

// The progress and challenges as the iPhone app gets them (src/app/api/v1), with every text in the
// caller's language, so both apps say exactly the same.

export async function progressJson(p: Progress) {
  const t = await getTranslations('progress')
  const steps = await getTranslations('today.steps')
  const tierOf = (key: string, tier: number) => BADGES.find((b) => b.key === key)?.tiers[tier - 1] ?? 0
  return {
    points: p.points,
    level: {
      number: p.level.level,
      key: p.level.key,
      name: t(`levels.${p.level.key}`),
      floor: p.level.floor,
      next: p.level.next,
      nextName: p.level.nextKey ? t(`levels.${p.level.nextKey}`) : null,
      progress: p.level.progress,
    },
    levelUp: p.levelUp,
    roles: p.roles,
    week: { goal: p.weeklyGoal, walks: p.walksThisWeek, activeWeeks: p.activeWeeks },
    badges: p.badges.map((b) => ({
      key: b.key,
      icon: b.icon,
      name: t(`badges.${b.key}.name`),
      hint: t(`badges.${b.key}.hint`),
      /** The tier reached, or the first one to aim for. */
      title: t(`badges.${b.key}.tier`, { n: b.tiers[Math.max(b.tier, 1) - 1] }),
      nextTitle: b.next == null ? null : t(`badges.${b.key}.tier`, { n: b.next }),
      tier: b.tier,
      tiers: b.tiers,
      value: b.value,
      next: b.next,
      color: b.tier ? tierColor(b.tier) : null,
      earnedAt: b.tier ? (p.earnedAt[`${b.key}:${b.tier}`] ?? null) : null,
      new: p.newAwards.some((a) => a.key === b.key),
    })),
    newAwards: p.newAwards.map((a) => ({
      key: a.key,
      tier: a.tier,
      name: t(`badges.${a.key}.name`),
      title: t(`badges.${a.key}.tier`, { n: tierOf(a.key, a.tier) }),
      color: tierColor(a.tier),
    })),
    recent: p.recent.map((r) => ({ kind: r.kind, points: r.points, at: r.at, label: t(`recent.${recentKey(r.kind, r.dogName)}`, { dog: r.dogName ?? '' }) })),
    steps: p.steps.map((s) => ({
      key: s.key,
      done: s.done,
      href: s.href,
      title: steps(`${s.key}.title`),
      hint: steps(`${s.key}.hint`),
      points: STEP_POINTS[s.key] ?? null,
    })),
  }
}

/** Days left in the month, counting today. */
export function daysLeft(c: MonthChallenges, now = new Date()): number {
  return Math.max(1, Math.ceil((c.endsAt.getTime() - now.getTime()) / 86_400_000))
}

export async function challengesJson(c: MonthChallenges, now = new Date()) {
  const t = await getTranslations('challenges')
  const format = await getFormatter()
  const month = format.dateTime(new Date((c.startsAt.getTime() + c.endsAt.getTime()) / 2), { month: 'long' })
  const stats = (x: { dogs: number; walkers: number; km: number }) => t('stats', { dogs: x.dogs, walkers: x.walkers, km: x.km })
  return {
    month: c.month,
    season: c.season,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    daysLeft: daysLeft(c, now),
    city: c.city && {
      ...c.city,
      title: t('city', { city: c.city.name, goal: c.city.goal, month }),
      progressText: t('progress', { walks: c.city.walks, goal: c.city.goal }),
      statsText: stats(c.city),
    },
    all: {
      ...c.all,
      title: t('all', { goal: c.all.goal, month }),
      progressText: t('progress', { walks: c.all.walks, goal: c.all.goal }),
      statsText: stats(c.all),
    },
  }
}
