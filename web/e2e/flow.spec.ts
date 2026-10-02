import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signUp, soonSlot, unique } from './helpers'

test('owner and walker: meet request, accept, trust, live walk with GPS, follow along, private feedback', async ({ browser }) => {
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
  await expect(walker.page).toHaveURL(/\/dogs/)
  await walker.page.goto(dogUrl)
  // Contact details stay private until the appointment is accepted.
  await expect(walker.page.getByText('Oudegracht 1')).toHaveCount(0)
  const slot = soonSlot()
  await walker.page.getByLabel('Datum').fill(slot.date)
  await walker.page.getByLabel('Tijd').fill(slot.time)
  await walker.page.getByLabel('Bericht').fill('Hoi Ans! Ik ben Fleur en loop graag een rondje met Bello.')
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(walker.page.getByText(/Aanvraag verstuurd/)).toBeVisible()
  await shot(walker.page, '05-request-sent')

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
  await shot(owner.page, '06-requests-incoming')

  // --- Walker sees the owner's details and starts the walk ---
  await walker.page.goto('/requests')
  await expect(walker.page.getByText('06 1234 5678')).toBeVisible()
  await expect(walker.page.getByText(/Oudegracht 1/)).toBeVisible()
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

  // --- Owner follows along live ---
  await owner.page.goto(`/follow/${walkId}`)
  await expect(owner.page.getByText(/Je ziet waar Fleur met Bello loopt/)).toBeVisible()
  await expect(owner.page.getByText(/Laatste locatie/)).toBeVisible()
  await expect(owner.page.locator('path.route-line')).toHaveCount(1)
  await expect(owner.page.getByRole('link', { name: /Bel Fleur/ })).toBeVisible()
  await shot(owner.page, '09-follow')
  await shot(walker.page, '08-walk')
  await walker.page.getByRole('button', { name: 'Hulp nodig' }).click()
  await shot(walker.page, '08b-sos')
  await walker.page.keyboard.press('Escape')

  // --- Walker ends the walk and gives private feedback ---
  await walker.page.getByRole('button', { name: 'Rondje klaar' }).click()
  await walker.page.getByRole('button', { name: 'Ja, rondje klaar' }).click()
  await expect(walker.page).toHaveURL(/ended=1/)
  await expect(walker.page.getByRole('heading', { name: 'Rondje met Bello' })).toBeVisible()
  await expect(walker.page.getByText(/Bello liep .* met je mee/)).toBeVisible()
  await shot(walker.page, '10-summary')
  await walker.page.getByRole('radio', { name: 'Top' }).click()
  await walker.page.getByLabel('Makkelijk').check()
  await walker.page.getByRole('group', { name: /ophalen en terugbrengen/ }).getByLabel('Ja').check()
  await walker.page.getByRole('group', { name: /Voelde je je veilig/ }).getByLabel('Ja').check()
  await walker.page.getByRole('button', { name: 'Verstuur' }).click()
  await expect(walker.page.getByText(/Dank je. Als er iets is/)).toBeVisible()

  // --- The owner's live page turns into the summary with their own feedback form ---
  await expect(owner.page.getByRole('heading', { name: 'Rondje met Bello' })).toBeVisible({ timeout: 20_000 })
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
  await walker.page.goto('/profile')
  await shot(walker.page, '12-profile')
  await walker.page.goto('/requests')
  await shot(walker.page, '13-requests-mine')
  await walker.page.goto('/notifications')
  await shot(walker.page, '14-notifications')
  await walker.page.goto(dogUrl)
  await walker.page.getByLabel('Zelfstandig rondje').check()
  await expect(walker.page.getByLabel(/Elke week op dit moment/)).toBeVisible()

  await owner.context.close()
  await walker.context.close()
})
