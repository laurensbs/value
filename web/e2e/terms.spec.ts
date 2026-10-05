import { expect, request, test } from '@playwright/test'
import { addDog, newPerson, onboard, shot, signUp, soonSlot, unique } from './helpers'

/** A moment after the new terms take effect (TERMS_EFFECTIVE_AT, 9 November 2026, in Amsterdam). */
const AFTER = '2026-11-10T10:00:00+01:00'
const TITLE = 'De voorwaarden zijn bijgewerkt'

test('changed terms: a calm notice first, and once they take effect the yes before anything new', async ({ browser }) => {
  test.setTimeout(240_000)
  const id = unique()

  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Bo')
  const dogUrl = new URL(owner.page.url()).pathname
  const dogId = dogUrl.split('/').pop()!
  // Signed up under the current terms: nothing to agree to again.
  await owner.page.goto('/')
  await expect(owner.page.locator('.today-head')).toBeVisible()
  await expect(owner.page.getByRole('region', { name: TITLE })).toHaveCount(0)

  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Noor', email: `noor-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2002-02-02', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false })
  // Noor agreed to the previous version (0.2), as if she signed up before the terms changed (a test server only).
  const back = () => walker.page.request.post('/api/test/terms-version', { data: { version: '0.2' } })
  expect((await back()).ok()).toBe(true)

  // --- Announced: nothing on Vandaag, a short card on the profile, and the list with "Akkoord" on a page of its own ---
  await walker.page.goto('/')
  await expect(walker.page.locator('.today-head')).toBeVisible()
  await expect(walker.page.getByRole('region', { name: TITLE })).toHaveCount(0)
  // Without a walk coming up, Rondjes stays quiet too until the day.
  await walker.page.goto('/requests')
  await expect(walker.page.getByRole('heading', { name: 'Rondjes', level: 1 })).toBeVisible()
  await expect(walker.page.getByRole('region', { name: TITLE })).toHaveCount(0)
  await walker.page.goto('/profile')
  const card = walker.page.getByRole('region', { name: TITLE })
  await expect(card).toContainText('De nieuwe voorwaarden gelden voor jou vanaf 9 november 2026. Vanaf dan vragen we eerst je akkoord')
  await expect(card).not.toContainText('blijft alles zoals het was')
  // No "Akkoord" without the list in view: the card leads to the page where both are.
  await expect(card.getByRole('listitem')).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'Akkoord' })).toHaveCount(0)
  const review = card.getByRole('link', { name: 'Bekijk wat er verandert' })
  await expect(review).toHaveAttribute('href', '/profile/terms?next=%2Fprofile')
  await shot(walker.page, 'terms-profile')
  await review.click()
  await expect(walker.page).toHaveURL(/\/profile\/terms\?next=%2Fprofile$/)
  const notice = walker.page.getByRole('region', { name: TITLE })
  await expect(notice.getByRole('listitem')).toHaveCount(6)
  await expect(notice.getByRole('listitem').first()).toHaveText('Rondje Mee wordt aangeboden door Laurens Bos, de maker van Rondje Mee. Je bereikt ons via hetzelfde contactadres als eerst (artikel 1).')
  // Honest about what is not new, and about what was not checked.
  await expect(notice.getByRole('listitem').nth(1)).toContainText('Zo werkt Rondje Mee al sinds 2 oktober 2026')
  await expect(notice.getByRole('listitem').last()).toContainText('De voorwaarden zijn nog een concept: een jurist heeft ze nog niet nagekeken.')
  await expect(notice).not.toContainText('hebben we nagekeken')
  await expect(notice.getByRole('link', { name: 'Lees de volledige voorwaarden' })).toHaveAttribute('href', '/legal/terms')
  await expect(notice.getByRole('button', { name: 'Akkoord' })).toBeVisible()
  await shot(walker.page, 'terms-step')
  // Asking for a meeting works as before.
  await walker.page.goto(dogUrl)
  await expect(walker.page.getByRole('button', { name: 'Verstuur aanvraag' })).toBeVisible()

  // The app hears the same from /api/v1/me.
  const app = await request.newContext({ baseURL: new URL(walker.page.url()).origin, extraHTTPHeaders: { 'x-forwarded-for': `10.249.${Math.floor(Math.random() * 250)}.1` } })
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email: `noor-${id}@e2e.test`, password: 'wandelen-123' } })
  const bearer = { Authorization: `Bearer ${signIn.headers()['set-auth-token']}`, 'Accept-Language': 'nl-NL' }
  const me = await (await app.get('/api/v1/me', { headers: bearer })).json()
  expect(me).toMatchObject({ termsVersion: '0.3', termsAccepted: false, termsRequired: false, termsEffectiveAt: '2026-11-08T23:00:00.000Z' })
  expect(me.termsChanges).toMatchObject({ version: '0.3', from: '0.2', title: 'Wat er verandert in de voorwaarden', url: '/legal/terms' })
  expect(me.termsChanges.items).toHaveLength(6)

  // --- Taken effect: a new appointment waits for the yes, in the app and on the website ---
  const later = { ...bearer, 'x-rondje-now': AFTER }
  expect((await (await app.get('/api/v1/me', { headers: later })).json()).termsRequired).toBe(true)
  const slot = soonSlot()
  const refused = await app.post('/api/v1/requests', { data: { dogId, kind: 'meet', date: slot.date, time: slot.time, message: '' }, headers: later })
  expect(refused.status()).toBe(400)
  expect(await refused.json()).toEqual({ error: 'needs-terms', message: 'Eerst graag je akkoord met de bijgewerkte voorwaarden.' })

  await walker.context.setExtraHTTPHeaders({ 'x-rondje-now': AFTER })
  await walker.page.goto(dogUrl)
  const plan = walker.page.locator('#plan')
  const step = plan.getByRole('region', { name: TITLE })
  await expect(step).toContainText('De nieuwe voorwaarden gelden sinds 9 november 2026.')
  // Here, where it is the step before asking, the changes are open right away.
  await expect(step.getByRole('listitem')).toHaveCount(6)
  await expect(walker.page.getByRole('button', { name: 'Verstuur aanvraag' })).toHaveCount(0)
  await step.scrollIntoViewIfNeeded()
  await shot(walker.page, 'terms-dog-step')
  // The same calm step, right where the form was: one "Akkoord", then the form.
  await step.getByRole('button', { name: 'Akkoord' }).click()
  await expect(walker.page.getByRole('button', { name: 'Verstuur aanvraag' })).toBeVisible()
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(walker.page.getByRole('heading', { name: 'Verstuurd naar Ans.' })).toBeVisible()
  await walker.page.goto('/profile')
  await expect(walker.page.locator('.profile-head')).toBeVisible()
  await expect(walker.page.getByRole('region', { name: TITLE })).toHaveCount(0)
  expect(await (await app.get('/api/v1/me', { headers: later })).json()).toMatchObject({ termsAccepted: true, termsRequired: false, termsChanges: null })

  // --- The step on its own page, where a button leads when something waits for the yes ---
  expect((await back()).ok()).toBe(true)
  await walker.page.goto(`/profile/terms?next=${encodeURIComponent('/group-walks')}`)
  await expect(walker.page.getByRole('heading', { name: 'Bijgewerkte voorwaarden', level: 1 })).toBeVisible()
  await walker.page.getByRole('region', { name: TITLE }).getByRole('button', { name: 'Akkoord' }).click()
  await expect(walker.page).toHaveURL(/\/group-walks$/)
  await walker.page.goto('/profile/terms')
  await expect(walker.page.getByText('Je hebt de nieuwste voorwaarden al geaccepteerd.')).toBeVisible()

  // --- The app records the yes for the version it showed ---
  expect((await back()).ok()).toBe(true)
  // The version is required: a yes must say which text it is for.
  for (const data of [{}, { version: '' }]) {
    const unsaid = await app.post('/api/v1/terms/accept', { data, headers: bearer })
    expect(unsaid.status()).toBe(400)
    expect((await unsaid.json()).error).toBe('invalid')
  }
  expect((await (await app.get('/api/v1/me', { headers: bearer })).json()).termsAccepted).toBe(false)
  const stale = await app.post('/api/v1/terms/accept', { data: { version: '0.2' }, headers: bearer })
  expect(stale.status()).toBe(409)
  expect(await stale.json()).toEqual({ error: 'terms-changed', message: 'De voorwaarden zijn intussen opnieuw bijgewerkt. Kijk even naar de nieuwste versie.' })
  expect((await (await app.get('/api/v1/me', { headers: bearer })).json()).termsAccepted).toBe(false)
  const agreed = await app.post('/api/v1/terms/accept', { data: { version: '0.3' }, headers: bearer })
  expect(agreed.status()).toBe(200)
  const body = await agreed.json()
  expect(body).toMatchObject({ ok: true, termsVersion: '0.3' })
  expect(Math.abs(Date.parse(body.termsAcceptedAt) - Date.now())).toBeLessThan(5 * 60_000)
  expect((await (await app.get('/api/v1/me', { headers: later })).json()).termsAccepted).toBe(true)

  // --- Before the day, a walker with an accepted walk coming up reads it on Rondjes, not first at the owner's door ---
  const ansApp = await request.newContext({ baseURL: new URL(walker.page.url()).origin, extraHTTPHeaders: { 'x-forwarded-for': `10.249.${Math.floor(Math.random() * 250)}.2` } })
  const ansSignIn = await ansApp.post('/api/auth/sign-in/email', { data: { email: `ans-${id}@e2e.test`, password: 'wandelen-123' } })
  const ansBearer = { Authorization: `Bearer ${ansSignIn.headers()['set-auth-token']}` }
  const asked = ((await (await ansApp.get('/api/v1/requests', { headers: ansBearer })).json()).incoming as { id: string; status: string }[]).find((r) => r.status === 'pending')!
  expect((await ansApp.post(`/api/v1/requests/${asked.id}`, { data: { action: 'accept' }, headers: ansBearer })).ok()).toBe(true)
  await ansApp.dispose()
  expect((await back()).ok()).toBe(true)
  await walker.context.setExtraHTTPHeaders({})
  await walker.page.goto('/requests')
  const ahead = walker.page.getByRole('region', { name: TITLE })
  await expect(ahead).toContainText('De nieuwe voorwaarden gelden voor jou vanaf 9 november 2026. Vanaf dan vragen we eerst je akkoord, voordat je iets nieuws afspreekt of een rondje start.')
  await expect(ahead.getByRole('button', { name: 'Akkoord' })).toHaveCount(0)
  await expect(ahead.getByRole('link', { name: 'Bekijk wat er verandert' })).toHaveAttribute('href', '/profile/terms?next=%2Frequests')
  await shot(walker.page, 'terms-requests-ahead')
  // From the day on, the step itself, right there.
  await walker.context.setExtraHTTPHeaders({ 'x-rondje-now': AFTER })
  await walker.page.goto('/requests')
  const due = walker.page.getByRole('region', { name: TITLE })
  await expect(due).toContainText('De nieuwe voorwaarden gelden sinds 9 november 2026.')
  await expect(due.getByRole('listitem')).toHaveCount(6)
  await expect(due.getByRole('button', { name: 'Akkoord' })).toBeVisible()
  await app.dispose()

  await owner.context.close()
  await walker.context.close()
})
