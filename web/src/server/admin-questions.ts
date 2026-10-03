// "De beste vragen" on the admin home (/admin): the questions a trust & safety / operations lead
// asks every day, each answered from real data, with a link to act. This file has no database:
// src/server/admin-hub.ts gathers the facts, these pure functions turn them into answers (unit-tested
// in admin-questions.test.ts). The texts live in messages under adminHub.questions.<id>.<answer>.
//
// Only counts, dates, first names and dog names leave here: nothing the admin pages did not show
// already. Example data (demo dogs and shelters) is left out by the queries.

import { overdueMinutes } from '@/lib/rules'

export type Level = 'urgent' | 'attention' | 'calm'

export const QUESTION_IDS = ['walks', 'reports', 'signals', 'intros', 'shelters', 'safety', 'groupWalks', 'tips', 'system'] as const
export type QuestionId = (typeof QUESTION_IDS)[number]

/** One line under an answer: a person, a dog or a shelter to look at. */
export interface QuestionItem {
  /** What it is about, e.g. "Bram · Sanne" (dog · walker). */
  label: string
  /** Which text explains it (adminHub.items.<kind>) and the values for that text. */
  kind: 'overdue' | 'unanswered' | 'idPending' | 'emptyWalk'
  values: Record<string, string | number | Date>
  href?: string
}

export interface Question {
  id: QuestionId
  level: Level
  /** Which answer text: adminHub.questions.<id>.<answer>. */
  answer: string
  values: Record<string, string | number>
  /** Where to act. */
  href: string
  items: QuestionItem[]
}

export interface OpsFacts {
  now: Date
  /** Walks with status 'active' right now; plannedEndAt to see which are over time. */
  activeWalks: { walkId: string; dogName: string; plannedEndAt: Date }[]
  /** Open reports and their category ('safety' and 'abuse' are the urgent ones). */
  openReports: { category: string; createdAt: Date }[]
  /** Flagged in the last 7 days: feedback after a walk, requests and chat messages (money, IBAN, link). */
  signals: { feedback: number; requests: number; chats: number }
  /** Meeting requests (kind 'meet') still waiting for the owner. */
  pendingIntros: { requestId: string; dogId: string; dogName: string; walkerName: string; createdAt: Date; startsAt: Date }[]
  /** Accepted meetings that already happened, where the owner has not confirmed the walker's ID yet. */
  metWithoutId: { requestId: string; dogId: string; dogName: string; walkerName: string; startsAt: Date }[]
  /** Shelters waiting for verification. */
  pendingShelters: { createdAt: Date }[]
  /** Bans by an admin in the last 7 days. */
  bannedThisWeek: { name: string }[]
  /** Blocks between people in the last 7 days, and how many people were blocked by 2+ others in 30 days. */
  blocksThisWeek: number
  repeatBlocked: number
  /** Group walks of real shelters in the next 48 hours, with how many places are booked. */
  upcomingGroupWalks: { orgId: string; orgName: string; startsAt: Date; booked: number }[]
  /** Open tips and votes, grouped per shelter: 'new' ones, and 'contacted' ones without an outcome. */
  tipGroups: { name: string; votes: number; status: 'new' | 'contacted'; handledAt: Date | null }[]
  system: {
    database: 'neon' | 'postgres' | 'pglite'
    /** How long one simple question to the database took, in ms. */
    dbMs: number
    /** Running on Vercel (preview or live), where an in-memory database loses everything. */
    hosted: boolean
    /** Work the daily cleanup (03:15 UTC) should have done already: if this grows, the cron is not running. */
    backlog: { requests: number; walks: number; routes: number }
  }
}

const HOUR = 60 * 60_000
const DAY = 24 * HOUR

/** A meeting request is stuck when the owner has not answered in 2 days, or it starts within a day. */
export const INTRO_STUCK_AFTER_MS = 2 * DAY
export const INTRO_SOON_MS = DAY
/** A shelter that tipped people were told about, but nothing happened for two weeks. */
export const TIP_FOLLOW_UP_MS = 14 * DAY
/** Slower than this for one simple question means something is wrong (cold start, far region). */
export const SLOW_DB_MS = 800

const RANK: Record<Level, number> = { urgent: 0, attention: 1, calm: 2 }

const days = (ms: number) => Math.max(0, Math.floor(ms / DAY))

function walks(f: OpsFacts): Question {
  const overdue = f.activeWalks
    .map((w) => ({ ...w, over: overdueMinutes(w.plannedEndAt, f.now) }))
    .filter((w) => w.over > 0)
    .sort((a, b) => b.over - a.over)
  const running = f.activeWalks.length
  const items: QuestionItem[] = overdue.map((w) => ({ label: w.dogName, kind: 'overdue', values: { minutes: w.over }, href: `/follow/${w.walkId}` }))
  if (overdue.length) return { id: 'walks', level: 'urgent', answer: 'overdue', values: { running, overdue: overdue.length }, href: items[0].href!, items }
  return { id: 'walks', level: 'calm', answer: running ? 'running' : 'none', values: { running }, href: '/admin/numbers', items: [] }
}

function reports(f: OpsFacts): Question {
  const n = f.openReports.length
  if (!n) return { id: 'reports', level: 'calm', answer: 'none', values: {}, href: '/admin/moderation', items: [] }
  const serious = f.openReports.filter((r) => r.category === 'safety' || r.category === 'abuse').length
  const oldest = Math.min(...f.openReports.map((r) => r.createdAt.getTime()))
  const waitingDays = days(f.now.getTime() - oldest)
  // A safety report, or one that waited more than a day, is the first thing to look at.
  const level: Level = serious || f.now.getTime() - oldest > DAY ? 'urgent' : 'attention'
  return { id: 'reports', level, answer: serious ? 'serious' : 'open', values: { n, serious, days: waitingDays }, href: '/admin/moderation#meldingen', items: [] }
}

function signals(f: OpsFacts): Question {
  const { feedback, requests, chats } = f.signals
  const n = feedback + requests + chats
  if (!n) return { id: 'signals', level: 'calm', answer: 'none', values: {}, href: '/admin/moderation#signalen', items: [] }
  return { id: 'signals', level: 'attention', answer: 'some', values: { feedback, requests, chats }, href: '/admin/moderation#signalen', items: [] }
}

function intros(f: OpsFacts): Question {
  const now = f.now.getTime()
  const unanswered = f.pendingIntros.filter(
    (r) => r.startsAt.getTime() > now && (now - r.createdAt.getTime() > INTRO_STUCK_AFTER_MS || r.startsAt.getTime() - now < INTRO_SOON_MS),
  )
  const items: QuestionItem[] = [
    ...unanswered.map((r) => ({
      label: `${r.dogName} · ${r.walkerName}`,
      kind: 'unanswered' as const,
      values: { days: days(now - r.createdAt.getTime()), startsAt: r.startsAt },
      href: `/dogs/${r.dogId}`,
    })),
    ...f.metWithoutId.map((r) => ({
      label: `${r.dogName} · ${r.walkerName}`,
      kind: 'idPending' as const,
      values: { days: Math.max(1, days(now - r.startsAt.getTime())) },
      href: `/dogs/${r.dogId}`,
    })),
  ]
  if (!items.length) return { id: 'intros', level: 'calm', answer: 'none', values: { waiting: f.pendingIntros.length }, href: '/admin/numbers', items }
  return {
    id: 'intros',
    level: 'attention',
    answer: 'stuck',
    values: { unanswered: unanswered.length, idPending: f.metWithoutId.length },
    href: items[0].href!,
    items: items.slice(0, 5),
  }
}

function shelters(f: OpsFacts): Question {
  const n = f.pendingShelters.length
  if (!n) return { id: 'shelters', level: 'calm', answer: 'none', values: {}, href: '/admin/shelters', items: [] }
  const oldest = Math.min(...f.pendingShelters.map((o) => o.createdAt.getTime()))
  return { id: 'shelters', level: 'attention', answer: 'waiting', values: { n, days: days(f.now.getTime() - oldest) }, href: '/admin/shelters', items: [] }
}

function safety(f: OpsFacts): Question {
  const banned = f.bannedThisWeek.length
  const values = { banned, names: f.bannedThisWeek.map((b) => b.name).join(', '), blocks: f.blocksThisWeek, repeat: f.repeatBlocked }
  // Someone blocked by several people is a pattern worth a look, even without a report.
  if (f.repeatBlocked) return { id: 'safety', level: 'attention', answer: 'repeat', values, href: '/admin/moderation#geblokkeerd', items: [] }
  return { id: 'safety', level: 'calm', answer: banned ? 'banned' : 'quiet', values, href: '/admin/moderation#geblokkeerd', items: [] }
}

function groupWalks(f: OpsFacts): Question {
  const empty = f.upcomingGroupWalks.filter((w) => w.booked === 0).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const n = f.upcomingGroupWalks.length
  const items: QuestionItem[] = empty.map((w) => ({ label: w.orgName, kind: 'emptyWalk', values: { startsAt: w.startsAt }, href: `/shelter/${w.orgId}` }))
  if (empty.length) return { id: 'groupWalks', level: 'attention', answer: 'empty', values: { n, empty: empty.length }, href: items[0].href!, items: items.slice(0, 5) }
  return { id: 'groupWalks', level: 'calm', answer: n ? 'filled' : 'none', values: { n }, href: '/admin/numbers', items: [] }
}

function tips(f: OpsFacts): Question {
  const fresh = f.tipGroups.filter((g) => g.status === 'new').sort((a, b) => b.votes - a.votes)
  const stale = f.tipGroups.filter((g) => g.status === 'contacted' && g.handledAt && f.now.getTime() - g.handledAt.getTime() > TIP_FOLLOW_UP_MS)
  if (!fresh.length && !stale.length) return { id: 'tips', level: 'calm', answer: 'none', values: {}, href: '/admin/tips', items: [] }
  const top = fresh[0]
  return {
    id: 'tips',
    level: 'attention',
    answer: top ? 'open' : 'followUp',
    values: { n: fresh.length, top: top?.name ?? '', votes: top?.votes ?? 0, followUp: stale.length },
    href: '/admin/tips',
    items: [],
  }
}

function system(f: OpsFacts): Question {
  const { database, dbMs, hosted, backlog } = f.system
  const late = backlog.requests + backlog.walks + backlog.routes
  const values = { ms: Math.round(dbMs), database, requests: backlog.requests, walks: backlog.walks, routes: backlog.routes }
  // The in-memory demo database live would lose everything on the next deploy.
  if (hosted && database === 'pglite') return { id: 'system', level: 'urgent', answer: 'demoDatabase', values, href: '/admin/numbers#instellingen', items: [] }
  if (late) return { id: 'system', level: 'attention', answer: 'cronLate', values, href: '/admin/numbers#instellingen', items: [] }
  if (dbMs > SLOW_DB_MS) return { id: 'system', level: 'attention', answer: 'slow', values, href: '/admin/numbers#instellingen', items: [] }
  return { id: 'system', level: 'calm', answer: 'healthy', values, href: '/admin/numbers#instellingen', items: [] }
}

/**
 * All questions with their answers, most urgent first. Within a level the order stays fixed
 * (safety of walks first, then reports and signals, then supply, then housekeeping).
 */
export function opsQuestions(f: OpsFacts): Question[] {
  const all = [walks(f), reports(f), signals(f), intros(f), shelters(f), safety(f), groupWalks(f), tips(f), system(f)]
  return all.map((q, i) => ({ q, i })).sort((a, b) => RANK[a.q.level] - RANK[b.q.level] || a.i - b.i).map(({ q }) => q)
}

/** For the banner above the questions: how many ask for something, and how bad the worst is. */
export function opsSummary(questions: Question[]): { level: Level; count: number } {
  const open = questions.filter((q) => q.level !== 'calm')
  return { level: open.some((q) => q.level === 'urgent') ? 'urgent' : open.length ? 'attention' : 'calm', count: open.length }
}

/** Shelter tips grouped like on the tips page: one group per directory shelter or per normalised name. */
export interface TipGroup<T> {
  key: string
  first: T
  ids: string[]
  notes: string[]
  contacted: boolean
  /** When it was last marked as contacted. */
  handledAt: Date | null
}

export function groupTips<T extends { id: string; status: string; handledAt: Date | null; note: string }>(tips: T[], keyOf: (tip: T) => string): TipGroup<T>[] {
  const groups = new Map<string, TipGroup<T>>()
  for (const tip of tips) {
    const key = keyOf(tip)
    const group = groups.get(key) ?? { key, first: tip, ids: [], notes: [], contacted: false, handledAt: null }
    group.ids.push(tip.id)
    if (tip.note) group.notes.push(tip.note)
    if (tip.status === 'contacted') {
      group.contacted = true
      if (tip.handledAt && (!group.handledAt || tip.handledAt > group.handledAt)) group.handledAt = tip.handledAt
    }
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => b.ids.length - a.ids.length)
}
