import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))
const pushNow = vi.fn<(...args: unknown[]) => Promise<void>>(async () => {})
vi.mock('./push', () => ({ canPush: () => true, pushNow }))
const sendEmail = vi.fn<(email: { to: string }) => Promise<boolean>>(async () => true)
vi.mock('./email', () => ({
  emailEnabled: () => true,
  toLocale: (v: string | null) => v ?? 'nl',
  notificationEmail: async (kind: string, _data: unknown, _locale: string, to: string) => ({ to, subject: kind, html: '', text: '' }),
  sendEmail,
}))

const { lastActive, sendNudges, seintjesStopped } = await import('./nudges')
const { sendAppointmentReminders } = await import('./reminders')

// Thursday 8 October 2026, 09:30 in Amsterdam.
const now = new Date('2026-10-08T07:30:00Z')
const day = (date: string) => new Date(`${date}T07:30:00Z`)

async function seintjes(userId: string) {
  const rows = await client.query<{ kind: string; data: Record<string, string> }>(
    `select kind, data from notification where user_id = $1 and (kind like 'nudge-%' or kind = 'challenge-done') order by created_at`,
    [userId],
  )
  return rows.rows
}

async function remindersOn(userId: string) {
  const rows = await client.query<{ reminders: boolean; updated: string }>(
    `select reminders, to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated from profile where user_id = $1`,
    [userId],
  )
  return rows.rows[0]
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('nieuw', 'Nina', 'nina@example.org', false, now(), now()),
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now()),
      ('tom', 'Tom', 'tom@example.org', false, now(), now()),
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('stil', 'Stil', 'stil@example.org', false, now(), now()),
      ('moe', 'Moe', 'moe@example.org', false, now(), now()),
      ('staf', 'Staf', 'staf@example.org', false, now(), now());
    -- Seintjes on: everyone who turned them on. Stil left them off (the default for new profiles).
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code,
      wants_to_walk, has_dogs, photo_url, bio, weekly_goal, reminders, local_nudges, email_notifications, created_at, updated_at)
    values
      ('nieuw', 'Nina', '2000-01-01', 'NL', 'Utrecht', now(), '1', 'NIE234', true, false, null, '', 1, true, false, true, '2026-10-07 10:00', '2026-10-07 10:00'),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', true, false, 'https://example.org/f.jpg',
        'Ik studeer in Utrecht en mis de hond van mijn ouders.', 2, true, false, true, '2026-09-01 10:00', '2026-09-01 10:00'),
      ('tom', 'Tom', '1990-01-01', 'NL', 'Utrecht', now(), '1', 'TOM234', true, false, null, '', null, true, true, true, '2026-09-01 10:00', '2026-09-01 10:00'),
      ('ans', 'Ans', '1951-04-02', 'NL', 'Amersfoort', now(), '1', 'ANS234', false, true, null, '', null, true, false, false, '2026-09-01 10:00', '2026-09-01 10:00'),
      ('stil', 'Stil', '1980-01-01', 'NL', 'Utrecht', now(), '1', 'STI234', true, false, null, '', 3, false, false, true, '2026-09-01 10:00', '2026-09-01 10:00'),
      ('moe', 'Moe', '1995-01-01', 'NL', 'Utrecht', now(), '1', 'MOE234', true, false, null, '', null, true, false, true, '2026-08-01 10:00', '2026-08-01 10:00'),
      ('staf', 'Staf', '1985-01-01', 'NL', 'Utrecht', now(), '1', 'STA234', false, false, 'https://example.org/s.jpg',
        'Ik werk bij de opvang en help graag mee.', null, true, false, true, '2026-10-07 10:00', '2026-10-07 10:00');
    insert into organization (id, name, country, city) values ('opvang', 'Opvang', 'NL', 'Utrecht');
    insert into organization_member (org_id, user_id) values ('opvang', 'staf');
    insert into dog (id, owner_id, name, country, city, created_at, updated_at) values
      ('bello', 'ans', 'Bello', 'NL', 'Utrecht', '2026-09-01 09:00', '2026-09-01 09:00'),
      ('max', 'ans', 'Max', 'NL', 'Amersfoort', '2026-09-28 09:00', '2026-09-28 09:00'),
      ('luna', 'ans', 'Luna', 'NL', 'Utrecht', '2026-10-07 09:00', '2026-10-07 09:00');
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status, created_at) values
      ('r1', 'bello', 'fleur', 'meet', '2026-10-05 08:00', 30, 'completed', '2026-10-01 10:00'),
      ('r2', 'bello', 'tom', 'meet', '2026-09-18 08:00', 30, 'completed', '2026-09-15 10:00'),
      -- Stil has seintjes off but a walk tomorrow at 10:00: that is an appointment, not a seintje.
      ('morgen', 'bello', 'stil', 'walk', '2026-10-09 08:00', 30, 'accepted', '2026-10-01 10:00');
    insert into walk (id, request_id, dog_id, walker_id, started_at, planned_end_at, ended_at, status) values
      ('w1', 'r1', 'bello', 'fleur', '2026-10-05 08:00', '2026-10-05 08:30', '2026-10-05 08:35', 'ended'),
      ('w2', 'r2', 'bello', 'tom', '2026-09-18 08:00', '2026-09-18 08:30', '2026-09-18 08:35', 'ended');
    -- Moe did nothing since 1 August, and three seintjes since then (two of kinds no longer sent).
    insert into notification (id, user_id, kind, data, created_at) values
      ('m1', 'moe', 'nudge-old', '{"variant":"any"}', '2026-09-10 07:30'),
      ('m2', 'moe', 'nudge-gone', '{"left":1,"goal":1}', '2026-09-17 07:30'),
      ('m3', 'moe', 'nudge-challenge', '{"city":"Utrecht","goal":10}', '2026-10-01 07:30');
    insert into push_device (id, user_id, kind, endpoint) values
      ('d1', 'fleur', 'web', 'https://push.example.org/1'),
      -- Tom's iPhone plans its own seintjes (local_nudges), so the server sends it none.
      ('d2', 'tom', 'apns', 'tom-iphone-token');
  `)
}, 30_000)

beforeEach(() => {
  pushNow.mockClear()
  sendEmail.mockClear()
})

afterAll(async () => {
  await client.close()
})

describe('sendNudges', () => {
  it('lets someone who just heard about an appointment wait a day', async () => {
    const run = await sendNudges(now, new Set(['nieuw', 'fleur', 'tom', 'ans']))
    expect(run).toMatchObject({ people: 6, sent: {}, pushed: 0, emailed: 0 })
    // Three in a row and nothing done: Moe's stop anyway, quietly.
    expect(run.stopped).toBe(1)
  })

  it("stopped Moe's seintjes without making it look like Moe did something", async () => {
    expect(await remindersOn('moe')).toEqual({ reminders: false, updated: '2026-08-01 10:00' })
    expect(await seintjes('moe')).toHaveLength(3)
    expect(await seintjesStopped('moe', false, now)).toBe(true)
    // Someone who turned them off themselves (and got none) never sees the line.
    expect(await seintjesStopped('stil', false, now)).toBe(false)
    expect(await seintjesStopped('fleur', true, now)).toBe(false)
  })

  it('sends each person with seintjes on the one that fits; with them off, none', async () => {
    const run = await sendNudges(now)
    expect(run.people).toBe(5)
    expect(run.sent).toEqual({ 'nudge-step': 1, 'nudge-new-dog': 2, 'nudge-owner': 1 })
    expect(run.stopped).toBe(0)

    expect(await seintjes('nieuw')).toEqual([{ kind: 'nudge-step', data: { step: 'about' } }])
    expect(await seintjes('fleur')).toEqual([{ kind: 'nudge-new-dog', data: { dogId: 'luna', dogName: 'Luna' } }])
    expect(await seintjes('tom')).toEqual([{ kind: 'nudge-new-dog', data: { dogId: 'luna', dogName: 'Luna' } }])
    // Max is quiet and hardly any walkers live near Ans: the honest message, without "no request yet".
    expect(await seintjes('ans')).toEqual([{ kind: 'nudge-owner', data: { dogId: 'max', dogName: 'Max' } }])
    expect(await seintjes('stil')).toEqual([])
    expect(await seintjes('staf')).toEqual([])

    // Fleur by push; Tom's iPhone plans its own, so neither a push to it nor an email; Ans turned email off.
    expect(run.pushed).toBe(1)
    expect(pushNow).toHaveBeenCalledWith(db, ['fleur'], 'nudge-new-dog', { dogId: 'luna', dogName: 'Luna' }, { apns: true })
    expect(pushNow.mock.calls.some((c) => (c[1] as string[]).includes('tom'))).toBe(false)
    expect(run.emailed).toBe(1)
    expect(sendEmail.mock.calls.map((c) => c[0].to)).toEqual(['nina@example.org'])
  })

  it('sends nothing more within seven days', async () => {
    for (const date of ['2026-10-09', '2026-10-12', '2026-10-14']) {
      expect((await sendNudges(day(date))).sent).toEqual({})
    }
  })

  it('a week later: the next one for each, and a new dog only for walkers who did not block its owner', async () => {
    await client.exec(`
      insert into dog (id, owner_id, name, country, city, created_at, updated_at) values
        ('pip', 'ans', 'Pip', 'NL', 'Utrecht', '2026-10-13 09:00', '2026-10-13 09:00'),
        ('verre', 'ans', 'Verre', 'NL', 'Groningen', '2026-10-13 09:00', '2026-10-13 09:00');
      insert into block (blocker_id, blocked_id) values ('tom', 'ans');
      -- Fleur asked for a walk after her last seintje: she did something.
      insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status, created_at)
        values ('r3', 'bello', 'fleur', 'walk', '2026-10-20 08:00', 30, 'pending', '2026-10-10 12:00');
    `)
    const run = await sendNudges(day('2026-10-15'))
    // Nina's next first step, Luna (online a week now, no request) for Ans, and Pip for Fleur only.
    expect(run.sent).toEqual({ 'nudge-step': 1, 'nudge-new-dog': 1, 'nudge-owner': 1 })
    expect((await seintjes('ans')).map((n) => n.data.dogId)).toEqual(['max', 'luna'])
    const told = await db.select().from(schema.notification).where(eq(schema.notification.kind, 'nudge-new-dog'))
    expect(told.filter((n) => (n.data as { dogId: string }).dogId === 'pip')).toMatchObject([{ userId: 'fleur' }])
  })

  it('never at night', async () => {
    const night = await sendNudges(new Date('2026-10-20T22:30:00Z'))
    expect(night).toMatchObject({ people: 0, sent: {} })
  })
})

describe('the daily job for someone with seintjes off', () => {
  it('sends no seintje, but does remind them of their own appointment', async () => {
    const before = await seintjes('stil')
    const reminders = await sendAppointmentReminders(now)
    expect(reminders.people).toContain('stil')
    const nudges = await sendNudges(now, new Set(reminders.people))
    expect(nudges.people).not.toBe(0)
    expect(await seintjes('stil')).toEqual(before)
    expect(before).toEqual([])
    const appointment = await client.query<{ kind: string }>(`select kind from notification where user_id = 'stil'`)
    expect(appointment.rows).toEqual([{ kind: 'request-reminder' }])
  })
})

describe('lastActive', () => {
  it('takes the latest thing someone did, and only that', async () => {
    const active = await lastActive(db, ['fleur', 'moe', 'ans'])
    // Fleur's request of 10 October; Moe only his profile; Ans her newest dog.
    expect(active.get('fleur')?.getTime()).toBe(new Date('2026-10-10T12:00:00Z').getTime())
    expect(active.get('moe')?.getTime()).toBe(new Date('2026-08-01T10:00:00Z').getTime())
    expect(active.get('ans')?.getTime()).toBe(new Date('2026-10-13T09:00:00Z').getTime())
  })
})
