import { describe, expect, it } from 'vitest'
import { isListable, newestDogs, type NewestDogRow } from './newest-dogs'

const row = (id: string, over: Partial<NewestDogRow> = {}): NewestDogRow => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  breed: '',
  city: 'Tiel',
  country: 'NL',
  photos: [],
  avatar: null,
  energy: 'medium',
  walkMinutes: 30,
  status: 'active',
  isDemo: false,
  orgId: null,
  orgStatus: null,
  orgIsDemo: null,
  createdAt: '2026-10-01T10:00:00Z',
  ...over,
})

describe('newest dogs on the home page', () => {
  it('never an example dog, a paused, hidden or adopted dog, a draft, or a dog of an unverified or example shelter', () => {
    expect(isListable(row('bello'))).toBe(true)
    expect(isListable(row('noor', { isDemo: true }))).toBe(false)
    for (const status of ['paused', 'hidden', 'adopted', 'draft']) expect(isListable(row('pip', { status })), status).toBe(false)
    expect(isListable(row('naamloos', { name: ' ' }))).toBe(false)
    expect(isListable(row('max', { orgId: 'nieuw', orgStatus: 'pending', orgIsDemo: false }))).toBe(false)
    expect(isListable(row('rex', { orgId: 'demo-olivos', orgStatus: 'verified', orgIsDemo: true }))).toBe(false)
    expect(isListable(row('luna', { orgId: 'dierenasiel', orgStatus: 'verified', orgIsDemo: false }))).toBe(true)
  })

  it('puts dogs from the Netherlands first, newest first within each country', () => {
    const list = newestDogs([
      row('lola', { country: 'ES', city: 'Madrid', createdAt: '2026-10-05T09:00:00Z' }),
      row('bello', { createdAt: '2026-10-01T09:00:00Z' }),
      row('fien', { country: 'BE', city: 'Gent', createdAt: '2026-10-04T09:00:00Z' }),
      row('guus', { city: 'Gorinchem', createdAt: '2026-10-03T09:00:00Z' }),
      row('noor', { isDemo: true, createdAt: '2026-10-06T09:00:00Z' }),
    ])
    expect(list.map((d) => d.id)).toEqual(['guus', 'bello', 'lola', 'fien'])
  })

  it('shows at most six', () => {
    const rows = Array.from({ length: 9 }, (_, i) => row(`hond${i}`, { createdAt: new Date(Date.UTC(2026, 9, 1, i)) }))
    const list = newestDogs(rows)
    expect(list).toHaveLength(6)
    expect(list[0].id).toBe('hond8')
  })

  it('carries the town and the first photo, and nothing about the exact place', () => {
    const [dog] = newestDogs([
      { ...row('bello', { photos: ['', 'https://x.public.blob.vercel-storage.com/bello.jpg'] }), lat: 51.89, lng: 5.43, meetingInfo: 'Bij de kerk' } as NewestDogRow,
    ])
    expect(dog).toEqual({
      id: 'bello',
      name: 'Bello',
      breed: '',
      city: 'Tiel',
      country: 'NL',
      photo: 'https://x.public.blob.vercel-storage.com/bello.jpg',
      avatar: null,
      energy: 'medium',
      walkMinutes: 30,
      host: 'owner',
    })
    expect(newestDogs([row('pip')])[0].photo).toBeNull()
    expect(newestDogs([row('luna', { orgId: 'asiel', orgStatus: 'verified', orgIsDemo: false })])[0].host).toBe('shelter')
  })

  it('is empty when there are only examples', () => {
    expect(newestDogs([row('noor', { isDemo: true }), row('saar', { isDemo: true })])).toEqual([])
  })
})
