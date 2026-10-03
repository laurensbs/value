import { describe, expect, it } from 'vitest'
import { scrubEvent } from './Analytics'

const view = (url: string) => scrubEvent({ type: 'pageview', url })

describe('what Web Analytics may see', () => {
  it('never counts admin pages or the hub', () => {
    expect(view('https://rondje.test/admin')).toBeNull()
    expect(view('https://rondje.test/admin/launch#cijfers')).toBeNull()
    expect(view('https://rondje.test/hub')).toBeNull()
    expect(view('https://rondje.test/hub/partners?type=opvang')).toBeNull()
    expect(view('https://rondje.test/hubble')?.url).toBe('https://rondje.test/hubble')
  })

  it('drops query strings and hashes (claim links, invite codes, next=)', () => {
    expect(view('https://rondje.test/shelter?claim=nl-abc')?.url).toBe('https://rondje.test/shelter')
    expect(view('https://rondje.test/login?next=%2Frequests#x')?.url).toBe('https://rondje.test/login')
  })

  it('replaces ids in paths', () => {
    expect(view('https://rondje.test/follow/0f8b3c1e-2a4d-4e5f-9a8b-1c2d3e4f5a6b')?.url).toBe('https://rondje.test/follow/:id')
    expect(view('https://rondje.test/dogs')?.url).toBe('https://rondje.test/dogs')
  })

  it('skips anything that is not a URL', () => {
    expect(view('not a url')).toBeNull()
  })
})
