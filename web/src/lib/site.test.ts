import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminAccess, safeNext } from './site'

describe('safeNext', () => {
  it('keeps paths on this site as they are, with their query and anchor', () => {
    expect(safeNext('/dogs/abc#plan')).toBe('/dogs/abc#plan')
    expect(safeNext('/dogs?org=o1', '/')).toBe('/dogs?org=o1')
    expect(safeNext('/group-walks?city=Den Haag', '/')).toBe('/group-walks?city=Den Haag')
    // Resolves to "https://site//x": still this site, so it may stay (tidying it would make "//x").
    expect(safeNext('/.//evil.example', '/')).toBe('/.//evil.example')
  })

  it('falls back for anything that is not a path', () => {
    expect(safeNext(undefined)).toBe('/dogs')
    expect(safeNext(['/dogs'], '/')).toBe('/')
    expect(safeNext('dogs', '/')).toBe('/')
    expect(safeNext('https://evil.example/', '/')).toBe('/')
    expect(safeNext('javascript:alert(1)', '/')).toBe('/')
  })

  it('never sends someone to another site', () => {
    for (const trick of ['//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/\\/evil.example']) {
      expect(safeNext(trick, '/')).toBe('/')
      // What a browser would make of the path that comes back.
      expect(new URL(safeNext(trick, '/'), 'https://rondje.test').origin).toBe('https://rondje.test')
    }
  })
})

describe('adminAccess', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('never makes an unconfirmed address on ADMIN_EMAILS an admin, also while Rondje sends no email', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Boss@Example.org , helper@example.org')
    // Someone who signed up first with an admin's address, without a link from that inbox.
    expect(adminAccess({ email: 'BOSS@example.org', emailVerified: false })).toBe('confirm')
    expect(adminAccess({ email: 'helper@example.org', emailVerified: false, role: 'user' })).toBe('confirm')
  })

  it('gives admin rights by address once the address is confirmed, and always for the admin role', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Boss@Example.org , helper@example.org')
    expect(adminAccess({ email: 'boss@example.org', emailVerified: true })).toBe('admin')
    expect(adminAccess({ email: 'helper@example.org', emailVerified: false, role: 'admin' })).toBe('admin')
    expect(adminAccess({ email: 'someone@example.org', emailVerified: false, role: 'admin' })).toBe('admin')
  })

  it('never for addresses that are not on the list', () => {
    vi.stubEnv('ADMIN_EMAILS', 'boss@example.org')
    expect(adminAccess({ email: 'someone@example.org', emailVerified: true })).toBeNull()
    expect(adminAccess({ email: 'boss@example.org.evil.example', emailVerified: true }, true)).toBeNull()
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(adminAccess({ email: 'boss@example.org', emailVerified: true })).toBeNull()
  })

  it('lets the list count without confirmation only on a throwaway test server', () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@e2e.test')
    expect(adminAccess({ email: 'admin@e2e.test', emailVerified: false }, true)).toBe('admin')
    expect(adminAccess({ email: 'admin@e2e.test', emailVerified: false }, false)).toBe('confirm')
  })
})
