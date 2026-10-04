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
 * Admin rights come from the admin role, or from an address on ADMIN_EMAILS. Once Rondje can send
 * email, an address on the list counts only after its owner confirmed it ("confirm"): otherwise
 * anyone could sign up first with an admin's address and be an admin.
 */
export function adminAccess(
  user: { email: string; emailVerified: boolean; role?: string | null },
  canEmail: boolean,
): 'admin' | 'confirm' | null {
  if (user.role === 'admin') return 'admin'
  if (!adminEmails().includes(user.email.toLowerCase())) return null
  return user.emailVerified || !canEmail ? 'admin' : 'confirm'
}

export const TERMS_VERSION = '0.2'

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
