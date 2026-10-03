import { describe, expect, it } from 'vitest'
import { ALL_TASKS, DEFAULT_COSTS, DEFAULT_INCOME, DEFAULT_SETTINGS, PHASES, TEMPLATES, type HubTask } from './content'
import {
  applyAutoChecks,
  autoChecks,
  blanksIn,
  costSummary,
  fillTemplate,
  followedUp,
  followUpsDue,
  levelFor,
  mailtoHref,
  milestoneViews,
  moneyPicture,
  movePartner,
  newMilestones,
  nextTasks,
  partnerFromContact,
  partnerList,
  templateFor,
  waitingTasks,
  weekRhythm,
  xpOf,
  type HubState,
  type MilestoneStats,
} from './game'

const NOW = new Date('2026-10-02T10:00:00Z')

function state(patch: Partial<HubState> = {}): HubState {
  return {
    tasks: {},
    partners: {},
    content: {},
    settings: DEFAULT_SETTINGS,
    costs: DEFAULT_COSTS,
    income: DEFAULT_INCOME,
    milestones: {},
    ...patch,
  }
}

const noStats: MilestoneStats = { dogs: 0, walks: 0, km: 0, steadyPairs: 0, sheltersLive: 0, walkers: 0 }

describe('founder levels', () => {
  it('start at Idee and climb', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, name: 'Idee', next: 60, nextName: 'Plan', progress: 0 })
    expect(levelFor(30).progress).toBe(0.5)
    expect(levelFor(60)).toMatchObject({ level: 2, name: 'Plan' })
    expect(levelFor(99_999)).toMatchObject({ level: 10, name: 'Beweging', next: null, progress: 1 })
  })
})

describe('points', () => {
  it('never go down when a partner says no after a talk', () => {
    const mailed = movePartner(undefined, 'gemaild', NOW)
    expect(mailed.mailedAt).toBe(NOW.toISOString())
    const talk = movePartner(mailed, 'gesprek', NOW)
    const no = movePartner(talk, 'nee', NOW)
    expect(no.xp).toBe(50)
    expect(xpOf(state({ partners: { a: no } })).partners).toBe(50)
  })

  it('add up tasks, partners and milestones', () => {
    const first = ALL_TASKS[0]
    const xp = xpOf(state({ tasks: { [first.id]: { doneAt: NOW.toISOString() } }, milestones: { 'first-mail': NOW.toISOString() } }))
    expect(xp.tasks).toBe(first.xp)
    expect(xp.milestones).toBe(20)
    expect(xp.total).toBe(first.xp + 20)
  })
})

describe('next steps', () => {
  // Claude's steps and the ones waiting on top of Vandaag are never in "your next steps".
  const yours = (tasks: HubTask[]) => tasks.filter((t) => t.owner !== 'claude' && !t.waiting)
  const [first, second] = [yours(PHASES[0].tasks), yours(PHASES[1].tasks)]

  it('mix the current phase with one step from the next', () => {
    const steps = nextTasks(state())
    expect(steps.map((t) => t.id)).toEqual([first[0].id, first[1].id, second[0].id])
  })

  it('fill up from the next phase when the current one is nearly done', () => {
    const done = Object.fromEntries(first.slice(0, -1).map((t) => [t.id, { doneAt: NOW.toISOString() }]))
    const steps = nextTasks(state({ tasks: done }))
    expect(steps.map((t) => t.id)).toEqual([first.at(-1)!.id, second[0].id, second[1].id])
  })

  it('leave out what Claude does and what waits on top', () => {
    const ids = new Set(nextTasks(state(), 50).map((t) => t.id))
    for (const t of ALL_TASKS.filter((t) => t.owner === 'claude' || t.waiting)) expect(ids.has(t.id)).toBe(false)
  })

  it('are empty when everything is done', () => {
    const done = Object.fromEntries(ALL_TASKS.map((t) => [t.id, { doneAt: NOW.toISOString() }]))
    expect(nextTasks(state({ tasks: done }))).toEqual([])
  })
})

describe('what waits on you', () => {
  it('is four steps: the name, going live, the App Store and what costs money', () => {
    expect(waitingTasks().map((t) => t.id)).toEqual(['naam', 'live-zetten', 'indienen', 'geld'])
  })

  it('every step from the launch hub has its own key, once', () => {
    const keys = ALL_TASKS.flatMap((t) => (t.launchKey ? [t.launchKey] : []))
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(expect.arrayContaining(['name', 'goLive', 'submit', 'money', 'trademark', 'firstMails', 'firstDog']))
  })
})

describe('steps that tick themselves off', () => {
  const facts = { production: false, socialLogin: false, realDogs: 0 }

  it('follow the live site, the shelters you mailed and the first real dog', () => {
    const shelters = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`opvang-${i}`, { ...movePartner(undefined, 'gemaild', NOW), name: `Opvang ${i}`, type: 'opvang' as const }]),
    )
    const s = state({ partners: shelters })
    const checks = autoChecks(s, { production: true, socialLogin: false, realDogs: 1 }, NOW)
    expect(checks).toEqual({ production: true, socialLogin: false, shelterMails: true, shelterMeeting: false, realDog: true })
    applyAutoChecks(s, checks, NOW)
    expect(s.tasks['live-zetten']).toEqual({ doneAt: NOW.toISOString(), auto: true })
    expect(s.tasks['tien-opvangen']?.auto).toBe(true)
    expect(s.tasks['eerste-hond']?.auto).toBe(true)
    expect(s.tasks['social-login']).toBeUndefined()
  })

  it('need ten shelters for "Mail 10 opvangen", and a planned talk for the first meeting', () => {
    const nine = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`opvang-${i}`, { ...movePartner(undefined, 'gemaild', NOW), name: `Opvang ${i}`, type: 'opvang' as const }]),
    )
    expect(autoChecks(state({ partners: nine }), facts, NOW).shelterMails).toBe(false)
    const talking = { a: { ...movePartner(undefined, 'gesprek', NOW), name: 'Asiel A', type: 'opvang' as const } }
    expect(autoChecks(state({ partners: talking }), facts, NOW).shelterMeeting).toBe(true)
  })

  it('do not count as steps you took this week', () => {
    const s = state()
    applyAutoChecks(s, { production: true, socialLogin: true, shelterMails: false, shelterMeeting: false, realDog: false }, NOW)
    expect(weekRhythm(s, NOW).tasks).toBe(0)
  })
})

describe('contacts from the launch hub', () => {
  const contact = {
    id: 'c1',
    audience: 'shelter',
    name: 'Sanne',
    organisation: 'Dierenasiel Utrecht',
    email: 'info@asiel.test',
    phone: '030 123 45 67',
    city: 'Utrecht',
    status: 'sent',
    lastContactAt: new Date('2026-10-01T09:00:00Z'),
    note: '',
    createdAt: new Date('2026-09-30T09:00:00Z'),
  }

  it('become partners with the same stage and its points', () => {
    expect(partnerFromContact(contact)).toEqual({
      status: 'gemaild',
      xp: 10,
      name: 'Dierenasiel Utrecht',
      type: 'opvang',
      contact: 'Sanne',
      email: 'info@asiel.test',
      phone: '030 123 45 67',
      city: 'Utrecht',
      note: undefined,
      mailedAt: '2026-10-01T09:00:00.000Z',
      lastContactAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    })
  })

  it('keep their kind: a student association gets the student mail, a buurtgroep the post', () => {
    const student = partnerFromContact({ ...contact, audience: 'student', status: 'todo', organisation: '', lastContactAt: null })
    expect(student).toMatchObject({ status: 'doel', xp: 0, name: 'Sanne', type: 'studenten', contact: undefined })
    expect(student.mailedAt).toBeUndefined()
    expect(templateFor('studenten')).toBe('studenten')
    expect(templateFor(partnerFromContact({ ...contact, audience: 'neighbourhood' }).type!)).toBe('buurtgroep')
  })
})

describe('follow-ups', () => {
  it('come after a week of silence, at most twice', () => {
    const weekAgo = new Date(NOW.getTime() - 7 * 24 * 60 * 60_000)
    const mailed = movePartner(undefined, 'gemaild', weekAgo)
    const list = partnerList(state({ partners: { hulphond: mailed } }), NOW)
    expect(followUpsDue(list, NOW).map((p) => p.id)).toEqual(['hulphond'])
    expect(followUpsDue(list, new Date(NOW.getTime() - 60_000))).toEqual([])

    const once = followedUp(mailed, NOW)
    expect(followUpsDue(partnerList(state({ partners: { hulphond: once } }), NOW), NOW)).toEqual([])
    const twice = { ...followedUp(once, weekAgo), lastContactAt: weekAgo.toISOString() }
    expect(followUpsDue(partnerList(state({ partners: { hulphond: twice } }), NOW), NOW)).toEqual([])
  })

  it('stop once someone answers', () => {
    const weekAgo = new Date(NOW.getTime() - 8 * 24 * 60 * 60_000)
    const answered = movePartner(movePartner(undefined, 'gemaild', weekAgo), 'reactie', NOW)
    expect(followUpsDue(partnerList(state({ partners: { hulphond: answered } }), NOW), NOW)).toEqual([])
  })
})

describe('partners', () => {
  it('list built-in targets and your own', () => {
    const own = { ...movePartner(undefined, 'doel', NOW), name: 'SPA La Louvière', type: 'opvang' as const, country: 'BE', region: 'Hainaut' }
    const list = partnerList(state({ partners: { 'dir-be-spa': own } }), NOW)
    expect(list.find((p) => p.id === 'hulphond')?.state.status).toBe('doel')
    expect(list.find((p) => p.id === 'dir-be-spa')).toMatchObject({ custom: true, template: 'opvang-fr' })
  })

  it('pick the shelter mail in the right language', () => {
    expect(templateFor('opvang', 'NL')).toBe('opvang')
    expect(templateFor('opvang', 'BE', 'West-Vlaanderen')).toBe('opvang')
    expect(templateFor('opvang', 'BE', 'Liège')).toBe('opvang-fr')
    expect(templateFor('opvang', 'ES', 'Andalucía')).toBe('opvang-es')
    expect(templateFor('overheid')).toBe('gemeente')
  })
})

describe('weekly rhythm', () => {
  it('counts this local week only', () => {
    const monday = new Date('2026-09-28T08:00:00Z')
    const lastSunday = new Date('2026-09-27T20:00:00Z')
    const s = state({
      partners: { a: movePartner(undefined, 'gemaild', monday), b: movePartner(undefined, 'gemaild', lastSunday) },
      tasks: { naam: { doneAt: monday.toISOString() } },
    })
    expect(weekRhythm(s, NOW)).toMatchObject({ week: '2026-09-28', mails: 1, mailsGoal: 3, tasks: 1, videos: 0 })
  })
})

describe('mails', () => {
  it('fill in names and keep blanks visible', () => {
    const text = fillTemplate('{aanhef},\n\nIk ben {jouwNaam} uit {stad}.\n\nGroet,\n{jouwNaam}\n{telefoon} · {website}', {
      jouwNaam: 'Laurens',
      website: 'rondje-five.vercel.app',
    })
    expect(text).toBe('Beste medewerker,\n\nIk ben Laurens uit [stad].\n\nGroet,\nLaurens\nrondje-five.vercel.app')
    expect(blanksIn(text)).toEqual(['[stad]'])
    expect(fillTemplate('{aanhef},', { naam: 'Anna' })).toBe('Beste Anna,')
    expect(fillTemplate('{bonjour}', {})).toBe('Bonjour,')
    expect(fillTemplate('{hola}', { naam: 'Ana' })).toBe('Hola, Ana:')
    expect(fillTemplate('{onbekend}', {})).toBe('{onbekend}')
  })

  it('leave no placeholders behind in any template', () => {
    const vars = { naam: 'Anna', organisatie: 'X', jouwNaam: 'L', telefoon: '06', website: 'w', stad: 'Utrecht', wijk: 'Oost', onderwerp: 'Rondje' }
    for (const t of TEMPLATES) {
      expect(fillTemplate(t.body, vars), t.id).not.toMatch(/\{\w+\}/)
      expect(fillTemplate(t.subject, vars), t.id).not.toMatch(/\{\w+\}/)
      if (t.short) expect(fillTemplate(t.short, vars), t.id).not.toMatch(/\{\w+\}/)
    }
  })

  it('build a mailto link mail apps understand', () => {
    const href = mailtoHref({ to: 'info@example.org', subject: 'Hoi & dag', body: 'Regel 1\nRegel 2' })
    expect(href).toBe('mailto:info@example.org?subject=Hoi%20%26%20dag&body=Regel%201%0D%0ARegel%202')
    expect(mailtoHref({ subject: 'x', body: '' })).toBe('mailto:?subject=x&body=')
  })
})

describe('money', () => {
  it('turns yearly costs into months and skips what is switched off', () => {
    const sum = costSummary([
      { id: 'a', label: 'A', amount: 5, period: 'maand', note: '', active: true },
      { id: 'b', label: 'B', amount: 120, period: 'jaar', note: '', active: true },
      { id: 'c', label: 'C', amount: 500, period: 'eenmalig', note: '', active: true },
      { id: 'd', label: 'D', amount: 19, period: 'maand', note: '', active: false },
    ])
    expect(sum).toEqual({ perMonth: 15, perYear: 180, oneOff: 500 })
  })

  it('says how many members cover the costs', () => {
    const costs = [{ id: 'a', label: 'A', amount: 40, period: 'maand' as const, note: '', active: true }]
    const m = moneyPicture(costs, { members: 3, averageGift: 5, otherPerMonth: 10 }, 20, 4)
    expect(m).toMatchObject({ costPerMonth: 40, incomePerMonth: 25, balance: -15, membersNeeded: 6, perWalk: 2, perActiveWalker: 10 })
    expect(m.covered).toBeCloseTo(0.625)
    expect(moneyPicture(costs, DEFAULT_INCOME, 0, 0).perWalk).toBeNull()
  })
})

describe('milestones', () => {
  it('unlock from app numbers and hub steps', () => {
    const s = state({ partners: { hulphond: movePartner(undefined, 'gemaild', NOW) } })
    expect(newMilestones(s, noStats)).toEqual(['first-mail'])
    expect(newMilestones(s, { ...noStats, walks: 12, dogs: 2 })).toEqual(expect.arrayContaining(['first-dog', 'first-walk', 'walks-10', 'first-mail']))
  })

  it('stay reached once recorded', () => {
    const s = state({ milestones: { 'first-walk': NOW.toISOString() } })
    expect(newMilestones(s, { ...noStats, walks: 1 })).not.toContain('first-walk')
    const view = milestoneViews(s, noStats).find((m) => m.id === 'first-walk')
    expect(view?.reachedAt).toBe(NOW.toISOString())
  })

  it('cover the costs only when there are costs', () => {
    const free = state({ costs: [], income: { members: 0, averageGift: 5, otherPerMonth: 0 } })
    expect(newMilestones(free, noStats)).not.toContain('costs-covered')
    const covered = state({
      costs: [{ id: 'a', label: 'A', amount: 10, period: 'maand', note: '', active: true }],
      income: { members: 2, averageGift: 5, otherPerMonth: 0 },
    })
    expect(newMilestones(covered, noStats)).toContain('costs-covered')
  })
})
