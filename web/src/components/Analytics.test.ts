import { describe, expect, it } from 'vitest'
import { scrubEvent } from './Analytics'

const view = (url: string) => scrubEvent({ type: 'pageview', url })

describe('what Web Analytics may see', () => {
  it('never counts admin pages', () => {
    expect(view('https://rondje.test/admin')).toBeNull()
    expect(view('https://rondje.test/admin/launch#cijfers')).toBeNull()
  })

  it('drops query strings and hashes (claim links, invite codes, next=)', () => {
    expect(view('https://rondje.test/shelter?claim=nl-abc')?.url).toBe('https://rondje.test/shelter')
    expect(view('https://rondje.test/login?next=%2Frequests#x')?.url).toBe('https://rondje.test/login')
  })

  it('keeps the utm_* campaign tags and drops every other parameter', () => {
    expect(view('https://rondje.test/dogs?utm_source=flyer-bibliotheek&utm_medium=print&utm_campaign=start&claim=nl-abc&next=%2Fx')?.url).toBe(
      'https://rondje.test/dogs?utm_source=flyer-bibliotheek&utm_medium=print&utm_campaign=start',
    )
    expect(view('https://rondje.test/?utm_content=p01&utm_term=honden&ref=ABC123#top')?.url).toBe('https://rondje.test/?utm_content=p01&utm_term=honden')
    // Only the five utm keys, in a fixed order, whatever order the link had.
    expect(view('https://rondje.test/?utm_campaign=start&utm_id=9&utm_source=ig')?.url).toBe('https://rondje.test/?utm_source=ig&utm_campaign=start')
  })

  it('cleans campaign tags and drops ones that could hold personal details', () => {
    expect(view('https://rondje.test/?utm_source=Buurt%20App!&utm_medium=social')?.url).toBe('https://rondje.test/?utm_source=buurt-app&utm_medium=social')
    expect(view('https://rondje.test/?utm_source=sanne%40example.com&utm_medium=email')?.url).toBe('https://rondje.test/?utm_medium=email')
    expect(view('https://rondje.test/?utm_content=0f8b3c1e-2a4d-4e5f-9a8b-1c2d3e4f5a6b')?.url).toBe('https://rondje.test/')
    expect(view('https://rondje.test/?utm_source=')?.url).toBe('https://rondje.test/')
  })

  it('replaces ids in paths', () => {
    expect(view('https://rondje.test/follow/0f8b3c1e-2a4d-4e5f-9a8b-1c2d3e4f5a6b')?.url).toBe('https://rondje.test/follow/:id')
    expect(view('https://rondje.test/dogs')?.url).toBe('https://rondje.test/dogs')
  })

  it('skips anything that is not a URL', () => {
    expect(view('not a url')).toBeNull()
  })
})
