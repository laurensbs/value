import { describe, expect, it, vi } from 'vitest'

// What the app gets about changed terms (/api/v1/me), and the changes read from content/legal.

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => ({}) }))
let now = new Date()
vi.mock('./clock', () => ({ pageNow: async () => now }))

const { termsChanges, termsForApp } = await import('./terms')
const { termsEffectiveAt } = await import('@/lib/rules')
const { TERMS_VERSION } = await import('@/lib/site')

describe('the changes in the terms', () => {
  it("come from content/legal in the reader's language, as plain sentences", async () => {
    const nl = await termsChanges('nl')
    expect(nl).toMatchObject({ version: TERMS_VERSION, from: '0.2', title: 'Wat er verandert in de voorwaarden', url: '/legal/terms' })
    expect(nl!.intro).toMatch(/^Versie 0\.3/)
    expect(nl!.items.length).toBeGreaterThanOrEqual(5)
    expect(nl!.items.some((item) => item.includes('Laurens Bos'))).toBe(true)
    for (const item of nl!.items) expect(item).not.toMatch(/^[-*]|\*\*/)
    const en = await termsChanges('en')
    expect(en!.title).toBe('What changes in the terms')
    expect(en!.items).toHaveLength(nl!.items.length)
  })

  it('fall back to Dutch', async () => {
    expect((await termsChanges('de'))?.title).toBe('Wat er verandert in de voorwaarden')
  })
})

describe('where someone stands, for the app', () => {
  it('agreed to the previous version: the changes, and only from the day they take effect required', async () => {
    now = new Date(termsEffectiveAt().getTime() - 1000)
    const before = await termsForApp({ termsVersion: '0.2' }, 'nl')
    expect(before).toMatchObject({ termsVersion: TERMS_VERSION, termsAccepted: false, termsRequired: false, termsEffectiveAt: termsEffectiveAt().toISOString() })
    expect(before.termsChanges?.items.length).toBeGreaterThan(0)
    now = new Date(termsEffectiveAt().getTime())
    expect((await termsForApp({ termsVersion: '0.2' }, 'nl')).termsRequired).toBe(true)
  })

  it('agreed to the current version: nothing to show, nothing waits', async () => {
    now = new Date(termsEffectiveAt().getTime() + 1000)
    expect(await termsForApp({ termsVersion: TERMS_VERSION }, 'nl')).toEqual({
      termsVersion: TERMS_VERSION,
      termsAccepted: true,
      termsEffectiveAt: termsEffectiveAt().toISOString(),
      termsRequired: false,
      termsChanges: null,
    })
  })

  it('no profile yet: they agree when finishing it', async () => {
    expect(await termsForApp(null, 'nl')).toMatchObject({ termsAccepted: false, termsRequired: false, termsChanges: null })
  })
})
