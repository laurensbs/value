import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const listDogs = vi.fn(async () => [])
vi.mock('@/server/queries', () => ({ listDogs }))

const apiActive = vi.fn()
vi.mock('@/server/api', () => ({
  apiActive,
  dogCard: vi.fn(),
  json: (body: unknown, status = 200) => NextResponse.json(body, { status }),
}))

const { GET } = await import('./route')

const get = () => GET(new Request('http://localhost/api/v1/dogs?lat=52.09&lng=5.12'))
const profile = { country: 'NL', lat: 52.09, lng: 5.12 }

describe('GET /api/v1/dogs', () => {
  beforeEach(() => {
    listDogs.mockClear()
  })

  it('an account without a finished profile sees the list as a visitor (DPIA maatregel M4)', async () => {
    apiActive.mockResolvedValue({ userId: 'nieuw', orgs: [], profile: null })
    expect((await get()).status).toBe(200)
    expect(listDogs).toHaveBeenCalledWith(expect.objectContaining({ visitor: true, near: { lat: 52.09, lng: 5.12 } }))
  })

  it('a member sees it as before', async () => {
    apiActive.mockResolvedValue({ userId: 'fleur', orgs: [], profile })
    expect((await get()).status).toBe(200)
    expect(listDogs).toHaveBeenCalledWith(expect.objectContaining({ visitor: false, country: 'NL' }))
  })
})
