import { expect, test, type Page } from '@playwright/test'
import { QUIZ } from '../src/lib/quiz'
import { newPerson, onboard, shot, smallTargets, unique } from './helpers'

/** The answer buttons of the card on screen. */
const answer = (page: Page, name: string | RegExp) => page.locator('.lesson-card').getByRole('button', { name })
const next = (page: Page) => page.getByRole('button', { name: 'Verder', exact: true })

test('Hondenschool: lesson 1 without an account, a miss comes back at the end, and after signing up it counts', async ({ browser }) => {
  test.setTimeout(240_000)
  const id = unique()
  const guest = await newPerson(browser)
  const page = guest.page
  await page.setViewportSize({ width: 390, height: 844 })

  // --- The path, signed out ---
  await page.goto('/school')
  await expect(page.getByRole('heading', { name: 'Hondenschool', level: 1 })).toBeVisible()
  await expect(page.getByText('De eerste les kan zonder account.')).toBeVisible()
  await expect(page.getByText('0 van 5 lessen')).toBeVisible()
  await expect(page.getByText('Geen punten en geen haast: in je eigen tempo, zo vaak je wilt.')).toBeVisible()
  expect(await smallTargets(page)).toEqual([])
  await shot(page, 'school-path')
  await page.getByRole('link', { name: 'Hoi zeggen, les 1 van 5, volgende' }).click()
  await expect(page).toHaveURL(/\/school\/hello$/)

  // --- Lesson 1: one idea per card, big answers, no clock and no score ---
  await expect(page.getByRole('heading', { name: 'Hoi zeggen', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Aan een hond stel je je voor met je hand/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Niet nu' })).toHaveAttribute('href', '/school')
  await expect(page.getByRole('timer')).toHaveCount(0)
  await next(page).click()

  await expect(page.getByRole('heading', { name: 'Je ziet Bobbie voor het eerst. Wat doe je?' })).toBeFocused()
  for (const option of await page.locator('.lesson-option').all()) expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(52)
  const progress = page.getByRole('progressbar')
  const before = await progress.getAttribute('aria-valuenow')
  // A wrong answer: one kind sentence why, the right one, and the question comes back. The bar does not go back.
  await answer(page, 'Meteen over zijn kop aaien').click()
  const why = page.getByRole('status')
  await expect(why).toBeFocused()
  await expect(why).toContainText('Een hand van boven voelt voor een hond als iets groots dat op hem afkomt.')
  await expect(why).toContainText('Het goede antwoord: Hand laag houden en laten snuffelen')
  await expect(why).toContainText('Deze vraag komt aan het eind van de les nog een keer.')
  await expect(progress).toHaveAttribute('aria-valuenow', before!)
  await expect(answer(page, 'Hand laag houden en laten snuffelen')).toBeDisabled()
  expect(await smallTargets(page)).toEqual([])
  await shot(page, 'school-lesson-miss')
  await next(page).click()

  await expect(page.getByRole('heading', { name: /Vraag altijd eerst de eigenaar/ })).toBeVisible()
  // With less motion the next card only fades in.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await next(page).click()
  expect(await page.locator('.lesson-card').evaluate((el) => getComputedStyle(el).animationName)).toBe('fade-in')
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  await answer(page, 'Even genoeg, geef hem ruimte').click()
  await expect(page.getByRole('status')).toContainText('Goed gezien. Luisteren naar een hond is de helft van het werk.')
  expect(Number(await progress.getAttribute('aria-valuenow'))).toBeGreaterThan(Number(before))
  await next(page).click()

  // The missed question is back, at the end.
  await expect(page.getByRole('heading', { name: 'Je ziet Bobbie voor het eerst. Wat doe je?' })).toBeVisible()
  await answer(page, 'Hand laag houden en laten snuffelen').click()
  await expect(page.getByRole('status')).toContainText('Precies! Zo weet hij wie je bent.')
  await next(page).click()

  // --- The end: no points, and what an account adds, without "bewaar" or "kwijt" ---
  await expect(page.getByRole('heading', { name: 'Les klaar!' })).toBeFocused()
  await expect(page.getByText('1 van 5 lessen klaar')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wil je verder?' })).toBeVisible()
  await expect(page.getByText('Met een account kun je de quiz doen en een hond vragen.')).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/bewaar|kwijt|punten|streak/i)
  expect(await smallTargets(page)).toEqual([])
  await shot(page, 'school-lesson-done-guest')

  // Kept in this browser: after a reload lesson 1 is done, and lesson 2 is next.
  await page.goto('/school')
  await expect(page.getByText('1 van 5 lessen')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Hoi zeggen, les 1 van 5, klaar' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lichaamstaal, les 2 van 5, volgende' })).toBeVisible()
  // Lesson 2 asks for an account, calmly.
  await page.goto('/school/body')
  await expect(page.getByRole('heading', { name: 'Wil je verder?' })).toBeVisible()
  await expect(page.locator('.lesson-option')).toHaveCount(0)

  // --- An account: lesson 1 comes along ---
  await page.goto('/school')
  await page.getByRole('link', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/signup\?intent=walker&next=%2Fschool$/)
  const email = `school-${id}@e2e.test`
  await page.getByLabel('Voornaam').fill('Noor')
  await page.getByLabel('E-mailadres').fill(email)
  await page.getByLabel('Wachtwoord').fill('wandelen-123')
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/onboarding/)
  await onboard(page, { birthDate: '2002-02-02', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, next: true })
  // Walkers do the quiz first, then they are back on the path, with lesson 1 done.
  await expect(page).toHaveURL(/\/school$/)
  await expect(page.getByRole('link', { name: 'Hoi zeggen, les 1 van 5, klaar' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Veiligheidsquiz, gehaald' })).toBeVisible()
  // Stored with the account, not only in this browser: gone from localStorage once saved.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rondje.lessons'))).toBeNull()

  // --- In another browser, signed in: still done (lesson_progress) ---
  const other = await newPerson(browser)
  await other.page.setViewportSize({ width: 390, height: 844 })
  await other.page.goto('/login?next=%2Fschool')
  await other.page.getByLabel('E-mailadres').fill(email)
  await other.page.getByLabel('Wachtwoord').fill('wandelen-123')
  await other.page.getByRole('button', { name: 'Inloggen', exact: true }).click()
  await other.page.waitForURL((url) => url.pathname === '/school')
  await expect(other.page.getByText('1 van 5 lessen')).toBeVisible()
  await expect(other.page.getByRole('link', { name: 'Hoi zeggen, les 1 van 5, klaar' })).toBeVisible()
  await other.page.goto('/profile')
  await expect(other.page.getByRole('link', { name: /Hondenschool.*1 van 5 lessen, in je eigen tempo/ })).toBeVisible()

  // --- The hand on the pavement works from the keyboard too (no one can be made to hold for 7 s) ---
  await other.page.goto('/school/weather')
  const hold = other.page.getByRole('button', { name: /Houd vast/ })
  await hold.focus()
  await other.page.keyboard.press('Enter')
  await expect(other.page.getByRole('status')).toContainText('Te heet voor je hand? Dan ook voor zijn pootjes.')

  // --- A miss in the quiz points to the lesson that teaches it, and back ---
  await other.page.goto('/profile/quiz')
  await expect(other.page.getByText('De quiz leert je de regels; de eigenaar beslist of je alleen mag.')).toBeVisible()
  // Eight paws, one per question, like the app; no clock.
  await expect(other.page.locator('.quiz-paws > span')).toHaveCount(8)
  await expect(other.page.getByRole('timer')).toHaveCount(0)
  // Three right, the fourth missed: its explanation links to the lesson that teaches it.
  const quiz = other.page
  for (const q of QUIZ.slice(0, 3)) {
    await quiz.locator(`input[name="answer"][value="${q.correct}"]`).check()
    await quiz.getByRole('button', { name: 'Kijk na' }).click()
    await quiz.getByRole('button', { name: 'Verder' }).click()
  }
  const fourth = QUIZ[3]
  await quiz.locator(`input[name="answer"][value="${(fourth.correct + 1) % fourth.options}"]`).check()
  await quiz.getByRole('button', { name: 'Kijk na' }).click()
  await expect(quiz.getByText('Nog 5 vragen')).toBeVisible()
  await expect(quiz.locator('.quiz-paws > .is-right')).toHaveCount(3)
  const toLesson = quiz.getByRole('link', { name: 'Lees de les ‘Als er iets gebeurt’' })
  await toLesson.click()
  await expect(quiz).toHaveURL(/\/school\/help\?back=%2Fprofile%2Fquiz$/)
  await quiz.getByRole('link', { name: 'Niet nu' }).click()
  await expect(quiz).toHaveURL(/\/profile\/quiz$/)
  // Back where it was: the fourth question with its explanation, three paws green, not question 1 again.
  const where = async () => {
    await expect(quiz.getByText('Nog 5 vragen')).toBeVisible()
    await expect(quiz.locator('.quiz-paws > .is-right')).toHaveCount(3)
    await expect(quiz.getByRole('status').filter({ hasText: 'Niet helemaal.' })).toBeVisible()
    await expect(quiz.locator('legend')).toHaveText(/Een andere hond komt op jullie af/)
  }
  await where()
  // Also after a reload of the page (sessionStorage, this tab only).
  await quiz.reload()
  await where()
  await quiz.getByRole('button', { name: 'Verder' }).click()
  await expect(quiz.locator('legend')).toHaveText(/De hond is losgeschoten/)
  // The rest right, the missed one last: passed, and the next visit starts at the beginning.
  for (const q of [...QUIZ.slice(4), fourth]) {
    await quiz.locator(`input[name="answer"][value="${q.correct}"]`).check()
    await quiz.getByRole('button', { name: 'Kijk na' }).click()
    await quiz.getByRole('button', { name: 'Verder' }).click()
  }
  await expect(quiz.getByRole('heading', { name: 'Gehaald!' })).toBeVisible()
  await expect.poll(() => quiz.evaluate(() => sessionStorage.getItem('rondje.quiz'))).toBeNull()
  await quiz.goto('/profile/quiz')
  await expect(quiz.getByText('Nog 8 vragen')).toBeVisible()

  await guest.context.close()
  await other.context.close()
})
