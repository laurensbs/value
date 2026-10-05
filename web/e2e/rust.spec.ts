import { expect, request, test } from '@playwright/test'
import { newPerson, onboard, signUp, unique } from './helpers'

// Rust in de meldingen (onderzoek "Duolingo-achtig, zonder druk" §3.4): seintjes only for who turns
// them on, no countdowns on the challenge or the week card, no badges that push the wrong way, and
// everything about notifications in one block on the profile.
test('a new walker: seintjes off, no countdowns, one block for notifications', async ({ browser }) => {
  const id = unique()
  const walker = await newPerson(browser)
  const page = walker.page
  await signUp(page, { name: 'Sanne', email: `sanne-${id}@e2e.test` })
  await onboard(page, { birthDate: '2001-02-02', city: 'Utrecht', bio: 'Ik wandel graag in het park.', phone: '', walker: true, owner: false })

  // Vandaag: one thing to do, no challenge or week card with numbers, nothing that counts down.
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Eén ding nu' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/Nog \d+ dag|voor je weekdoel|0 van \d/)

  // /progress: the challenge without "Nog # dagen" and without how many walkers; no week card before
  // the first walk; no badge for walks after dark, for more different walkers, or for inviting people.
  await page.goto('/progress')
  const challenge = page.locator('#challenge')
  await expect(challenge).toBeVisible()
  await expect(challenge).not.toContainText(/Nog \d+ dag|wandelaar/)
  await expect(page.getByRole('region', { name: 'Deze week' })).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText(/voor je weekdoel/)
  const badges = page.getByRole('region', { name: 'Penningen', exact: true })
  await expect(badges).toBeVisible()
  for (const name of ['Avondrondje', 'Vriendenkring', 'Ambassadeur']) await expect(badges).not.toContainText(name)

  // /profile: one block "Meldingen" that says what you get; extra seintjes are off for a new profile.
  await page.goto('/profile')
  const alerts = page.getByRole('region', { name: 'Meldingen', exact: true })
  await expect(alerts).toContainText('Berichten, verzoeken en afspraken krijg je altijd')
  await expect(alerts.getByRole('checkbox', { name: /^Extra seintjes/ })).not.toBeChecked()
  await expect(alerts.getByRole('checkbox', { name: /e-mail bij belangrijke meldingen/ })).toBeChecked()

  // The iPhone app can say it plans its own seintjes; the server then sends that phone none.
  const app = await request.newContext({ baseURL: new URL(page.url()).origin }) // no cookies, like the iOS app
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email: `sanne-${id}@e2e.test`, password: 'wandelen-123' } })
  const bearer = { Authorization: `Bearer ${signIn.headers()['set-auth-token']}` }
  expect((await (await app.get('/api/v1/me', { headers: bearer })).json()).profile).toMatchObject({ reminders: false, localNudges: false })
  expect((await app.patch('/api/v1/profile', { data: { localNudges: true }, headers: bearer })).status()).toBe(200)
  expect((await (await app.get('/api/v1/me', { headers: bearer })).json()).profile).toMatchObject({ reminders: false, localNudges: true })
  // The app gets the challenge without a countdown (its daysLeft is optional), so "Nog # dagen" goes there too.
  const challenges = await (await app.get('/api/v1/challenges', { headers: bearer })).json()
  expect(challenges.all).toMatchObject({ goal: expect.any(Number) })
  expect(challenges).not.toHaveProperty('daysLeft')
  await app.dispose()
  await walker.context.close()
})
