/**
 * The Content-Security-Policy of every page. Scripts run only when they carry this response's
 * nonce (Next.js adds it to its own scripts) or were loaded by such a script, so markup that
 * slips into a page can never run code. Images may come from any https address: shelters link
 * dog photos on their own websites, and the map tiles come from a tile server.
 */
export function contentSecurityPolicy(nonce: string, options: { dev: boolean; https: boolean }): string {
  return [
    "default-src 'self'",
    // React needs eval only in development, for its error stacks.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.dev ? " 'unsafe-eval'" : ''}`,
    // React and Leaflet set style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.https ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

/** A fresh random nonce for one response. */
export function newNonce(): string {
  return btoa(crypto.randomUUID())
}

/** The nonce in a policy made by contentSecurityPolicy, or undefined when there is none. */
export function nonceFrom(policy: string | null | undefined): string | undefined {
  return /'nonce-([A-Za-z0-9+/=_-]+)'/.exec(policy ?? '')?.[1]
}
