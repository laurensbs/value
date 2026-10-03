// The launch hub (/admin/launch) without the database: the task list, milestones, points and
// levels, weekly buckets and monthly costs. Pure functions, so they are unit-tested
// (launch-core.test.ts); src/server/launch.ts feeds them real rows.
//
// The game is for the admin only and has no streaks, no deadlines and no daily pressure:
// points only ever come from things that are done, and nothing is ever taken away.

import { toZonedParts, zonedToUtc } from '@/lib/time'

export type Owner = 'laurens' | 'claude' | 'samen'

/** Checks that tick a task off by themselves, from real data or the deployment. */
export type AutoCheck = 'production' | 'socialLogin' | 'shelterMails' | 'shelterMeeting' | 'realDog'

export interface TaskDef {
  /** Stable key: stored in launch_task.key and used for the texts (launch.tasks.<key>). Never rename. */
  key: string
  owner: Owner
  points: number
  /** One of the four "Wacht op Laurens" tasks at the top. */
  waiting?: boolean
  href?: string
  auto?: AutoCheck
}

const REPO = 'https://github.com/laurensbs/value'

export const TASKS: readonly TaskDef[] = [
  // Wacht op Laurens: exactly these four, always first.
  { key: 'name', owner: 'laurens', points: 30, waiting: true, href: 'https://appstoreconnect.apple.com/apps' },
  { key: 'goLive', owner: 'laurens', points: 40, waiting: true, href: `${REPO}/pulls`, auto: 'production' },
  { key: 'submit', owner: 'laurens', points: 40, waiting: true, href: 'https://appstoreconnect.apple.com/apps' },
  { key: 'money', owner: 'laurens', points: 20, waiting: true },
  // Laurens' other tasks.
  { key: 'sendThree', owner: 'laurens', points: 15 },
  { key: 'trademark', owner: 'laurens', points: 15, href: 'https://www.tmdn.org/tmview/' },
  { key: 'appleAccount', owner: 'laurens', points: 20, href: 'https://developer.apple.com/programs/enroll/' },
  { key: 'domain', owner: 'laurens', points: 10, href: `${REPO}/blob/HEAD/docs/LAUNCH.md` },
  { key: 'socialKeys', owner: 'laurens', points: 20, href: `${REPO}/blob/HEAD/docs/LAUNCH.md`, auto: 'socialLogin' },
  { key: 'healthkit', owner: 'laurens', points: 10, href: 'https://developer.apple.com/account/resources/identifiers/list' },
  { key: 'legal', owner: 'laurens', points: 30, href: `${REPO}/blob/HEAD/docs/legal/REVIEW.md` },
  { key: 'analytics', owner: 'laurens', points: 10, href: 'https://vercel.com/dashboard' },
  { key: 'privacy', owner: 'laurens', points: 15 },
  // Together: Laurens sends, the data shows it.
  { key: 'firstMails', owner: 'samen', points: 25, auto: 'shelterMails' },
  { key: 'firstDemo', owner: 'samen', points: 20, auto: 'shelterMeeting' },
  { key: 'firstDog', owner: 'samen', points: 25, auto: 'realDog' },
  // Claude.
  { key: 'blobCleanup', owner: 'claude', points: 15 },
  { key: 'storeTexts', owner: 'claude', points: 10 },
  { key: 'mountAnalytics', owner: 'claude', points: 5 },
]

export const TASK_KEYS = TASKS.map((t) => t.key)

export function isTaskKey(key: unknown): key is string {
  return typeof key === 'string' && TASK_KEYS.includes(key)
}

export interface StoredTask {
  key: string
  status: string
  doneAt: Date | null
  note: string
}

export interface TaskState extends TaskDef {
  done: boolean
  /** Done because an automatic check says so (the admin cannot untick it). */
  autoDone: boolean
  doneAt: Date | null
  note: string
}

export function taskStates(stored: StoredTask[], auto: Partial<Record<AutoCheck, boolean>>): TaskState[] {
  const byKey = new Map(stored.map((s) => [s.key, s]))
  return TASKS.map((def) => {
    const row = byKey.get(def.key)
    const autoDone = Boolean(def.auto && auto[def.auto])
    const manual = row?.status === 'done'
    return { ...def, done: autoDone || manual, autoDone, doneAt: manual ? (row?.doneAt ?? null) : null, note: row?.note ?? '' }
  })
}

/**
 * The order on the page: the four "Wacht op Laurens" tasks (always, done or not), then Laurens'
 * other open tasks, then the open tasks of Claude and the shared ones, then everything that is done.
 */
export function groupTasks(tasks: TaskState[]) {
  const rest = tasks.filter((t) => !t.waiting)
  return {
    waiting: tasks.filter((t) => t.waiting),
    mine: rest.filter((t) => !t.done && t.owner === 'laurens'),
    others: rest.filter((t) => !t.done && t.owner !== 'laurens').sort((a, b) => (a.owner === b.owner ? 0 : a.owner === 'samen' ? -1 : 1)),
    done: rest.filter((t) => t.done),
  }
}

// ---------- Milestones (from real data) ----------

/** One row of real-world data: when it happened, and whether it is example data. */
export interface DataRow {
  at: Date
  demo: boolean
}

export interface MemberRow extends DataRow {
  /** Admins (ADMIN_EMAILS or role admin) are not counted as members. */
  admin: boolean
}

export interface WalkRow extends DataRow {
  walkerId: string
}

export interface LaunchFacts {
  /** Verified shelters; `at` is when it was verified (or signed up). */
  shelters: DataRow[]
  /** Requests for a first meeting (kennismaking). */
  intros: DataRow[]
  /** Finished walks; `at` is when the walk ended. */
  walks: WalkRow[]
  /** People with a profile; `at` is when they joined. */
  members: MemberRow[]
}

export type MilestoneId = 'firstShelter' | 'firstIntro' | 'firstWalk' | 'members10' | 'members50' | 'members100'

interface MilestoneDef {
  id: MilestoneId
  points: number
  source: 'shelters' | 'intros' | 'walks' | 'members'
  /** How many real rows are needed. */
  target: number
}

export const MILESTONES: readonly MilestoneDef[] = [
  { id: 'firstShelter', points: 30, source: 'shelters', target: 1 },
  { id: 'firstIntro', points: 30, source: 'intros', target: 1 },
  { id: 'firstWalk', points: 50, source: 'walks', target: 1 },
  { id: 'members10', points: 20, source: 'members', target: 10 },
  { id: 'members50', points: 40, source: 'members', target: 50 },
  { id: 'members100', points: 60, source: 'members', target: 100 },
]

export const MILESTONE_PREFIX = 'milestone:'

/** Example data never counts: rows marked demo, and for members also the admins themselves. */
export function realRows<T extends DataRow>(rows: T[]): T[] {
  return rows
    .filter((r) => !r.demo && !(r as Partial<MemberRow>).admin)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}

export interface MilestoneState {
  id: MilestoneId
  points: number
  reached: boolean
  /** When it happened: the date of the row that reached it, or when it was stored. */
  at: Date | null
  current: number
  target: number
}

/**
 * Which milestones are reached. A milestone that was stored before (`stored`, from launch_task)
 * stays reached, even if the rows behind it were deleted later.
 */
export function detectMilestones(facts: LaunchFacts, stored: Map<string, Date | null> = new Map()): MilestoneState[] {
  const real = {
    shelters: realRows(facts.shelters),
    intros: realRows(facts.intros),
    walks: realRows(facts.walks),
    members: realRows(facts.members),
  }
  return MILESTONES.map((m) => {
    const rows = real[m.source]
    const hit = rows.length >= m.target ? rows[m.target - 1].at : null
    const key = MILESTONE_PREFIX + m.id
    const kept = stored.has(key)
    return {
      id: m.id,
      points: m.points,
      reached: Boolean(hit) || kept,
      at: hit ?? stored.get(key) ?? null,
      current: Math.min(rows.length, m.target),
      target: m.target,
    }
  })
}

/** Milestones that are reached now but not stored yet: these get a launch_task row. */
export function newlyReached(milestones: MilestoneState[], stored: Map<string, Date | null>): MilestoneState[] {
  return milestones.filter((m) => m.reached && !stored.has(MILESTONE_PREFIX + m.id))
}

// ---------- Points and levels ----------

export const LEVELS = [
  { key: 'pup', min: 0 },
  { key: 'walker', min: 150 },
  { key: 'packLeader', min: 400 },
] as const

export type LevelKey = (typeof LEVELS)[number]['key']

export interface LaunchLevel {
  key: LevelKey
  number: number
  min: number
  next: { key: LevelKey; min: number } | null
  /** Points still needed for the next level (0 at the top). */
  toNext: number
  /** 0–1 on the way from this level to the next (1 at the top). */
  progress: number
}

export function pointsFor(tasks: Pick<TaskState, 'done' | 'points'>[], milestones: Pick<MilestoneState, 'reached' | 'points'>[]): number {
  return [...tasks, ...milestones.map((m) => ({ done: m.reached, points: m.points }))].reduce((sum, x) => sum + (x.done ? x.points : 0), 0)
}

export function levelFor(points: number): LaunchLevel {
  const index = LEVELS.reduce((found, level, i) => (points >= level.min ? i : found), 0)
  const level = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  return {
    key: level.key,
    number: index + 1,
    min: level.min,
    next: next ? { key: next.key, min: next.min } : null,
    toNext: next ? next.min - points : 0,
    progress: next ? (points - level.min) / (next.min - level.min) : 1,
  }
}

/** The road to the first real walk: live, real supply, a first meeting, a first walk. */
export function routeToFirstWalk(tasks: TaskState[], milestones: MilestoneState[]) {
  const done = (key: string) => tasks.some((t) => t.key === key && t.done)
  const reached = (id: MilestoneId) => milestones.some((m) => m.id === id && m.reached)
  const steps = [
    { key: 'live', done: done('goLive') },
    { key: 'supply', done: reached('firstShelter') || done('firstDog') },
    { key: 'intro', done: reached('firstIntro') },
    { key: 'walk', done: reached('firstWalk') },
  ] as const
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length }
}

// ---------- Weeks ----------

/** Monday 00:00 (Europe/Amsterdam) of the last `weeks` weeks, oldest first, as UTC instants. */
export function weekStarts(now: Date, weeks = 8): Date[] {
  const today = new Date(`${toZonedParts(now).date}T12:00:00Z`)
  const sinceMonday = (today.getUTCDay() + 6) % 7
  today.setUTCDate(today.getUTCDate() - sinceMonday)
  return Array.from({ length: weeks }, (_, i) => {
    const monday = new Date(today)
    monday.setUTCDate(monday.getUTCDate() - (weeks - 1 - i) * 7)
    return zonedToUtc(monday.toISOString().slice(0, 10), '00:00')
  })
}

/**
 * How many rows fall in each week. Rows before the first week are left out; anything after the
 * start of the last week counts in the last week (also a row a little "in the future" when the
 * database clock runs ahead of the server).
 */
export function countPerWeek(rows: { at: Date }[], starts: Date[]): number[] {
  const counts = starts.map(() => 0)
  for (const row of rows) {
    const t = row.at.getTime()
    for (let i = starts.length - 1; i >= 0; i--) {
      if (t >= starts[i].getTime()) {
        counts[i]++
        break
      }
    }
  }
  return counts
}

// ---------- Costs ----------

export type CostKey = 'vercel' | 'neon' | 'apple' | 'domain' | 'resend'

interface CostDef {
  key: CostKey
  perMonth?: number
  perYear?: number
  /** Only counted once this task is done (joined, bought). */
  whenTask?: string
}

/** What Rondje costs per month, in euros. Change here when a plan changes. */
export const COSTS: readonly CostDef[] = [
  { key: 'vercel', perMonth: 0 },
  { key: 'neon', perMonth: 0 },
  { key: 'apple', perYear: 99, whenTask: 'appleAccount' },
  { key: 'domain', perYear: 12, whenTask: 'domain' },
  { key: 'resend', perMonth: 0 },
]

export interface CostLine {
  key: CostKey
  /** Euros per month when active (yearly costs divided by 12). */
  monthly: number
  perYear: number | null
  active: boolean
}

export function monthlyCosts(doneTasks: Set<string>): { lines: CostLine[]; total: number } {
  const lines = COSTS.map((c) => ({
    key: c.key,
    monthly: c.perYear != null ? Math.round((c.perYear / 12) * 100) / 100 : (c.perMonth ?? 0),
    perYear: c.perYear ?? null,
    active: !c.whenTask || doneTasks.has(c.whenTask),
  }))
  const total = Math.round(lines.reduce((sum, l) => sum + (l.active ? l.monthly : 0), 0) * 100) / 100
  return { lines, total }
}

/** A division that is "—" (null) instead of Infinity or NaN when there is nothing to divide by. */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null
}

/** Real walks in the last 30 days, per walker who walked in those 30 days. */
export function walksPerActiveWalker(walks: WalkRow[], now: Date): number | null {
  const since = now.getTime() - 30 * 24 * 60 * 60_000
  const recent = realRows(walks).filter((w) => w.at.getTime() >= since)
  return ratio(recent.length, new Set(recent.map((w) => w.walkerId)).size)
}
