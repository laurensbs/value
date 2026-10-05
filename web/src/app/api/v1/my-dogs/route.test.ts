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
  fail: (error: string) => NextResponse.json({ error, message: 'generic' }, { status: 400 }),
  json: (body: unknown, status = 200) => NextResponse.json(body, { status }),
}))

// next-intl's request helpers, with the real messages, in the language the app asked for.
const lang = { locale: 'nl' as 'nl' | 'en' | 'es' | 'fr' }
vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl')
  const all = {
    nl: (await import('../../../../../messages/nl.json')).default,
    en: (await import('../../../../../messages/en.json')).default,
    es: (await import('../../../../../messages/es.json')).default,
    fr: (await import('../../../../../messages/fr.json')).default,
  }
  return {
    getTranslations: async (namespace?: string) => createTranslator({ locale: lang.locale, messages: all[lang.locale] as never, namespace: namespace as never }),
  }
})

const { POST } = await import('./route')

const post = (body: Record<string, unknown> = { name: 'Saar' }) =>
  POST(new Request('http://localhost/api/v1/my-dogs', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))

/** The form the route handed to saveDogForm (the same checks as the website's form). */
const sentForm = () => saveDogForm.mock.calls.at(-1)?.[1] as FormData

describe('POST /api/v1/my-dogs', () => {
  beforeEach(() => {
    dogsChanged.mockClear()
    saveDogForm.mockReset()
    lang.locale = 'nl'
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

  // DPIA maatregel M5: a dog for someone else only with the owner's yes, in the app as on the website.
  it('passes "for someone else" and the owner\'s consent on to the same check as the website', async () => {
    saveDogForm.mockResolvedValue({ ok: true, dogId: 'saar' })
    await post({ name: 'Saar', forSomeone: true, ownerConsent: true })
    expect(sentForm().get('forSomeone')).toBe('on')
    expect(sentForm().get('ownerConsent')).toBe('on')
    await post({ name: 'Saar', forSomeone: true })
    expect(sentForm().get('forSomeone')).toBe('on')
    expect(sentForm().get('ownerConsent')).toBeNull()
    // Only a real true counts: "true" as text or 1 is not a tick.
    await post({ name: 'Saar', forSomeone: true, ownerConsent: 'true' })
    expect(sentForm().get('ownerConsent')).toBeNull()
  })

  it('an app version that sends neither adds a dog of its own, as before', async () => {
    saveDogForm.mockResolvedValue({ ok: true, dogId: 'saar' })
    const res = await post({ name: 'Saar', insuranceConfirmed: true, healthConfirmed: true })
    expect(res.status).toBe(201)
    expect(sentForm().get('forSomeone')).toBeNull()
    expect(sentForm().get('ownerConsent')).toBeNull()
  })

  it('says calmly, in the language of the request, that the owner has to agree', async () => {
    saveDogForm.mockResolvedValue({ ok: false, error: 'owner-consent' })
    const nl = await post({ name: 'Saar', forSomeone: true })
    expect(nl.status).toBe(400)
    expect(await nl.json()).toEqual({ error: 'owner-consent', message: 'Vink aan dat de eigenaar ervan weet en het goed vindt.' })
    lang.locale = 'en'
    expect(await (await post({ name: 'Saar', forSomeone: true })).json()).toEqual({
      error: 'owner-consent',
      message: 'Tick the box to confirm the owner knows about it and is happy with it.',
    })
    expect(dogsChanged).not.toHaveBeenCalled()
  })

  it("uses the website form's sentence for its other refusals too, and the usual one otherwise", async () => {
    saveDogForm.mockResolvedValue({ ok: false, error: 'confirmations' })
    expect(await (await post()).json()).toEqual({ error: 'confirmations', message: 'Bevestig de verzekering en de gezondheid van je hond.' })
    saveDogForm.mockResolvedValue({ ok: false, error: 'invalid' })
    expect(await (await post()).json()).toEqual({ error: 'invalid', message: 'Controleer de verplichte velden.' })
    saveDogForm.mockResolvedValue({ ok: false, error: 'forbidden' })
    expect(await (await post()).json()).toEqual({ error: 'forbidden', message: 'Dit is niet jouw hond.' })
    saveDogForm.mockResolvedValue({ ok: false, error: 'something-new' })
    expect(await (await post()).json()).toEqual({ error: 'something-new', message: 'generic' })
  })
})
