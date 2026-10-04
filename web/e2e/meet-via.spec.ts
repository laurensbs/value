import { expect, test } from '@playwright/test'
import { addDog, newPerson, onboard, shot, signUp, unique } from './helpers'

test('a first meeting by phone: chosen in the form, shown everywhere, and never the meeting in person', async ({ browser }) => {
  test.setTimeout(180_000)
  const id = unique()

  // The smallest common phone width (375), so the four choices are checked where space is tightest.
  const phone = { viewport: { width: 375, height: 812 } }
  const owner = await newPerson(browser, undefined, phone)
  await signUp(owner.page, { name: 'Ria', email: `ria-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1948-02-02', city: 'Utrecht', bio: 'Ik ben Ria.', phone: '06 3333 4444', walker: false, owner: true })
  await addDog(owner.page, 'Pip')
  const dogUrl = new URL(owner.page.url()).pathname

  const walker = await newPerson(browser, undefined, phone)
  await signUp(walker.page, { name: 'Sem', email: `sem-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2002-07-07', city: 'Utrecht', bio: 'Ik ben Sem.', phone: '06 5555 6666', walker: true, owner: false })

  // Four ways to meet, walking together picked by default; a call says it does not count yet.
  await walker.page.goto(dogUrl)
  const ways = walker.page.getByRole('group', { name: 'Hoe maken jullie kennis?' })
  await expect(ways.getByRole('radio')).toHaveCount(4)
  await expect(ways.getByRole('radio', { name: /^Samen wandelen/ })).toBeChecked()
  await ways.getByRole('radio', { name: /^Bij de eigenaar thuis/ }).check()
  await expect(walker.page.getByText(/Veilig op bezoek: spreek overdag af/)).toBeVisible()
  await ways.getByRole('radio', { name: /^Eerst bellen/ }).check()
  await expect(walker.page.getByText(/Een gesprek telt nog niet als kennismaking in het echt/)).toBeVisible()
  await shot(walker.page, 'meet-01-form-phone')
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  // The confirmation says what happens next for a call: first the call, then meeting in person.
  await expect(walker.page.getByRole('heading', { name: 'Verstuurd naar Ria.' })).toBeVisible()
  await expect(walker.page.getByText('Eerst bellen jullie even. Daarna spreken jullie af in het echt.')).toBeVisible()

  // The owner hears how, and accepts. A call gives no ID check and no solo walks.
  await owner.page.goto('/notifications')
  await expect(owner.page.getByText('Sem wil eerst bellen om kennis te maken met Pip.')).toBeVisible()
  await owner.page.goto('/requests?view=incoming')
  await expect(owner.page.locator('.pill.meet-via')).toHaveText('Eerst bellen')
  await owner.page.getByRole('button', { name: 'Accepteren' }).click()
  await expect(owner.page.getByText('Afgesproken', { exact: true }).first()).toBeVisible()
  await expect(owner.page.getByText(/Het ID bekijken en zelfstandig wandelen toestaan kan pas/)).toBeVisible()
  await expect(owner.page.getByLabel(/ID in het echt gezien/)).toHaveCount(0)
  // What to talk about on the phone ends with meeting in person, not with checking the ID.
  await expect(owner.page.locator('.meet-check')).toContainText('Spreek af wanneer jullie elkaar in het echt ontmoeten')
  await expect(owner.page.locator('.meet-check')).not.toContainText('Bekijk het ID')
  await shot(owner.page, 'meet-02-requests-incoming')

  // The walker hears yes for the call, not for a walk.
  await walker.page.goto('/notifications')
  await expect(walker.page.getByText('Ja! Je belafspraak over Pip staat.')).toBeVisible()
  // The walker sees the number to call, no walk to start, and the next step: meeting in person.
  await walker.page.goto('/requests')
  await expect(walker.page.locator('.pill.meet-via')).toHaveText('Eerst bellen')
  await expect(walker.page.getByText('06 3333 4444')).toBeVisible()
  await expect(walker.page.getByRole('button', { name: 'Start rondje' })).toHaveCount(0)
  const plan = walker.page.getByRole('link', { name: 'Plan de kennismaking in het echt' })
  await expect(plan).toHaveAttribute('href', `${dogUrl}#plan`)
  await shot(walker.page, 'meet-03-requests-mine')
  // The chat says how they meet, and offers words for a call instead of for a walk.
  await walker.page.getByRole('link', { name: 'Chat' }).click()
  await expect(walker.page).toHaveURL(/\/chat\/[^/?]+$/)
  await expect(walker.page.locator('.pill.meet-via')).toHaveText('Eerst bellen')
  await expect(walker.page.getByRole('group', { name: 'Kant-en-klare berichten' })).toContainText('Bel jij mij, of zal ik jou bellen?')
  // Planning in person opens the form on walking together.
  await walker.page.goto(`${dogUrl}#plan`)
  await expect(walker.page.getByRole('group', { name: 'Hoe maken jullie kennis?' }).getByRole('radio', { name: /^Samen wandelen/ })).toBeChecked()

  await owner.context.close()
  await walker.context.close()
})
