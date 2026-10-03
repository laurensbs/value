import { expect, request, test } from '@playwright/test'
import { addDog, newPerson, onboard, PNG_1X1, shot, signUp, unique } from './helpers'

test('owner tells the neighbours: a ready message and a poster; a neighbour comes in through the link and plans to meet', async ({ browser }) => {
  test.setTimeout(180_000)
  const id = unique()

  // --- Ans puts Saar online, and gets a ready message for the neighbours ---
  const owner = await newPerson(browser, undefined, { permissions: ['geolocation', 'clipboard-read', 'clipboard-write'] })
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans en ik woon in Utrecht.', phone: '', walker: false, owner: true })
  await addDog(owner.page, 'Saar')
  const dogPath = new URL(owner.page.url()).pathname
  const dogId = dogPath.split('/').pop()
  const share = owner.page.getByRole('region', { name: 'Vertel je buren over Saar' })
  await expect(share).toContainText('Saar zoekt een wandelmaatje in Utrecht!')
  const message = (await share.locator('.share-message').innerText()).trim()
  const link = message.split(' ').pop() ?? ''
  // The link opens Saar's page through Ans's own invite code.
  expect(link).toMatch(new RegExp(`/r/[A-Z0-9]{6}/${dogId}$`))
  const code = link.split('/r/')[1].split('/')[0]
  await shot(owner.page, 'share-01-dog-page')

  // Shared from the phone's own menu, or with WhatsApp where there is none; copied as it is.
  const whatsapp = share.getByRole('link', { name: 'WhatsApp' })
  await expect(whatsapp.or(share.getByRole('button', { name: 'Delen', exact: true }))).toBeVisible()
  if (await whatsapp.isVisible()) expect(decodeURIComponent((await whatsapp.getAttribute('href')) ?? '')).toBe(`https://wa.me/?text=${message}`)
  await share.getByRole('button', { name: 'Kopiëren' }).click()
  await expect(share.getByRole('status')).toHaveText('Gekopieerd. Plak het waar je wilt.')
  expect(await owner.page.evaluate(() => navigator.clipboard.readText())).toBe(message)

  // A poster for the supermarket, with a QR code to the same link.
  await share.getByRole('link', { name: /Print een poster/ }).click()
  await expect(owner.page.getByRole('heading', { name: 'Poster voor Saar' })).toBeVisible()
  await expect(owner.page.getByRole('heading', { name: 'Saar zoekt een wandelmaatje' })).toBeVisible()
  await expect(owner.page.getByRole('img', { name: 'QR-code naar de pagina van Saar op Rondje' })).toBeVisible()
  await expect(owner.page.locator('.poster-url')).toHaveText(link.replace(/^https?:\/\//, ''))
  await shot(owner.page, 'share-02-poster')

  // With a photo and a few words about herself, meeting a first walker is her next step: Today points to the message.
  await owner.page.goto('/profile/edit')
  await owner.page.locator('input[type=file]').setInputFiles({ name: 'ans.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(owner.page.getByText('Andere foto')).toBeVisible()
  await owner.page.getByRole('button', { name: 'Opslaan' }).click()
  await expect(owner.page.getByText('Opgeslagen', { exact: true })).toBeVisible()
  await owner.page.goto('/')
  // Her first dog and her profile bring her to level 2, celebrated once.
  const party = owner.page.getByRole('dialog', { name: 'Level omhoog!' })
  await party.getByRole('button', { name: 'Top!' }).click()
  await expect(party).toBeHidden()
  const steps = owner.page.getByRole('region', { name: 'Je eerste stappen' })
  await expect(steps).toContainText('Wandelaars in de buurt kunnen Saar nu vinden. Vertel het ook zelf aan je buren, dan gaat het sneller.')
  // Above her dogs: how many walkers live nearby, or with only a few, a link to tell the neighbours.
  await expect(owner.page.getByRole('region', { name: 'Jouw honden' }).locator('.walkers-near')).toBeVisible()
  await shot(owner.page, 'share-03-today')
  await steps.getByRole('link', { name: 'Vertel je buren over Saar' }).click()
  await expect(owner.page).toHaveURL(new RegExp(`${dogPath}#share$`))
  await expect(share).toBeVisible()

  // --- Noor opens the link: Saar's page first, then an account, and straight back to plan a meeting ---
  const neighbour = await newPerson(browser)
  await neighbour.page.goto(new URL(link).pathname)
  await expect(neighbour.page).toHaveURL(new RegExp(`${dogPath}$`))
  await expect(neighbour.page.getByRole('heading', { name: 'Saar', exact: true })).toBeVisible()
  expect((await neighbour.context.cookies()).find((c) => c.name === 'rondje_ref')?.value).toBe(code)
  // In a chat, the link's preview says what Saar is looking for, in Ans's language whoever fetches it.
  await expect(neighbour.page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Saar zoekt een wandelmaatje')
  const preview = await (await neighbour.page.request.get(dogPath, { headers: { 'Accept-Language': 'es-ES' } })).text()
  expect(preview).toMatch(/<meta property="og:title" content="Saar zoekt een wandelmaatje"/)
  await shot(neighbour.page, 'share-04-visitor')
  await neighbour.page.getByRole('link', { name: 'Maak kennis met Saar' }).click()
  await expect(neighbour.page).toHaveURL(/\/signup\?intent=walker&next=/)
  await neighbour.page.getByLabel('Voornaam').fill('Noor')
  await neighbour.page.getByLabel('E-mailadres').fill(`noor-${id}@e2e.test`)
  await neighbour.page.getByLabel('Wachtwoord').fill('wandelen-123')
  await neighbour.page.getByRole('button', { name: 'Account maken' }).click()
  await expect(neighbour.page).toHaveURL(/\/onboarding/)
  await onboard(neighbour.page, { birthDate: '1999-02-03', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false })
  await expect(neighbour.page).toHaveURL(new RegExp(`${dogPath}#plan$`))
  await expect(neighbour.page.getByRole('button', { name: 'Verstuur aanvraag' })).toBeVisible()

  // Noor counts as Ans's invite.
  await owner.page.goto('/profile')
  await expect(owner.page.getByText('1 persoon deed mee via jouw link. Dank je!')).toBeVisible()

  // The iPhone app gets the same ready message for the owner, and none for anyone else.
  const origin = new URL(owner.page.url()).origin
  const fromApp = async (email: string, path: string) => {
    const app = await request.newContext({ baseURL: origin, extraHTTPHeaders: { 'x-forwarded-for': `10.251.${Math.floor(Math.random() * 250)}.1` } })
    const signIn = await app.post('/api/auth/sign-in/email', { data: { email, password: 'wandelen-123' } })
    const headers = { Authorization: `Bearer ${signIn.headers()['set-auth-token']}`, 'Accept-Language': 'nl-NL' }
    const body = await (await app.get(path, { headers })).json()
    await app.dispose()
    return body
  }
  const appShare = (await fromApp(`ans-${id}@e2e.test`, `/api/v1/dogs/${dogId}`)).share
  expect(appShare).toMatchObject({ url: link, message })
  // How many walkers live nearby: a number from three on (other tests add walkers), otherwise null.
  expect(appShare.walkersNearby === null || appShare.walkersNearby >= 3).toBe(true)
  expect((await fromApp(`noor-${id}@e2e.test`, `/api/v1/dogs/${dogId}`)).share).toBeNull()
  // And the same next step as on Today.
  const { steps: appSteps } = await fromApp(`ans-${id}@e2e.test`, '/api/v1/progress')
  expect(appSteps.find((s: { key: string }) => s.key === 'dogMet')).toMatchObject({ href: `${dogPath}#share`, dogId, action: 'Vertel je buren over Saar' })

  // Someone else's dog has no message to share, and its poster is not theirs to print.
  await neighbour.page.goto(dogPath)
  await expect(neighbour.page.getByRole('region', { name: /Vertel je buren/ })).toHaveCount(0)
  const poster = await neighbour.page.goto(`/my-dogs/${dogId}/poster`)
  expect(poster?.status()).toBe(404)

  await owner.context.close()
  await neighbour.context.close()
})
