import { NextRequest, NextResponse } from 'next/server'
import { describe, expect, it } from 'vitest'
import { JOIN_CHOICES, joinDestination, rememberSource, sourceCode } from './join'

const at = new Date('2026-10-05T10:00:00Z')
const profile = (over: Partial<{ wantsToWalk: boolean; quizPassedAt: Date | null; bannedAt: Date | null }> = {}) => ({
  wantsToWalk: true,
  quizPassedAt: at,
  bannedAt: null,
  ...over,
})

describe('/aanmelden', () => {
  it('offers the sign-up that already exists for each intent', () => {
    expect(JOIN_CHOICES.map((c) => c.href)).toEqual(['/signup?intent=walker', '/signup?intent=owner', '/signup?intent=shelter'])
  })

  it('sends someone who is signed in on to their next step', () => {
    expect(joinDestination(null)).toBe('/onboarding')
    expect(joinDestination(profile({ bannedAt: at }))).toBe('/banned')
    expect(joinDestination(profile({ quizPassedAt: null }))).toBe('/profile/quiz?next=%2F')
    expect(joinDestination(profile())).toBe('/')
    // Owners and shelter staff do not walk, so no quiz first.
    expect(joinDestination(profile({ wantsToWalk: false, quizPassedAt: null }))).toBe('/')
  })

  it('turns ?bron= into a sign-up code that never looks like a member code', () => {
    expect(sourceCode('whydonate')).toBe('WHYDONATE')
    expect(sourceCode('poster')).toBe('POSTERX')
    expect(sourceCode('jan@example.nl')).toBe('JANEXAMPLENL')
    expect(sourceCode('a'.repeat(30))).toHaveLength(12)
    expect(sourceCode('---')).toBeNull()
    expect(sourceCode('')).toBeNull()
    expect(sourceCode(null)).toBeNull()
  })

  it('remembers the source with the invite cookie, only on /aanmelden and never over an invite', () => {
    const visit = (url: string, cookie?: string) => {
      const request = new NextRequest(url, cookie ? { headers: { cookie } } : undefined)
      return rememberSource(request, NextResponse.next()).cookies.get('rondje_ref')
    }
    expect(visit('https://rondje.example/aanmelden?bron=whydonate')).toMatchObject({ value: 'WHYDONATE', maxAge: 2_592_000, httpOnly: true })
    expect(visit('https://rondje.example/aanmelden')).toBeUndefined()
    expect(visit('https://rondje.example/aanmelden?bron=%40%40')).toBeUndefined()
    expect(visit('https://rondje.example/dogs?bron=poster')).toBeUndefined()
    expect(visit('https://rondje.example/aanmelden?bron=poster', 'rondje_ref=ABC234')).toBeUndefined()
  })
})
