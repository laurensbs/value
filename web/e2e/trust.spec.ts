import { expect, request, test, type BrowserContext, type Page } from '@playwright/test'
import { addDog, newPerson, onboard, signUp, smallTargets, soonSlot, unique } from './helpers'

/** Records which sounds a page plays (onderzoek §2: send, success, error), without playing them. */
async function listenForSounds(context: BrowserContext) {
  await context.addInitScript(() => {
    const w = window as unknown as { __sounds: string[] }
    w.__sounds = []
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__sounds.push(this.src.split('/').pop()!.replace('.wav', ''))
      return Promise.resolve()
    }
  })
}

const sounds = (page: Page) => page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds)
const clearSounds = (page: Page) => page.evaluate(() => void ((window as unknown as { __sounds: string[] }).__sounds.length = 0))
const animation = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).animationName)

test('trust moments: sent stays until "Klaar", accepting opens warmly, trust is a ladder', async ({ browser }) => {
  test.setTimeout(240_000)
  const id = unique()

  const owner = await newPerson(browser)
  await listenForSounds(owner.context)
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Pip')
  const pipUrl = new URL(owner.page.url()).pathname
  await addDog(owner.page, 'Bello')
  const dogUrl = new URL(owner.page.url()).pathname

  const walker = await newPerson(browser)
  await listenForSounds(walker.context)
  await signUp(walker.page, { name: 'Fleur', email: `fleur-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2003-06-15', city: 'Utrecht', bio: 'Ik ben Fleur.', phone: '06 8765 4321', walker: true, owner: false })

  // A second tab with the same form, opened before anything is sent (it goes stale below).
  const stale = await walker.context.newPage()
  await stale.goto(dogUrl)

  // --- No connection while sending: the form stays as it was, with one plain sentence under it ---
  await walker.page.goto(dogUrl)
  const plan = walker.page.locator('#plan')
  // Soon, so the walk together can start in this test: recording the ID waits for the meeting itself.
  const slot = soonSlot()
  await expect(async () => {
    await walker.page.getByLabel('Datum').fill(slot.date)
    await walker.page.getByLabel('Tijd').fill(slot.time)
    await expect(walker.page.getByLabel('Tijd')).toHaveValue(slot.time, { timeout: 1000 })
  }).toPass()
  await walker.page.getByLabel('Bericht').fill('Hoi! Ik maak graag kennis met Bello.')
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.context.setOffline(true)
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(plan.getByRole('alert')).toHaveText('Dat lukte even niet. Controleer je verbinding en probeer het opnieuw.')
  await expect(walker.page.getByLabel('Bericht')).toHaveValue('Hoi! Ik maak graag kennis met Bello.')
  await expect.poll(() => sounds(walker.page)).toEqual(['error'])
  await walker.context.setOffline(false)

  // The request arrives, but the answer gets lost on the way back: sending again is no second request.
  await walker.page.route('**/*', async (route) => {
    if (route.request().method() === 'POST' && (await route.request().headerValue('next-action'))) {
      await route.fetch()
      return route.abort()
    }
    return route.continue()
  })
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(plan.getByRole('alert')).toHaveText('Er ging iets mis aan onze kant. Probeer het zo nog eens.')
  await expect.poll(() => sounds(walker.page)).toEqual(['error', 'error'])
  await walker.page.unroute('**/*')

  // --- Sent: a confirmation in three steps, which stays until "Klaar" ---
  await clearSounds(walker.page)
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  const sent = walker.page.getByRole('region', { name: 'Verstuurd naar Ans.' })
  await expect(sent).toBeVisible()
  await expect(sent.getByRole('heading', { name: 'Verstuurd naar Ans.' })).toBeFocused()
  await expect(sent.getByRole('listitem')).toHaveText(['Ans krijgt je aanvraag.', 'Zegt Ans ja, dan zien jullie elkaars contactgegevens.', 'De eerste keer lopen jullie samen.'])
  await expect(sent).toContainText('Je krijgt een melding zodra Ans antwoordt.')
  await expect(walker.page.getByRole('link', { name: '→' })).toHaveCount(0)
  await expect.poll(() => sounds(walker.page)).toEqual(['send'])
  // The paw pops; with less motion everything only fades in.
  expect(await animation(walker.page, '.request-sent-paw')).toBe('moment-pop')
  await walker.page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await animation(walker.page, '.request-sent-paw')).toBe('fade-in')
  expect(await animation(walker.page, '.request-sent-steps li')).toBe('fade-in')
  await walker.page.emulateMedia({ reducedMotion: 'no-preference' })
  // Both buttons are full buttons of 56 px; nothing here is too small to tap.
  for (const button of [sent.getByRole('button', { name: 'Klaar' }), sent.getByRole('link', { name: 'Bekijk je afspraken' })]) {
    // Rounded: on a phone with a fractional pixel ratio (Pixel 7: 2.625) 56 px can measure 55.99997.
    expect(Math.round((await button.boundingBox())!.height)).toBeGreaterThanOrEqual(56)
  }
  expect(await smallTargets(walker.page)).toEqual([])
  // It never leaves on its own.
  await walker.page.waitForTimeout(4_000)
  await expect(sent).toBeVisible()
  await sent.getByRole('button', { name: 'Klaar' }).click()
  await expect(sent).toHaveCount(0)
  await expect(plan).toContainText('Je aanvraag voor Bello staat bij je afspraken.')
  await expect(plan.getByRole('link', { name: 'Bekijk je afspraken' })).toHaveAttribute('href', '/requests')
  // The empty form does not come back, so nobody sends a second request by accident.
  await expect(walker.page.getByRole('button', { name: 'Verstuur aanvraag' })).toHaveCount(0)

  // --- One open request per dog: the stale tab, the back button and a reload give no second one ---
  await stale.getByLabel('Tijd').fill('11:00')
  await stale.getByLabel(/Ik houd me aan de/).check()
  await stale.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  const already = stale.locator('#plan').getByRole('alert')
  await expect(already).toContainText('Je hebt al een aanvraag of afspraak met deze hond open staan.')
  await expect(already.getByRole('link', { name: 'Bekijk je afspraken' })).toHaveAttribute('href', '/requests')
  await stale.close()
  await plan.getByRole('link', { name: 'Bekijk je afspraken' }).click()
  await expect(walker.page).toHaveURL(/\/requests/)
  await walker.page.goBack()
  await expect(walker.page).toHaveURL(new RegExp(`${dogUrl}$`))
  const again = walker.page.getByRole('button', { name: 'Verstuur aanvraag' })
  const openNote = walker.page.getByText('Je aanvraag voor Bello staat al bij je afspraken. Zodra Ans antwoordt, krijg je een melding.')
  await expect(again.or(openNote)).toBeVisible()
  if (await again.isVisible()) {
    // An old copy of the page: sending it again is the same request, not a second one.
    await walker.page.getByLabel(/Ik houd me aan de/).check()
    await again.click()
    // The same request counts as sent; another moment is refused. Either way, no second request.
    await expect(walker.page.getByRole('heading', { name: 'Verstuurd naar Ans.' }).or(plan.getByRole('alert'))).toBeVisible()
  }
  await walker.page.reload()
  await expect(openNote).toBeVisible()
  await expect(again).toHaveCount(0)

  // A request for Pip as well, which Ans will say no to.
  await walker.page.goto(pipUrl)
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(walker.page.getByRole('heading', { name: 'Verstuurd naar Ans.' })).toBeVisible()

  // --- The owner says yes: a warm line, the contact details slide in, the label turns green ---
  await owner.page.goto('/requests')
  // Exactly one request for Bello, however often it was sent.
  await expect(owner.page.locator('.list-item.request.incoming').filter({ hasText: 'Bello' })).toHaveCount(1)
  // Saying no to Pip: the request leaves the list, and the focus lands on what happened.
  await owner.page.locator('.list-item.request.incoming').filter({ hasText: 'Pip' }).getByRole('button', { name: 'Afwijzen' }).click()
  const declined = owner.page.locator('.decline-note')
  await expect(declined).toHaveText('Je zei nee tegen Fleur voor Pip. Fleur krijgt een melding.')
  await expect(declined).toBeFocused()
  await expect(owner.page.locator('.list-item.request.incoming').filter({ hasText: 'Pip' })).toHaveCount(0)
  const item = owner.page.locator('.list-item.request.incoming').filter({ hasText: 'Bello' })
  const status = item.locator('.request-status')
  await expect(status).toHaveText('Wacht op antwoord')
  for (const name of ['Accepteren', 'Afwijzen']) expect((await item.getByRole('button', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(48)
  expect(await smallTargets(owner.page)).toEqual([])
  await clearSounds(owner.page)
  await item.getByRole('button', { name: 'Accepteren' }).click()
  const note = item.locator('.accept-note')
  await expect(note).toHaveText('Afgesproken met Fleur! Jullie zien nu elkaars contactgegevens, en Fleur krijgt een melding.')
  await expect(note).toBeFocused()
  await expect(status).toHaveText('Afgesproken')
  await expect(item.getByText(`fleur-${id}@e2e.test`)).toBeVisible()
  expect(await animation(owner.page, '.accept-reveal.is-new .contact')).toBe('moment-rise')
  await expect.poll(() => sounds(owner.page)).toEqual(['success'])
  expect(await smallTargets(owner.page)).toEqual([])
  // Coming back later is calm: the moment was once.
  await owner.page.reload()
  await expect(owner.page.locator('.accept-note')).toHaveCount(0)
  await expect(owner.page.locator('.list-item.request.incoming .request-status')).toHaveText('Afgesproken')

  // The walker hears yes, in a warm sentence with the dog's name.
  await walker.page.goto('/notifications')
  await expect(walker.page.getByText('Ja! Je kennismaking met Bello staat.')).toBeVisible()

  // Before the meeting the ID cannot be recorded yet: it is seen at the meeting itself.
  await expect(owner.page.getByText('Na jullie kennismaking leg je hier vast of je het ID van Fleur in het echt hebt gezien.')).toBeVisible()
  await expect(owner.page.locator('.trust-form')).toHaveCount(0)
  // They meet: Fleur and Ans start the walk together.
  await walker.page.goto('/requests')
  await walker.page.getByRole('button', { name: 'Start rondje' }).click()
  await walker.page.getByLabel('Riem en tuig zitten goed vast').check()
  await walker.page.getByLabel('Mijn telefoon is opgeladen').check()
  await walker.page.getByRole('button', { name: 'Start het rondje' }).click()
  await expect(walker.page.getByRole('timer')).toBeVisible()

  // --- Trust: the ladder instead of "Bijgewerkt." ---
  await owner.page.goto('/requests?view=incoming')
  const trust = owner.page.getByRole('region', { name: 'Na de kennismaking' }).locator('.trust-form')
  await expect(trust).toHaveCount(1)
  await expect(trust).toContainText('Fleur en Bello')
  await expect(trust.locator('.trust-steps li.done')).toHaveCount(1)
  // Walks on their own wait for the ID seen in person (besluit 4 okt).
  await expect(owner.page.getByLabel(/mag zelfstandig met Bello wandelen/)).toBeDisabled()
  await expect(trust).toContainText('Zelfstandig kan pas aan als je het ID in het echt hebt gezien.')
  await owner.page.getByLabel(/ID in het echt gezien/).check()
  await owner.page.getByLabel(/mag zelfstandig met Bello wandelen/).check()
  await clearSounds(owner.page)
  await owner.page.getByRole('button', { name: 'Bevestigen' }).click()
  const ladder = owner.page.getByRole('dialog', { name: 'Fleur mag nu zelfstandig met Bello op pad.' })
  await expect(ladder).toBeVisible()
  await expect(ladder.getByRole('listitem')).toHaveText(['Kennismaking: gedaan', 'ID gezien: gedaan', 'Mag zelfstandig: gedaan'])
  await expect(ladder).toContainText('Je kunt bij elk rondje live meekijken, en je kunt dit altijd weer uitzetten.')
  // Fleur did the safety quiz when signing up and Bello needs no experience: nothing else stands in the way.
  await expect(ladder.locator('.trust-ladder-text .muted')).toHaveCount(0)
  await expect(ladder.getByRole('button', { name: 'Klaar' })).toBeFocused()
  expect(await animation(owner.page, '.trust-ladder .trust-steps li.done .trust-step-mark')).toBe('moment-pop')
  expect(await smallTargets(owner.page)).toEqual([])
  // One success sound, after the last tick (about 600 ms), and only one.
  await expect.poll(() => sounds(owner.page)).toEqual(['success'])
  await owner.page.waitForTimeout(1_000)
  expect(await sounds(owner.page)).toEqual(['success'])
  await expect(owner.page.getByText(/Opgeslagen|Bijgewerkt/)).toHaveCount(0)
  // Escape closes it, and focus goes back to the trust form.
  await owner.page.keyboard.press('Escape')
  await expect(ladder).toHaveCount(0)
  await expect(trust.locator('.trust-form-title')).toBeFocused()
  await expect(trust.locator('.trust-steps li.done')).toHaveCount(3)
  await expect(owner.page.getByRole('button', { name: 'Bevestigen' })).toBeDisabled()

  // Taking it back is said plainly: no ladder, no sound.
  await clearSounds(owner.page)
  await owner.page.getByLabel(/mag zelfstandig met Bello wandelen/).uncheck()
  await owner.page.getByRole('button', { name: 'Bevestigen' }).click()
  await expect(trust.getByRole('status')).toHaveText('Fleur loopt niet meer zelfstandig met Bello.')
  await expect(owner.page.getByRole('dialog')).toHaveCount(0)
  await expect(trust.locator('.trust-steps li.done')).toHaveCount(2)
  await owner.page.waitForTimeout(800)
  expect(await sounds(owner.page)).toEqual([])

  // With less motion the ticks fade in one after the other; the sound stays.
  await owner.page.emulateMedia({ reducedMotion: 'reduce' })
  await owner.page.getByLabel(/mag zelfstandig met Bello wandelen/).check()
  await owner.page.getByRole('button', { name: 'Bevestigen' }).click()
  await expect(ladder).toBeVisible()
  expect(await animation(owner.page, '.trust-ladder .trust-steps li.done .trust-step-mark')).toBe('fade-in')
  await expect.poll(() => sounds(owner.page)).toEqual(['success'])
  await ladder.getByRole('button', { name: 'Klaar' }).click()
  await expect(ladder).toHaveCount(0)

  // Turning the ID off takes walks on their own with it, and says so.
  await owner.page.emulateMedia({ reducedMotion: 'no-preference' })
  await owner.page.getByLabel(/ID in het echt gezien/).uncheck()
  await expect(owner.page.getByLabel(/mag zelfstandig met Bello wandelen/)).not.toBeChecked()
  await expect(owner.page.getByLabel(/mag zelfstandig met Bello wandelen/)).toBeDisabled()
  await expect(trust).toContainText('Zonder ‘ID gezien’ kan Fleur niet zelfstandig met Bello op pad, dus dat staat dan ook uit.')
  await owner.page.getByRole('button', { name: 'Bevestigen' }).click()
  await expect(trust.getByRole('status')).toHaveText('Fleur loopt niet meer zelfstandig met Bello.')
  await expect(trust.locator('.trust-steps li.done')).toHaveCount(1)

  // The server holds the same line for the iPhone app: no solo walks without the ID, with a plain reason.
  const origin = new URL(owner.page.url()).origin
  const app = await request.newContext({ baseURL: origin, extraHTTPHeaders: { 'x-forwarded-for': `10.252.${Math.floor(Math.random() * 250)}.1` } })
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email: `ans-${id}@e2e.test`, password: 'wandelen-123' } })
  const bearer = { Authorization: `Bearer ${signIn.headers()['set-auth-token']}` }
  const incoming = (await (await app.get('/api/v1/requests', { headers: bearer })).json()).incoming as { id: string; status: string; dog: { id: string; name: string }; walker: { id: string } }[]
  const bello = incoming.find((r) => r.dog.name === 'Bello' && r.status === 'accepted')!
  const refused = await app.post(`/api/v1/requests/${bello.id}`, {
    data: { action: 'trust', dogId: bello.dog.id, walkerId: bello.walker.id, idSeen: false, soloAllowed: true },
    headers: { ...bearer, 'Accept-Language': 'nl-NL' },
  })
  expect(refused.status()).toBe(400)
  expect(await refused.json()).toEqual({ error: 'id-not-seen', message: 'Zelfstandig wandelen kan pas als je het ID van de wandelaar in het echt hebt gezien.' })
  await app.dispose()

  // The walker sees the same appointment as agreed, and earlier ones behind a big enough summary.
  await walker.page.goto('/requests')
  await expect(walker.page.locator('.list-item.request .request-status')).toHaveText('Afgesproken')
  expect(await smallTargets(walker.page)).toEqual([])

  // Signed out in the meantime: the walker hears that, with the way back in, not "try again later".
  await walker.page.goto(pipUrl)
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.context.clearCookies()
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  const signedOut = walker.page.locator('#plan').getByRole('alert')
  await expect(signedOut).toContainText('Je bent niet meer ingelogd. Log opnieuw in en probeer het dan nog eens.')
  await expect(signedOut.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', `/login?next=${encodeURIComponent(pipUrl)}`)

  await owner.context.close()
  await walker.context.close()
})
