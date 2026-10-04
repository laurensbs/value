import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { EMAIL_KINDS, notificationHref, notificationValues, type NotificationData } from './notification-links'
import { NUDGE_KINDS } from './nudges'

describe('notification emails', () => {
  it('have a subject and text in every language', () => {
    for (const messages of [nl, en, es, fr]) {
      const kinds = messages.email.kinds as Record<string, { subject: string; body: string }>
      for (const kind of EMAIL_KINDS) {
        expect(kinds[kind]?.subject, kind).toBeTruthy()
        expect(kinds[kind]?.body, kind).toBeTruthy()
      }
    }
  })

  it('link to the right page', () => {
    expect(notificationHref('request-new', {})).toBe('/requests')
    expect(notificationHref('walk-overdue', { walkId: 'w1' })).toBe('/walk/w1')
    expect(notificationHref('shelter-joined', { orgId: 'o1' })).toBe('/dogs?org=o1')
    expect(notificationHref('org-pending', {})).toBe('/admin')
  })
})

describe('seintjes', () => {
  const samples: [string, NotificationData][] = [
    ['nudge-step', { step: 'about' }],
    ['nudge-step', { step: 'about', role: 'owner' }],
    ['nudge-step', { step: 'dog' }],
    ['nudge-step', { step: 'quiz' }],
    ['nudge-step', { step: 'meet' }],
    ['nudge-step', {}],
    ['nudge-challenge', { city: 'Utrecht', goal: 50 }],
    ['challenge-done', { city: 'Utrecht', goal: 50, mine: 1 }],
    ['challenge-done', { city: 'Utrecht', goal: 50, mine: 3 }],
    ['nudge-new-dog', { dogId: 'b1', dogName: 'Bello' }],
    ['nudge-owner', { dogId: 'm1', dogName: 'Max' }],
  ]

  it('cover every kind', () => {
    expect(new Set(samples.map(([kind]) => kind))).toEqual(new Set(NUDGE_KINDS))
  })

  it('read well in every language, in the list, as a push and by email', () => {
    for (const [locale, messages] of Object.entries({ nl, en, es, fr })) {
      const onError = (error: Error) => {
        throw error
      }
      // Keys are built from the kind, so the translators are not typed by the messages.
      const t = createTranslator({ locale, messages: messages as Record<string, unknown>, namespace: 'notifications', onError }) as (key: string, values?: object) => string
      const e = createTranslator({ locale, messages: messages as Record<string, unknown>, namespace: 'email', onError }) as (key: string, values?: object) => string
      for (const [kind, data] of samples) {
        const values = notificationValues(data)
        for (const text of [t(`kinds.${kind}`, values), e(`kinds.${kind}.subject`, values), e(`kinds.${kind}.body`, values)]) {
          expect(text, `${locale} ${kind}`).not.toMatch(/[{}]|undefined|NaN/)
          expect(text.length, `${locale} ${kind}`).toBeGreaterThan(8)
        }
      }
      expect(t('kinds.nudge-new-dog', notificationValues({ dogName: 'Bello' })), locale).toContain('Bello')
      expect(e('kinds.nudge-new-dog.subject', notificationValues({ dogName: 'Bello' })), locale).toContain('Bello')
      expect(t('kinds.nudge-step', notificationValues({ step: 'about', role: 'owner' })), locale).not.toEqual(t('kinds.nudge-step', notificationValues({ step: 'about' })))
    }
  })

  it('lead to the step, the dog or the challenge', () => {
    expect(notificationHref('nudge-step', { step: 'quiz' })).toBe('/profile/quiz')
    expect(notificationHref('nudge-step', { step: 'dog' })).toBe('/my-dogs/new')
    expect(notificationHref('nudge-challenge', {})).toBe('/progress#challenge')
    expect(notificationHref('nudge-new-dog', { dogId: 'b1' })).toBe('/dogs/b1')
    // Old rows still carry a tip; it no longer matters where they lead.
    expect(notificationHref('nudge-owner', { dogId: 'm1' })).toBe('/dogs/m1')
    expect(notificationHref('nudge-owner', {})).toBe('/my-dogs')
  })
})
