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
    for (const item of nl!.items) expect(item).not.toMatch(/^[-*]|\*\*/)
    const en = await termsChanges('en')
    expect(en!.title).toBe('What changes in the terms')
    expect(en!.items).toHaveLength(nl!.items.length)
    expect(en!.sections.map((s) => s.items.length)).toEqual(nl!.sections.map((s) => s.items.length))
  })

  it('accepted 0.3: only what 0.4 changes, with its own sentence', async () => {
    const nl = (await termsChanges('nl', '0.3'))!
    expect(nl).toMatchObject({ version: '0.4', from: '0.3' })
    expect(nl.sections).toHaveLength(1)
    expect(nl.intro).toMatch(/^Versie 0\.4 van de algemene voorwaarden vervangt versie 0\.3/)
    expect(nl.items).toEqual(nl.sections[0].items)
    expect(nl.items.length).toBeGreaterThanOrEqual(5)
    expect(nl.items[0]).toMatch(/^Live locatie kan aan of uit staan\./)
    expect(nl.items.some((item) => item.includes('"hond ontsnapt"'))).toBe(true)
    // Not the list of 0.3 again: that one they already agreed to.
    expect(nl.items.some((item) => item.includes('Laurens Bos'))).toBe(false)
  })

  it('accepted 0.2, an unknown version or none: 0.4 first, then what 0.3 changed', async () => {
    for (const accepted of ['0.2', 'demo', null, undefined]) {
      const nl = (await termsChanges('nl', accepted))!
      expect(nl, String(accepted)).toMatchObject({ version: '0.4', from: '0.2' })
      expect(nl.sections.map((s) => [s.version, s.from])).toEqual([
        ['0.4', '0.3'],
        ['0.3', '0.2'],
      ])
      expect(nl.intro).toMatch(/^Versie 0\.4 van de algemene voorwaarden vervangt de versie die je eerder accepteerde\./)
      expect(nl.sections[0].intro).toMatch(/^Versie 0\.4/)
      expect(nl.sections[1].intro).toMatch(/^Accepteerde je een versie van vóór 0\.3\?/)
      expect(nl.items).toEqual([...nl.sections[0].items, ...nl.sections[1].items])
      expect(nl.sections[1].items[0]).toMatch(/^Rondje Mee wordt aangeboden door Laurens Bos/)
    }
  })

  it('every language has the same parts, with the same number of changes', async () => {
    const nl = (await termsChanges('nl', '0.2'))!
    for (const locale of ['en', 'es', 'fr']) {
      const other = (await termsChanges(locale, '0.2'))!
      expect(other.sections.map((s) => [s.version, s.from, s.items.length]), locale).toEqual(nl.sections.map((s) => [s.version, s.from, s.items.length]))
      expect(other.intro, locale).not.toBe(other.sections[0].intro)
      expect((await termsChanges(locale, '0.3'))!.items, locale).toHaveLength(nl.sections[0].items.length)
    }
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
    expect(before.termsChanges).toMatchObject({ version: TERMS_VERSION, from: '0.2' })
    // Agreed to 0.3 (today's sign-ups): only what changed since then.
    const since03 = await termsForApp({ termsVersion: '0.3' }, 'nl')
    expect(since03).toMatchObject({ termsAccepted: false, termsRequired: false })
    expect(since03.termsChanges).toMatchObject({ version: TERMS_VERSION, from: '0.3' })
    expect(since03.termsChanges!.items.length).toBeLessThan(before.termsChanges!.items.length)
    now = new Date(termsEffectiveAt().getTime())
    expect((await termsForApp({ termsVersion: '0.2' }, 'nl')).termsRequired).toBe(true)
    expect((await termsForApp({ termsVersion: '0.3' }, 'nl')).termsRequired).toBe(true)
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
