import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const dogsChanged = vi.fn()
vi.mock('@/server/newest-dogs', () => ({ dogsChanged }))

const saveDogForm = vi.fn()
vi.mock('@/server/dog-core', () => ({ saveDogForm }))

vi.mock('@/server/queries', () => ({ myDogs: vi.fn(async () => []) }))

vi.mock('@/server/api', () => ({
  apiMember: vi.fn(async () => ({ userId: 'fleur' })),
  dogLook: vi.fn(),
  fail: (error: string) => NextResponse.json({ ok: false, error }, { status: 400 }),
  json: (body: unknown, status = 200) => NextResponse.json(body, { status }),
}))

const { POST } = await import('./route')

const post = () =>
  POST(new Request('http://localhost/api/v1/my-dogs', { method: 'POST', body: JSON.stringify({ name: 'Saar' }), headers: { 'content-type': 'application/json' } }))

describe('POST /api/v1/my-dogs', () => {
  beforeEach(() => {
    dogsChanged.mockClear()
    saveDogForm.mockReset()
  })

  it('refreshes the newest dogs on the home page after a dog is saved from the app', async () => {
    saveDogForm.mockResolvedValue({ ok: true, dogId: 'saar' })
    const res = await post()
    expect(res.status).toBe(201)
    expect(dogsChanged).toHaveBeenCalledTimes(1)
  })

  it('leaves the home page alone when saving fails', async () => {
    saveDogForm.mockResolvedValue({ ok: false, error: 'invalid' })
    const res = await post()
    expect(res.status).toBe(400)
    expect(dogsChanged).not.toHaveBeenCalled()
  })
})
