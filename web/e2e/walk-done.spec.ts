import { expect, test, type Browser, type Page } from '@playwright/test'
import { addDog, newPerson, onboard, signUp, smallTargets, soonSlot, unique } from './helpers'

/** Owner puts Bello online, the walker asks to meet, the owner accepts, and the walker starts the walk. */
async function walkerOnAWalk(browser: Browser, id: string) {
  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Ans', email: `ans-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Bello')
  const dogUrl = new URL(owner.page.url()).pathname

  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Fleur', email: `fleur-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2000-05-05', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '06 9876 5432', walker: true, owner: false })
  await walker.page.goto(dogUrl)
  const slot = soonSlot()
  // Typed in after the page settled: one of Bello's own moments would otherwise pick another day.
  await expect(async () => {
    await walker.page.getByLabel('Datum').fill(slot.date)
    await walker.page.getByLabel('Tijd').fill(slot.time)
    await expect(walker.page.getByLabel('Datum')).toHaveValue(slot.date, { timeout: 1000 })
    await expect(walker.page.getByLabel('Tijd')).toHaveValue(slot.time, { timeout: 1000 })
  }).toPass()
  await walker.page.getByLabel('Bericht').fill('Hoi! Ik maak graag kennis met Bello.')
  // The request form's chips (kind of walk) are big enough to tap.
  expect(await smallTargets(walker.page)).toEqual([])
  await walker.page.getByLabel(/Ik houd me aan de/).check()
  await walker.page.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await expect(walker.page.getByRole('heading', { name: 'Verstuurd naar Ans.' })).toBeVisible()

  await owner.page.goto('/requests')
  await expect(owner.page.getByRole('button', { name: 'Accepteren' })).toBeVisible()
  expect(await smallTargets(owner.page)).toEqual([])
  await owner.page.getByRole('button', { name: 'Accepteren' }).click()
  await expect(owner.page.getByText('Afgesproken', { exact: true }).first()).toBeVisible()

  await walker.page.goto('/requests')
  await walker.page.getByRole('button', { name: 'Start rondje' }).click()
  // The checklist before the walk: every row is one big tap target.
  await expect(walker.page.getByLabel('Riem en tuig zitten goed vast')).toBeVisible()
  // Bags and treats are the owner's: the walker is not asked about them.
  await expect(walker.page.getByLabel(/poepzakjes/)).toHaveCount(0)
  expect(await smallTargets(walker.page)).toEqual([])
  await walker.page.getByLabel('Riem en tuig zitten goed vast').check()
  await walker.page.getByLabel('Mijn telefoon is opgeladen').check()
  await walker.page.getByRole('button', { name: 'Start het rondje' }).click()
  await expect(walker.page.getByRole('timer')).toBeVisible()
  return { owner, walker }
}

async function endWalk(page: Page) {
  await page.getByRole('button', { name: 'Rondje klaar' }).click()
  await page.getByRole('button', { name: 'Ja, rondje klaar' }).click()
}

test('after a walk with a new level: first "Goed rondje!", the level only after "Klaar"', async ({ browser }) => {
  test.setTimeout(180_000)
  const { owner, walker } = await walkerOnAWalk(browser, unique())
  const page = walker.page
  await endWalk(page)

  // "Goed rondje!" comes first, on its own: no party on top of it, and no second head telling the same.
  await expect(page.getByRole('heading', { name: 'Goed rondje!', level: 1 })).toBeVisible()
  // A walk of a few metres thanks without a number, never "0 m".
  await expect(page.getByText('Bello en jij zijn samen op pad geweest. Dank je wel.')).toBeVisible()
  await expect(page.getByText(/liepen 0 m/)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Rondje met Bello' })).toHaveCount(0)
  // Wait out the whole moment (0.9 s and more): the level still doesn't jump in by itself.
  await page.waitForTimeout(2_000)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.confetti')).toHaveCount(0)
  // Everything to tap here, the faces and the feedback chips below included, is at least 44 px high.
  expect(await smallTargets(page)).toEqual([])

  // Only when the walker moves on: one party, the one with the paws (like the iPhone app).
  await page.getByRole('button', { name: 'Klaar', exact: true }).click()
  const party = page.getByRole('dialog', { name: 'Level omhoog!' })
  await expect(party).toBeVisible()
  await expect(party.getByText('Eerste rondje')).toBeVisible()
  await expect(page.locator('.level-up-paw').first()).toBeAttached()
  expect(await smallTargets(page)).toEqual([])
  await party.getByRole('button', { name: 'Verder' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/')
  // Seen once: home doesn't celebrate the same level again.
  await expect(page.getByRole('heading', { name: /Fleur/ }).first()).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Level omhoog!' })).toHaveCount(0)

  // Browser back brings the old screen back from the cache: no second party for a level already seen.
  await page.goBack()
  await expect(page).toHaveURL(/\/walk\//)
  const klaar = page.getByRole('button', { name: 'Klaar', exact: true })
  if (await klaar.isVisible()) {
    await klaar.click()
    await expect(page).toHaveURL((url) => url.pathname === '/')
  }
  await page.waitForTimeout(1_000)
  await expect(page.getByRole('dialog', { name: 'Level omhoog!' })).toHaveCount(0)

  await owner.context.close()
  await walker.context.close()
})

test('leaving "Goed rondje!" without "Klaar": the level comes with paws, never confetti', async ({ browser }) => {
  test.setTimeout(180_000)
  const { owner, walker } = await walkerOnAWalk(browser, unique())
  const page = walker.page
  await endWalk(page)
  await expect(page.getByRole('heading', { name: 'Goed rondje!', level: 1 })).toBeVisible()

  // Not "Klaar", but straight home through the logo: the one party on the web is still LevelUp.
  await page.getByRole('banner').locator('a[href="/"]').first().click()
  await expect(page).toHaveURL((url) => url.pathname === '/')
  const party = page.getByRole('dialog', { name: 'Level omhoog!' })
  await expect(party).toBeVisible()
  await expect(page.locator('.level-up-paw').first()).toBeAttached()
  await expect(page.locator('.confetti')).toHaveCount(0)
  await party.getByRole('button', { name: 'Verder' }).click()
  await expect(party).toHaveCount(0)
  // Seen once: the progress page doesn't celebrate it again.
  await page.goto('/progress')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await owner.context.close()
  await walker.context.close()
})
