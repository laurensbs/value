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

const { sendAppointmentReminders } = await import('./reminders')

// Thursday 8 October 2026, 09:30 in Amsterdam: the morning run.
const now = new Date('2026-10-08T07:30:00Z')

async function reminders() {
  const result = await client.query<{ user_id: string; kind: string; data: Record<string, string> }>(
    `select user_id, kind, data from notification order by kind, user_id, data->>'requestId'`,
  )
  return result.rows.map((r) => ({
    to: r.user_id,
    about: r.data.requestId ?? r.data.groupWalkId,
    day: r.data.day,
    time: r.data.time,
    ...(r.kind === 'request-reminder' ? { variant: r.data.variant } : { orgName: r.data.orgName }),
  }))
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now()),
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('staf', 'Staf', 'staf@example.org', false, now(), now()),
      ('noor', 'Noor', 'noor@example.org', false, now(), now()),
      ('weg', 'Weg', 'weg@example.org', false, now(), now()),
      ('laat', 'Laat', 'laat@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, email_notifications, banned_at)
    values
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', true, null),
      ('ans', 'Ans', '1951-04-02', 'NL', 'Utrecht', now(), '1', 'ANS234', false, null),
      ('staf', 'Staf', '1985-01-01', 'NL', 'Utrecht', now(), '1', 'STA234', true, null),
      ('noor', 'Noor', '1999-01-01', 'NL', 'Utrecht', now(), '1', 'NOO234', true, null),
      ('weg', 'Weg', '1999-01-01', 'NL', 'Utrecht', now(), '1', 'WEG234', true, now()),
      ('laat', 'Laat', '1999-01-01', 'NL', 'Utrecht', now(), '1', 'LAA234', true, null);
    insert into organization (id, name, country, city, status, is_demo) values
      ('opvang', 'Opvang', 'NL', 'Utrecht', 'verified', false),
      ('nieuw', 'Nieuw', 'NL', 'Utrecht', 'pending', false),
      ('voorbeeld', 'Voorbeeld', 'NL', 'Utrecht', 'verified', true);
    insert into organization_member (org_id, user_id) values ('opvang', 'staf');
    insert into dog (id, owner_id, org_id, name, country, city, is_demo) values
      ('bello', 'ans', null, 'Bello', 'NL', 'Utrecht', false),
      ('luna', null, 'opvang', 'Luna', 'NL', 'Utrecht', false),
      ('demo', 'ans', null, 'Saar', 'NL', 'Utrecht', true);
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status, weekly) values
      ('today', 'bello', 'fleur', 'solo', '2026-10-08 16:00', 30, 'accepted', false),
      ('tomorrow', 'luna', 'fleur', 'meet', '2026-10-09 07:00', 30, 'accepted', true),
      ('later', 'bello', 'fleur', 'solo', '2026-10-10 08:00', 30, 'accepted', false),
      ('asked', 'bello', 'fleur', 'solo', '2026-10-08 17:00', 30, 'pending', false),
      ('started', 'bello', 'fleur', 'solo', '2026-10-08 07:00', 30, 'accepted', false),
      ('example', 'demo', 'fleur', 'solo', '2026-10-08 15:00', 30, 'accepted', false);
    insert into group_walk (id, org_id, starts_at, status) values
      ('groep', 'opvang', '2026-10-09 08:00', 'scheduled'),
      ('afgelast', 'opvang', '2026-10-09 09:00', 'cancelled'),
      ('ongecontroleerd', 'nieuw', '2026-10-09 08:00', 'scheduled'),
      ('demo-groep', 'voorbeeld', '2026-10-09 08:00', 'scheduled');
    insert into group_walk_signup (group_walk_id, user_id, status) values
      ('groep', 'noor', 'booked'),
      ('groep', 'weg', 'booked'),
      ('groep', 'fleur', 'cancelled'),
      ('afgelast', 'noor', 'booked'),
      ('ongecontroleerd', 'noor', 'booked'),
      ('demo-groep', 'noor', 'booked');
    insert into push_device (id, user_id, kind, endpoint) values ('d1', 'fleur', 'web', 'https://push.example.org/1');
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('appointment reminders', () => {
  it("go to everyone in today's and tomorrow's appointments, once, by push or else by email", async () => {
    const run = await sendAppointmentReminders(now)
    expect(run).toMatchObject({ appointments: 2, groupWalks: 1, pushed: 2, emailed: 2 })
    expect(run.people.sort()).toEqual(['ans', 'fleur', 'noor', 'staf'])
    expect(await reminders()).toEqual([
      // Only the group walk of a verified shelter that goes ahead; not for someone who is banned.
      { to: 'noor', about: 'groep', day: 'tomorrow', time: '10:00', orgName: 'Opvang' },
      { to: 'ans', about: 'today', day: 'today', time: '18:00', variant: 'walk' },
      { to: 'fleur', about: 'today', day: 'today', time: '18:00', variant: 'walk' },
      { to: 'fleur', about: 'tomorrow', day: 'tomorrow', time: '09:00', variant: 'meet' },
      // A shelter dog: its staff hear it.
      { to: 'staf', about: 'tomorrow', day: 'tomorrow', time: '09:00', variant: 'meet' },
    ])
    // Fleur has a phone that can get a push; Ans turned email off, so hers is only in her list.
    expect(pushNow).toHaveBeenCalledTimes(2)
    expect(pushNow).toHaveBeenCalledWith(db, ['fleur'], 'request-reminder', expect.objectContaining({ requestId: 'today', day: 'today', time: '18:00' }))
    expect(sendEmail.mock.calls.map((c) => (c as unknown as [{ to: string; subject: string }])[0]).map((e) => `${e.to} ${e.subject}`).sort()).toEqual([
      'noor@example.org group-walk-reminder',
      'staf@example.org request-reminder',
    ])
  })

  it('are sent once per person and appointment, also to someone who signs up later', async () => {
    const later = new Date(now.getTime() + 3 * 3_600_000)
    expect(await sendAppointmentReminders(later)).toMatchObject({ appointments: 0, groupWalks: 0, people: [] })
    await client.exec(`insert into group_walk_signup (group_walk_id, user_id, status) values ('groep', 'laat', 'booked')`)
    expect(await sendAppointmentReminders(later)).toMatchObject({ groupWalks: 1, people: ['laat'] })
    expect(await reminders()).toHaveLength(6)
  })

  it('come back each week for a weekly walk', async () => {
    await client.exec(`update walk_request set starts_at = '2026-10-16 07:00' where id = 'tomorrow'`)
    const run = await sendAppointmentReminders(new Date('2026-10-15T07:30:00Z'))
    expect(run).toMatchObject({ appointments: 1, groupWalks: 0 })
    expect(run.people.sort()).toEqual(['fleur', 'staf'])
  })

  it('never go out at night', async () => {
    await client.exec(`update walk_request set starts_at = '2026-10-23 07:00' where id = 'tomorrow'`)
    expect(await sendAppointmentReminders(new Date('2026-10-22T22:30:00Z'))).toMatchObject({ appointments: 0, people: [] })
  })
})
