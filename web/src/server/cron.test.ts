import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))

const { claimRun } = await import('./cron')

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('claimRun', () => {
  it('lets only the first of several calls do the daily job', async () => {
    const calls = await Promise.all([claimRun('nudges'), claimRun('nudges'), claimRun('nudges')])
    expect(calls.filter(Boolean)).toHaveLength(1)
    expect(await claimRun('nudges')).toBe(false)
    // Another job has its own day.
    expect(await claimRun('cleanup')).toBe(true)
  })

  it('runs again the next day', async () => {
    await client.exec(`update audit_log set created_at = now() - interval '21 hours' where action = 'cron.nudges'`)
    expect(await claimRun('nudges')).toBe(true)
  })
})
