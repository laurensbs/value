/** The public base URL of this deployment, without a trailing slash. */
export function siteUrl(): string {
  const explicit = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

/** Every origin that may call the auth API: production, this deployment, branch previews, local. */
export function trustedOrigins(): string[] {
  const hosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean)
  return [
    siteUrl(),
    ...hosts.map((h) => `https://${h}`),
    'http://localhost:3000',
    `http://localhost:${process.env.PORT ?? 3000}`,
  ]
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Admin rights come from the admin role, or from an address on ADMIN_EMAILS once its owner confirmed
 * it (a link in that inbox: the confirmation on /admin or a password reset, or Google/Apple). Until
 * then the list only gives "confirm": otherwise anyone could sign up first with an admin's address
 * and be an admin. That also holds while Rondje sends no email: then only the role counts.
 * `throwaway`: a test server with its own embedded database (db/index.ts isThrowawayTestServer), which
 * has no inbox and no real data; only there does the list count without confirmation.
 */
export function adminAccess(
  user: { email: string; emailVerified: boolean; role?: string | null },
  throwaway = false,
): 'admin' | 'confirm' | null {
  if (user.role === 'admin') return 'admin'
  if (!adminEmails().includes(user.email.toLowerCase())) return null
  return user.emailVerified || throwaway ? 'admin' : 'confirm'
}

/**
 * The terms someone accepts when they create a profile, stored with it (profile.termsVersion and
 * termsAcceptedAt). Equal to `version` in content/legal/<locale>/terms.md (checked in
 * legal-placeholders.test.ts). When it goes up, people who accepted an older version see what changed
 * (content/legal/<locale>/terms-changes.md) and can agree again (lib/rules.ts termsReason).
 */
export const TERMS_VERSION = '0.3'

/**
 * The day the in-app notice about TERMS_VERSION goes live: the deploy that shows people who accepted
 * an older version what changed (on the profile, /profile/terms and /requests). Terms art. 19 counts
 * its 30 days from here. Zet op de echte live-datum bij het mergen (YYYY-MM-DD).
 */
export const TERMS_NOTICE_FROM = '2026-10-05'

/**
 * The day TERMS_VERSION takes effect for people who accepted an older version (00:00 in Amsterdam).
 * Terms art. 19 promises important changes at least 30 days ahead: at least TERMS_NOTICE_FROM plus
 * 30 days (legal-placeholders.test.ts checks it), with a few days to spare. Until then nothing is
 * blocked for them; from then on, making new appointments and starting a walk wait for their yes. New
 * sign-ups accept the current version at once. Merged after 10 October 2026? Then move both days.
 */
export const TERMS_EFFECTIVE_AT = '2026-11-09'

const SAME_SITE = 'https://same-site.invalid'

/**
 * Only allow redirects to paths on this site ("/x", never "//evil" or "/\evil"). Browsers drop
 * tabs and line breaks from a URL and read "\" as "/", so "/<tab>/evil.com" would leave the site
 * too: control characters and backslashes are refused, and the path must resolve to this site.
 * The path is returned as given, not tidied: "/.//x" stays on this site, "//x" would not.
 */
export function safeNext(value: unknown, fallback = '/dogs'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback
  }
  try {
    return new URL(value, SAME_SITE).origin === SAME_SITE ? value : fallback
  } catch {
    return fallback
  }
}

/** The app's name in one place: everything that shows the name reads it from here. */
export const APP_NAME = 'Rondje Mee'
