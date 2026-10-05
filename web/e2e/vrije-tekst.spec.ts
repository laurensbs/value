import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signUp, unique } from './helpers'

// DPIA maatregel M18: a dog's story and "what helps most" are public, also without an account. Under
// both fields a calm line says so, read out with the field (aria-describedby), and the ready sentences
// are about the dog: not about when the owner is home or how they are. At 375 px, like most owners.
const PHONE = { viewport: { width: 375, height: 812 } }
const STORY_HINT = 'Dit verhaal is voor iedereen te zien. Schrijf over de hond, niet over jezelf: geen naam, adres of tijden waarop je thuis bent.'
const NEEDS_HINT = 'Ook dit is voor iedereen te zien. Houd het bij de hond.'

test('the story field says it is public, and its ready sentences are about the dog', async ({ browser }) => {
  test.setTimeout(240_000)
  const id = unique()
  const owner = await newPerson(browser, undefined, PHONE)
  const page = owner.page
  await signUp(page, { name: 'Wilma', email: `wilma-${id}@e2e.test`, intent: 'owner' })
  await onboard(page, { birthDate: '1950-05-05', city: 'Utrecht', bio: 'Ik woon in Utrecht.', phone: '', walker: false, owner: true })

  // --- A new dog, step by step: the story step ---
  await page.goto('/my-dogs/new')
  await page.getByLabel('Naam', { exact: true }).fill('Pluk')
  const next = page.getByRole('button', { name: 'Verder' })
  // Past the name and the character to the story.
  for (let step = 0; step < 2; step++) await next.click()
  const story = page.getByLabel('Het verhaal', { exact: true })
  await expect(story).toBeVisible()
  await expect(story).toHaveAccessibleDescription(STORY_HINT)
  await expect(page.getByText(STORY_HINT)).toBeVisible()
  await expect(page.getByLabel(/Wat helpt het meest/)).toHaveAccessibleDescription(NEEDS_HINT)
  // The hint is not part of the field's name, and the page does not scroll sideways at 375 px.
  await expect(story).toHaveAccessibleName('Het verhaal')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  // The ready sentences tell about Pluk; none about work, days at home or the owner's health.
  const sentences = page.getByRole('group', { name: 'Tik om een zin toe te voegen' })
  await expect(sentences).toContainText('Pluk kan best wat meer beweging gebruiken, dus een extra rondje is welkom.')
  await expect(sentences).toContainText('Pluk vindt ons vaste blokje om wat kort, dus een extra rondje is welkom.')
  await expect(sentences).not.toContainText('Door mijn werk')
  await expect(sentences).not.toContainText('Zelf loop ik')
  await sentences.getByRole('button', { name: /Pluk kan best wat meer beweging gebruiken/ }).click()
  await expect(story).toHaveValue('Pluk kan best wat meer beweging gebruiken, dus een extra rondje is welkom.')
  // Only one sentence of that pair fits a dog: the other one goes.
  await expect(sentences).not.toContainText('Pluk vindt ons vaste blokje om')
  await shot(page, 'verhaal-hint')

  // --- Put Pluk online: past the story, the walk, where and the private part, then the promises ---
  for (let step = 0; step < 4; step++) await next.click()
  await page.getByLabel(/Ik ben verzekerd/).check()
  await page.getByLabel(/gechipt en gevaccineerd/).check()
  await page.getByRole('button', { name: 'Zet Pluk online' }).click()
  await expect(page).toHaveURL(/\/dogs\/[^/?]+\?saved=1$/)
  const dogId = new URL(page.url()).pathname.split('/').pop()!

  // --- Editing later, in the full form: the same line under the story and under "what helps most" ---
  await page.goto(`/my-dogs/${dogId}/edit`)
  await expect(page.getByLabel('Het verhaal', { exact: true })).toHaveAccessibleDescription(STORY_HINT)
  await expect(page.getByLabel(/Wat helpt het meest/)).toHaveAccessibleDescription(NEEDS_HINT)
  await expect(page.getByLabel('Het verhaal', { exact: true })).toHaveValue('Pluk kan best wat meer beweging gebruiken, dus een extra rondje is welkom.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  await owner.context.close()
})

test('the example dogs tell about the dog, not about their made-up owner', async ({ browser }) => {
  const visitor = await newPerson(browser, undefined, PHONE)
  for (const [dog, owner] of [
    ['demo-saar', 'Ans'],
    ['demo-pip', 'Henk'],
    ['demo-tess', 'Marian'],
    ['demo-bolle', 'Paul'],
    ['demo-luna', 'Carmen'],
  ]) {
    await visitor.page.goto(`/dogs/${dog}`)
    const main = visitor.page.locator('main')
    await expect(main.getByRole('heading', { name: /^Over / })).toBeVisible()
    await expect(main).not.toContainText(owner)
  }
  await visitor.context.close()
})
