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

  it('gives admin rights by address only once the address is confirmed, when email works', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Boss@Example.org , helper@example.org')
    expect(adminAccess({ email: 'boss@example.org', emailVerified: true }, true)).toBe('admin')
    expect(adminAccess({ email: 'BOSS@example.org', emailVerified: false }, true)).toBe('confirm')
    // Without email there is no way to confirm: the list alone decides, as before.
    expect(adminAccess({ email: 'helper@example.org', emailVerified: false }, false)).toBe('admin')
  })

  it('never for addresses that are not on the list, and always for the admin role', () => {
    vi.stubEnv('ADMIN_EMAILS', 'boss@example.org')
    expect(adminAccess({ email: 'someone@example.org', emailVerified: true }, true)).toBeNull()
    expect(adminAccess({ email: 'boss@example.org.evil.example', emailVerified: true }, false)).toBeNull()
    expect(adminAccess({ email: 'someone@example.org', emailVerified: false, role: 'admin' }, true)).toBe('admin')
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(adminAccess({ email: 'boss@example.org', emailVerified: true }, true)).toBeNull()
  })
})
