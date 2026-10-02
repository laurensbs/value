// The rules of the founder's hub: points, levels, milestones, follow-ups, weekly goals and the money
// sums. Pure functions, so the screens and the tests share one truth.
//
// Same spirit as the app (docs/DECISIONS.md, decision 7): points only for real steps, nothing is
// ever taken away, and no streaks. A week with no mails is just a week.

import { weekOf } from '../progress'
import {
  ALL_TASKS,
  FOLLOW_UP_DAYS,
  FOUNDER_LEVELS,
  PARTNER_TARGETS,
  PHASES,
  STATUS_XP,
  type CostLine,
  type HubIncome,
  type HubSettings,
  type HubTask,
  type PartnerStatus,
  type PartnerType,
  type VideoStatus,
} from './content'

const DAY = 24 * 60 * 60_000

// ---------- State ----------

export interface TaskState {
  doneAt: string
}

export interface PartnerState {
  status: PartnerStatus
  /** Highest points this partner ever earned: going back to "nee" never takes points away. */
  xp: number
  /** Your own partners (a shelter from the list, or one you added). */
  name?: string
  type?: PartnerType
  city?: string
  country?: string
  region?: string
  email?: string
  website?: string
  contact?: string
  note?: string
  /** When you first mailed them, and when you last mailed or followed up. */
  mailedAt?: string
  lastContactAt?: string
  followUps?: number
  updatedAt: string
}

export interface ContentState {
  status: VideoStatus
  xp: number
  link?: string
  note?: string
  postedAt?: string
  /** Your own idea, not one from the list. */
  title?: string
  updatedAt: string
}

export interface HubState {
  tasks: Record<string, TaskState>
  partners: Record<string, PartnerState>
  content: Record<string, ContentState>
  settings: HubSettings
  costs: CostLine[]
  income: HubIncome
  /** Milestone id to the moment it was first reached. */
  milestones: Record<string, string>
}

/** Points for a video step. A posted video is the real thing. */
export const VIDEO_XP: Record<VideoStatus, number> = { idee: 0, gepland: 5, gefilmd: 10, gepost: 25 }

// ---------- Levels ----------

export interface FounderLevel {
  /** 1 to 10. */
  level: number
  name: string
  floor: number
  next: number | null
  nextName: string | null
  /** 0 to 1 on the way to the next level (1 at the top). */
  progress: number
}

export function levelFor(xp: number): FounderLevel {
  let i = 0
  while (i + 1 < FOUNDER_LEVELS.length && xp >= FOUNDER_LEVELS[i + 1].min) i++
  const floor = FOUNDER_LEVELS[i].min
  const nextLevel = FOUNDER_LEVELS[i + 1]
  return {
    level: i + 1,
    name: FOUNDER_LEVELS[i].name,
    floor,
    next: nextLevel?.min ?? null,
    nextName: nextLevel?.name ?? null,
    progress: nextLevel ? Math.min(1, Math.max(0, (xp - floor) / (nextLevel.min - floor))) : 1,
  }
}

export interface XpBreakdown {
  tasks: number
  partners: number
  content: number
  milestones: number
  total: number
}

export function xpOf(state: HubState): XpBreakdown {
  const taskXp = new Map(ALL_TASKS.map((t) => [t.id, t.xp]))
  const tasks = Object.keys(state.tasks).reduce((n, id) => n + (taskXp.get(id) ?? 0), 0)
  const partners = Object.values(state.partners).reduce((n, p) => n + Math.max(p.xp ?? 0, STATUS_XP[p.status] ?? 0), 0)
  const content = Object.values(state.content).reduce((n, c) => n + Math.max(c.xp ?? 0, VIDEO_XP[c.status] ?? 0), 0)
  const xpById = new Map(MILESTONES.map((m) => [m.id, m.xp]))
  const milestones = Object.keys(state.milestones).reduce((n, id) => n + (xpById.get(id) ?? 0), 0)
  return { tasks, partners, content, milestones, total: tasks + partners + content + milestones }
}

/** The next partner state after a status change. Points only ever go up. */
export function movePartner(prev: PartnerState | undefined, status: PartnerStatus, now: Date): PartnerState {
  const at = now.toISOString()
  const next: PartnerState = { ...(prev ?? { status: 'doel', xp: 0, updatedAt: at }), status, updatedAt: at }
  next.xp = Math.max(prev?.xp ?? 0, STATUS_XP[status])
  if (status !== 'doel' && !next.mailedAt) {
    next.mailedAt = at
    next.lastContactAt = at
  }
  return next
}

export function moveContent(prev: ContentState | undefined, status: VideoStatus, now: Date): ContentState {
  const at = now.toISOString()
  const next: ContentState = { ...(prev ?? { status: 'idee', xp: 0, updatedAt: at }), status, updatedAt: at }
  next.xp = Math.max(prev?.xp ?? 0, VIDEO_XP[status])
  if (status === 'gepost' && !next.postedAt) next.postedAt = at
  return next
}

// ---------- The plan ----------

export function phaseProgress(state: HubState) {
  return PHASES.map((p) => {
    const done = p.tasks.filter((t) => state.tasks[t.id]).length
    return { id: p.id, title: p.title, done, total: p.tasks.length, complete: done === p.tasks.length }
  })
}

/**
 * What to do next: up to `n - 1` open steps from the phase you are in, and one from the phase after
 * it, so there is always something that can move today while the slow things (a notary) wait.
 */
export function nextTasks(state: HubState, n = 3): HubTask[] {
  const open = PHASES.map((p) => p.tasks.filter((t) => !state.tasks[t.id])).filter((tasks) => tasks.length > 0)
  const [current = [], after = []] = open
  const picked = current.slice(0, after.length > 0 ? n - 1 : n)
  for (const t of after) {
    if (picked.length >= n) break
    picked.push(t)
  }
  return picked
}

// ---------- Partners ----------

export interface PartnerView {
  id: string
  name: string
  type: PartnerType
  why?: string
  ask?: string
  template: string
  email?: string
  website?: string
  city?: string
  country?: string
  generic: boolean
  custom: boolean
  state: PartnerState
}

/** Built-in targets with their saved state, plus the partners you added yourself. */
export function partnerList(state: HubState, now: Date): PartnerView[] {
  const fresh = (): PartnerState => ({ status: 'doel', xp: 0, updatedAt: now.toISOString() })
  const builtIn: PartnerView[] = PARTNER_TARGETS.map((t) => {
    const saved = state.partners[t.id]
    return {
      id: t.id,
      name: t.name,
      type: t.type,
      why: t.why,
      ask: t.ask,
      template: t.template,
      email: saved?.email || t.email,
      website: t.website,
      generic: Boolean(t.generic),
      custom: false,
      state: saved ?? fresh(),
    }
  })
  const known = new Set(PARTNER_TARGETS.map((t) => t.id))
  const own: PartnerView[] = Object.entries(state.partners)
    .filter(([id, p]) => !known.has(id) && p.name)
    .map(([id, p]) => ({
      id,
      name: p.name!,
      type: p.type ?? 'opvang',
      template: templateFor(p.type ?? 'opvang', p.country, p.region),
      email: p.email,
      website: p.website,
      city: p.city,
      country: p.country,
      generic: false,
      custom: true,
      state: p,
    }))
  return [...builtIn, ...own]
}

const FRENCH_REGIONS = /bruxelles|brussel|wallon|li[eè]ge|hainaut|namur|luxembourg/i

/** The mail that fits a partner you added. Shelters get it in their own language. */
export function templateFor(type: PartnerType, country?: string, region?: string): string {
  if (type !== 'opvang') return TYPE_TEMPLATE[type]
  if (country === 'ES') return 'opvang-es'
  if (country === 'BE' && region && FRENCH_REGIONS.test(region)) return 'opvang-fr'
  return 'opvang'
}

const TYPE_TEMPLATE: Record<PartnerType, string> = {
  welzijn: 'welzijn',
  opvang: 'opvang',
  'goed-doel': 'hulphond',
  fonds: 'fonds',
  overheid: 'gemeente',
  onderwijs: 'hogeschool',
  bedrijf: 'dierenwinkel',
  verzekering: 'verzekeraar',
  dierenarts: 'dierenarts',
  pers: 'pers',
}

/** You sent a friendly follow-up: the week starts again. */
export function followedUp(prev: PartnerState, now: Date): PartnerState {
  const at = now.toISOString()
  return { ...prev, followUps: (prev.followUps ?? 0) + 1, lastContactAt: at, updatedAt: at }
}

/** Mailed partners who have not answered for a week. At most two friendly follow-ups each. */
export function followUpsDue(partners: PartnerView[], now: Date): PartnerView[] {
  return partners.filter((p) => {
    if (p.state.status !== 'gemaild') return false
    if ((p.state.followUps ?? 0) >= 2) return false
    const last = p.state.lastContactAt ?? p.state.mailedAt
    if (!last) return false
    return now.getTime() - new Date(last).getTime() >= FOLLOW_UP_DAYS * DAY
  })
}

export function daysSince(iso: string | undefined, now: Date): number | null {
  if (!iso) return null
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY)
}

// ---------- Weekly rhythm ----------

export interface WeekRhythm {
  week: string
  mails: number
  mailsGoal: number
  videos: number
  videosGoal: number
  tasks: number
}

/** This week's mails (first mails and follow-ups), posted videos and ticked steps. Local weeks. */
export function weekRhythm(state: HubState, now: Date): WeekRhythm {
  const week = weekOf(now)
  const inWeek = (iso?: string) => Boolean(iso && weekOf(new Date(iso)) === week)
  const mails = Object.values(state.partners).filter((p) => inWeek(p.mailedAt) || inWeek(p.lastContactAt)).length
  const videos = Object.values(state.content).filter((c) => inWeek(c.postedAt)).length
  const tasks = Object.values(state.tasks).filter((t) => inWeek(t.doneAt)).length
  return {
    week,
    mails,
    mailsGoal: state.settings.mailsPerWeek,
    videos,
    videosGoal: state.settings.videosPerWeek,
    tasks,
  }
}

// ---------- Mails ----------

export type MailVars = Partial<Record<'naam' | 'organisatie' | 'jouwNaam' | 'telefoon' | 'website' | 'stad' | 'wijk' | 'onderwerp', string>>

/** Left out quietly when empty: the greeting falls back to "medewerker", the signature shrinks. */
const OPTIONAL = new Set(['naam', 'telefoon', 'website'])
/** Shown as [stad] when empty, so you see what to fill in before sending. */
const REQUIRED = new Set(['organisatie', 'jouwNaam', 'stad', 'wijk', 'onderwerp'])

/** Fills the {placeholders} of a mail. Unknown placeholders stay as they are. */
export function fillTemplate(text: string, vars: MailVars): string {
  const naam = vars.naam?.trim()
  const values: Record<string, string | undefined> = {
    ...vars,
    aanhef: naam ? `Beste ${naam}` : 'Beste medewerker',
    bonjour: naam ? `Bonjour ${naam},` : 'Bonjour,',
    hola: naam ? `Hola, ${naam}:` : 'Hola:',
  }
  return text
    .replace(/\{(\w+)\}/g, (match, key: string) => {
      const value = values[key]?.trim()
      if (value) return value
      if (OPTIONAL.has(key)) return ''
      if (REQUIRED.has(key)) return `[${key}]`
      return match
    })
    .split('\n')
    .map((line) => line.replace(/^\s*·\s*/, '').replace(/\s*·\s*$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

/** Blanks still to fill in, like [datum] or [aantal]. */
export function blanksIn(text: string): string[] {
  return [...new Set(text.match(/\[[^\]\n]{2,60}\]/g) ?? [])]
}

export function mailtoHref({ to, subject, body }: { to?: string; subject: string; body: string }): string {
  const address = (to ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => encodeURIComponent(a).replace(/%40/g, '@'))
    .join(',')
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`
}

const query = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

export function gmailHref({ to, subject, body }: { to?: string; subject: string; body: string }): string {
  return `https://mail.google.com/mail/?${query({ view: 'cm', fs: '1', to: to ?? '', su: subject, body })}`
}

export function outlookHref({ to, subject, body }: { to?: string; subject: string; body: string }): string {
  return `https://outlook.live.com/mail/0/deeplink/compose?${query({ to: to ?? '', subject, body })}`
}

// ---------- Money ----------

export function monthlyAmount(line: CostLine): number {
  if (!line.active) return 0
  if (line.period === 'maand') return line.amount
  if (line.period === 'jaar') return line.amount / 12
  return 0
}

export interface CostSummary {
  perMonth: number
  perYear: number
  oneOff: number
}

export function costSummary(lines: CostLine[]): CostSummary {
  const perMonth = lines.reduce((n, l) => n + monthlyAmount(l), 0)
  const oneOff = lines.filter((l) => l.active && l.period === 'eenmalig').reduce((n, l) => n + l.amount, 0)
  return { perMonth, perYear: perMonth * 12, oneOff }
}

export interface MoneyPicture {
  costPerMonth: number
  incomePerMonth: number
  /** Income minus costs, per month. */
  balance: number
  /** 0 to 1+, how much of the monthly costs the gifts cover. */
  covered: number
  /** Members at the average gift needed to cover the costs (on top of other income). */
  membersNeeded: number
  /** Euros per walk last month, or null without walks. */
  perWalk: number | null
  /** Euros per walker who walked last month. */
  perActiveWalker: number | null
}

export function moneyPicture(costs: CostLine[], income: HubIncome, walksMonth: number, activeWalkersMonth: number): MoneyPicture {
  const { perMonth } = costSummary(costs)
  const incomePerMonth = income.members * income.averageGift + income.otherPerMonth
  const gap = Math.max(0, perMonth - income.otherPerMonth)
  return {
    costPerMonth: perMonth,
    incomePerMonth,
    balance: incomePerMonth - perMonth,
    covered: perMonth > 0 ? incomePerMonth / perMonth : incomePerMonth > 0 ? 1 : 0,
    membersNeeded: income.averageGift > 0 ? Math.ceil(gap / income.averageGift) : 0,
    perWalk: walksMonth > 0 ? perMonth / walksMonth : null,
    perActiveWalker: activeWalkersMonth > 0 ? perMonth / activeWalkersMonth : null,
  }
}

export function euro(amount: number, digits = amount % 1 === 0 ? 0 : 2): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount)
}

/** Share as a whole percentage, or null when there is nothing to divide by. */
export function pct(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null
}

/** Change from last week to this week, as a whole percentage (null when last week was zero). */
export function change(now: number, before: number): number | null {
  return before > 0 ? Math.round(((now - before) / before) * 100) : null
}

// ---------- Milestones ----------

/** The app numbers milestones look at. */
export interface MilestoneStats {
  dogs: number
  walks: number
  km: number
  steadyPairs: number
  sheltersLive: number
  walkers: number
}

export interface Milestone {
  id: string
  title: string
  /** What it means, shown on the medal. */
  text: string
  xp: number
  group: 'app' | 'hub'
  /** Where you are on the way, for locked milestones. */
  measure: (state: HubState, stats: MilestoneStats) => { now: number; goal: number }
}

const count = (n: number, goal: number) => ({ now: Math.min(n, goal), goal })
const partnersAt = (state: HubState, statuses: PartnerStatus[]) => Object.values(state.partners).filter((p) => statuses.includes(p.status)).length
const ever = (state: HubState, statuses: PartnerStatus[], min: number) =>
  Object.values(state.partners).filter((p) => statuses.includes(p.status) || p.xp >= min).length

export const MILESTONES: Milestone[] = [
  { id: 'first-dog', group: 'app', title: 'Eerste hond', text: 'Er staat een echte hond op Rondje.', xp: 25, measure: (_, s) => count(s.dogs, 1) },
  { id: 'first-walk', group: 'app', title: 'Eerste rondje', text: 'Iemand liep een rondje via Rondje.', xp: 50, measure: (_, s) => count(s.walks, 1) },
  { id: 'walkers-10', group: 'app', title: '10 wandelaars', text: 'Tien mensen die willen lopen.', xp: 30, measure: (_, s) => count(s.walkers, 10) },
  { id: 'walks-10', group: 'app', title: '10 rondjes', text: 'Tien keer een hond naar buiten.', xp: 40, measure: (_, s) => count(s.walks, 10) },
  { id: 'first-pair', group: 'app', title: 'Eerste vaste koppel', text: 'Een wandelaar en een hond liepen 3 keer samen.', xp: 80, measure: (_, s) => count(s.steadyPairs, 1) },
  { id: 'first-shelter', group: 'app', title: 'Eerste opvang', text: 'Een opvang staat geverifieerd op Rondje.', xp: 60, measure: (_, s) => count(s.sheltersLive, 1) },
  { id: 'km-100', group: 'app', title: '100 kilometer', text: 'Samen 100 kilometer gelopen.', xp: 50, measure: (_, s) => count(Math.floor(s.km), 100) },
  { id: 'pairs-5', group: 'app', title: '5 vaste koppels', text: 'Het doel van de pilot is 3. Dit is meer.', xp: 100, measure: (_, s) => count(s.steadyPairs, 5) },
  { id: 'walks-100', group: 'app', title: '100 rondjes', text: 'Honderd keer een hond naar buiten.', xp: 100, measure: (_, s) => count(s.walks, 100) },
  { id: 'walkers-100', group: 'app', title: '100 wandelaars', text: 'Honderd mensen die willen lopen.', xp: 100, measure: (_, s) => count(s.walkers, 100) },
  { id: 'walks-1000', group: 'app', title: '1.000 rondjes', text: 'Duizend keer. Dit is een beweging.', xp: 200, measure: (_, s) => count(s.walks, 1000) },
  { id: 'first-mail', group: 'hub', title: 'Eerste mail', text: 'Je vroeg het gewoon. Dat is het moeilijkste.', xp: 20, measure: (st) => count(ever(st, ['gemaild', 'reactie', 'gesprek', 'partner', 'nee'], 10), 1) },
  { id: 'mails-10', group: 'hub', title: '10 mails', text: 'Tien organisaties weten van Rondje.', xp: 50, measure: (st) => count(ever(st, ['gemaild', 'reactie', 'gesprek', 'partner', 'nee'], 10), 10) },
  { id: 'first-reply', group: 'hub', title: 'Eerste reactie', text: 'Iemand schreef terug.', xp: 30, measure: (st) => count(ever(st, ['reactie', 'gesprek', 'partner'], 25), 1) },
  { id: 'first-meeting', group: 'hub', title: 'Eerste gesprek', text: 'Een afspraak in de agenda.', xp: 40, measure: (st) => count(ever(st, ['gesprek', 'partner'], 50), 1) },
  { id: 'first-partner', group: 'hub', title: 'Eerste partner', text: 'Iemand doet echt mee.', xp: 100, measure: (st) => count(partnersAt(st, ['partner']), 1) },
  { id: 'first-video', group: 'hub', title: 'Eerste video', text: 'Rondje is te zien.', xp: 30, measure: (st) => count(Object.values(st.content).filter((c) => c.postedAt).length, 1) },
  { id: 'videos-10', group: 'hub', title: '10 video’s', text: 'Een echt kanaal.', xp: 80, measure: (st) => count(Object.values(st.content).filter((c) => c.postedAt).length, 10) },
  {
    id: 'fundament',
    group: 'hub',
    title: 'Fundament staat',
    text: 'Naam, stichting en verzekering geregeld.',
    xp: 100,
    measure: (st) => {
      const tasks = PHASES[0].tasks
      return { now: tasks.filter((t) => st.tasks[t.id]).length, goal: tasks.length }
    },
  },
  { id: 'first-member', group: 'hub', title: 'Eerste lid', text: 'Iemand geeft elke maand.', xp: 60, measure: (st) => count(st.income.members, 1) },
  {
    id: 'costs-covered',
    group: 'hub',
    title: 'Kosten gedekt',
    text: 'De giften dekken de maandkosten.',
    xp: 150,
    measure: (st) => {
      const money = moneyPicture(st.costs, st.income, 0, 0)
      if (money.costPerMonth <= 0) return { now: 0, goal: 1 }
      return { now: Math.min(100, Math.round(money.covered * 100)), goal: 100 }
    },
  },
]

export interface MilestoneView {
  id: string
  title: string
  text: string
  xp: number
  group: 'app' | 'hub'
  reachedAt: string | null
  now: number
  goal: number
}

export function milestoneViews(state: HubState, stats: MilestoneStats): MilestoneView[] {
  return MILESTONES.map((m) => {
    const { now, goal } = m.measure(state, stats)
    return { id: m.id, title: m.title, text: m.text, xp: m.xp, group: m.group, reachedAt: state.milestones[m.id] ?? null, now, goal }
  })
}

/** Milestones reached now but not yet recorded. Once recorded they stay, even if a number drops. */
export function newMilestones(state: HubState, stats: MilestoneStats): string[] {
  return MILESTONES.filter((m) => {
    if (state.milestones[m.id]) return false
    const { now, goal } = m.measure(state, stats)
    return now >= goal
  }).map((m) => m.id)
}

/** The closest milestone not reached yet, to show as "next up". */
export function nextMilestone(views: MilestoneView[]): MilestoneView | null {
  const open = views.filter((v) => !v.reachedAt)
  if (open.length === 0) return null
  return open.reduce((best, v) => (v.now / v.goal > best.now / best.goal ? v : best), open[0])
}
