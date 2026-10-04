import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { addDog, newPerson, onboard, signUp, smallTargets, unique } from './helpers'

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
  test.setTimeout(180_000)
  const id = unique()

  const owner = await newPerson(browser)
  await listenForSounds(owner.context)
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Bello')
  const dogUrl = new URL(owner.page.url()).pathname

  const walker = await newPerson(browser)
  await listenForSounds(walker.context)
  await signUp(walker.page, { name: 'Fleur', email: `fleur-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2003-06-15', city: 'Utrecht', bio: 'Ik ben Fleur.', phone: '06 8765 4321', walker: true, owner: false })

  // --- No connection while sending: the form stays as it was, with one plain sentence under it ---
  await walker.page.goto(dogUrl)
  const plan = walker.page.locator('#plan')
  await walker.page.getByLabel('Bericht').fill('Hoi! Ik maak graag kennis met Bello.')
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.context.setOffline(true)
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(plan.getByRole('alert')).toHaveText('Dat lukte even niet. Controleer je verbinding en probeer het opnieuw.')
  await expect(walker.page.getByLabel('Bericht')).toHaveValue('Hoi! Ik maak graag kennis met Bello.')
  await expect.poll(() => sounds(walker.page)).toEqual(['error'])
  await walker.context.setOffline(false)

  // --- Sent: a confirmation in three steps, which stays until "Klaar" ---
  await clearSounds(walker.page)
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  const sent = walker.page.getByRole('region', { name: 'Verstuurd naar Ans.' })
  await expect(sent).toBeVisible()
  await expect(sent.getByRole('heading', { name: 'Verstuurd naar Ans.' })).toBeFocused()
  await expect(sent.getByRole('listitem')).toHaveText(['Ans leest je bericht.', 'Zegt Ans ja, dan zien jullie elkaars contactgegevens.', 'De eerste keer lopen jullie samen.'])
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
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(56)
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

  // --- The owner says yes: a warm line, the contact details slide in, the label turns green ---
  await owner.page.goto('/requests')
  const item = owner.page.locator('.list-item.request.incoming').first()
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

  // --- Trust: the ladder instead of "Bijgewerkt." ---
  const trust = owner.page.locator('.trust-form')
  await expect(trust.locator('.trust-steps li.done')).toHaveCount(1)
  await owner.page.getByLabel(/ID in het echt gezien/).check()
  await owner.page.getByLabel(/mag zelfstandig met Bello wandelen/).check()
  await clearSounds(owner.page)
  await owner.page.getByRole('button', { name: 'Bevestigen' }).click()
  const ladder = owner.page.getByRole('dialog', { name: 'Fleur mag nu zelfstandig met Bello op pad.' })
  await expect(ladder).toBeVisible()
  await expect(ladder.getByRole('listitem')).toHaveText(['Kennismaking: gedaan', 'ID gezien: gedaan', 'Mag zelfstandig: gedaan'])
  await expect(ladder).toContainText('Je kunt bij elk rondje live meekijken, en je kunt dit altijd weer uitzetten.')
  // Fleur has not done the safety quiz yet: the ladder says what that means, instead of promising too much.
  await expect(ladder).toContainText('Een zelfstandig rondje aanvragen kan Fleur zodra de veiligheidsquiz gehaald is.')
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

  // The walker sees the same appointment as agreed.
  await walker.page.goto('/requests')
  await expect(walker.page.locator('.list-item.request .request-status')).toHaveText('Afgesproken')

  await owner.context.close()
  await walker.context.close()
})
