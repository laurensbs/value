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

export const TERMS_VERSION = '0.2'

/** Only allow redirects to paths on this site ("/x", never "//evil" or "/\evil"). */
export function safeNext(value: unknown, fallback = '/dogs'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

/** The app's name in one place, until the final name is chosen. */
export const APP_NAME = 'Rondje'
