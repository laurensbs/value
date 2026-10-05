import { expect, request, test, type APIRequestContext } from '@playwright/test'
import { addDog, newPerson, onboard, shot, signUp, soonSlot, unique } from './helpers'

/**
 * Live location is off unless LIVE_LOCATION switches it on (lib/live-location.ts). The test server
 * switches it on (playwright.config.ts); this header switches it off again for one browser or app, so
 * both states are tested on one server (test server only).
 */
const OFF = { 'x-rondje-live-location': 'off' }
const TOGETHER = 'Jullie lopen samen, dus er is geen kaart nodig.'
const SOLO_OFF = 'Live locatie staat voorlopig uit, dus een rondje alleen met de hond start nog niet. Samen met de eigenaar lopen kan wel.'

async function appFor(origin: string, email: string): Promise<{ app: APIRequestContext; bearer: Record<string, string> }> {
  const app = await request.newContext({ baseURL: origin, extraHTTPHeaders: { 'x-forwarded-for': `10.248.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}` } })
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email, password: 'wandelen-123' } })
  return { app, bearer: { Authorization: `Bearer ${signIn.headers()['set-auth-token']}`, 'Accept-Language': 'nl-NL' } }
}

test('live location: never at a first meeting, only on a walk alone with the dog, and only while it is on', async ({ browser }) => {
  test.setTimeout(300_000)
  const id = unique()

  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Bello')
  const dogId = new URL(owner.page.url()).pathname.split('/').pop()!

  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Fleur', email: `fleur-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2000-05-05', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '06 9876 5432', walker: true, owner: false })

  const origin = new URL(walker.page.url()).origin
  const fleur = await appFor(origin, `fleur-${id}@e2e.test`)
  const ans = await appFor(origin, `ans-${id}@e2e.test`)

  // The apps read the switch from the config.
  expect((await (await fleur.app.get('/api/v1/config')).json()).features).toEqual({ liveLocation: true })
  expect((await (await fleur.app.get('/api/v1/config', { headers: OFF })).json()).features).toEqual({ liveLocation: false })

  // --- A first meeting, with live location on: Ans walks along, so no GPS and no map ---
  const slot = soonSlot()
  const asked = await fleur.app.post('/api/v1/requests', { data: { dogId, kind: 'meet', meetVia: 'walk', date: slot.date, time: slot.time, message: 'Hoi!' }, headers: fleur.bearer })
  expect(asked.status()).toBe(201)
  const incoming = async () => (await (await ans.app.get('/api/v1/requests', { headers: ans.bearer })).json()).incoming as { id: string; kind: string; status: string; walker: { id: string } }[]
  const meet = (await incoming()).find((r) => r.kind === 'meet' && r.status === 'pending')!
  expect((await ans.app.post(`/api/v1/requests/${meet.id}`, { data: { action: 'accept' }, headers: ans.bearer })).ok()).toBe(true)

  await walker.page.goto('/requests')
  await walker.page.getByRole('button', { name: 'Start rondje' }).click()
  await expect(walker.page.getByText(TOGETHER)).toBeVisible()
  await expect(walker.page.getByText(/deelt je telefoon je locatie met de eigenaar/)).toHaveCount(0)
  await walker.page.getByLabel('Riem en tuig zitten goed vast').check()
  await walker.page.getByLabel('Mijn telefoon is opgeladen').check()
  await walker.page.getByRole('button', { name: 'Start het rondje' }).click()
  await expect(walker.page.getByRole('timer')).toBeVisible()
  const walkId = new URL(walker.page.url()).pathname.split('/').pop()!
  await expect(walker.page.getByText(TOGETHER)).toBeVisible()
  await expect(walker.page.locator('.map')).toHaveCount(0)
  await expect(walker.page.locator('.live-label')).toHaveCount(0)
  await expect(walker.page.getByText('Wachten op de eerste locatie…')).toHaveCount(0)
  // The report and SOS work as always.
  await expect(walker.page.getByRole('button', { name: /Plas/ }).first()).toBeVisible()
  await expect(walker.page.getByRole('button', { name: 'Hulp nodig' })).toBeVisible()
  await shot(walker.page, 'meet-together-walker')

  // The server stores no location for a first meeting, even with the switch on, and says why.
  const point = () => ({ points: [{ lat: 52.0907, lng: 5.1214, accuracy: 10, t: Date.now() }] })
  const refused = await walker.page.request.post(`/api/walks/${walkId}/points`, { data: point() })
  expect(refused.status()).toBe(403)
  expect(await refused.json()).toEqual({ error: 'live-location-off', message: TOGETHER })
  expect(await (await walker.page.request.get(`/api/walks/${walkId}/live`)).json()).toMatchObject({ kind: 'meet', liveLocation: false, points: [] })
  // The app hears the same when it starts (or picks up) the walk.
  const resumed = await fleur.app.post('/api/v1/walks', { data: { requestId: meet.id }, headers: fleur.bearer })
  expect(resumed.status()).toBe(201)
  expect(await resumed.json()).toEqual({ walkId, liveLocation: false })

  // Ans follows without a map, and reads why.
  await owner.page.goto(`/follow/${walkId}`)
  await expect(owner.page.getByText(TOGETHER)).toBeVisible()
  await expect(owner.page.locator('.map')).toHaveCount(0)
  await expect(owner.page.locator('.live-label')).toHaveCount(0)
  await shot(owner.page, 'meet-together-owner')

  // Ending the walk works as always.
  await walker.page.getByRole('button', { name: 'Rondje klaar' }).click()
  await walker.page.getByRole('button', { name: 'Ja, rondje klaar' }).click()
  await expect(walker.page.getByRole('heading', { name: 'Goed rondje!', level: 1 })).toBeVisible()

  // --- A walk alone with Bello, while live location is off: agreed, but it does not start ---
  const trust = await ans.app.post(`/api/v1/requests/${meet.id}`, {
    data: { action: 'trust', dogId, walkerId: meet.walker.id, idSeen: true, soloAllowed: true },
    headers: ans.bearer,
  })
  expect(trust.ok()).toBe(true)
  const solo = soonSlot()
  expect((await fleur.app.post('/api/v1/requests', { data: { dogId, kind: 'solo', date: solo.date, time: solo.time, message: '' }, headers: fleur.bearer })).status()).toBe(201)
  const soloRequest = (await incoming()).find((r) => r.kind === 'solo' && r.status === 'pending')!
  expect((await ans.app.post(`/api/v1/requests/${soloRequest.id}`, { data: { action: 'accept' }, headers: ans.bearer })).ok()).toBe(true)

  await walker.page.setExtraHTTPHeaders(OFF)
  await walker.page.goto('/requests')
  await expect(walker.page.getByRole('button', { name: 'Start rondje' })).toBeDisabled()
  await expect(walker.page.getByText(SOLO_OFF)).toBeVisible()
  await shot(walker.page, 'live-off-solo')
  const notNow = await fleur.app.post('/api/v1/walks', { data: { requestId: soloRequest.id }, headers: { ...fleur.bearer, ...OFF } })
  expect(notNow.status()).toBe(400)
  expect(await notNow.json()).toEqual({ error: 'live-location-off', message: SOLO_OFF })
  await walker.page.setExtraHTTPHeaders({})

  // --- With live location on, the same walk starts, shares the route, and Ans follows it on the map ---
  await walker.page.goto('/requests')
  await walker.page.getByRole('button', { name: 'Start rondje' }).click()
  await expect(walker.page.getByText('Tijdens het rondje deelt je telefoon je locatie met de eigenaar.', { exact: false })).toBeVisible()
  await expect(walker.page.getByText(TOGETHER)).toHaveCount(0)
  await walker.page.getByLabel('Riem en tuig zitten goed vast').check()
  await walker.page.getByLabel('Mijn telefoon is opgeladen').check()
  await walker.page.getByRole('button', { name: 'Start het rondje' }).click()
  await expect(walker.page.getByRole('timer')).toBeVisible()
  const soloWalk = new URL(walker.page.url()).pathname.split('/').pop()!
  expect(soloWalk).not.toBe(walkId)
  await expect(walker.page.locator('.live-label')).toBeVisible()
  await expect(walker.page.locator('.map')).toBeVisible()
  await expect(walker.page.getByText(TOGETHER)).toHaveCount(0)
  // Walk a few hundred metres north-east; the page sends the route every ten seconds.
  for (let i = 1; i <= 3; i++) {
    await walker.context.setGeolocation({ latitude: 52.0907 + i * 0.0006, longitude: 5.1214 + i * 0.0004 })
    await walker.page.waitForTimeout(4_300)
  }
  await expect
    .poll(async () => ((await (await walker.page.request.get(`/api/walks/${soloWalk}/live`)).json()).points as unknown[]).length, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(2)
  expect(await (await walker.page.request.get(`/api/walks/${soloWalk}/live`)).json()).toMatchObject({ kind: 'solo', liveLocation: true })
  expect(await (await walker.page.request.post(`/api/walks/${soloWalk}/points`, { data: point() })).json()).toMatchObject({ status: 'active', accepted: 1 })
  expect(await (await fleur.app.post('/api/v1/walks', { data: { requestId: soloRequest.id }, headers: fleur.bearer })).json()).toEqual({ walkId: soloWalk, liveLocation: true })

  await owner.page.goto(`/follow/${soloWalk}`)
  await expect(owner.page.getByText(/Je ziet waar Fleur met Bello loopt/)).toBeVisible()
  await expect(owner.page.getByText(/Laatste locatie/)).toBeVisible()
  await expect(owner.page.locator('path.route-line')).toHaveCount(1)
  await shot(owner.page, 'solo-follow')

  // Switched off during the walk: no more points are stored, and ending works as always.
  const stopped = await walker.page.request.post(`/api/walks/${soloWalk}/points`, { data: point(), headers: OFF })
  expect(stopped.status()).toBe(403)
  expect(await stopped.json()).toEqual({ error: 'live-location-off', message: SOLO_OFF })
  expect((await (await walker.page.request.get(`/api/walks/${soloWalk}/live`, { headers: OFF })).json()).liveLocation).toBe(false)
  await walker.page.getByRole('button', { name: 'Rondje klaar' }).click()
  await walker.page.getByRole('button', { name: 'Ja, rondje klaar' }).click()
  await expect(walker.page.getByRole('heading', { name: 'Goed rondje!', level: 1 })).toBeVisible()

  await fleur.app.dispose()
  await ans.app.dispose()
  await owner.context.close()
  await walker.context.close()
})
