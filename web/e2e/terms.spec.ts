import { expect, request, test } from '@playwright/test'
import { addDog, newPerson, onboard, shot, signUp, soonSlot, unique } from './helpers'

/** A moment after the new terms take effect (TERMS_EFFECTIVE_AT, 9 November 2026, in Amsterdam). */
const AFTER = '2026-11-10T10:00:00+01:00'
const TITLE = 'De voorwaarden zijn bijgewerkt'
/** What 0.4 changes, and what 0.3 changed before it (content/legal/nl/terms-changes.md). */
const NEW = 8
const OLDER = 6

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
  // Noor agreed to version 0.2, as if she signed up before the terms changed twice (a test server only).
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
  // She skipped a version: what 0.4 changes first, then what 0.3 changed, each with its own sentence.
  await expect(notice.getByRole('listitem')).toHaveCount(NEW + OLDER)
  await expect(notice.getByText(/^Versie 0\.4 van de algemene voorwaarden vervangt versie 0\.3/)).toBeVisible()
  await expect(notice.getByText('Accepteerde je een versie van vóór 0.3? Dan verandert er ook dit, uit versie 0.3:')).toBeVisible()
  await expect(notice.getByRole('listitem').first()).toContainText('Live locatie kan aan of uit staan.')
  await expect(notice.getByRole('listitem').nth(NEW)).toHaveText('Rondje Mee wordt aangeboden door Laurens Bos, de maker van Rondje Mee. Je bereikt ons via hetzelfde contactadres als eerst (artikel 1).')
  // Honest about what is not new, and about what was not checked.
  await expect(notice.getByRole('listitem').nth(NEW + 1)).toContainText('Zo werkt Rondje Mee al sinds 2 oktober 2026')
  await expect(notice.getByRole('listitem').nth(NEW - 1)).toHaveText('De voorwaarden en het veiligheidsprotocol zijn nog een concept: een jurist heeft ze nog niet nagekeken.')
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
  expect(me).toMatchObject({ termsVersion: '0.4', termsAccepted: false, termsRequired: false, termsEffectiveAt: '2026-11-08T23:00:00.000Z' })
  expect(me.termsChanges).toMatchObject({ version: '0.4', from: '0.2', title: 'Wat er verandert in de voorwaarden', url: '/legal/terms' })
  expect(me.termsChanges.intro).toMatch(/^Versie 0\.4 van de algemene voorwaarden vervangt de versie die je eerder accepteerde\./)
  expect(me.termsChanges.items).toHaveLength(NEW + OLDER)
  expect(me.termsChanges.sections.map((part: { version: string; items: string[] }) => [part.version, part.items.length])).toEqual([
    ['0.4', NEW],
    ['0.3', OLDER],
  ])

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
  await expect(step.getByRole('listitem')).toHaveCount(NEW + OLDER)
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
  // An app that still shows the list of 0.3 (or older) cannot say yes to 0.4 with it.
  for (const version of ['0.2', '0.3']) {
    const stale = await app.post('/api/v1/terms/accept', { data: { version }, headers: bearer })
    expect(stale.status()).toBe(409)
    expect(await stale.json()).toEqual({ error: 'terms-changed', message: 'De voorwaarden zijn intussen opnieuw bijgewerkt. Kijk even naar de nieuwste versie.' })
  }
  expect((await (await app.get('/api/v1/me', { headers: bearer })).json()).termsAccepted).toBe(false)
  const agreed = await app.post('/api/v1/terms/accept', { data: { version: '0.4' }, headers: bearer })
  expect(agreed.status()).toBe(200)
  const body = await agreed.json()
  expect(body).toMatchObject({ ok: true, termsVersion: '0.4' })
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
  await expect(due.getByRole('listitem')).toHaveCount(NEW + OLDER)
  await expect(due.getByRole('button', { name: 'Akkoord' })).toBeVisible()

  // --- Agreed to 0.3 (everyone who signed up or said yes on 5 October): only what 0.4 changes ---
  await walker.context.setExtraHTTPHeaders({})
  expect((await walker.page.request.post('/api/test/terms-version', { data: { version: '0.3' } })).ok()).toBe(true)
  await walker.page.goto('/profile/terms')
  const since03 = walker.page.getByRole('region', { name: TITLE })
  await expect(since03.getByRole('listitem')).toHaveCount(NEW)
  await expect(since03.getByText(/^Versie 0\.4 van de algemene voorwaarden vervangt versie 0\.3/)).toBeVisible()
  await expect(since03).not.toContainText('Accepteerde je een versie van vóór 0.3?')
  await expect(since03).not.toContainText('Laurens Bos')
  await expect(since03.getByRole('listitem').nth(2)).toContainText('Met een hond van een opvang wandel je nooit alleen.')
  await expect(since03.getByRole('listitem').nth(4)).toContainText('Er stond dat je in de app voor "hond ontsnapt" kon kiezen, maar die knop is er niet')
  await shot(walker.page, 'terms-since-03')
  const me03 = await (await app.get('/api/v1/me', { headers: bearer })).json()
  expect(me03).toMatchObject({ termsVersion: '0.4', termsAccepted: false, termsRequired: false })
  expect(me03.termsChanges).toMatchObject({ version: '0.4', from: '0.3' })
  expect(me03.termsChanges.intro).toMatch(/^Versie 0\.4 van de algemene voorwaarden vervangt versie 0\.3/)
  expect(me03.termsChanges.items).toHaveLength(NEW)
  expect((await (await app.get('/api/v1/me', { headers: { ...bearer, 'x-rondje-now': AFTER } })).json()).termsRequired).toBe(true)
  expect((await app.post('/api/v1/terms/accept', { data: { version: '0.4' }, headers: bearer })).status()).toBe(200)
  expect(await (await app.get('/api/v1/me', { headers: bearer })).json()).toMatchObject({ termsAccepted: true, termsChanges: null })
  await app.dispose()

  await owner.context.close()
  await walker.context.close()
})

test('legal pages: terms 0.4, safety protocol 0.2, privacy 0.6 and partner terms 0.2 promise nothing the app does not do', async ({ page }) => {
  await page.goto('/legal/terms')
  const terms = page.locator('article.legal')
  await expect(terms).toContainText('Versie 0.4')
  for (const gone of [
    'zodat de live locatie werkt',
    'Alleen dan verzamelen we locatie',
    'De eigenaar of opvang ziet een live kaart met de route',
    'dan krijgt de eigenaar of opvang een melding',
    'Je kunt een vaste wekelijkse wandeling afspreken',
    'Anderen zien op je profiel onder meer je voornaam, foto en ongeveer waar je woont',
    'mag pas als de eigenaar of opvang daar in de app',
  ]) {
    await expect(terms).not.toContainText(gone)
  }
  await expect(terms).toContainText('Live locatie kan aan of uit staan.')
  await expect(terms).toContainText('Het SOS-scherm stuurt zelf niets naar de eigenaar of opvang en deelt geen locatie.')
  await expect(terms).toContainText('Wie geen lid is, ziet bij die hond alleen de hond, de woonplaats en dat er een eigenaar in de buurt is.')
  // A ban by Rondje Mee, not someone blocking you (art. 14): that is what the dog page checks.
  await expect(terms).toContainText('niet geblokkeerd door Rondje Mee')
  await expect(terms).toContainText('Een wandeling alleen met de hond kan bovendien alleen zolang live locatie aan staat (artikel 13).')
  // A shelter's dog never walks alone (setTrust, canRequestSolo), and the SOS call button needs a known number.
  await expect(terms).toContainText('Met een hond van een opvang wandel je nooit alleen')
  await expect(terms).toContainText('een knop om de eigenaar of opvang te bellen (als het nummer bekend is)')
  // Help lines stay where they were: 112 first, always.
  await expect(terms).toContainText('Bij gevaar bel je altijd eerst 112.')

  await page.goto('/legal/safety')
  const safety = page.locator('article.legal')
  await expect(safety).toContainText('Versie 0.2')
  for (const gone of [
    'Je live locatie wordt dan gedeeld met de eigenaar of opvang',
    'dan krijgt de eigenaar of opvang een melding',
    'Kies in de app voor "hond ontsnapt"',
    'Kijk op de live kaart waar de wandelaar is en of er beweging is.',
    'Rondje Mee kan iemands locatie alleen zien tijdens een actieve wandeling',
  ]) {
    await expect(safety).not.toContainText(gone)
  }
  await expect(safety).toContainText('Vertel aan de telefoon waar en wanneer je de hond voor het laatst zag.')
  await expect(safety).toContainText('Staat live locatie uit, dan is er geen kaart.')
  await expect(safety).toContainText('113 Zelfmoordpreventie')
  await shot(page, 'legal-safety-02')

  // The privacy statement says the same as terms art. 13: no promised alert when a walk runs late.
  await page.goto('/legal/privacy')
  const privacy = page.locator('article.legal')
  await expect(privacy).toContainText('Versie 0.6')
  for (const gone of ['Dan krijgt de eigenaar of opvang een melding', 'Wie met een account een hondenprofiel bekijkt', 'de eigenaar of opvang van de hond']) {
    await expect(privacy).not.toContainText(gone)
  }
  await expect(privacy).toContainText('Duurt een wandeling veel langer dan gepland, dan stuurt Rondje Mee soms een melding, maar niet altijd. Reken er dus niet op.')
  await expect(privacy).toContainText('Wie geen lid is, ziet bij die hond alleen de hond, de woonplaats en dat er een eigenaar in de buurt is.')

  // The partner terms for shelters: 0.1 was live, so 0.2; no shelter dog walks alone.
  await page.goto('/legal/shelters')
  const shelters = page.locator('article.legal')
  await expect(shelters).toContainText('Versie 0.2')
  await expect(shelters).toContainText('Een wandelaar loopt nooit alleen met een hond van de opvang.')
  for (const gone of ['De opvang geeft alleen solo-vertrouwen', 'voordat iemand alleen mag']) {
    await expect(shelters).not.toContainText(gone)
  }
})
