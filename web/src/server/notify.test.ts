import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
const throwaway = vi.fn(() => false)
vi.mock('@/db', () => ({ getDb: async () => db, isThrowawayTestServer: () => throwaway() }))
vi.mock('./push', () => ({ pushLater: () => {} }))

const { notifyAdmins } = await import('./notify')

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, role, created_at, updated_at) values
      ('boss', 'Boss', 'boss@example.org', true, 'user', now(), now()),
      ('first', 'Was here first', 'helper@example.org', false, 'user', now(), now()),
      ('role', 'Role', 'role@example.org', false, 'admin', now(), now()),
      ('owner', 'Owner', 'owner@example.org', false, 'admin', now(), now()),
      ('other', 'Other', 'other@example.org', true, 'user', now(), now());
  `)
}, 30_000)

afterEach(async () => {
  vi.unstubAllEnvs()
  throwaway.mockReturnValue(false)
  await db.delete(schema.notification)
})

async function notified() {
  return (await db.select({ userId: schema.notification.userId }).from(schema.notification)).map((n) => n.userId).sort()
}

describe('notifyAdmins', () => {
  it('reaches only accounts that really are admin, not an unconfirmed address on the list', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'Boss@example.org, helper@example.org, role@example.org')
    await notifyAdmins(db, 'org-pending', { orgId: 'o1', orgName: 'Asiel' })
    // The admin role counts with or without the list.
    expect(await notified()).toEqual(['boss', 'owner', 'role'])
  })

  it('reaches the admin role also when ADMIN_EMAILS is empty', async () => {
    vi.stubEnv('ADMIN_EMAILS', '')
    await notifyAdmins(db, 'org-pending', { orgId: 'o1', orgName: 'Asiel' })
    expect(await notified()).toEqual(['owner', 'role'])
  })

  it('on a throwaway test server, the list alone is enough', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'helper@example.org')
    throwaway.mockReturnValue(true)
    await notifyAdmins(db, 'org-pending', { orgId: 'o1', orgName: 'Asiel' })
    expect(await notified()).toEqual(['first', 'owner', 'role'])
  })
})
