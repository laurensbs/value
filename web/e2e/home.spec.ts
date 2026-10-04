import { expect, test } from '@playwright/test'
import crowdfunding from '../content/crowdfunding.json'
import { campaign } from '../src/lib/support'
import { addDog, newPerson, onboard, shot, signUp, unique } from './helpers'

const APP_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 RondjeApp'
const TIEL = { latitude: 51.8866, longitude: 5.4299 }

test('home: "Help ons!" with the crowdfunding, right after the hero, never in the app', async ({ browser }) => {
  const { context, page } = await newPerson(browser)
  await page.goto('/')
  // No country badge above the hero (Laurens, 5 okt 2026): the Netherlands come first in the dogs and the copy.
  await expect(page.locator('.lp-kicker')).toHaveCount(0)
  const help = page.locator('section#help-ons')
  await expect(help.getByRole('heading', { name: 'Help ons!', level: 2 })).toBeVisible()
  // Big and early: the first section after the hero.
  await expect(page.locator('.lp > section').nth(1)).toHaveId('help-ons')
  const give = help.getByRole('link', { name: 'Geef een rondje' })
  await expect(give).toHaveAttribute('href', 'https://whydonate.com/nl/fundraising/example')
  await expect(give).toHaveAttribute('target', '_blank')
  await expect(give).toHaveAttribute('rel', /noopener/)
  await expect(help.getByRole('link', { name: /of meld je aan/ })).toHaveAttribute('href', '/aanmelden?bron=helpons')
  await expect(help.getByText(/naar Voorbeeld, die Rondje Mee bouwt/)).toBeVisible()
  // The numbers from content/crowdfunding.json, once it has a goal and an amount raised.
  const { progress } = campaign(crowdfunding)
  await expect(help.getByRole('progressbar')).toHaveCount(progress ? 1 : 0)
  if (progress) await expect(help.getByText(/rondjes/).first()).toBeVisible()
  // Warm, never pushy.
  await expect(help).not.toContainText(/nog maar|laatste kans|streak|vandaag nog|snel/i)
  await shot(page, '60-home-help')
  await context.close()

  const app = await browser.newContext({ userAgent: APP_UA })
  const inApp = await app.newPage()
  await inApp.goto('/')
  await expect(inApp.getByRole('heading', { name: 'Wat brengt je hier?' })).toBeVisible()
  await expect(inApp.locator('section#help-ons')).toHaveCount(0)
  await expect(inApp.getByRole('link', { name: 'Geef een rondje' })).toHaveCount(0)
  await expect(inApp.locator('a[href*="whydonate"]')).toHaveCount(0)
  await app.close()
})

test('home: the newest real dogs, Dutch dogs first, never an example dog', async ({ browser }) => {
  const name = `Tobi ${unique()}`
  const owner = await newPerson(browser, TIEL)
  await signUp(owner.page, { name: 'Wim', email: `wim-home-${unique()}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1949-06-12', city: 'Tiel', bio: 'Ik ben Wim.', phone: '06 2222 3333', walker: false, owner: true })
  await addDog(owner.page, name)
  await owner.context.close()

  // A visitor sees the dog straight away: adding a dog clears the cached list.
  const { context, page } = await newPerson(browser)
  await page.goto('/')
  const fresh = page.locator('section.lp-new')
  await expect(fresh.getByRole('heading', { name: 'Net aangemeld', level: 2 })).toBeVisible()
  const cards = fresh.locator('.lp-peek-list > li')
  expect(await cards.count()).toBeLessThanOrEqual(6)
  const card = fresh.getByRole('link', { name: new RegExp(name) })
  await expect(card).toBeVisible()
  // The newest Dutch dog leads, with its town and nothing more precise.
  await expect(cards.first()).toContainText(name)
  await expect(card).toContainText('Tiel')
  // The example dogs (SEED_DEMO=1 in the tests) never show here.
  await expect(fresh.locator('a[href^="/dogs/demo-"]')).toHaveCount(0)
  await expect(fresh.getByText('Voorbeeld', { exact: true })).toHaveCount(0)
  await shot(page, '62-home-new-dogs')
  await card.click()
  await expect(page).toHaveURL(/\/dogs\/[^/?]+$/)
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
  await context.close()
})

test("about: Laurens' story with his photo, the campaign on the website and the 113 line under it", async ({ browser }) => {
  const { context, page } = await newPerson(browser)
  await page.goto('/about')
  const story = page.locator('section#verhaal')
  await expect(story.getByRole('heading', { name: 'Waarom ik Rondje Mee begon', level: 2 })).toBeVisible()
  await expect(story.getByText(/Sinds mijn tiende heb ik te maken met depressie/)).toBeVisible()
  await expect(story.getByText(/Rondje Mee is geen behandeling/)).toBeVisible()
  const photo = story.getByRole('img', { name: /Laurens met zijn arm om een bruin-witte hond/ })
  await photo.scrollIntoViewIfNeeded()
  await expect(photo).toBeVisible()
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  // Under the story, always: the suicide prevention line, tap to call, and all help lines.
  await expect(story.getByRole('link', { name: /113 Zelfmoordpreventie \(0800-0113\)/ })).toHaveAttribute('href', 'tel:08000113')
  await expect(story.getByRole('link', { name: /Bekijk de hulplijnen/ })).toHaveAttribute('href', '/help?country=NL')
  await expect(story.getByRole('link', { name: 'Geef een rondje' })).toHaveAttribute('href', /^https:\/\/whydonate\.com\//)
  // No writing prompts or template notes.
  await expect(page.getByText(/Schrijfvraag|sjabloon/)).toHaveCount(0)
  await shot(page, '61-about-story')

  // The same story in English, with the help line.
  const english = await (await page.request.get('/about', { headers: { 'accept-language': 'en' } })).text()
  expect(english).toContain('I have lived with depression since I was ten.')
  expect(english).toContain('tel:08000113')
  await context.close()

  // In the app: the story and the help, nothing about money.
  const app = await browser.newContext({ userAgent: APP_UA })
  const inApp = await app.newPage()
  await inApp.goto('/about')
  await expect(inApp.getByText(/Sinds mijn tiende heb ik te maken met depressie/)).toBeVisible()
  await expect(inApp.getByRole('link', { name: /113 Zelfmoordpreventie/ })).toBeVisible()
  await expect(inApp.getByRole('link', { name: 'Geef een rondje' })).toHaveCount(0)
  await expect(inApp.locator('a[href*="whydonate"]')).toHaveCount(0)
  await app.close()
})
