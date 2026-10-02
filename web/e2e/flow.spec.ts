import { expect, request, test } from '@playwright/test'
import { newPerson, onboard, PNG_1X1, shot, signUp, soonSlot, unique } from './helpers'

test('owner and walker: meet request, accept, trust, live walk with GPS, follow along, private feedback', async ({ browser }) => {
  // The whole journey of two people, celebrations included: longer than one page test, above all on a cold dev server.
  test.setTimeout(240_000)
  const id = unique()

  // --- Owner signs up and adds a dog ---
  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await shot(owner.page, '02-onboarding')
  await onboard(owner.page, {
    birthDate: '1951-04-02',
    city: 'Utrecht',
    bio: 'Ik ben Ans, mijn knie werkt niet meer mee.',
    phone: '06 1234 5678',
    walker: false,
    owner: true,
  })
  await expect(owner.page).toHaveURL(/\/my-dogs\/new/)
  await shot(owner.page, '03-dog-form')
  await owner.page.getByLabel('Naam', { exact: true }).fill('Bello')
  await owner.page.getByLabel('Ras').fill('Beagle')
  await owner.page.getByLabel('Het verhaal').fill('Bello snuffelt graag en is dol op kinderen.')
  await owner.page.getByRole('button', { name: 'Moment toevoegen' }).click()
  await owner.page.getByLabel('Waar spreken jullie af?').fill('Aanbellen bij Ans, Oudegracht 1')
  await owner.page.getByLabel(/Ik ben verzekerd/).check()
  await owner.page.getByLabel(/gechipt en gevaccineerd/).check()
  await owner.page.getByRole('button', { name: 'Zet online' }).click()
  await expect(owner.page).toHaveURL(/\/dogs\/.+\?saved=1/)
  await expect(owner.page.getByText('Opgeslagen. Bello staat online.')).toBeVisible()
  await shot(owner.page, '04-dog-page-owner')
  const dogUrl = new URL(owner.page.url()).pathname

  // --- Walker signs up and asks to meet ---
  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Fleur', email: `fleur-${id}@e2e.test` })
  await onboard(walker.page, {
    birthDate: '2003-06-15',
    city: 'Utrecht',
    bio: 'Ik studeer in Utrecht en mis de hond van mijn ouders.',
    phone: '06 8765 4321',
    walker: true,
    owner: false,
  })
  // New walkers start on their own home: a welcome, the first steps and the dogs nearby.
  await expect(walker.page).toHaveURL(/\/\?welcome=1$/)
  // With the app's tabs (shown on phones) straight away, not only after a reload.
  await expect(walker.page.locator('nav[aria-label="App"]')).toBeAttached()
  await expect(walker.page.getByRole('heading', { name: 'Welkom bij Rondje, Fleur!' })).toBeVisible()
  await expect(walker.page.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/profile/edit')
  await shot(walker.page, '05-today-walker')
  await walker.page.goto(dogUrl)
  // Contact details stay private until the appointment is accepted.
  await expect(walker.page.getByText('Oudegracht 1')).toHaveCount(0)
  // One tap picks one of Bello's own moments. This walk has to start sooner, so it is typed in.
  const moments = walker.page.getByRole('group', { name: 'Momenten die Bello goed uitkomen' })
  await moments.getByRole('button').first().click()
  await expect(moments.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(walker.page.getByLabel('Datum')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
  const slot = soonSlot()
  await walker.page.getByLabel('Datum').fill(slot.date)
  await walker.page.getByLabel('Tijd').fill(slot.time)
  await expect(moments.getByRole('button', { pressed: true })).toHaveCount(0)
  // The message is built from ready sentences; each one is offered once and can still be edited.
  const sentences = walker.page.getByRole('group', { name: 'Tik om een zin toe te voegen' })
  await sentences.getByRole('button', { name: 'Hoi! Ik ben Fleur en ik maak graag kennis met Bello.' }).click()
  await sentences.getByRole('button', { name: 'Ik woon in de buurt.' }).click()
  await expect(walker.page.getByLabel('Bericht')).toHaveValue('Hoi! Ik ben Fleur en ik maak graag kennis met Bello. Ik woon in de buurt.')
  await expect(sentences.getByRole('button', { name: 'Ik woon in de buurt.' })).toHaveCount(0)
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await shot(walker.page, '05-request-form')
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(walker.page.getByText(/Aanvraag verstuurd/)).toBeVisible()
  await shot(walker.page, '05-request-sent')

  // --- Before deciding, the owner asks a question in the chat; no phone numbers needed yet ---
  await owner.page.goto('/requests')
  await owner.page.getByRole('link', { name: 'Chat' }).click()
  await expect(owner.page).toHaveURL(/\/chat\/[^/?]+$/)
  const requestId = owner.page.url().split('/chat/')[1]
  await expect(owner.page.getByRole('heading', { name: 'Chat over Bello' })).toBeVisible()
  // Ready messages fit the moment. A tap puts one in the box, to send as it is or to edit first.
  const ownerQuick = owner.page.getByRole('group', { name: 'Kant-en-klare berichten' })
  await expect(ownerQuick.getByRole('button', { name: 'Wat leuk dat je kennis wilt maken met Bello!' })).toBeVisible()
  await shot(owner.page, '05a-chat-ready')
  await ownerQuick.getByRole('button', { name: 'Heb je al eerder met honden gewandeld?' }).click()
  await expect(owner.page.getByLabel('Typ een bericht')).toHaveValue('Heb je al eerder met honden gewandeld?')
  await expect(ownerQuick).toHaveCount(0)
  await owner.page.getByRole('button', { name: 'Verstuur' }).click()
  await expect(owner.page.locator('.chat-bubble.mine')).toContainText('eerder met honden')
  // Sent once, it is not offered again.
  await expect(ownerQuick.getByRole('button', { name: 'Past een ander moment je ook?' })).toBeVisible()
  await expect(ownerQuick.getByRole('button', { name: 'Heb je al eerder met honden gewandeld?' })).toHaveCount(0)

  await walker.page.goto('/notifications')
  await expect(walker.page.getByText('Ans stuurde een bericht over Bello.')).toBeVisible()
  // Headless browsers refuse notifications up front, where a real browser has not asked yet. With
  // permission but no subscription in this browser, the question shows the same way.
  await walker.context.grantPermissions(['notifications'])
  await walker.page.goto('/requests')
  // Waiting for an answer is when a heads-up matters: Rondje asks once, and "Later" keeps it away.
  const ask = walker.page.getByRole('region', { name: 'Zal ik je een seintje geven?' })
  await expect(ask).toContainText('Dan weet je het meteen als er antwoord is over Bello.')
  await shot(walker.page, '05c-push-ask')
  await ask.getByRole('button', { name: 'Later' }).click()
  await expect(ask).toHaveCount(0)
  expect(await walker.page.evaluate(() => Number(localStorage.getItem('rondje.pushAsk')) > Date.now())).toBe(true)
  await walker.page.getByRole('link', { name: 'Chat' }).click()
  await expect(walker.page.getByText('Heb je al eerder met honden gewandeld?')).toBeVisible()
  await expect(walker.page.getByRole('group', { name: 'Kant-en-klare berichten' })).toContainText('Waar zullen we afspreken?')
  await walker.page.getByLabel('Typ een bericht').fill('Ja, met de pup van mijn buren!')
  await walker.page.getByRole('button', { name: 'Verstuur' }).click()
  await expect(owner.page.getByText('Ja, met de pup van mijn buren!')).toBeVisible({ timeout: 10_000 })
  await shot(owner.page, '05b-chat')

  // --- Owner accepts, sees contact details, records the ID check and allows solo walks ---
  await owner.page.goto('/requests')
  await expect(owner.page.getByText('Fleur', { exact: true }).first()).toBeVisible()
  await owner.page.getByRole('button', { name: 'Accepteren' }).click()
  await expect(owner.page.getByText('Geaccepteerd').first()).toBeVisible()
  await expect(owner.page.getByText(`fleur-${id}@e2e.test`)).toBeVisible()
  await owner.page.getByLabel(/ID in het echt gezien/).check()
  await owner.page.getByLabel(/mag zelfstandig met Bello wandelen/).check()
  await owner.page.getByRole('button', { name: 'Bevestigen' }).click()
  await expect(owner.page.getByText('Bijgewerkt.')).toBeVisible()
  // A first meeting comes with what to talk about. The ticks stay on this device.
  const ownerList = owner.page.locator('.meet-check')
  await expect(ownerList).toContainText('Kennismaken met Bello')
  await expect(ownerList).toContainText('0 van 5')
  await ownerList.getByLabel(/Bekijk het ID van Fleur in het echt/).check()
  await expect(ownerList).toContainText('1 van 5')
  await owner.page.reload()
  await expect(owner.page.locator('.meet-check')).toContainText('1 van 5')
  await expect(owner.page.locator('.meet-check').getByLabel(/Bekijk het ID van Fleur/)).toBeChecked()
  await expect(owner.page.getByRole('link', { name: 'Zet in je agenda' })).toBeVisible()
  await shot(owner.page, '06-requests-incoming')

  // --- Walker sees the owner's details and starts the walk ---
  await walker.page.goto('/requests')
  await expect(walker.page.getByText('06 1234 5678')).toBeVisible()
  await expect(walker.page.getByText(/Oudegracht 1/)).toBeVisible()
  await expect(walker.page.locator('.meet-check')).toContainText('Hoe loopt Bello aan de lijn')
  await shot(walker.page, '06b-meet-checklist')

  // The appointment goes into any calendar app, with a reminder an hour before, and only for the two of them.
  const calendarUrl = `/requests/${requestId}/calendar.ics`
  await expect(walker.page.getByRole('link', { name: 'Zet in je agenda' })).toHaveAttribute('href', calendarUrl)
  const ics = await walker.page.request.get(calendarUrl)
  expect(ics.headers()['content-type']).toContain('text/calendar')
  const calendar = await ics.text()
  expect(calendar).toContain('\r\nSUMMARY:Kennismaken met Bello\r\n')
  expect(calendar).toContain('\r\nLOCATION:Aanbellen bij Ans\\, Oudegracht 1\r\n')
  expect(calendar).toContain('DESCRIPTION:Met Ans.')
  expect(calendar).toContain('\r\nTRIGGER:-PT60M\r\n')
  const stranger = await request.newContext({ baseURL: new URL(walker.page.url()).origin })
  expect((await stranger.get(calendarUrl, { maxRedirects: 0 })).status()).toBe(307)
  await stranger.dispose()
  await walker.page.getByRole('button', { name: 'Start rondje' }).click()
  await walker.page.getByLabel('Riem en tuig zitten goed vast').check()
  await walker.page.getByLabel('Ik heb poepzakjes bij me').check()
  await walker.page.getByLabel('Mijn telefoon is opgeladen').check()
  await shot(walker.page, '07-start-checklist')
  await walker.page.getByRole('button', { name: 'Start het rondje' }).click()
  await expect(walker.page).toHaveURL(/\/walk\/[^/?]+$/)
  const walkId = walker.page.url().split('/walk/')[1]
  await expect(walker.page.getByRole('timer')).toBeVisible()

  // Walk a few hundred metres north-east.
  for (let i = 1; i <= 5; i++) {
    await walker.context.setGeolocation({ latitude: 52.0907 + i * 0.0006, longitude: 5.1214 + i * 0.0004 })
    await walker.page.waitForTimeout(4_300)
  }
  await walker.page.waitForTimeout(10_500) // the next upload

  // The walker shares a photo along the way.
  await walker.page.getByLabel('Stuur een foto').setInputFiles({ name: 'bello.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(walker.page.getByText('Foto verstuurd')).toBeVisible()
  await expect(walker.page.getByAltText('Foto van Bello tijdens het rondje')).toHaveCount(1)
  // ...and a quick walk report: two pees (one mis-tap taken back) and a drink.
  for (let i = 0; i < 3; i++) await walker.page.getByRole('button', { name: /^Plas:/ }).click()
  await walker.page.getByRole('button', { name: 'Eentje terug bij Plas' }).click()
  await walker.page.getByRole('button', { name: /^Gedronken:/ }).click()
  await expect(walker.page.getByRole('button', { name: 'Gedronken: 1' })).toBeVisible()
  await expect(walker.page.getByRole('button', { name: 'Plas: 2' })).toBeVisible()
  // The taps are saved one after the other: wait until the last one is in.
  await expect(walker.page.getByRole('region', { name: 'Rondje-rapport' })).toHaveAttribute('aria-busy', 'false')
  // Two quick taps where only the second one is lost: the first one stays, as it does for the owner.
  let careTaps = 0
  await walker.page.route(/\/walk\//, async (route) => {
    const tap = route.request().method() === 'POST' && route.request().postData()?.includes('"pee"')
    if (!tap) return route.continue()
    careTaps += 1
    if (careTaps === 2) return route.abort()
    await new Promise((resolve) => setTimeout(resolve, 500)) // still on its way during the second tap
    return route.continue()
  })
  await walker.page.getByRole('button', { name: /^Plas:/ }).click()
  await walker.page.getByRole('button', { name: 'Eentje terug bij Plas' }).click()
  await expect(walker.page.getByRole('region', { name: 'Rondje-rapport' })).toHaveAttribute('aria-busy', 'false')
  await expect(walker.page.getByRole('button', { name: 'Plas: 3' })).toBeVisible()
  await walker.page.unroute(/\/walk\//)
  await walker.page.getByRole('button', { name: 'Eentje terug bij Plas' }).click()
  await expect(walker.page.getByRole('button', { name: 'Plas: 2' })).toBeVisible()
  await expect(walker.page.getByRole('region', { name: 'Rondje-rapport' })).toHaveAttribute('aria-busy', 'false')
  // Out of range, a tap is taken back with a short note, so the walker never sees more than the owner.
  await walker.context.setOffline(true)
  await walker.page.getByRole('button', { name: /^Poep:/ }).click()
  await expect(walker.page.getByText(/Niet opgeslagen: geen verbinding/)).toBeVisible()
  await expect(walker.page.getByRole('button', { name: 'Poep: 0' })).toBeVisible()
  await walker.context.setOffline(false)

  // The native app reaches the same report through the bearer-only JSON API; a cookie alone is refused.
  const care = `/api/v1/walks/${walkId}/care`
  expect((await walker.page.request.post(care, { data: { kind: 'poo', delta: 1 } })).status()).toBe(401)
  const app = await request.newContext({ baseURL: new URL(walker.page.url()).origin }) // no cookies, like the iOS app
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email: `fleur-${id}@e2e.test`, password: 'wandelen-123' } })
  const token = signIn.headers()['set-auth-token']
  expect(token).toBeTruthy()
  const bearer = { Authorization: `Bearer ${token}` }
  expect(await (await app.post(care, { data: { kind: 'poo', delta: 1 }, headers: bearer })).json()).toEqual({ pee: 2, poo: 1, water: 1 })
  expect((await (await app.get(`/api/v1/walks/${walkId}/photos`, { headers: bearer })).json()).photos).toHaveLength(1)
  const chatUrl = `/api/v1/requests/${requestId}/messages`
  const sent = await app.post(chatUrl, { data: { body: 'Bello doet het super!' }, headers: bearer })
  expect((await sent.json()).chat.body).toBe('Bello doet het super!')
  // Talk of money is flagged, from the app too; the owner sees a warning under it.
  const money = await app.post(chatUrl, { data: { body: 'Zal ik €10 overmaken voor de koekjes?' }, headers: bearer })
  expect((await money.json()).chat.flags).toContain('money')
  const thread = await (await app.get(chatUrl, { headers: bearer })).json()
  expect(thread.messages).toHaveLength(4)
  // On a first meeting the owner walks along: no ready messages, and no meeting list during the walk.
  expect(thread.suggestions).toEqual([])
  expect((await (await app.get(`${chatUrl}?after=${Date.now() - 60_000}`, { headers: bearer })).json()).suggestions).toBeUndefined()
  expect((await (await app.get('/api/v1/requests', { headers: bearer })).json()).outgoing[0].checklist).toBeNull()
  // Notifications come with a ready text and the page they lead to.
  const notes = (await (await app.get('/api/v1/notifications', { headers: bearer })).json()).notifications
  expect(notes[0]).toMatchObject({ text: expect.stringMatching(/\w/), href: expect.stringMatching(/^\//) })
  // Reminders can be switched off on their own, without touching the profile.
  expect((await app.patch('/api/v1/profile', { data: { reminders: false }, headers: bearer })).status()).toBe(200)
  expect((await (await app.get('/api/v1/me', { headers: bearer })).json()).profile.reminders).toBe(false)
  expect((await app.patch('/api/v1/profile', { data: { reminders: true }, headers: bearer })).status()).toBe(200)
  // The iPhone app registers its push token; anything that isn't one is refused.
  expect((await app.post('/api/v1/devices', { data: { token: 'a'.repeat(64), sandbox: true }, headers: bearer })).status()).toBe(200)
  expect((await app.post('/api/v1/devices', { data: { token: 'not-a-token' }, headers: bearer })).status()).toBe(400)
  await app.dispose()
  await owner.page.goto(`/chat/${requestId}`)
  await expect(owner.page.getByRole('note').filter({ hasText: 'Rondje is gratis' })).toBeVisible()
  await shot(owner.page, '07b-chat-warning')

  // --- Owner follows along live ---
  await owner.page.goto(`/follow/${walkId}`)
  await expect(owner.page.getByText(/Je ziet waar Fleur met Bello loopt/)).toBeVisible()
  await expect(owner.page.getByText(/Laatste locatie/)).toBeVisible()
  await expect(owner.page.locator('path.route-line')).toHaveCount(1)
  await expect(owner.page.getByRole('link', { name: /Bel Fleur/ })).toBeVisible()
  await expect(owner.page.getByAltText('Foto van Bello tijdens het rondje')).toHaveCount(1)
  await expect(owner.page.getByRole('region', { name: 'Rondje-rapport' })).toContainText('2× Plas')
  await expect(owner.page.getByRole('region', { name: 'Rondje-rapport' })).toContainText('1× Poep')
  await shot(owner.page, '09-follow')
  await shot(walker.page, '08-walk')
  await walker.page.getByRole('button', { name: 'Hulp nodig' }).click()
  await shot(walker.page, '08b-sos')
  await walker.page.keyboard.press('Escape')

  // --- Walker ends the walk and gives private feedback ---
  await walker.page.getByRole('button', { name: 'Rondje klaar' }).click()
  await walker.page.getByRole('button', { name: 'Ja, rondje klaar' }).click()
  await expect(walker.page).toHaveURL(/ended=1/)
  // The first walk: a level up and the first badge, celebrated once.
  const party = walker.page.getByRole('dialog', { name: 'Level omhoog!' })
  await expect(party).toBeVisible()
  await expect(party.getByText('Eerste rondje')).toBeVisible()
  await shot(walker.page, '10a-celebration')
  await party.getByRole('button', { name: 'Top!' }).click()
  await expect(party).toBeHidden()
  await expect(walker.page.getByRole('heading', { name: 'Rondje met Bello' })).toBeVisible()
  // A walk, the walk report and a photo for the owner.
  await expect(walker.page.getByText('+35 punten')).toBeVisible()
  await expect(walker.page.getByText(/Bello en jij: Net kennisgemaakt/)).toBeVisible()
  await expect(walker.page.getByRole('link', { name: 'Plan nog een rondje met Bello' })).toHaveAttribute('href', /#plan$/)
  await expect(walker.page.getByText(/Bello liep .* met je mee/)).toBeVisible()
  await expect(walker.page.getByRole('region', { name: 'Rondje-rapport' })).toContainText('1× Gedronken')
  await expect(walker.page.getByAltText('Foto van Bello tijdens het rondje')).toHaveCount(1)
  await shot(walker.page, '10-summary')
  await walker.page.getByRole('radio', { name: 'Top' }).click()
  await walker.page.getByLabel('Makkelijk').check()
  await walker.page.getByRole('group', { name: /ophalen en terugbrengen/ }).getByLabel('Ja').check()
  await walker.page.getByRole('group', { name: /Voelde je je veilig/ }).getByLabel('Ja').check()
  await walker.page.getByRole('button', { name: 'Verstuur' }).click()
  await expect(walker.page.getByText(/Dank je. Als er iets is/)).toBeVisible()

  // --- The owner's live page turns into the summary with their own feedback form ---
  // Bello's first walk brings the owner to level 2 as well.
  await expect(owner.page.getByRole('dialog', { name: 'Level omhoog!' })).toBeVisible({ timeout: 20_000 })
  await owner.page.getByRole('button', { name: 'Top!' }).click()
  await expect(owner.page.getByRole('heading', { name: 'Rondje met Bello' })).toBeVisible()
  await expect(owner.page.getByText('+10 punten')).toBeVisible()
  await owner.page.getByLabel('Blij en moe').check()
  await owner.page.getByRole('group', { name: /op tijd terug/ }).getByLabel('Ja').check()
  await owner.page.getByRole('group', { name: /weer met deze wandelaar/ }).getByLabel('Ja').check()
  await owner.page.getByRole('button', { name: 'Verstuur' }).click()
  await expect(owner.page.getByText(/Dank je. Als er iets is/)).toBeVisible()

  // --- The walker passes the safety quiz and can now ask for a solo walk ---
  await walker.page.goto('/profile/quiz')
  const answers: Record<string, number> = { heat: 1, leash: 0, treats: 2, otherDogs: 1, escaped: 0, bite: 2, stress: 1, overdue: 0 }
  for (const [q, a] of Object.entries(answers)) await walker.page.locator(`input[name="q-${q}"][value="${a}"]`).check()
  await walker.page.getByRole('button', { name: 'Nakijken' }).click()
  await expect(walker.page.getByText(/Gehaald!/)).toBeVisible()
  await shot(walker.page, '11-quiz')
  // Home again: the celebration was seen, the first steps moved on, and the week shows the walk.
  await walker.page.goto('/')
  await expect(walker.page.getByRole('heading', { name: /Fleur/ }).first()).toBeVisible()
  const quizParty = walker.page.getByRole('dialog', { name: 'Nieuwe penning!' })
  await expect(quizParty).toBeVisible()
  await expect(quizParty.getByText('Veiligheidsquiz gehaald')).toBeVisible()
  await quizParty.getByRole('button', { name: 'Top!' }).click()
  await expect(walker.page.getByText('1 van 1 rondje').or(walker.page.getByText('Weekdoel gehaald!'))).toBeVisible()
  await shot(walker.page, '11b-today-after-walk')
  await walker.page.goto('/progress')
  await expect(walker.page.getByRole('heading', { name: 'Snuffelaar' })).toBeVisible()
  await expect(walker.page.getByText('Net kennisgemaakt')).toBeVisible()
  await shot(walker.page, '11c-progress')
  await walker.page.goto('/profile')
  await shot(walker.page, '12-profile')
  await walker.page.goto('/requests')
  await shot(walker.page, '13-requests-mine')
  // After the meeting: a thank-you is ready. Bello's owner already lets Fleur walk alone, so no need to ask.
  await walker.page.goto(`/chat/${requestId}`)
  const afterQuick = walker.page.getByRole('group', { name: 'Kant-en-klare berichten' })
  await expect(afterQuick.getByRole('button', { name: 'Dank je wel, het was een fijne kennismaking!' })).toBeVisible()
  await expect(afterQuick.getByRole('button', { name: /zelf met Bello mogen wandelen/ })).toHaveCount(0)
  await walker.page.goto('/notifications')
  await shot(walker.page, '14-notifications')
  await walker.page.goto(dogUrl)
  await walker.page.getByLabel('Zelfstandig rondje').check()
  await expect(walker.page.getByLabel(/Elke week op dit moment/)).toBeVisible()
  await expect(walker.page.getByRole('group', { name: 'Tik om een zin toe te voegen' })).toContainText('Hoi! Ik loop graag weer een rondje met Bello.')

  await owner.context.close()
  await walker.context.close()
})
