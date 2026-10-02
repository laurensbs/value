import { describe, expect, it } from 'vitest'
import {
  ageBand,
  canRequestMeeting,
  canRequestSolo,
  canStartWalk,
  feedbackNeedsReview,
  isAdult,
  overdueMinutes,
  scanText,
  trustBadges,
  type DogFacts,
  type Relation,
  type WalkerFacts,
} from './rules'

const now = new Date('2026-10-02T12:00:00')

const walker: WalkerFacts = {
  userId: 'w1',
  onboarded: true,
  banned: false,
  birthDate: '2001-05-04',
  quizPassed: true,
  pppLicense: false,
  experience: 'some',
  pendingRequests: 0,
}

const dog: DogFacts = {
  ownerId: 'o1',
  orgId: null,
  country: 'NL',
  status: 'active',
  isDemo: false,
  ppp: false,
  level: 'starter',
}

const rel: Relation = { isStaff: false, blocked: false, soloAllowed: false }

describe('age', () => {
  it('requires 18 on the day itself', () => {
    expect(isAdult('2008-10-02', now)).toBe(true)
    expect(isAdult('2008-10-03', now)).toBe(false)
    expect(isAdult(null, now)).toBe(false)
    expect(isAdult('not-a-date', now)).toBe(false)
  })

  it('shows an age band instead of an exact age', () => {
    expect(ageBand('2005-01-01', now)).toBe('18-24')
    expect(ageBand('1990-01-01', now)).toBe('35-49')
  })
})

describe('first meeting', () => {
  it('is allowed for an onboarded adult', () => {
    expect(canRequestMeeting(walker, dog, rel)).toBeNull()
  })

  it('blocks banned, minors, own dogs, demo dogs and blocked pairs', () => {
    expect(canRequestMeeting({ ...walker, banned: true }, dog, rel)).toBe('banned')
    expect(canRequestMeeting({ ...walker, birthDate: '2010-01-01' }, dog, rel)).toBe('too-young')
    expect(canRequestMeeting(walker, { ...dog, ownerId: 'w1' }, rel)).toBe('own-dog')
    expect(canRequestMeeting(walker, { ...dog, isDemo: true }, rel)).toBe('demo-dog')
    expect(canRequestMeeting(walker, dog, { ...rel, blocked: true })).toBe('blocked')
    expect(canRequestMeeting(walker, { ...dog, status: 'paused' }, rel)).toBe('dog-unavailable')
  })

  it('limits open requests to prevent spam', () => {
    expect(canRequestMeeting({ ...walker, pendingRequests: 5 }, dog, rel)).toBe('too-many-pending')
  })

  it('requires a PPP licence for PPP dogs in Spain only', () => {
    expect(canRequestMeeting(walker, { ...dog, country: 'ES', ppp: true }, rel)).toBe('ppp-licence')
    expect(canRequestMeeting({ ...walker, pppLicense: true }, { ...dog, country: 'ES', ppp: true }, rel)).toBeNull()
    expect(canRequestMeeting(walker, { ...dog, country: 'NL', ppp: true }, rel)).toBeNull()
  })
})

describe('solo walk', () => {
  it('needs solo trust from the owner and the quiz', () => {
    expect(canRequestSolo(walker, dog, rel)).toBe('needs-solo-trust')
    expect(canRequestSolo({ ...walker, quizPassed: false }, dog, { ...rel, soloAllowed: true })).toBe('needs-quiz')
    expect(canRequestSolo(walker, dog, { ...rel, soloAllowed: true })).toBeNull()
  })

  it('is never possible with shelter dogs (always supervised)', () => {
    expect(canRequestSolo(walker, { ...dog, ownerId: null, orgId: 'org' }, { ...rel, soloAllowed: true })).toBe(
      'needs-meeting',
    )
  })

  it('keeps experienced dogs away from walkers without dog experience', () => {
    expect(
      canRequestSolo({ ...walker, experience: 'none' }, { ...dog, level: 'experienced' }, { ...rel, soloAllowed: true }),
    ).toBe('experience')
  })
})

describe('starting a walk', () => {
  const req = { status: 'accepted', startsAt: new Date('2026-10-02T12:00:00'), walkerId: 'w1' }

  it('works from 30 min before until 2 h after the start', () => {
    expect(canStartWalk(req, 'w1', new Date('2026-10-02T11:35:00'))).toBe(true)
    expect(canStartWalk(req, 'w1', new Date('2026-10-02T11:25:00'))).toBe(false)
    expect(canStartWalk(req, 'w1', new Date('2026-10-02T14:05:00'))).toBe(false)
  })

  it('only for the walker of an accepted request', () => {
    expect(canStartWalk(req, 'someone-else', now)).toBe(false)
    expect(canStartWalk({ ...req, status: 'pending' }, 'w1', now)).toBe(false)
  })
})

describe('overdue', () => {
  it('counts minutes after a 20 minute grace period', () => {
    const end = new Date('2026-10-02T12:00:00')
    expect(overdueMinutes(end, new Date('2026-10-02T12:15:00'))).toBe(0)
    expect(overdueMinutes(end, new Date('2026-10-02T12:35:00'))).toBe(15)
  })
})

describe('scanText', () => {
  it('flags money requests in all four languages', () => {
    expect(scanText('Kun je even 20 euro overmaken?')).toContain('money')
    expect(scanText('Please pay me a deposit')).toContain('money')
    expect(scanText('Necesito un bizum')).toContain('money')
    expect(scanText('Merci de faire un virement')).toContain('money')
  })

  it('flags IBANs, links, phone numbers and e-mail addresses', () => {
    expect(scanText('NL91 ABNA 0417 1643 00')).toContain('iban')
    expect(scanText('kijk op www.example.com')).toContain('link')
    expect(scanText('bel me op 06 12345678')).toContain('phone')
    expect(scanText('mail naar a@b.nl')).toContain('email')
  })

  it('leaves a normal introduction alone', () => {
    expect(scanText('Hoi! Ik ben Fleur, 22, en ik ben opgegroeid met twee labradors.')).toEqual([])
  })
})

describe('feedback', () => {
  it('sends worrying answers to moderation', () => {
    expect(feedbackNeedsReview('owner', { dogCondition: 'injured', onTime: true, wouldAgain: true })).toBe(true)
    expect(feedbackNeedsReview('owner', { dogCondition: 'happy', onTime: true, wouldAgain: true })).toBe(false)
    expect(feedbackNeedsReview('walker', { dogBehaviour: 'aggressive', handoverOk: true, feltSafe: true })).toBe(true)
    expect(feedbackNeedsReview('walker', { dogBehaviour: 'easy', handoverOk: true, feltSafe: false })).toBe(true)
  })
})

describe('trust badges', () => {
  it('marks new members and earned trust', () => {
    expect(trustBadges({ walks: 0, idChecks: 0, quizPassed: false, memberSinceYear: 2026 })).toEqual(['new'])
    expect(trustBadges({ walks: 12, idChecks: 2, quizPassed: true, memberSinceYear: 2026 })).toEqual([
      'id-seen',
      'quiz',
      'regular',
    ])
  })
})
