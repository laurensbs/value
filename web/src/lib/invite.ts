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

/** The link an owner shares with the neighbours: it opens their dog's page and remembers who shared it. */
export function dogShareUrl(base: string, code: string, dogId: string): string {
  return `${base}/r/${cleanInviteCode(code)}/${cleanDogId(dogId)}`
}
