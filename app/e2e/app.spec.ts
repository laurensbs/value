import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  test.info().annotations.push({ type: 'errors', description: '' })
  ;(page as unknown as { __errors: string[] }).__errors = errors
})

test.afterEach(async ({ page }) => {
  expect((page as unknown as { __errors: string[] }).__errors).toEqual([])
})

test('opens with dogs nearby and never scrolls sideways', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Wie gaat er vandaag mee/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Honden' }).getByRole('listitem')).toHaveCount(8)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})

test('plans a first meeting and walks it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Noor/ }).click()
  await page.getByRole('button', { name: 'Maak kennis met Noor' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Ja', { exact: true }).click()
  for (const box of await dialog.getByRole('checkbox').all()) await box.check({ force: true })
  await dialog.getByRole('button', { name: 'Ik doe mee' }).click()
  await dialog.getByRole('button', { name: 'Verstuur aanvraag' }).click()
  await dialog.getByRole('button', { name: 'Naar mijn rondjes' }).click()

  const noor = page.locator('.planned', { hasText: 'Noor' })
  await expect(noor).toContainText('Kennismaking')
  await noor.getByRole('button', { name: /Start rondje/ }).click()
  await page.getByRole('radio', { name: /Oké/ }).click()
  await page.getByRole('button', { name: 'Rondje klaar' }).click()
  await page.getByRole('radio', { name: /Top/ }).click()
  await page.getByRole('button', { name: 'Bewaar in mijn rondjes' }).click()
  await expect(page.locator('.buddies')).toContainText('Noor')
})

test('keeps help one tap away', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Even niet oké?' }).click()
  await expect(page.getByRole('heading', { name: '113 Zelfmoordpreventie' })).toBeVisible()
  await expect(page.getByText('0800-0113')).toBeVisible()
})
