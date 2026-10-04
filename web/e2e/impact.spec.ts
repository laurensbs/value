import { expect, test } from '@playwright/test'
import { newPerson, shot } from './helpers'

const APP_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 RondjeApp'

test('why it matters: home band and /waarom show checked numbers with their sources', async ({ browser }) => {
  const { context, page } = await newPerson(browser)
  await page.goto('/')
  const band = page.locator('section.im-band')
  await expect(band.getByRole('heading', { name: 'Goed voor mensen, goed voor honden', level: 2 })).toBeVisible()
  // Three or four numbers, each with a source that opens in a new tab.
  const stats = band.locator('.im-stat')
  expect(await stats.count()).toBeGreaterThanOrEqual(3)
  for (const source of await band.locator('.im-stat-source').all()) {
    await expect(source).toHaveAttribute('href', /^https:\/\//)
    await expect(source).toHaveAttribute('target', '_blank')
  }
  await expect(band.getByRole('link', { name: 'Doe mee' })).toHaveAttribute('href', '/dogs')
  await expect(band.getByRole('link', { name: 'Maak het mogelijk' })).toHaveAttribute('href', '/support')
  await band.getByRole('link', { name: /Waarom we dit doen/ }).click()

  await expect(page).toHaveURL(/\/waarom$/)
  await expect(page.getByRole('heading', { name: 'Samen naar buiten, voor mens en hond', level: 1 })).toBeVisible()
  for (const topic of ['Mensen', 'Naar buiten', 'Honden']) await expect(page.getByRole('heading', { name: topic, level: 3 })).toBeVisible()
  // Never a treatment, and help is always in view: the suicide prevention line of the visitor's country.
  await expect(page.getByText(/is geen hulpverlening en geen behandeling/)).toBeVisible()
  await expect(page.getByRole('link', { name: /113 Zelfmoordpreventie \(0800-0113\)/ })).toHaveAttribute('href', 'tel:08000113')
  await expect(page.getByRole('link', { name: /Alle hulplijnen/ })).toHaveAttribute('href', '/help?country=NL')
  // Every number on the page is listed under Bronnen, with a link.
  const sources = page.locator('.im-sources li')
  expect(await sources.count()).toBe(await page.locator('.im-stat').count())
  for (const link of await page.locator('.im-sources li a').all()) await expect(link).toHaveAttribute('href', /^https:\/\//)
  await expect(page.locator('main').getByRole('link', { name: 'Zo kun je helpen →' })).toHaveAttribute('href', '/support')
  await shot(page, '40-waarom')

  expect(await (await page.request.get('/sitemap.xml')).text()).toContain('/waarom')
  await context.close()
})

test('support page: monthly support, open about money, and an honest promise about good causes', async ({ browser }) => {
  const { context, page } = await newPerson(browser)
  await page.goto('/support')
  await expect(page.getByRole('heading', { name: 'Eerlijk over geld' })).toBeVisible()
  await expect(page.getByText(/We geven 10% van alle bijdragen door aan goede doelen/).first()).toBeVisible()
  await expect(page.getByText(/nog geen stichting en geen goed doel met ANBI-status/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lees waarom →' })).toHaveAttribute('href', '/waarom')
  await expect(page.getByText('Waarom kan ik niet steunen in de app?')).toBeVisible()
  const monthly = page.getByRole('link', { name: /Steun Rondje Mee via/ })
  if (await monthly.count()) {
    await expect(monthly).toHaveAttribute('href', /patreon\.com/)
    // No campaign link is configured in the tests, so no crowdfunding button and no progress bar.
    await expect(page.getByRole('link', { name: /Doe mee via/ })).toHaveCount(0)
    await expect(page.getByRole('progressbar')).toHaveCount(0)
  }
  await shot(page, '41-support')
  await context.close()
})

test('in the app: the numbers and the help, but nothing about money', async ({ browser }) => {
  const app = await browser.newContext({ userAgent: APP_UA })
  const page = await app.newPage()
  await page.goto('/')
  const band = page.locator('section.im-band')
  await expect(band.getByRole('heading', { name: 'Goed voor mensen, goed voor honden' })).toBeVisible()
  await expect(band.getByRole('link', { name: 'Maak het mogelijk' })).toHaveCount(0)

  await page.goto('/waarom')
  await expect(page.getByRole('heading', { name: 'Samen naar buiten, voor mens en hond', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /113 Zelfmoordpreventie/ })).toBeVisible()
  await expect(page.locator('main a[href="/support"]')).toHaveCount(0)

  await page.goto('/support')
  await expect(page.getByRole('heading', { name: 'Eerlijk over geld' })).toHaveCount(0)
  await expect(page.getByText(/Doe mee aan de crowdfunding/)).toHaveCount(0)
  await expect(page.getByText('Waarom kan ik niet steunen in de app?')).toHaveCount(0)
  await app.close()
})
