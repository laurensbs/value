import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, newNonce } from './csp'

const directive = (policy: string, name: string) => policy.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''

describe('contentSecurityPolicy', () => {
  it('runs only scripts with the nonce, and eval only in development', () => {
    const live = contentSecurityPolicy('abc', { dev: false, https: true })
    expect(directive(live, 'script-src')).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(live).not.toContain('unsafe-eval')
    expect(contentSecurityPolicy('abc', { dev: true, https: false })).toContain("'unsafe-eval'")
  })

  it('shows photos and map tiles from https addresses, and talks only to this site', () => {
    const policy = contentSecurityPolicy('n', { dev: false, https: true })
    expect(directive(policy, 'img-src')).toBe("img-src 'self' data: blob: https:")
    expect(directive(policy, 'connect-src')).toBe("connect-src 'self'")
  })

  it('cannot be framed, loads no plugins and keeps forms and the base URL on this site', () => {
    const policy = contentSecurityPolicy('n', { dev: false, https: true })
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "form-action 'self'", "base-uri 'self'", "worker-src 'self'"]) {
      expect(policy).toContain(d)
    }
    expect(policy).toContain('upgrade-insecure-requests')
    expect(contentSecurityPolicy('n', { dev: true, https: false })).not.toContain('upgrade-insecure-requests')
  })
})

describe('newNonce', () => {
  it('is new every time', () => {
    expect(newNonce()).not.toBe(newNonce())
    expect(newNonce()).toMatch(/^[A-Za-z0-9+/=]{40,}$/)
  })
})
