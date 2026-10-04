import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { shareOffer } from './shelter-share'

const now = new Date('2026-10-04T12:00:00Z')
const hours = (h: number) => new Date(now.getTime() + h * 3600_000)

describe('shareOffer', () => {
  it('offers nothing before the shelter is checked, because the link does not work yet', () => {
    expect(shareOffer('pending', 5, [hours(24)], now)).toBeNull()
  })

  it('offers the dogs once they are online', () => {
    expect(shareOffer('verified', 3, [], now)).toBe('dog')
  })

  it('offers a group walk when there are no dogs online but a walk is still to come', () => {
    expect(shareOffer('verified', 0, [hours(24)], now)).toBe('walk')
  })

  it('offers nothing when the only walk has started, since the public page no longer shows it', () => {
    expect(shareOffer('verified', 0, [hours(-2)], now)).toBeNull()
    expect(shareOffer('verified', 0, [], now)).toBeNull()
  })
})

describe('the message for volunteers', () => {
  const url = 'https://example.org/dogs?org=org-1'
  const values = { name: 'Dierenopvang Test', hasTimes: 'yes', times: 'zaterdag 10:00–12:00', url }

  for (const [locale, messages] of Object.entries({ nl, en, es, fr })) {
    const t = createTranslator({ locale, messages: messages as Record<string, unknown>, namespace: 'shelterShare' }) as unknown as (key: string, values: Record<string, string>) => string

    it(`${locale}: ends with the link, and asks to pick a dog only when there are dogs`, () => {
      const dog = t('message', { ...values, pick: 'dog' })
      const walk = t('message', { ...values, pick: 'walk' })
      expect(dog.endsWith(url), dog).toBe(true)
      expect(walk.endsWith(url), walk).toBe(true)
      expect(walk).not.toBe(dog)
      expect(walk).toContain('Dierenopvang Test')
    })

    it(`${locale}: leaves out the walking times when there are none`, () => {
      expect(t('message', { ...values, pick: 'dog' })).toContain('zaterdag 10:00–12:00')
      expect(t('message', { ...values, hasTimes: 'no', times: '', pick: 'dog' })).not.toContain('10:00')
    })
  }
})
