import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { reminderMoment, reminderWindow } from './appointments'
import { notificationHref, notificationValues } from './notification-links'

// 09:30 in Amsterdam (summer time), when the morning run goes out.
const now = new Date('2026-10-02T07:30:00Z')

describe('appointment reminders', () => {
  it('cover the rest of today and all of tomorrow, in Amsterdam time', () => {
    const { from, to } = reminderWindow(now)
    expect(from).toEqual(now)
    expect(to.toISOString()).toBe('2026-10-03T22:00:00.000Z') // midnight after tomorrow, local
  })

  it('say today or tomorrow, at the local time', () => {
    expect(reminderMoment(new Date('2026-10-02T16:00:00Z'), now)).toEqual({ day: 'today', time: '18:00' })
    expect(reminderMoment(new Date('2026-10-03T06:15:00Z'), now)).toEqual({ day: 'tomorrow', time: '08:15' })
    // Just before midnight local time is still tomorrow, just after it is not.
    expect(reminderMoment(new Date('2026-10-03T21:59:00Z'), now)).toEqual({ day: 'tomorrow', time: '23:59' })
    expect(reminderMoment(new Date('2026-10-03T22:00:00Z'), now)).toBeNull()
    expect(reminderMoment(new Date('2026-10-02T07:00:00Z'), now)).toBeNull() // already started
  })

  it('follow winter time', () => {
    const winter = new Date('2026-12-01T08:30:00Z') // 09:30 in Amsterdam
    expect(reminderWindow(winter).to.toISOString()).toBe('2026-12-02T23:00:00.000Z')
    expect(reminderMoment(new Date('2026-12-02T09:00:00Z'), winter)).toEqual({ day: 'tomorrow', time: '10:00' })
  })

  it('read well in every language, in the list, as a push and by email, and lead to the appointments', () => {
    for (const [locale, messages] of Object.entries({ nl, en, es, fr })) {
      const onError = (error: Error) => {
        throw error
      }
      const t = createTranslator({ locale, messages: messages as Record<string, unknown>, namespace: 'notifications', onError }) as (key: string, values?: object) => string
      const e = createTranslator({ locale, messages: messages as Record<string, unknown>, namespace: 'email', onError }) as (key: string, values?: object) => string
      for (const day of ['today', 'tomorrow'])
        for (const variant of ['meet', 'walk']) {
          const values = notificationValues({ requestId: 'r1', dogName: 'Bello', day, time: '10:00', variant })
          for (const text of [t('kinds.request-reminder', values), e('kinds.request-reminder.subject', values), e('kinds.request-reminder.body', values)]) {
            expect(text, `${locale} ${day} ${variant}`).not.toMatch(/[{}]|undefined|NaN/)
          }
          expect(t('kinds.request-reminder', values), locale).toContain('Bello')
          expect(t('kinds.request-reminder', values), locale).toContain('10:00')
        }
      const today = t('kinds.request-reminder', notificationValues({ dogName: 'Bello', day: 'today', time: '10:00', variant: 'walk' }))
      const tomorrow = t('kinds.request-reminder', notificationValues({ dogName: 'Bello', day: 'tomorrow', time: '10:00', variant: 'walk' }))
      expect(today, locale).not.toEqual(tomorrow)
      for (const day of ['today', 'tomorrow']) {
        const values = notificationValues({ groupWalkId: 'g1', orgName: 'Dierenopvang Utrecht', day, time: '10:00' })
        for (const text of [t('kinds.group-walk-reminder', values), e('kinds.group-walk-reminder.subject', values), e('kinds.group-walk-reminder.body', values)]) {
          expect(text, `${locale} ${day} group`).not.toMatch(/[{}]|undefined|NaN/)
        }
        expect(t('kinds.group-walk-reminder', values), locale).toContain('Dierenopvang Utrecht')
        expect(t('kinds.group-walk-reminder', values), locale).toContain('10:00')
      }
    }
    expect(notificationHref('request-reminder', { requestId: 'r1' })).toBe('/requests')
    expect(notificationHref('group-walk-reminder', { groupWalkId: 'g1' })).toBe('/group-walks')
  })
})
