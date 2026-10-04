import type { NextResponse } from 'next/server'

/** Invite links remember who invited someone for 30 days, so a sign-up counts for them. */
export const INVITE_COOKIE = 'rondje_ref'
export const INVITE_MAX_AGE = 60 * 60 * 24 * 30

/** A referral code as it may appear in a link: letters and digits, at most 12. */
export function cleanInviteCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

/** A dog id as it may appear in a link. Anything else is dropped, so the link only ever opens a dog's page. */
export function cleanDogId(id: string): string {
  return id.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64)
}

/** Someone's invite link, which opens sign-up; for dog owners with that start already chosen. */
export function inviteUrl(base: string, code: string, intent?: 'owner'): string {
  return `${base}/r/${cleanInviteCode(code)}${intent ? `?intent=${intent}` : ''}`
}

/** The link an owner shares with the neighbours: it opens their dog's page and remembers who shared it. */
export function dogShareUrl(base: string, code: string, dogId: string): string {
  return `${base}/r/${cleanInviteCode(code)}/${cleanDogId(dogId)}`
}

/** Remembers who invited the visitor (see INVITE_COOKIE), whichever invite link they came through. */
export function rememberInviter(response: NextResponse, code: string): NextResponse {
  const clean = cleanInviteCode(code)
  if (clean) response.cookies.set(INVITE_COOKIE, clean, { path: '/', maxAge: INVITE_MAX_AGE, sameSite: 'lax', httpOnly: true })
  return response
}
