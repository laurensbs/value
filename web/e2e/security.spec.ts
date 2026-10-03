import { expect, test, type Page } from '@playwright/test'
import { newPerson, onboard, unique } from './helpers'

// "/<tab>/example.com": browsers drop the tab, which makes it "//example.com", another site.
const TRICK = encodeURIComponent('/\t/example.com')

const onThisSite = (page: Page) => expect.poll(() => new URL(page.url()).hostname).toBe('localhost')

test('security: pages run only their own scripts', async ({ browser, request }) => {
  // Every page sends a policy with a fresh nonce, and every script on the page carries it.
  for (const path of ['/', '/dogs', '/login']) {
    const res = await request.get(path)
    const policy = res.headers()['content-security-policy'] ?? ''
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1]
    expect(nonce, path).toBeTruthy()
    expect(policy).toContain("frame-ancestors 'none'")
    const scripts = (await res.text()).match(/<script\b[^>]*>/g) ?? []
    expect(scripts.length, path).toBeGreaterThan(0)
    for (const tag of scripts) expect(tag, path).toContain(`nonce="${nonce}"`)
  }
  expect((await request.get('/')).headers()['content-security-policy']).not.toBe((await request.get('/')).headers()['content-security-policy'])

  // Markup that slips into a page cannot run code.
  const { context, page } = await newPerson(browser)
  await page.goto('/dogs')
  await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<img src="/nope.png" onerror="window.__ran = true">'))
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => Boolean((window as unknown as { __ran?: boolean }).__ran))).toBe(false)
  await context.close()
})

test('security: a link with a hidden tab never sends someone to another site', async ({ browser }) => {
  const email = `tab-${unique()}@example.com`
  const first = await newPerson(browser)
  // Signing up and finishing the start from such a link ends on Rondje.
  await first.page.goto(`/signup?next=${TRICK}`)
  await first.page.getByLabel('Voornaam').fill('Tess')
  await first.page.getByLabel('E-mailadres').fill(email)
  await first.page.getByLabel('Wachtwoord').fill('wandelen-123')
  await first.page.getByRole('button', { name: 'Account maken' }).click()
  await expect(first.page).toHaveURL(/\/onboarding/)
  await onboard(first.page, { birthDate: '1995-03-03', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false })
  await expect(first.page).not.toHaveURL(/onboarding/)
  await onThisSite(first.page)
  // Signed in already: the login link sends you on, but stays on Rondje.
  await first.page.goto(`/login?next=${TRICK}`)
  await onThisSite(first.page)
  await first.context.close()

  // Logging in from such a link.
  const second = await newPerson(browser)
  await second.page.goto(`/login?next=${TRICK}`)
  await second.page.getByLabel('E-mailadres').fill(email)
  await second.page.getByLabel('Wachtwoord').fill('wandelen-123')
  await second.page.getByRole('button', { name: 'Inloggen', exact: true }).click()
  await expect(second.page).not.toHaveURL(/\/login/)
  await onThisSite(second.page)
  await second.context.close()
})
