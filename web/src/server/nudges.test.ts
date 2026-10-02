import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))
const pushNow = vi.fn(async () => {})
vi.mock('./push', () => ({ canPush: (kind: string) => kind === 'web', pushNow }))
const sendEmail = vi.fn(async () => true)
vi.mock('./email', () => ({
  emailEnabled: () => true,
  toLocale: (v: string | null) => v ?? 'nl',
  notificationEmail: async (kind: string, _data: unknown, _locale: string, to: string) => ({ to, subject: kind, html: '', text: '' }),
  sendEmail,
}))

const { sendNudges } = await import('./nudges')

// Thursday 8 October 2026, 09:30 in Amsterdam.
const now = new Date('2026-10-08T07:30:00Z')

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('nieuw', 'Nina', 'nina@example.org', false, now(), now()),
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now()),
      ('tom', 'Tom', 'tom@example.org', false, now(), now()),
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('stil', 'Stil', 'stil@example.org', false, now(), now()),
      ('staf', 'Staf', 'staf@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code,
      wants_to_walk, has_dogs, photo_url, bio, weekly_goal, reminders, email_notifications, created_at)
    values
      ('nieuw', 'Nina', '2000-01-01', 'NL', 'Utrecht', now(), '1', 'NIE234', true, false, null, '', 1, true, true, '2026-10-07 10:00'),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', true, false, 'https://example.org/f.jpg',
        'Ik studeer in Utrecht en mis de hond van mijn ouders.', 2, true, true, '2026-09-01 10:00'),
      ('tom', 'Tom', '1990-01-01', 'NL', 'Utrecht', now(), '1', 'TOM234', true, false, null, '', null, true, true, '2026-09-01 10:00'),
      ('ans', 'Ans', '1951-04-02', 'NL', 'Utrecht', now(), '1', 'ANS234', false, true, null, '', null, true, false, '2026-09-01 10:00'),
      ('stil', 'Stil', '1980-01-01', 'NL', 'Utrecht', now(), '1', 'STI234', true, false, null, '', 3, false, true, '2026-10-07 10:00'),
      ('staf', 'Staf', '1985-01-01', 'NL', 'Utrecht', now(), '1', 'STA234', false, false, 'https://example.org/s.jpg',
        'Ik werk bij de opvang en help graag mee.', null, true, true, '2026-10-07 10:00');
    insert into organization (id, name, country, city) values ('opvang', 'Opvang', 'NL', 'Utrecht');
    insert into organization_member (org_id, user_id) values ('opvang', 'staf');
    insert into dog (id, owner_id, name, country, city, created_at) values
      ('bello', 'ans', 'Bello', 'NL', 'Utrecht', '2026-09-01 09:00'),
      ('max', 'ans', 'Max', 'NL', 'Utrecht', '2026-09-28 09:00');
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status) values
      ('r1', 'bello', 'fleur', 'meeting', '2026-10-05 08:00', 30, 'completed'),
      ('r2', 'bello', 'tom', 'meeting', '2026-09-18 08:00', 30, 'completed');
    insert into walk (id, request_id, dog_id, walker_id, started_at, planned_end_at, ended_at, status) values
      ('w1', 'r1', 'bello', 'fleur', '2026-10-05 08:00', '2026-10-05 08:30', '2026-10-05 08:35', 'ended'),
      ('w2', 'r2', 'bello', 'tom', '2026-09-18 08:00', '2026-09-18 08:30', '2026-09-18 08:35', 'ended');
    insert into push_device (id, user_id, kind, endpoint) values ('d1', 'fleur', 'web', 'https://push.example.org/1');
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('sendNudges', () => {
  it('lets someone who just heard about an appointment wait a day', async () => {
    const run = await sendNudges(now, new Set(['nieuw', 'fleur', 'tom', 'ans']))
    expect(run).toMatchObject({ people: 5, sent: {}, pushed: 0, emailed: 0 })
  })

  it('sends each person the one reminder that fits, by push or else by email', async () => {
    const run = await sendNudges(now)
    expect(run.people).toBe(5)
    expect(run.sent).toEqual({ 'nudge-step': 1, 'nudge-week': 1, 'nudge-back': 1, 'nudge-owner': 1 })
    expect(run.pushed).toBe(1)
    // Ans turned email off, so her tip is only in her notifications.
    expect(run.emailed).toBe(2)
    expect(sendEmail.mock.calls.map((c) => (c as unknown as [{ to: string }])[0].to).sort()).toEqual(['nina@example.org', 'tom@example.org'])

    const rows = await db.select().from(schema.notification)
    const byUser = Object.fromEntries(rows.map((r) => [r.userId, { kind: r.kind, data: r.data }]))
    expect(byUser).toEqual({
      nieuw: { kind: 'nudge-step', data: { step: 'about' } },
      fleur: { kind: 'nudge-week', data: { left: 1, goal: 2 } },
      tom: { kind: 'nudge-back', data: { variant: 'dog', dogId: 'bello', dogName: 'Bello' } },
      ans: { kind: 'nudge-owner', data: { tip: 'photo', dogId: 'max', dogName: 'Max' } },
    })
    expect(pushNow).toHaveBeenCalledWith(db, ['fleur'], 'nudge-week', { left: 1, goal: 2 })
  })

  it('sends nothing more for a few days', async () => {
    const again = await sendNudges(new Date('2026-10-09T07:30:00Z'))
    expect(again.sent).toEqual({})
  })

  it('never at night', async () => {
    const night = await sendNudges(new Date('2026-10-20T22:30:00Z'))
    expect(night).toMatchObject({ people: 0, sent: {} })
  })
})
