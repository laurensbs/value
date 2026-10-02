import 'server-only'
import { eq, sql } from 'drizzle-orm'
import { cache } from 'react'
import { dbMode, getDb } from '@/db'
import * as s from '@/db/schema'
import { DIRECTORY } from '@/lib/directory'
import { DEFAULT_COSTS, DEFAULT_INCOME, DEFAULT_SETTINGS, type CostLine, type HubIncome, type HubSettings } from '@/lib/hub/content'
import {
  levelFor,
  MILESTONES,
  newMilestones,
  xpOf,
  type ContentState,
  type FounderLevel,
  type HubState,
  type Milestone,
  type MilestoneStats,
  type PartnerState,
  type TaskState,
  type XpBreakdown,
} from '@/lib/hub/game'
import { weekOf } from '@/lib/progress'
import { growthKpis } from './kpis'

// The founder's hub keeps its own notes in hub_entry, one row per item. It reads the app's tables
// only to count: no names, no messages, no locations.

const DAY = 24 * 60 * 60_000
const DEMO_EMAIL = '%@demo.example.org'

type Row = Record<string, unknown>
const num = (v: unknown) => Number(v ?? 0)
const maybe = (v: unknown) => (v === null || v === undefined ? null : Number(v))

export type HubKind = 'task' | 'partner' | 'content' | 'settings' | 'costs' | 'income' | 'milestone' | 'meta'

interface Loaded {
  state: HubState
  /** The level you last saw, to celebrate going up exactly once. */
  seenLevel: number | null
}

/** Your notes as they are now. Server actions use this: it records nothing and is never cached. */
export async function loadHubState(): Promise<HubState> {
  return (await loadHub()).state
}

async function loadHub(): Promise<Loaded> {
  const db = await getDb()
  const rows = await db.select().from(s.hubEntry)
  let seenLevel: number | null = null
  const state: HubState = {
    tasks: {},
    partners: {},
    content: {},
    settings: DEFAULT_SETTINGS,
    costs: DEFAULT_COSTS,
    income: DEFAULT_INCOME,
    milestones: {},
  }
  for (const row of rows) {
    const key = row.id.slice(row.kind.length + 1)
    const data = row.data as Record<string, unknown>
    switch (row.kind) {
      case 'task':
        state.tasks[key] = data as unknown as TaskState
        break
      case 'partner':
        state.partners[key] = data as unknown as PartnerState
        break
      case 'content':
        state.content[key] = data as unknown as ContentState
        break
      case 'settings':
        state.settings = { ...DEFAULT_SETTINGS, ...(data as Partial<HubSettings>) }
        break
      case 'costs':
        state.costs = Array.isArray(data.lines) ? (data.lines as CostLine[]) : DEFAULT_COSTS
        break
      case 'income':
        state.income = { ...DEFAULT_INCOME, ...(data as Partial<HubIncome>) }
        break
      case 'milestone':
        state.milestones[key] = String(data.at)
        break
      case 'meta':
        if (key === 'seen') seenLevel = Number(data.level) || null
        break
    }
  }
  return { state, seenLevel }
}

export async function putEntry(kind: HubKind, key: string, data: object): Promise<void> {
  const db = await getDb()
  const id = `${kind}:${key}`
  await db
    .insert(s.hubEntry)
    .values({ id, kind, data })
    .onConflictDoUpdate({ target: s.hubEntry.id, set: { data, updatedAt: new Date() } })
}

export async function deleteEntry(kind: HubKind, key: string): Promise<void> {
  const db = await getDb()
  await db.delete(s.hubEntry).where(eq(s.hubEntry.id, `${kind}:${key}`))
}

/** Records milestones reached since the last visit, so their date is kept. Returns the new ones. */
async function recordMilestones(state: HubState, stats: MilestoneStats, now: Date): Promise<string[]> {
  const fresh = newMilestones(state, stats)
  if (fresh.length === 0) return []
  const db = await getDb()
  const at = now.toISOString()
  await db
    .insert(s.hubEntry)
    .values(fresh.map((id) => ({ id: `milestone:${id}`, kind: 'milestone', data: { at } })))
    .onConflictDoNothing()
  for (const id of fresh) state.milestones[id] = at
  return fresh
}

export interface Hub {
  state: HubState
  xp: XpBreakdown
  level: FounderLevel
  /** Set once, on the request where you went up a level. */
  levelUp: boolean
  /** Milestones reached since your last visit. */
  fresh: Milestone[]
  counts: MilestoneStats
}

/**
 * The hub for this request: your notes, your points and level, and the milestones reached since
 * your last visit (recorded now, so each one is celebrated once). Shared by the layout and pages.
 */
export const getHub = cache(async (): Promise<Hub> => {
  const now = new Date()
  const [{ state, seenLevel }, counts] = await Promise.all([loadHub(), milestoneCounts(now)])
  const freshIds = await recordMilestones(state, counts, now)
  const xp = xpOf(state)
  const level = levelFor(xp.total)
  const levelUp = seenLevel !== null && level.level > seenLevel
  if (seenLevel === null || level.level > seenLevel) await putEntry('meta', 'seen', { level: level.level })
  return { state, xp, level, levelUp, fresh: MILESTONES.filter((m) => freshIds.includes(m.id)), counts }
})

/** The few app numbers milestones need, cheap enough for every hub page. */
async function milestoneCounts(now: Date): Promise<MilestoneStats> {
  const db = await getDb()
  const eightWeeksAgo = new Date(now.getTime() - 56 * DAY).toISOString()
  const [row] = (
    await db.execute<Row>(sql`
      select
        (select count(*) from dog where status = 'active' and not is_demo) as dogs,
        (select count(*) from walk where status = 'ended') as walks,
        (select coalesce(sum(distance_m), 0) / 1000.0 from walk where status = 'ended') as km,
        (select count(*) from (
          select 1 from walk where status = 'ended' and ended_at >= ${eightWeeksAgo} group by walker_id, dog_id having count(*) >= 3
        ) t) as pairs,
        (select count(*) from organization where status = 'verified' and not is_demo) as shelters,
        (select count(*) from profile p join "user" u on u.id = p.user_id where p.wants_to_walk and u.email not like ${DEMO_EMAIL}) as walkers
    `)
  ).rows
  return {
    dogs: num(row?.dogs),
    walks: num(row?.walks),
    km: num(row?.km),
    steadyPairs: num(row?.pairs),
    sheltersLive: num(row?.shelters),
    walkers: num(row?.walkers),
  }
}

// ---------- Numbers from the app ----------

export interface WeekPoint {
  week: string
  signups: number
  walks: number
}

export interface FunnelStep {
  label: string
  n: number
}

export interface HubStats {
  people: {
    accounts: number
    profiles: number
    walkers: number
    owners: number
    quizPassed: number
    newWeek: number
    newLastWeek: number
    viaInvite: number
    viaYourLink: number
  }
  dogs: { owner: number; shelter: number; total: number }
  shelters: { live: number; pending: number; directory: number }
  walks: {
    total: number
    week: number
    lastWeek: number
    month: number
    km: number
    avgKm: number | null
    avgMin: number | null
    withPhoto: number
    withReport: number
    walkersMonth: number
    perWalkerMonth: number | null
    daysToFirstWalk: number | null
  }
  requests: { total: number; week: number; accepted: number; declined: number; open: number; hoursToDecide: number | null }
  chat: { messages: number; week: number; flagged: number }
  devices: Record<string, number>
  platform: { app: number; mobileWeb: number; desktopWeb: number }
  steady: { pairs: number; walksWeek: number }
  groups: { signupsWeek: number; fill: number | null }
  series: WeekPoint[]
  walkerFunnel: FunnelStep[]
  ownerFunnel: FunnelStep[]
  cities: { city: string; country: string; people: number; dogs: number }[]
  db: { mode: string; sizeMb: number | null }
}

/** Everything the Cijfers screen shows, in a handful of queries. Demo accounts never count. */
export async function hubStats(yourReferralCode: string | null, now = new Date()): Promise<HubStats> {
  const db = await getDb()
  // Timestamps are stored in UTC without a zone; compare with UTC strings.
  const ago = (days: number) => new Date(now.getTime() - days * DAY).toISOString()
  const weekAgo = ago(7)
  const twoWeeksAgo = ago(14)
  const monthAgo = ago(30)
  const twelveWeeksAgo = ago(12 * 7)
  const rows = async (q: ReturnType<typeof sql>) => (await db.execute<Row>(q)).rows

  const [kpis, [people], [walks], [requests], [chat], devices, [platform], series, [walkerFunnel], [ownerFunnel], cities, [shelters]] =
    await Promise.all([
      growthKpis(now),
      rows(sql`
        select
          (select count(*) from "user" where email not like ${DEMO_EMAIL}) as accounts,
          count(*) as profiles,
          count(*) filter (where p.wants_to_walk) as walkers,
          count(*) filter (where p.has_dogs) as owners,
          count(*) filter (where p.quiz_passed_at is not null) as quiz,
          count(*) filter (where p.created_at >= ${weekAgo}) as new_week,
          count(*) filter (where p.created_at >= ${twoWeeksAgo} and p.created_at < ${weekAgo}) as new_last_week,
          count(*) filter (where p.referred_by is not null) as via_invite,
          count(*) filter (where p.referred_by = ${yourReferralCode ?? ''}) as via_you
        from profile p join "user" u on u.id = p.user_id
        where u.email not like ${DEMO_EMAIL}
      `),
      rows(sql`
        select
          count(*) as total,
          count(*) filter (where w.ended_at >= ${weekAgo}) as week,
          count(*) filter (where w.ended_at >= ${twoWeeksAgo} and w.ended_at < ${weekAgo}) as last_week,
          count(*) filter (where w.ended_at >= ${monthAgo}) as month,
          coalesce(sum(w.distance_m), 0) / 1000.0 as km,
          avg(w.distance_m) filter (where w.distance_m > 0) / 1000.0 as avg_km,
          avg(extract(epoch from (w.ended_at - w.started_at)) / 60) filter (where w.ended_at > w.started_at) as avg_min,
          count(*) filter (where exists (select 1 from walk_photo ph where ph.walk_id = w.id)) as with_photo,
          count(*) filter (where w.pee + w.poo + w.water > 0) as with_report,
          count(distinct w.walker_id) filter (where w.ended_at >= ${monthAgo}) as walkers_month,
          (
            select avg(extract(epoch from (f.first_walk - p.created_at)) / 86400)
            from profile p
            join (select walker_id, min(started_at) as first_walk from walk where status = 'ended' group by walker_id) f on f.walker_id = p.user_id
          ) as days_to_first
        from walk w
        where w.status = 'ended'
      `),
      rows(sql`
        select
          count(*) as total,
          count(*) filter (where r.created_at >= ${weekAgo}) as week,
          count(*) filter (where r.status in ('accepted', 'completed')) as accepted,
          count(*) filter (where r.status = 'declined') as declined,
          count(*) filter (where r.status = 'pending') as open,
          avg(extract(epoch from (r.decided_at - r.created_at)) / 3600) filter (where r.decided_at is not null) as hours_to_decide
        from walk_request r join dog d on d.id = r.dog_id
        where not d.is_demo
      `),
      rows(sql`
        select
          count(*) as messages,
          count(*) filter (where created_at >= ${weekAgo}) as week,
          count(*) filter (where cardinality(flags) > 0) as flagged
        from chat_message
      `),
      rows(sql`select kind, count(*) as n from push_device group by kind`),
      // Each person once: the app if they used it at all, else the phone browser, else a computer.
      rows(sql`
        select
          count(*) filter (where app) as app,
          count(*) filter (where not app and phone) as mobile_web,
          count(*) filter (where not app and not phone) as desktop_web
        from (
          select se.user_id,
            bool_or(coalesce(se.user_agent, '') ilike '%RondjeApp%') as app,
            bool_or(coalesce(se.user_agent, '') ~* '(iphone|android|mobile)') as phone
          from session se join "user" u on u.id = se.user_id
          where se.updated_at >= ${monthAgo} and u.email not like ${DEMO_EMAIL}
          group by se.user_id
        ) x
      `),
      rows(sql`
        select week, sum(signups) as signups, sum(walks) as walks from (
          select to_char(date_trunc('week', (p.created_at at time zone 'UTC') at time zone 'Europe/Amsterdam'), 'YYYY-MM-DD') as week, 1 as signups, 0 as walks
          from profile p join "user" u on u.id = p.user_id
          where p.created_at >= ${twelveWeeksAgo} and u.email not like ${DEMO_EMAIL}
          union all
          select to_char(date_trunc('week', (w.ended_at at time zone 'UTC') at time zone 'Europe/Amsterdam'), 'YYYY-MM-DD'), 0, 1
          from walk w
          where w.status = 'ended' and w.ended_at >= ${twelveWeeksAgo}
        ) x group by week
      `),
      // Funnels: every person gets the furthest step they reached, and each step counts everyone who
      // got at least that far. So a step is never bigger than the one before, and someone who once
      // walked still counts after switching walking off.
      rows(sql`
        select
          count(*) as walkers,
          count(*) filter (where step >= 1) as quiz,
          count(*) filter (where step >= 2) as requested,
          count(*) filter (where step >= 3) as met,
          count(*) filter (where step >= 4) as walked,
          count(*) filter (where step >= 5) as regular
        from (
          select p.wants_to_walk, case
              when (select count(*) from walk w where w.walker_id = p.user_id and w.status = 'ended') >= 3 then 5
              when exists (select 1 from walk w where w.walker_id = p.user_id and w.status = 'ended') then 4
              when exists (select 1 from walk_request r where r.walker_id = p.user_id and r.status in ('accepted', 'completed')) then 3
              when exists (select 1 from walk_request r where r.walker_id = p.user_id) then 2
              when p.quiz_passed_at is not null then 1
              else 0
            end as step
          from profile p join "user" u on u.id = p.user_id
          where u.email not like ${DEMO_EMAIL}
        ) x
        where wants_to_walk or step >= 2
      `),
      rows(sql`
        select
          count(*) as owners,
          count(*) filter (where step >= 1) as with_dog,
          count(*) filter (where step >= 2) as asked,
          count(*) filter (where step >= 3) as walked
        from (
          select p.has_dogs, case
              when exists (select 1 from walk w join dog d on d.id = w.dog_id where d.owner_id = p.user_id and not d.is_demo and w.status = 'ended') then 3
              when exists (select 1 from walk_request r join dog d on d.id = r.dog_id where d.owner_id = p.user_id and not d.is_demo) then 2
              when exists (select 1 from dog d where d.owner_id = p.user_id and not d.is_demo and d.status = 'active') then 1
              else 0
            end as step
          from profile p join "user" u on u.id = p.user_id
          where u.email not like ${DEMO_EMAIL}
        ) x
        where has_dogs or step >= 1
      `),
      rows(sql`
        select p.city, p.country, count(*) as people,
          (select count(*) from dog d where d.owner_id is not null and not d.is_demo and d.status = 'active'
            and d.owner_id in (select p2.user_id from profile p2 where p2.city = p.city and p2.country = p.country)) as dogs
        from profile p join "user" u on u.id = p.user_id
        where u.email not like ${DEMO_EMAIL}
        group by p.city, p.country
        order by people desc
        limit 8
      `),
      rows(sql`
        select
          count(*) filter (where status = 'verified') as live,
          count(*) filter (where status = 'pending') as pending
        from organization where not is_demo
      `),
    ])

  let sizeMb: number | null = null
  try {
    const [size] = await rows(sql`select pg_database_size(current_database()) as bytes`)
    sizeMb = Math.round((num(size?.bytes) / 1024 / 1024) * 10) / 10
  } catch {
    sizeMb = null
  }

  const byWeek = new Map(series.map((r) => [String(r.week), r]))
  const weeks: WeekPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const week = weekOf(new Date(now.getTime() - i * 7 * DAY))
    const r = byWeek.get(week)
    if (!weeks.some((w) => w.week === week)) weeks.push({ week, signups: num(r?.signups), walks: num(r?.walks) })
  }

  const walksMonth = num(walks.month)
  const walkersMonth = num(walks.walkers_month)

  return {
    people: {
      accounts: num(people.accounts),
      profiles: num(people.profiles),
      walkers: num(people.walkers),
      owners: num(people.owners),
      quizPassed: num(people.quiz),
      newWeek: num(people.new_week),
      newLastWeek: num(people.new_last_week),
      viaInvite: num(people.via_invite),
      viaYourLink: yourReferralCode ? num(people.via_you) : 0,
    },
    dogs: { owner: kpis.ownerDogs, shelter: kpis.shelterDogs, total: kpis.dogsOnline },
    shelters: { live: num(shelters.live), pending: num(shelters.pending), directory: DIRECTORY.length },
    walks: {
      total: num(walks.total),
      week: num(walks.week),
      lastWeek: num(walks.last_week),
      month: walksMonth,
      km: Math.round(num(walks.km) * 10) / 10,
      avgKm: maybe(walks.avg_km) === null ? null : Math.round(num(walks.avg_km) * 100) / 100,
      avgMin: maybe(walks.avg_min) === null ? null : Math.round(num(walks.avg_min)),
      withPhoto: num(walks.with_photo),
      withReport: num(walks.with_report),
      walkersMonth,
      perWalkerMonth: walkersMonth > 0 ? Math.round((walksMonth / walkersMonth) * 10) / 10 : null,
      daysToFirstWalk: maybe(walks.days_to_first) === null ? null : Math.round(num(walks.days_to_first) * 10) / 10,
    },
    requests: {
      total: num(requests.total),
      week: num(requests.week),
      accepted: num(requests.accepted),
      declined: num(requests.declined),
      open: num(requests.open),
      hoursToDecide: maybe(requests.hours_to_decide) === null ? null : Math.round(num(requests.hours_to_decide) * 10) / 10,
    },
    chat: { messages: num(chat.messages), week: num(chat.week), flagged: num(chat.flagged) },
    devices: Object.fromEntries(devices.map((d) => [String(d.kind), num(d.n)])),
    platform: { app: num(platform.app), mobileWeb: num(platform.mobile_web), desktopWeb: num(platform.desktop_web) },
    steady: { pairs: kpis.steadyPairs, walksWeek: kpis.steadyWalksWeek },
    groups: { signupsWeek: kpis.groupSignupsWeek, fill: kpis.groupFill },
    series: weeks,
    walkerFunnel: [
      { label: 'Wil wandelen', n: num(walkerFunnel.walkers) },
      { label: 'Quiz gehaald', n: num(walkerFunnel.quiz) },
      { label: 'Verzoek gestuurd', n: num(walkerFunnel.requested) },
      { label: 'Kennismaking', n: num(walkerFunnel.met) },
      { label: 'Eerste rondje', n: num(walkerFunnel.walked) },
      { label: '3 of meer rondjes', n: num(walkerFunnel.regular) },
    ],
    ownerFunnel: [
      { label: 'Heeft een hond', n: num(ownerFunnel.owners) },
      { label: 'Hond op Rondje', n: num(ownerFunnel.with_dog) },
      { label: 'Verzoek gekregen', n: num(ownerFunnel.asked) },
      { label: 'Hond liep een rondje', n: num(ownerFunnel.walked) },
    ],
    cities: cities.map((c) => ({ city: String(c.city), country: String(c.country), people: num(c.people), dogs: num(c.dogs) })),
    db: { mode: dbMode(), sizeMb },
  }
}
