import { describe, expect, it } from 'vitest'
import { shouldMigrate } from './preview'

describe('shouldMigrate', () => {
  it('migrates in production, locally and in tests', () => {
    expect(shouldMigrate({ VERCEL_ENV: 'production' })).toBe(true)
    expect(shouldMigrate({})).toBe(true)
    expect(shouldMigrate({ VERCEL_ENV: 'development' })).toBe(true)
  })

  it('never migrates a preview that shares the production database', () => {
    expect(shouldMigrate({ VERCEL_ENV: 'preview' })).toBe(false)
    expect(shouldMigrate({ VERCEL_ENV: 'preview', PREVIEW_MIGRATIONS: '0' })).toBe(false)
  })

  it('migrates a preview once it has its own database', () => {
    expect(shouldMigrate({ VERCEL_ENV: 'preview', PREVIEW_MIGRATIONS: '1' })).toBe(true)
  })
})
