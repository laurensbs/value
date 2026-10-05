import { describe, expect, it } from 'vitest'
import {
  ageBand,
  canRequestMeeting,
  canRecordTrust,
  canRequestSolo,
  canStartWalk,
  checkMeetVia,
  compareTermsVersions,
  checkTrust,
  forDecider,
  feedbackNeedsReview,
  isAdult,
  isInPerson,
  isMeetVia,
  liveLocationReason,
  meetViaOptions,
  openRequestConflict,
  overdueMinutes,
  scanText,
  soloTrustReason,
  termsEffectiveAt,
  termsOutdated,
  termsReason,
  trustBadges,
  walkHasLiveLocation,
  type DogFacts,
  type Relation,
  type WalkerFacts,
} from './rules'
import { TERMS_EFFECTIVE_AT, TERMS_VERSION } from './site'

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
  needsTerms: false,
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

const rel: Relation = { isStaff: false, blocked: false, soloAllowed: false, idSeen: false }

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

  it('comes after the safety quiz (besluit 4 okt)', () => {
    expect(canRequestMeeting({ ...walker, quizPassed: false }, dog, rel)).toBe('needs-quiz')
    // The owner's own dog was never theirs to ask for.
    expect(canRequestMeeting({ ...walker, quizPassed: false }, { ...dog, ownerId: 'w1' }, rel)).toBe('own-dog')
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
    expect(canRequestSolo({ ...walker, quizPassed: false }, dog, { ...rel, soloAllowed: true, idSeen: true })).toBe('needs-quiz')
    expect(canRequestSolo(walker, dog, { ...rel, soloAllowed: true, idSeen: true })).toBeNull()
  })

  it('needs the ID seen in person, even when the owner allowed it', () => {
    expect(canRequestSolo(walker, dog, { ...rel, soloAllowed: true, idSeen: false })).toBe('needs-id')
    expect(canRequestSolo(walker, dog, { ...rel, soloAllowed: false, idSeen: true })).toBe('needs-solo-trust')
  })

  it('is checked again from the stored trust when it is accepted, started or rolled on', () => {
    expect(soloTrustReason('meet', dog, null)).toBeNull()
    expect(soloTrustReason('solo', dog, null)).toBe('needs-solo-trust')
    expect(soloTrustReason('solo', dog, { soloAllowed: false, idSeen: true })).toBe('needs-solo-trust')
    expect(soloTrustReason('solo', dog, { soloAllowed: true, idSeen: false })).toBe('needs-id')
    expect(soloTrustReason('solo', { orgId: 'org' }, { soloAllowed: true, idSeen: true })).toBe('needs-solo-trust')
    expect(soloTrustReason('solo', dog, { soloAllowed: true, idSeen: true })).toBeNull()
    expect(forDecider('needs-id')).toBe('id-not-seen')
    expect(forDecider('needs-solo-trust')).toBe('solo-not-allowed')
  })

  it('cannot be allowed without the ID seen', () => {
    expect(checkTrust({ idSeen: false, soloAllowed: true })).toBe('needs-id')
    expect(checkTrust({ idSeen: true, soloAllowed: true })).toBeNull()
    expect(checkTrust({ idSeen: true, soloAllowed: false })).toBeNull()
    // Taking everything back is always possible.
    expect(checkTrust({ idSeen: false, soloAllowed: false })).toBeNull()
  })

  it('is never possible with shelter dogs (always supervised)', () => {
    expect(canRequestSolo(walker, { ...dog, ownerId: null, orgId: 'org' }, { ...rel, soloAllowed: true, idSeen: true })).toBe(
      'needs-meeting',
    )
  })

  it('keeps experienced dogs away from walkers without dog experience', () => {
    expect(
      canRequestSolo({ ...walker, experience: 'none' }, { ...dog, level: 'experienced' }, { ...rel, soloAllowed: true, idSeen: true }),
    ).toBe('experience')
  })
})

describe('one open request per walker and dog', () => {
  const later = new Date('2026-10-05T10:00:00')
  const earlier = new Date('2026-09-30T10:00:00')
  const meet = { kind: 'meet', meetVia: 'walk' }

  it('finds a request that is waiting or agreed and still to come', () => {
    expect(openRequestConflict([{ status: 'pending', startsAt: later, meetVia: 'walk', kind: 'meet', weekly: false }], meet, now)).not.toBeNull()
    expect(openRequestConflict([{ status: 'accepted', startsAt: later, meetVia: 'home', kind: 'meet', weekly: false }], { kind: 'solo', meetVia: 'walk' }, now)).not.toBeNull()
  })

  it('lets go of what is past, said no to, cancelled or done', () => {
    expect(openRequestConflict([{ status: 'pending', startsAt: earlier, meetVia: 'walk', kind: 'meet', weekly: false }], meet, now)).toBeNull()
    expect(openRequestConflict([{ status: 'accepted', startsAt: earlier, meetVia: 'walk', kind: 'meet', weekly: false }], meet, now)).toBeNull()
    for (const status of ['declined', 'cancelled', 'completed', 'expired']) {
      expect(openRequestConflict([{ status, startsAt: later, meetVia: 'walk', kind: 'meet', weekly: false }], meet, now)).toBeNull()
    }
  })

  it('after an agreed first call, meeting in person can still be planned', () => {
    const call = [{ status: 'accepted', startsAt: later, meetVia: 'phone', kind: 'meet', weekly: false }]
    expect(openRequestConflict(call, meet, now)).toBeNull()
    expect(openRequestConflict(call, { kind: 'meet', meetVia: 'video' }, now)).not.toBeNull()
    expect(openRequestConflict([{ status: 'pending', startsAt: later, meetVia: 'phone', kind: 'meet', weekly: false }], meet, now)).not.toBeNull()
  })

  it('an agreed weekly solo walk leaves room for an extra solo walk, not for anything else', () => {
    const series = [{ status: 'accepted', startsAt: later, meetVia: 'walk', kind: 'solo', weekly: true }]
    expect(openRequestConflict(series, { kind: 'solo', meetVia: 'walk' }, now)).toBeNull()
    expect(openRequestConflict(series, meet, now)).not.toBeNull()
    expect(openRequestConflict([{ ...series[0], weekly: false }], { kind: 'solo', meetVia: 'walk' }, now)).not.toBeNull()
    expect(openRequestConflict([{ ...series[0], status: 'pending' }], { kind: 'solo', meetVia: 'walk' }, now)).not.toBeNull()
  })
})

describe('starting a walk', () => {
  const req = { status: 'accepted', startsAt: new Date('2026-10-02T12:00:00'), walkerId: 'w1', meetVia: 'walk' }

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

describe('how a first meeting happens', () => {
  const shelterDog = { ...dog, ownerId: null, orgId: 'org' }

  it('knows the four ways, and only walking and a home visit are in person', () => {
    expect(isMeetVia('phone')).toBe(true)
    expect(isMeetVia('skype')).toBe(false)
    expect(isMeetVia(undefined)).toBe(false)
    expect(['walk', 'home'].every(isInPerson)).toBe(true)
    expect(['phone', 'video', '', 'unknown'].some(isInPerson)).toBe(false)
  })

  it('lets an owner choose a walk, a home visit, a call or a video call for a first meeting', () => {
    expect(meetViaOptions('meet', dog)).toEqual(['walk', 'home', 'phone', 'video'])
    for (const via of ['walk', 'home', 'phone', 'video']) expect(checkMeetVia('meet', via, dog)).toBeNull()
    expect(checkMeetVia('meet', 'skype', dog)).toBe('meet-via')
  })

  it('keeps a regular walk a walk', () => {
    expect(meetViaOptions('solo', dog)).toEqual(['walk'])
    expect(checkMeetVia('solo', 'walk', dog)).toBeNull()
    for (const via of ['home', 'phone', 'video']) expect(checkMeetVia('solo', via, dog)).toBe('meet-via')
  })

  it('keeps meeting a shelter dog on location, walking', () => {
    expect(meetViaOptions('meet', shelterDog)).toEqual(['walk'])
    for (const via of ['home', 'phone', 'video']) expect(checkMeetVia('meet', via, shelterDog)).toBe('meet-via')
  })

  it('never lets a call count as meeting in person: no ID check and no solo walks after it', () => {
    const past = new Date('2026-10-01T10:00:00')
    expect(canRecordTrust([], 0, now)).toBe('needs-meeting')
    expect(canRecordTrust([{ status: 'pending', meetVia: 'walk', startsAt: past }], 0, now)).toBe('needs-meeting')
    expect(canRecordTrust([{ status: 'accepted', meetVia: 'phone', startsAt: past }], 0, now)).toBe('needs-in-person')
    expect(
      canRecordTrust([{ status: 'completed', meetVia: 'video', startsAt: past }, { status: 'accepted', meetVia: 'phone', startsAt: past }], 0, now),
    ).toBe('needs-in-person')
    // Asked for, but not yet accepted: the call still does not count.
    expect(
      canRecordTrust([{ status: 'accepted', meetVia: 'phone', startsAt: past }, { status: 'pending', meetVia: 'walk', startsAt: past }], 0, now),
    ).toBe('needs-in-person')
  })

  it('counts an accepted walk or home visit that took place, or a walk together, as meeting in person', () => {
    const past = new Date('2026-10-01T10:00:00')
    expect(canRecordTrust([{ status: 'accepted', meetVia: 'walk', startsAt: past }], 0, now)).toBeNull()
    expect(canRecordTrust([{ status: 'accepted', meetVia: 'home', startsAt: past }], 0, now)).toBeNull()
    expect(canRecordTrust([{ status: 'accepted', meetVia: 'phone', startsAt: past }, { status: 'completed', meetVia: 'walk', startsAt: past }], 0, now)).toBeNull()
    expect(canRecordTrust([{ status: 'accepted', meetVia: 'phone', startsAt: past }], 1, now)).toBeNull()
  })

  it('does not count a meeting in person that is still to come (no ID seen yet)', () => {
    const later = new Date('2026-10-03T11:00:00')
    expect(canRecordTrust([{ status: 'accepted', meetVia: 'home', startsAt: later }], 0, now)).toBe('meeting-ahead')
    // A walk together that already started counts, even before its planned moment.
    expect(canRecordTrust([{ status: 'accepted', meetVia: 'walk', startsAt: later }], 1, now)).toBeNull()
    expect(canRecordTrust([{ status: 'completed', meetVia: 'home', startsAt: later }], 0, now)).toBeNull()
  })

  it('never starts a walk with live location from a call', () => {
    const at = new Date('2026-10-02T12:00:00')
    const base = { status: 'accepted', startsAt: at, walkerId: 'w1' }
    expect(canStartWalk({ ...base, meetVia: 'walk' }, 'w1', at)).toBe(true)
    expect(canStartWalk({ ...base, meetVia: 'home' }, 'w1', at)).toBe(true)
    expect(canStartWalk({ ...base, meetVia: 'phone' }, 'w1', at)).toBe(false)
    expect(canStartWalk({ ...base, meetVia: 'video' }, 'w1', at)).toBe(false)
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

describe('changed terms (art. 19)', () => {
  it('orders versions as numbers, and anything else before every version', () => {
    expect(compareTermsVersions('0.2', '0.3')).toBe(-1)
    expect(compareTermsVersions('0.3', '0.3')).toBe(0)
    expect(compareTermsVersions('0.10', '0.9')).toBe(1)
    expect(compareTermsVersions('1', '0.3')).toBe(1)
    expect(compareTermsVersions('0.3.0', '0.3')).toBe(0)
    expect(compareTermsVersions('demo', '0.3')).toBe(-1)
    expect(compareTermsVersions('0.1', 'demo')).toBe(1)
  })

  it('sees who agreed to an older version, or to none we know', () => {
    expect(termsOutdated('0.2', '0.3')).toBe(true)
    expect(termsOutdated('0.3', '0.3')).toBe(false)
    expect(termsOutdated('1', '0.3')).toBe(false)
    expect(termsOutdated('demo', '0.3')).toBe(true)
    expect(termsOutdated(null, '0.3')).toBe(true)
    expect(termsOutdated(TERMS_VERSION)).toBe(false)
  })

  it('takes effect at midnight in Amsterdam on TERMS_EFFECTIVE_AT', () => {
    expect(termsEffectiveAt('2026-11-09').toISOString()).toBe('2026-11-08T23:00:00.000Z')
    expect(termsEffectiveAt('2026-07-01').toISOString()).toBe('2026-06-30T22:00:00.000Z')
    expect(termsEffectiveAt().toISOString()).toBe(termsEffectiveAt(TERMS_EFFECTIVE_AT).toISOString())
  })

  it('waits for the yes only from the day the new terms take effect', () => {
    const terms = { version: '0.3', effectiveAt: new Date('2026-11-08T23:00:00Z') }
    // Announced: a notice, nothing waits yet.
    expect(termsReason('0.2', new Date('2026-11-08T22:59:59Z'), terms)).toBeNull()
    // Taken effect: asking, accepting, starting and joining wait for the yes.
    expect(termsReason('0.2', new Date('2026-11-08T23:00:00Z'), terms)).toBe('needs-terms')
    expect(termsReason('0.2', new Date('2027-01-01T12:00:00Z'), terms)).toBe('needs-terms')
    // Agreed to the new terms (at sign-up or afterwards): nothing waits.
    expect(termsReason('0.3', new Date('2027-01-01T12:00:00Z'), terms)).toBeNull()
  })

  it('comes before the quiz for a first meeting and a solo walk, after what is about the dog', () => {
    const later = { ...walker, needsTerms: true }
    expect(canRequestMeeting(later, dog, rel)).toBe('needs-terms')
    expect(canRequestMeeting({ ...later, quizPassed: false }, dog, rel)).toBe('needs-terms')
    expect(canRequestMeeting(later, { ...dog, isDemo: true }, rel)).toBe('demo-dog')
    expect(canRequestSolo(later, dog, { ...rel, soloAllowed: true, idSeen: true })).toBe('needs-terms')
    expect(canRequestSolo(later, dog, rel)).toBe('needs-solo-trust')
  })
})

describe('live location switched off', () => {
  it('stops a walk alone with the dog, never a first meeting with the owner there', () => {
    expect(liveLocationReason('solo', false)).toBe('live-location-off')
    expect(liveLocationReason('meet', false)).toBeNull()
    expect(liveLocationReason('solo', true)).toBeNull()
    expect(liveLocationReason('meet', true)).toBeNull()
  })
})

describe('which walks collect live location', () => {
  it('only a walk alone with the dog, and only with the switch on', () => {
    expect(walkHasLiveLocation('solo', true)).toBe(true)
    expect(walkHasLiveLocation('solo', false)).toBe(false)
  })

  it('never a first meeting or anything else, even with the switch on', () => {
    expect(walkHasLiveLocation('meet', true)).toBe(false)
    expect(walkHasLiveLocation('meet', false)).toBe(false)
    expect(walkHasLiveLocation('group', true)).toBe(false)
    // A walk whose request is gone: no kind, so nothing is collected.
    expect(walkHasLiveLocation(null, true)).toBe(false)
    expect(walkHasLiveLocation(undefined, true)).toBe(false)
    expect(walkHasLiveLocation('Solo', true)).toBe(false)
  })
})
