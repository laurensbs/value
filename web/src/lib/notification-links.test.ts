import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { EMAIL_KINDS, notificationHref } from './notification-links'

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
