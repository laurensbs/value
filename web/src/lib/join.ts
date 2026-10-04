import type { NextRequest, NextResponse } from 'next/server'
import { cleanInviteCode, INVITE_COOKIE, rememberInviter } from './invite'

// /aanmelden: the one short link for posters, WhatsApp, the crowdfunding and the shelters.
// Pure functions, so the page, the proxy and the tests share them.

export const JOIN_PATH = '/aanmelden'

/** The same page under a word that reads well in the other languages (redirects in next.config.ts). */
export const JOIN_ALIASES = ['/join', '/unete', '/rejoindre'] as const

/** The three ways in. Each one is the sign-up that already exists for that intent (see AuthForm and /onboarding). */
export const JOIN_CHOICES = [
  { key: 'walker', href: '/signup?intent=walker' },
  { key: 'owner', href: '/signup?intent=owner' },
  { key: 'shelter', href: '/signup?intent=shelter' },
] as const

export type JoinChoice = (typeof JOIN_CHOICES)[number]['key']

interface ProfileFacts {
  wantsToWalk: boolean
  quizPassedAt: Date | null
  bannedAt: Date | null
}

/**
 * Someone who is already signed in skips the page: the profile first, a walker the safety quiz
 * (the same step as right after onboarding), everyone else Vandaag.
 */
export function joinDestination(profile: ProfileFacts | null): string {
  if (!profile) return '/onboarding'
  if (profile.bannedAt) return '/banned'
  if (profile.wantsToWalk && !profile.quizPassedAt) return `/profile/quiz?next=${encodeURIComponent('/')}`
  return '/'
}

/**
 * ?bron=whydonate or ?bron=poster as a sign-up code, counted per code in the admin hub like the
 * campaign codes there. At least 7 characters, so it never looks like a member's own 6-character code.
 */
export function sourceCode(bron: string | null | undefined): string | null {
  const clean = cleanInviteCode(bron ?? '')
  return clean ? clean.padEnd(7, 'X') : null
}

/**
 * Remembers where a visitor of /aanmelden came from, with the invite cookie that already exists.
 * Only the channel word, nothing about the person. A member's invite that is already there wins:
 * that sign-up counts for them.
 */
export function rememberSource(request: NextRequest, response: NextResponse): NextResponse {
  if (request.nextUrl.pathname !== JOIN_PATH || request.cookies.has(INVITE_COOKIE)) return response
  const code = sourceCode(request.nextUrl.searchParams.get('bron'))
  return code ? rememberInviter(response, code) : response
}
