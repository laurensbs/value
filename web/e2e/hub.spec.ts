import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signInAdmin, signUp, unique } from './helpers'

test('hub: only for admins, a step earns points, a mail is filled in and the partner moves on', async ({ browser }) => {
  // Someone who is not an admin does not even see that the hub exists.
  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Sem', email: `sem-${unique()}@e2e.test` })
  await onboard(walker.page, { birthDate: '2000-02-02', city: 'Utrecht', bio: 'Ik loop graag.', phone: '', walker: true, owner: false })
  const res = await walker.page.goto('/hub')
  expect(res?.status()).toBe(404)

  const admin = await signInAdmin(browser)
  const page = admin.page

  // The hub installs as its own app.
  const manifest = await (await page.request.get('/hub/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Rondje Hub', start_url: '/hub', scope: '/hub' })

  // The launch hub moved into this hub: the admin page and the old address both lead here.
  await page.goto('/admin')
  await page.getByRole('link', { name: /^Hub/ }).click()
  await expect(page).toHaveURL(/\/hub$/)
  await page.goto('/admin/launch')
  await expect(page).toHaveURL(/\/hub$/)

  // Today: the founder level, the four things that wait on you, and the next steps. The site's own header is hidden.
  await expect(page.getByRole('heading', { name: /^Niveau \d+:/ })).toBeVisible()
  await expect(page.locator('.header')).toBeHidden()
  const waiting = page.getByRole('list', { name: 'Wacht op jou' })
  await expect(waiting.locator(':scope > li')).toHaveCount(4)
  await expect(waiting.locator(':scope > li').first()).toContainText('Kies de naam definitief')
  await expect(page.getByRole('heading', { name: 'Jouw volgende stappen' })).toBeVisible()
  await shot(page, 'hub-01-vandaag')

  // Your details go into every mail.
  await page.goto('/hub/jij')
  await page.getByLabel('Stad').fill('Utrecht')
  await page.getByLabel('Pilotwijk').fill('Lombok')
  await page.getByRole('button', { name: 'Opslaan' }).first().click()
  await expect(page.getByText(/Opgeslagen/)).toBeVisible()

  // Ticking a step of the plan gives its points straight away.
  await page.goto('/hub/plan')
  await page.locator('summary').filter({ hasText: 'Fundament' }).click()
  const step = page.getByRole('button', { name: 'Doe de merkcheck op TMview: afvinken' })
  await step.click()
  await expect(page.getByRole('button', { name: /Doe de merkcheck op TMview: gedaan/ })).toBeVisible()
  await expect(page.locator('.hub-toast').filter({ hasText: '+20' })).toBeVisible()
  await shot(page, 'hub-02-plan')

  // Claude's steps say so, and a step that ticks itself off says that too.
  await expect(page.locator('.hub-task').filter({ hasText: 'Vercel Blob' }).getByText('Claude doet dit')).toBeVisible()
  await expect(page.locator('.hub-task').filter({ hasText: 'Zet de nieuwe versie live' }).getByText('Vinkt vanzelf af', { exact: true })).toBeVisible()

  // A mail for Hulphond Nederland: filled in, nothing sent by the hub; you mark it as sent.
  await page.goto('/hub/mails?p=hulphond')
  const body = page.getByLabel('Tekst')
  await expect(body).toHaveValue(/Beste medewerker,/)
  await expect(body).toHaveValue(/Laurens|Beheer/)
  await expect(page.getByLabel('Onderwerp')).toHaveValue(/Rondje/)
  await expect(page.getByRole('link', { name: 'Open in Mail' })).toHaveAttribute('href', /^mailto:\?subject=/)
  await page.getByLabel(/Naam contactpersoon/).fill('Anna')
  await expect(body).toHaveValue(/^Beste Anna,/)
  await shot(page, 'hub-03-mail')
  await page.getByRole('button', { name: 'Verstuurd', exact: true }).click()
  await expect(page.locator('.hub-toast').filter({ hasText: /gemaild/ })).toBeVisible()
  // The first mail is a milestone, celebrated once.
  const party = page.getByRole('dialog', { name: 'Mijlpaal gehaald' })
  await expect(party).toBeVisible()
  await expect(party.getByText('Eerste mail')).toBeVisible()
  await shot(page, 'hub-03b-mijlpaal')
  await page.getByRole('button', { name: 'Verder' }).click()

  // The partner is now mailed.
  await page.goto('/hub/partners')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Hulphond Nederland' }) })
  await expect(card.getByRole('button', { name: 'Gemaild', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Nog niemand heeft ja gezegd/)).toBeVisible()
  await shot(page, 'hub-04-partners')

  // A shelter from the public list goes on your list as a goal.
  await page.getByText('Opvangen uit de lijst').click()
  await page.getByRole('button', { name: /Op mijn lijst/ }).first().click()
  await expect(page.locator('.hub-toast').filter({ hasText: /staat op je lijst/ })).toBeVisible()

  // A shelter mail comes with a call script, for when calling works better.
  await page.goto('/hub/mails?t=opvang')
  await page.getByText('Liever bellen?').click()
  await expect(page.locator('.hub-call-text')).toContainText('Spreek ik met wie de vrijwilligers coördineert?')

  // Numbers and costs render from the database.
  await page.goto('/hub/cijfers')
  await expect(page.getByRole('heading', { name: 'Hoe gaat het met Rondje?' })).toBeVisible()
  await expect(page.getByText('Van aanmelden naar vast rondje')).toBeVisible()
  await shot(page, 'hub-05-cijfers')
  await page.goto('/hub/kosten')
  await expect(page.getByText('Kosten per maand').first()).toBeVisible()
  await shot(page, 'hub-06-kosten')
  await page.goto('/hub/content')
  await expect(page.getByText('Snuffelrondje')).toBeVisible()
  await shot(page, 'hub-07-content')
})
