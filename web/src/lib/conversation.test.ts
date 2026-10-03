import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { chatMoment, meetChecklistKeys, requestBlockKeys, SOON_BEFORE_MS, suggestionKeys, type ChatMoment, type ChatSide } from './conversation'

const at = new Date('2026-10-03T10:00:00Z')
const request = (status: string, startsAt = at) => ({ status, startsAt, durationMin: 30 })

describe('chat moment', () => {
  it('follows the appointment', () => {
    expect(chatMoment(request('pending'), at)).toBe('pending')
    expect(chatMoment(request('completed'), at)).toBe('done')
    expect(chatMoment(request('declined'), at)).toBeNull()
    expect(chatMoment(request('cancelled'), at)).toBeNull()
    expect(chatMoment(request('accepted'), at, true)).toBe('walking')
  })

  it('is soon from two hours before until an hour after the end', () => {
    const now = at.getTime()
    expect(chatMoment(request('accepted'), new Date(now - SOON_BEFORE_MS - 1))).toBe('planned')
    expect(chatMoment(request('accepted'), new Date(now - SOON_BEFORE_MS))).toBe('soon')
    expect(chatMoment(request('accepted'), new Date(now + 90 * 60_000))).toBe('soon')
    expect(chatMoment(request('accepted'), new Date(now + 91 * 60_000))).toBe('planned')
  })

  it('ends a first call once its time has passed, but not a walk that never started', () => {
    const later = new Date(at.getTime() + 91 * 60_000)
    expect(chatMoment({ ...request('accepted'), kind: 'meet', meetVia: 'phone' }, later)).toBe('done')
    expect(chatMoment({ ...request('accepted'), kind: 'meet', meetVia: 'video' }, later)).toBe('done')
    expect(chatMoment({ ...request('accepted'), kind: 'meet', meetVia: 'phone' }, at)).toBe('soon')
    expect(chatMoment({ ...request('accepted'), kind: 'meet', meetVia: 'home' }, later)).toBe('planned')
    expect(chatMoment({ ...request('accepted'), kind: 'meet', meetVia: 'walk' }, later)).toBe('planned')
  })
})

describe('ready messages', () => {
  const sides: ChatSide[] = ['walker', 'host']
  const moments: ChatMoment[] = ['pending', 'planned', 'soon', 'walking', 'done']
  const situations = ['meet', 'solo'].flatMap((kind) =>
    [false, true].flatMap((shelter) =>
      [false, true].flatMap((weekly) =>
        [false, true].flatMap((soloAllowed) =>
          (kind === 'meet' ? ['walk', 'home', 'phone', 'video'] : ['walk']).map((meetVia) => ({ kind, shelter, weekly, soloAllowed, meetVia })),
        ),
      ),
    ),
  )

  it('offer at most three, never twice the same', () => {
    for (const side of sides)
      for (const moment of moments)
        for (const situation of situations) {
          const keys = suggestionKeys(side, moment, situation)
          expect(keys.length).toBeLessThanOrEqual(3)
          expect(new Set(keys).size).toBe(keys.length)
        }
  })

  it('stay quiet while the owner walks along to meet', () => {
    for (const side of sides) expect(suggestionKeys(side, 'walking', { kind: 'meet', shelter: false, weekly: false })).toEqual([])
    expect(suggestionKeys('walker', 'walking', { kind: 'solo', shelter: false, weekly: false })).toContain('allGood')
  })

  it('fit who is asking', () => {
    // Nobody rings a shelter's doorbell, and a walker who may already go alone has nothing to ask.
    expect(suggestionKeys('host', 'planned', { kind: 'solo', shelter: true, weekly: false })).not.toContain('home')
    expect(suggestionKeys('host', 'soon', { kind: 'solo', shelter: true, weekly: false })).not.toContain('lateHome')
    expect(suggestionKeys('walker', 'done', { kind: 'meet', shelter: false, weekly: false })).toContain('soloNext')
    expect(suggestionKeys('walker', 'done', { kind: 'meet', shelter: false, weekly: false, soloAllowed: true })).not.toContain('soloNext')
    expect(suggestionKeys('host', 'done', { kind: 'solo', shelter: false, weekly: true })).not.toContain('weekly')
  })

  for (const [locale, messages] of Object.entries({ nl, en, es, fr })) {
    it(`exist in ${locale}, with the dog's and the walker's name filled in`, () => {
      const t = createTranslator({ locale, messages })
      for (const side of sides) {
        for (const moment of moments)
          for (const situation of situations)
            for (const key of suggestionKeys(side, moment, situation)) {
              const text = t(`chatQuick.${side}.${key}` as never, { dog: 'Bello' } as never)
              expect(text, `${locale} chatQuick.${side}.${key}`).not.toMatch(/chatQuick|[{}]/)
            }
        for (const via of ['walk', 'home', 'phone', 'video'])
          for (const key of meetChecklistKeys(side, via)) {
            const text = t(`meetCheck.${side}.${key}` as never, { dog: 'Bello', name: 'Fleur' } as never)
            expect(text, `${locale} meetCheck.${side}.${key}`).not.toMatch(/meetCheck|[{}]/)
          }
      }
      for (const kind of ['meet', 'solo'])
        for (const key of requestBlockKeys(kind)) {
          const text = t(`request.blocks.${key}` as never, { dog: 'Bello', name: 'Fleur' } as never)
          expect(text, `${locale} request.blocks.${key}`).not.toMatch(/request\.blocks|[{}]/)
        }
    })
  }

  it('ask the host to check the ID, not the walker', () => {
    expect(meetChecklistKeys('host')).toContain('id')
    expect(meetChecklistKeys('host', 'home')).toContain('id')
    expect(meetChecklistKeys('walker')).not.toContain('id')
  })

  it('never ask for an ID check or a walk together in a call, and end it with meeting in person', () => {
    for (const via of ['phone', 'video'])
      for (const side of sides) {
        expect(meetChecklistKeys(side, via)).not.toContain('id')
        expect(meetChecklistKeys(side, via)).not.toContain('together')
        expect(meetChecklistKeys(side, via)).toContain('inPerson')
      }
  })

  it('fit a first call: how to call, and after it no question about walking alone', () => {
    const call = { kind: 'meet', shelter: false, weekly: false, meetVia: 'phone' }
    expect(suggestionKeys('walker', 'pending', call)).toContain('whoCalls')
    expect(suggestionKeys('walker', 'pending', call)).not.toContain('where')
    expect(suggestionKeys('host', 'planned', { ...call, meetVia: 'video' })).toContain('videoHow')
    expect(suggestionKeys('host', 'planned', call)).not.toContain('home')
    expect(suggestionKeys('walker', 'soon', call)).not.toContain('here')
    expect(suggestionKeys('walker', 'done', call)).toEqual(['thanksCall', 'meetNext'])
    expect(suggestionKeys('walker', 'done', call)).not.toContain('soloNext')
  })
})
