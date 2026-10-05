import { describe, expect, it } from 'vitest'
import { groupTips, opsQuestions, opsSummary, QUESTION_IDS, type OpsFacts } from './admin-questions'

const now = new Date('2026-10-03T10:00:00Z')
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000)
const DAY = 24 * 60

const quiet = (): OpsFacts => ({
  now,
  activeWalks: [],
  openReports: [],
  signals: { feedback: 0, requests: 0, chats: 0 },
  pendingIntros: [],
  metWithoutId: [],
  pendingShelters: [],
  bannedThisWeek: [],
  blocksThisWeek: 0,
  repeatBlocked: 0,
  upcomingGroupWalks: [],
  tipGroups: [],
  system: { database: 'neon', dbMs: 12, hosted: true, backlog: { requests: 0, walks: 0, routes: 0 } },
})

const byId = (facts: OpsFacts) => Object.fromEntries(opsQuestions(facts).map((q) => [q.id, q]))

describe('opsQuestions', () => {
  it('answers every question, and says all is quiet when nothing needs attention', () => {
    const questions = opsQuestions(quiet())
    expect(questions.map((q) => q.id)).toEqual([...QUESTION_IDS])
    expect(questions.every((q) => q.level === 'calm')).toBe(true)
    expect(opsSummary(questions)).toEqual({ level: 'calm', count: 0 })
    expect(byId(quiet()).system).toMatchObject({ answer: 'healthy', values: { ms: 12, database: 'neon' } })
  })

  it('puts a walk that is over time first, with a link to follow it', () => {
    const facts = quiet()
    facts.activeWalks = [
      { walkId: 'w1', dogName: 'Bram', plannedEndAt: ago(10) },
      { walkId: 'w2', dogName: 'Saar', plannedEndAt: ago(45) },
    ]
    facts.pendingShelters = [{ createdAt: ago(3 * DAY) }]
    const [first, second] = opsQuestions(facts)
    // 45 minutes after the planned end, minus 20 minutes grace: 25 minutes over time. Bram (10) is still in time.
    expect(first).toMatchObject({ id: 'walks', level: 'urgent', answer: 'overdue', values: { running: 2, overdue: 1 }, href: '/follow/w2' })
    expect(first.items).toEqual([{ label: 'Saar', kind: 'overdue', values: { minutes: 25 }, href: '/follow/w2' }])
    expect(second).toMatchObject({ id: 'shelters', level: 'attention', values: { n: 1, days: 3 } })
    expect(opsSummary(opsQuestions(facts))).toEqual({ level: 'urgent', count: 2 })
  })

  it('treats a safety report, or one waiting more than a day, as urgent', () => {
    const facts = quiet()
    facts.openReports = [{ category: 'other', createdAt: ago(60) }]
    expect(byId(facts).reports).toMatchObject({ level: 'attention', answer: 'open', values: { n: 1, serious: 0, days: 0 } })
    facts.openReports = [{ category: 'other', createdAt: ago(2 * DAY) }]
    expect(byId(facts).reports).toMatchObject({ level: 'urgent', answer: 'open', values: { days: 2 } })
    facts.openReports = [{ category: 'safety', createdAt: ago(5) }]
    expect(byId(facts).reports).toMatchObject({ level: 'urgent', answer: 'serious', values: { serious: 1 } })
  })

  it('finds meetings that are stuck: no answer for two days, starting soon, or no ID after meeting', () => {
    const facts = quiet()
    const intro = { dogId: 'd1', dogName: 'Bram', walkerName: 'Noor' }
    facts.pendingIntros = [
      { ...intro, requestId: 'fresh', createdAt: ago(60), startsAt: ago(-3 * DAY) },
      { ...intro, requestId: 'old', createdAt: ago(3 * DAY), startsAt: ago(-2 * DAY) },
      { ...intro, requestId: 'soon', createdAt: ago(120), startsAt: ago(-6 * 60) },
      { ...intro, requestId: 'past', createdAt: ago(4 * DAY), startsAt: ago(60) },
    ]
    facts.metWithoutId = [{ ...intro, dogId: 'd2', dogName: 'Saar', requestId: 'met', startsAt: ago(2 * DAY) }]
    const q = byId(facts).intros
    expect(q).toMatchObject({ level: 'attention', answer: 'stuck', values: { unanswered: 2, idPending: 1 }, href: '/dogs/d1' })
    expect(q.items.map((i) => [i.kind, i.label])).toEqual([
      ['unanswered', 'Bram · Noor'],
      ['unanswered', 'Bram · Noor'],
      ['idPending', 'Saar · Noor'],
    ])
    expect(q.items[2].values).toEqual({ days: 2 })

    const calm = quiet()
    calm.pendingIntros = [facts.pendingIntros[0]]
    expect(byId(calm).intros).toMatchObject({ level: 'calm', answer: 'none', values: { waiting: 1 } })
  })

  it('flags someone blocked by several people, and lists this week’s bans by first name', () => {
    const facts = quiet()
    facts.bannedThisWeek = [{ name: 'Tim' }]
    facts.blocksThisWeek = 2
    expect(byId(facts).safety).toMatchObject({ level: 'calm', answer: 'banned', values: { banned: 1, names: 'Tim', blocks: 2 } })
    facts.repeatBlocked = 1
    expect(byId(facts).safety).toMatchObject({ level: 'attention', answer: 'repeat', values: { repeat: 1 } })
  })

  it('points at group walks without sign-ups and tips that wait', () => {
    const facts = quiet()
    facts.upcomingGroupWalks = [
      { orgId: 'o1', orgName: 'Opvang Noord', startsAt: ago(-DAY), booked: 0 },
      { orgId: 'o2', orgName: 'Opvang Zuid', startsAt: ago(-120), booked: 3 },
    ]
    facts.tipGroups = [
      { name: 'Asiel A', votes: 1, status: 'new', handledAt: null },
      { name: 'Asiel B', votes: 4, status: 'new', handledAt: null },
      { name: 'Asiel C', votes: 2, status: 'contacted', handledAt: ago(20 * DAY) },
      { name: 'Asiel D', votes: 2, status: 'contacted', handledAt: ago(2 * DAY) },
    ]
    const q = byId(facts)
    expect(q.groupWalks).toMatchObject({ level: 'attention', answer: 'empty', values: { n: 2, empty: 1 }, href: '/shelter/o1' })
    expect(q.tips).toMatchObject({ level: 'attention', answer: 'open', values: { n: 2, top: 'Asiel B', votes: 4, followUp: 1 } })
  })

  it('checks the database and the daily cleanup', () => {
    const facts = quiet()
    facts.system.backlog.requests = 3
    expect(byId(facts).system).toMatchObject({ level: 'attention', answer: 'cronLate', values: { requests: 3 } })
    facts.system = { database: 'pglite', dbMs: 2, hosted: true, backlog: { requests: 0, walks: 0, routes: 0 } }
    expect(byId(facts).system).toMatchObject({ level: 'urgent', answer: 'demoDatabase' })
    // Locally the embedded database is normal.
    facts.system.hosted = false
    expect(byId(facts).system).toMatchObject({ level: 'calm', answer: 'healthy' })
    facts.system.dbMs = 2400
    expect(byId(facts).system).toMatchObject({ level: 'attention', answer: 'slow', values: { ms: 2400 } })
  })
})

describe('groupTips', () => {
  it('groups tips per shelter, most asked-for first, with notes and when it was contacted', () => {
    const tip = (id: string, key: string, status = 'new', handledAt: Date | null = null, note = '') => ({ id, key, status, handledAt, note })
    const groups = groupTips(
      [tip('1', 'a'), tip('2', 'b', 'new', null, 'Graag!'), tip('3', 'b', 'contacted', ago(DAY)), tip('4', 'b', 'contacted', ago(2 * DAY))],
      (t) => t.key,
    )
    expect(groups.map((g) => [g.key, g.ids, g.notes, g.contacted, g.handledAt])).toEqual([
      ['b', ['2', '3', '4'], ['Graag!'], true, ago(DAY)],
      ['a', ['1'], [], false, null],
    ])
  })
})
