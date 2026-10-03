// Campaign links for the marketing hub (/admin/marketing): pure functions, so the builder, the
// post planner and the tests share them. Nothing here contacts anyone or stores anything.

import { cleanInviteCode, inviteUrl } from '@/lib/invite'

/** Where a link is shared. "opvang" and "partner" get a name after them (opvang-dierenasiel-x). */
export const SOURCES = ['flyer', 'instagram', 'tiktok', 'linkedin', 'buurtapp', 'opvang', 'partner', 'mail'] as const
export type Source = (typeof SOURCES)[number]

export function isSource(value: unknown): value is Source {
  return typeof value === 'string' && (SOURCES as readonly string[]).includes(value)
}

const MEDIUM: Record<Source, string> = {
  flyer: 'print',
  instagram: 'social',
  tiktok: 'social',
  linkedin: 'social',
  buurtapp: 'community',
  opvang: 'referral',
  partner: 'referral',
  mail: 'email',
}

/** utm_medium follows from the source, so the same kind of channel always has the same medium. */
export function mediumFor(source: Source): string {
  return MEDIUM[source]
}

/** "Dierenasiel 's-Hertogenbosch!" → "dierenasiel-s-hertogenbosch": safe in a URL and readable in a dashboard. */
export function slug(text: string, max = 40): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
}

export interface CampaignInput {
  /** A path on this site, like "/", "/dogs" or "/cities/utrecht". */
  path: string
  source: Source
  /** A name or place after the source: the shelter, the partner, the flyer spot. Optional. */
  detail?: string
  campaign: string
  /** utm_content: which post or which version of a flyer. Optional. */
  content?: string
}

/** Only paths on this site, so a link can never point somewhere else. */
export function safePath(path: string): string {
  const clean = path.trim()
  if (!clean.startsWith('/') || clean.startsWith('//') || /[\\\s]/.test(clean)) return '/'
  return clean
}

export function utmSource(source: Source, detail = ''): string {
  const extra = slug(detail, 30)
  return extra ? `${source}-${extra}` : source
}

/** A link to a page of this site with utm_source, utm_medium and utm_campaign (and utm_content). */
export function campaignUrl(base: string, input: CampaignInput): string {
  const url = new URL(safePath(input.path), `${base.replace(/\/$/, '')}/`)
  const params = new URLSearchParams(url.search)
  params.set('utm_source', utmSource(input.source, input.detail))
  params.set('utm_medium', mediumFor(input.source))
  params.set('utm_campaign', slug(input.campaign) || 'start')
  const content = slug(input.content ?? '')
  if (content) params.set('utm_content', content)
  url.search = params.toString()
  return url.toString()
}

const PREFIX: Record<Source, string> = {
  flyer: 'FL',
  instagram: 'IG',
  tiktok: 'TT',
  linkedin: 'LI',
  buurtapp: 'BA',
  opvang: 'OP',
  partner: 'PA',
  mail: 'ML',
}

/**
 * A suggested sign-up code for /r/<CODE>: two letters for the source, then the name or place, then
 * the campaign, at most 12 characters. Members' own codes are 6 characters, so a suggestion is
 * always longer (7 or more) and never looks like someone's personal link.
 */
export function suggestCode(source: Source, detail: string, campaign: string): string {
  const body = cleanInviteCode(`${detail}${campaign}`)
  const code = cleanInviteCode(`${PREFIX[source]}${body}`)
  return code.padEnd(7, 'X')
}

/** The sign-up link with a code: counts sign-ups per code in the hub, also without Vercel Analytics. */
export function codeUrl(base: string, code: string, owner = false): string | null {
  const clean = cleanInviteCode(code)
  return clean ? inviteUrl(base.replace(/\/$/, ''), clean, owner ? 'owner' : undefined) : null
}
