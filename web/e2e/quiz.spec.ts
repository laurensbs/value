import { expect, request, test } from '@playwright/test'
import { QUIZ } from '../src/lib/quiz'
import { addDog, newPerson, onboard, passQuiz, signUp, smallTargets, soonSlot, unique } from './helpers'

test('the safety quiz comes first: right after signing up, calmly, and before any request', async ({ browser }) => {
  test.setTimeout(180_000)
  const id = unique()

  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  // An owner does not do the quiz to put a dog online.
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Bo')
  const dogUrl = new URL(owner.page.url()).pathname
  const dogId = dogUrl.split('/').pop()!

  // --- A new walker: straight from the start to the quiz ---
  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Noor', email: `noor-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2002-02-02', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, quiz: false })
  await expect(walker.page).toHaveURL(/\/profile\/quiz\?next=%2F%3Fwelcome%3D1$/)
  await expect(walker.page.getByRole('heading', { name: 'Veiligheidsquiz', level: 1 })).toBeVisible()
  await expect(walker.page.getByText('Nog 8 vragen')).toBeVisible()
  // No clock and no score; every option is a big tap target.
  await expect(walker.page.getByRole('timer')).toHaveCount(0)
  expect(await smallTargets(walker.page)).toEqual([])

  // A wrong answer: why it matters, the right one, and the question comes back later.
  const first = QUIZ[0]
  await walker.page.locator(`input[name="answer"][value="${(first.correct + 1) % first.options}"]`).check()
  await walker.page.getByRole('button', { name: 'Kijk na' }).click()
  const feedback = walker.page.getByRole('status').filter({ hasText: 'Niet helemaal.' })
  await expect(feedback).toBeVisible()
  await expect(feedback).toBeFocused()
  await expect(feedback).toContainText('Het goede antwoord:')
  await expect(feedback).toContainText('Deze vraag komt straks nog een keer terug.')
  await walker.page.getByRole('button', { name: 'Verder' }).click()
  await expect(walker.page.getByText('Nog 8 vragen')).toBeVisible()
  // With less motion the next question only fades in.
  await walker.page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await walker.page.locator('.quiz-step').evaluate((el) => getComputedStyle(el).animationName)).toBe('fade-in')
  await walker.page.emulateMedia({ reducedMotion: 'no-preference' })

  // Later is allowed: on to where Noor was going.
  await walker.page.getByRole('link', { name: 'Later doen' }).click()
  await expect(walker.page).toHaveURL(/\/\?welcome=1$/)

  // The app cannot go around it: a request without the quiz is refused, with the reason.
  const app = await request.newContext({ baseURL: new URL(walker.page.url()).origin, extraHTTPHeaders: { 'x-forwarded-for': `10.253.${Math.floor(Math.random() * 250)}.1` } })
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email: `noor-${id}@e2e.test`, password: 'wandelen-123' } })
  const bearer = { Authorization: `Bearer ${signIn.headers()['set-auth-token']}`, 'Accept-Language': 'nl-NL' }
  const slot = soonSlot()
  const refused = await app.post('/api/v1/requests', { data: { dogId, kind: 'meet', date: slot.date, time: slot.time, message: '' }, headers: bearer })
  expect(refused.status()).toBe(400)
  expect(await refused.json()).toEqual({ error: 'needs-quiz', message: 'Haal eerst de veiligheidsquiz.' })
  await app.dispose()

  // --- On the dog's page: one button to the quiz instead of the form, and back again afterwards ---
  await walker.page.goto(dogUrl)
  const plan = walker.page.locator('#plan')
  await expect(plan).toContainText('Voordat je een kennismaking aanvraagt, doe je een korte veiligheidsquiz. Daarna kom je hier terug bij Bo.')
  await expect(walker.page.getByRole('button', { name: 'Verstuur aanvraag' })).toHaveCount(0)
  await plan.getByRole('link', { name: 'Eerst de quiz (± 3 min)' }).click()
  await expect(walker.page).toHaveURL(/\/profile\/quiz\?next=/)
  await passQuiz(walker.page)
  await expect(walker.page).toHaveURL(new RegExp(`${dogUrl}#plan$`))
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(walker.page.getByRole('heading', { name: 'Verstuurd naar Ans.' })).toBeVisible()

  await owner.context.close()
  await walker.context.close()
})
