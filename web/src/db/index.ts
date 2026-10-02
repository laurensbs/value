import 'server-only'
import { PGlite } from '@electric-sql/pglite'
import { Pool } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import migrations from './migrations.json'
import * as schema from './schema'

export type Db = ReturnType<typeof drizzlePglite<typeof schema>>

interface DbState {
  db: Db
  mode: 'neon' | 'pglite'
  ready?: Promise<void>
}

const globalForDb = globalThis as unknown as { __rondjeDb?: DbState }

function connectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined
}

function create(): DbState {
  const url = connectionString()
  if (url) {
    const pool = new Pool({ connectionString: url })
    return { db: drizzleNeon({ client: pool, schema }) as unknown as Db, mode: 'neon' }
  }
  // No database configured: run an embedded Postgres. Locally it persists in .pglite;
  // on a serverless host it lives in memory (demo mode, data is not kept).
  const dataDir = process.env.PGLITE_DIR ?? (process.env.VERCEL ? undefined : '.pglite')
  const client = new PGlite(dataDir === 'memory' ? undefined : dataDir)
  return { db: drizzlePglite({ client, schema }), mode: 'pglite' }
}

const state = (globalForDb.__rondjeDb ??= create())

export const db = state.db

/** True when no real database is connected and data is not persisted between deploys. */
export function isDemoMode(): boolean {
  return state.mode === 'pglite' && Boolean(process.env.VERCEL)
}

export function dbMode(): DbState['mode'] {
  return state.mode
}

async function migrate(): Promise<void> {
  await db.execute(
    sql`create table if not exists _rondje_migrations (tag text primary key, applied_at timestamp default now())`,
  )
  for (const migration of migrations) {
    await db.transaction(async (tx) => {
      // Serialise concurrent cold starts, then re-check inside the lock.
      await tx.execute(sql`select pg_advisory_xact_lock(727272)`)
      const done = await tx.execute(sql`select 1 from _rondje_migrations where tag = ${migration.tag}`)
      if (done.rows.length > 0) return
      for (const statement of migration.statements) await tx.execute(sql.raw(statement))
      await tx.execute(sql`insert into _rondje_migrations (tag) values (${migration.tag})`)
    })
  }
}

/** Migrates (and seeds example data when the database is empty) once per server instance. */
export function ready(): Promise<void> {
  state.ready ??= (async () => {
    await migrate()
    const { seedIfEmpty } = await import('./seed')
    await seedIfEmpty(db)
  })().catch((error) => {
    state.ready = undefined
    throw error
  })
  return state.ready
}

/** The database, after migrations have run. */
export async function getDb(): Promise<Db> {
  await ready()
  return db
}
