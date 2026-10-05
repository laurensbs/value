import { expect, request, test, type APIRequestContext } from '@playwright/test'
import { addDog, newPerson, onboard, shot, signUp, soonSlot, unique } from './helpers'

/** Switches live location off for one browser or app, as LIVE_LOCATION=0 does for everyone (test server only). */
const OFF = { 'x-rondje-live-location': 'off' }

async function appFor(origin: string, email: string): Promise<{ app: APIRequestContext; bearer: Record<string, string> }> {
  const app = await request.newContext({ baseURL: origin, extraHTTPHeaders: { 'x-forwarded-for': `10.248.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}` } })
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email, password: 'wandelen-123' } })
  return { app, bearer: { Authorization: `Bearer ${signIn.headers()['set-auth-token']}`, 'Accept-Language': 'nl-NL' } }
}

test('live location switched off: a first meeting starts without a map, a walk alone with the dog does not start', async ({ browser }) => {
  test.setTimeout(240_000)
  const id = unique()

  const owner = await newPerson(browser, undefined, { extraHTTPHeaders: OFF })
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Bello')
  const dogId = new URL(owner.page.url()).pathname.split('/').pop()!

  const walker = await newPerson(browser, undefined, { extraHTTPHeaders: OFF })
  await signUp(walker.page, { name: 'Fleur', email: `fleur-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2000-05-05', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '06 9876 5432', walker: true, owner: false })

  const origin = new URL(walker.page.url()).origin
  const fleur = await appFor(origin, `fleur-${id}@e2e.test`)
  const ans = await appFor(origin, `ans-${id}@e2e.test`)

  // The apps read the switch from the config.
  expect((await (await fleur.app.get('/api/v1/config', { headers: OFF })).json()).features).toEqual({ liveLocation: false })
  expect((await (await fleur.app.get('/api/v1/config')).json()).features).toEqual({ liveLocation: true })

  // --- A first meeting, with Ans there: it starts, without GPS and without a map ---
  const slot = soonSlot()
  const asked = await fleur.app.post('/api/v1/requests', { data: { dogId, kind: 'meet', meetVia: 'walk', date: slot.date, time: slot.time, message: 'Hoi!' }, headers: fleur.bearer })
  expect(asked.status()).toBe(201)
  const incoming = async () => (await (await ans.app.get('/api/v1/requests', { headers: ans.bearer })).json()).incoming as { id: string; kind: string; status: string; walker: { id: string } }[]
  const meet = (await incoming()).find((r) => r.kind === 'meet' && r.status === 'pending')!
  expect((await ans.app.post(`/api/v1/requests/${meet.id}`, { data: { action: 'accept' }, headers: ans.bearer })).ok()).toBe(true)

  await walker.page.goto('/requests')
  await walker.page.getByRole('button', { name: 'Start rondje' }).click()
  await expect(walker.page.getByText('Live locatie staat op dit moment uit: je telefoon deelt tijdens dit rondje geen locatie.')).toBeVisible()
  await expect(walker.page.getByText(/deelt je telefoon je locatie met de eigenaar/)).toHaveCount(0)
  await walker.page.getByLabel('Riem en tuig zitten goed vast').check()
  await walker.page.getByLabel('Mijn telefoon is opgeladen').check()
  await walker.page.getByRole('button', { name: 'Start het rondje' }).click()
  await expect(walker.page.getByRole('timer')).toBeVisible()
  const walkId = new URL(walker.page.url()).pathname.split('/').pop()!
  await expect(walker.page.getByText('Live locatie staat op dit moment uit. Je route wordt niet bijgehouden of gedeeld')).toBeVisible()
  await expect(walker.page.locator('.map')).toHaveCount(0)
  await expect(walker.page.locator('.live-label')).toHaveCount(0)
  await expect(walker.page.getByText('Wachten op de eerste locatie…')).toHaveCount(0)
  // The report and SOS work as always.
  await expect(walker.page.getByRole('button', { name: /Plas/ }).first()).toBeVisible()
  await expect(walker.page.getByRole('button', { name: 'Hulp nodig' })).toBeVisible()
  await shot(walker.page, 'live-off-walker')

  // The server stores no location: the same point is refused while it is off, and taken when it is on.
  const point = { points: [{ lat: 52.0907, lng: 5.1214, accuracy: 10, t: Date.now() }] }
  const refused = await walker.page.request.post(`/api/walks/${walkId}/points`, { data: point })
  expect(refused.status()).toBe(403)
  expect((await refused.json()).error).toBe('live-location-off')
  const taken = await walker.page.request.post(`/api/walks/${walkId}/points`, { data: point, headers: { 'x-rondje-live-location': 'on' } })
  expect(await taken.json()).toMatchObject({ status: 'active', accepted: 1 })
  expect((await (await walker.page.request.get(`/api/walks/${walkId}/live`)).json()).liveLocation).toBe(false)

  // Ans follows without a map, and reads why.
  await owner.page.goto(`/follow/${walkId}`)
  await expect(owner.page.getByText('Live locatie staat op dit moment uit, dus hier staat geen kaart.')).toBeVisible()
  await expect(owner.page.locator('.map')).toHaveCount(0)
  await expect(owner.page.locator('.live-label')).toHaveCount(0)
  await shot(owner.page, 'live-off-owner')

  // Ending the walk works as always.
  await walker.page.getByRole('button', { name: 'Rondje klaar' }).click()
  await walker.page.getByRole('button', { name: 'Ja, rondje klaar' }).click()
  await expect(walker.page.getByRole('heading', { name: 'Goed rondje!', level: 1 })).toBeVisible()

  // --- A walk alone with Bello: agreed, but it does not start while live location is off ---
  const trust = await ans.app.post(`/api/v1/requests/${meet.id}`, {
    data: { action: 'trust', dogId, walkerId: meet.walker.id, idSeen: true, soloAllowed: true },
    headers: ans.bearer,
  })
  expect(trust.ok()).toBe(true)
  const solo = soonSlot()
  expect((await fleur.app.post('/api/v1/requests', { data: { dogId, kind: 'solo', date: solo.date, time: solo.time, message: '' }, headers: fleur.bearer })).status()).toBe(201)
  const soloRequest = (await incoming()).find((r) => r.kind === 'solo' && r.status === 'pending')!
  expect((await ans.app.post(`/api/v1/requests/${soloRequest.id}`, { data: { action: 'accept' }, headers: ans.bearer })).ok()).toBe(true)

  await walker.page.goto('/requests')
  await expect(walker.page.getByRole('button', { name: 'Start rondje' })).toBeDisabled()
  await shot(walker.page, 'live-off-solo')
  await expect(
    walker.page.getByText('Live locatie staat op dit moment uit, en zonder live locatie start een rondje alleen met de hond niet. Een kennismaking, samen met de eigenaar, kan wel.'),
  ).toBeVisible()

  const notNow = await fleur.app.post('/api/v1/walks', { data: { requestId: soloRequest.id }, headers: { ...fleur.bearer, ...OFF } })
  expect(notNow.status()).toBe(400)
  expect(await notNow.json()).toEqual({
    error: 'live-location-off',
    message: 'Live locatie staat op dit moment uit, en zonder live locatie start een rondje alleen met de hond niet. Een kennismaking, samen met de eigenaar, kan wel.',
  })
  // With live location on again, the same walk starts, and ends.
  const started = await fleur.app.post('/api/v1/walks', { data: { requestId: soloRequest.id }, headers: fleur.bearer })
  expect(started.status()).toBe(201)
  const { walkId: soloWalk } = await started.json()
  expect((await fleur.app.post(`/api/v1/walks/${soloWalk}/end`, { headers: { ...fleur.bearer, ...OFF } })).ok()).toBe(true)

  await fleur.app.dispose()
  await ans.app.dispose()
  await owner.context.close()
  await walker.context.close()
})
