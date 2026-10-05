import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { loadText } from '@/lib/content'
import { termsEffectiveAt, termsOutdated, termsReason, type Reason } from '@/lib/rules'
import { TERMS_VERSION } from '@/lib/site'
import { pageNow } from './clock'

// Changed terms (art. 19): the notice, agreeing again, and the step that waits for it. The rule itself
// is lib/rules.ts termsReason; the website and the app API (src/app/api/v1) both come through here.

/** What changed since the previous version, from content/legal/<locale>/terms-changes.md. */
export interface TermsChanges {
  /** The version these changes lead to (TERMS_VERSION), and the one before. */
  version: string
  from: string
  title: string
  /** The sentence above the list. */
  intro: string
  /** One change per item, in plain text (no markdown). */
  items: string[]
  /** The full terms on the website. */
  url: string
}

const plain = (text: string) =>
  text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

/** The changes in the reader's language (Dutch as fallback), or null when there is no such text. */
export async function termsChanges(locale: string): Promise<TermsChanges | null> {
  const text = await loadText('legal', 'terms-changes', locale)
  if (!text) return null
  const blocks = text.body.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean)
  const items = blocks
    .flatMap((b) => b.split(/\r?\n(?=[-*] )/))
    .filter((b) => /^[-*] /.test(b))
    .map((b) => plain(b.slice(2)))
  const intro = blocks.find((b) => !/^[-*#] /.test(b)) ?? ''
  return {
    version: text.data.version ?? TERMS_VERSION,
    from: text.data.from ?? '',
    title: text.data.title ?? '',
    intro: plain(intro),
    items,
    url: '/legal/terms',
  }
}

/** Whether this person's yes to the new terms is needed right now (null when not, or no profile yet). */
export async function termsBlock(profile: { termsVersion: string } | null | undefined): Promise<Reason | null> {
  return profile ? termsReason(profile.termsVersion, await pageNow()) : null
}

/**
 * Where someone stands with the terms, for the app (/api/v1/me). `termsChanges` is filled only while
 * they still have to agree: the app shows the notice exactly then. `termsRequired` is true from
 * `termsEffectiveAt` on: then asking, accepting, starting and joining wait for the yes ('needs-terms').
 * Someone without a profile agrees when finishing it (POST /api/v1/profile, termsAccepted).
 */
export async function termsForApp(profile: { termsVersion: string } | null | undefined, locale: string) {
  const outdated = Boolean(profile && termsOutdated(profile.termsVersion))
  return {
    termsVersion: TERMS_VERSION,
    termsAccepted: Boolean(profile) && !outdated,
    termsEffectiveAt: termsEffectiveAt().toISOString(),
    termsRequired: Boolean(await termsBlock(profile)),
    termsChanges: outdated ? await termsChanges(locale) : null,
  }
}

/**
 * Records the yes to the current terms, with the moment. `version` is the version the person was shown,
 * and it is required: without it nobody can tell which text the yes is for ('invalid'), and a yes to any
 * other version is refused ('terms-changed'), so nobody agrees to a text they did not see. Agreeing
 * again when already up to date changes nothing.
 */
export async function acceptCurrentTerms(
  userId: string,
  profile: { termsVersion: string; termsAcceptedAt: Date },
  version: unknown,
): Promise<{ ok: true; termsVersion: string; termsAcceptedAt: Date } | { ok: false; error: 'invalid' | 'terms-changed' }> {
  if (typeof version !== 'string' || !version.trim()) return { ok: false, error: 'invalid' }
  if (version !== TERMS_VERSION) return { ok: false, error: 'terms-changed' }
  if (!termsOutdated(profile.termsVersion)) return { ok: true, termsVersion: profile.termsVersion, termsAcceptedAt: profile.termsAcceptedAt }
  const termsAcceptedAt = new Date()
  const db = await getDb()
  await db.update(s.profile).set({ termsVersion: TERMS_VERSION, termsAcceptedAt }).where(eq(s.profile.userId, userId))
  return { ok: true, termsVersion: TERMS_VERSION, termsAcceptedAt }
}
