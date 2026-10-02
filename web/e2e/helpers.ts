import { expect, type Browser, type Page } from '@playwright/test'

/** With SHOTS=1, saves a full-page screenshot per step for design review (shots/<name>.png). */
export async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shots/${process.env.SHOTS_PREFIX ?? ''}${name}.png`, fullPage: true })
}

export const unique = () => Math.random().toString(36).slice(2, 8)

/** The first quarter hour at least 16 minutes from now, in Amsterdam time (the app's time zone). */
export function soonSlot(now = new Date()): { date: string; time: string } {
  const t = new Date(now.getTime() + 16 * 60_000)
  t.setSeconds(0, 0)
  const m = t.getMinutes()
  t.setMinutes(m % 15 === 0 ? m : m + (15 - (m % 15)))
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const parts = Object.fromEntries(f.formatToParts(t).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

/** Each person gets their own (test) IP, as in real life: sign-in and sign-up are limited per IP address. */
const randomIp = () => `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`

export async function newPerson(browser: Browser, geo?: { latitude: number; longitude: number }) {
  const context = await browser.newContext({
    colorScheme: process.env.SHOTS_DARK ? 'dark' : 'light',
    geolocation: geo ?? { latitude: 52.0907, longitude: 5.1214 },
    permissions: ['geolocation'],
    extraHTTPHeaders: { 'x-forwarded-for': randomIp() },
  })
  const page = await context.newPage()
  return { context, page }
}

export async function signUp(page: Page, opts: { name: string; email: string; intent?: 'owner' | 'walker' | 'shelter' }) {
  await page.goto(`/signup${opts.intent ? `?intent=${opts.intent}` : ''}`)
  await page.getByLabel('Voornaam').fill(opts.name)
  await page.getByLabel('E-mailadres').fill(opts.email)
  await page.getByLabel('Wachtwoord').fill('wandelen-123')
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/onboarding/)
}

/** Walks through the onboarding screens (src/app/onboarding/OnboardingFlow.tsx), one question at a time. */
export async function onboard(page: Page, opts: { birthDate: string; city: string; bio: string; phone: string; walker: boolean; owner: boolean }) {
  const next = () => page.getByRole('button', { name: 'Verder' }).click()
  await page.getByRole('button', { name: 'Laten we beginnen' }).click()
  const role = opts.walker && opts.owner ? 'Allebei' : opts.walker ? 'Ik wil wandelen' : opts.owner ? 'Ik heb een hond' : 'Ik werk bij een opvang'
  await page.getByRole('radio', { name: role, exact: true }).check()
  await next()
  await page.getByLabel('Geboortedatum').fill(opts.birthDate)
  await next()
  await page.getByLabel('Plaats').fill(opts.city)
  await page.getByRole('button', { name: 'Gebruik mijn locatie' }).click()
  await next()
  if (opts.walker) {
    // Experience ("Een beetje" is chosen) and how often (decide later).
    await expect(page.getByRole('heading', { name: /ervaring/ })).toBeVisible()
    await next()
    await expect(page.getByRole('heading', { name: /Hoe vaak/ })).toBeVisible()
    await next()
  }
  if (opts.walker || opts.owner) {
    await page.getByLabel('Over jou').fill(opts.bio)
    if (opts.phone) await page.getByLabel(/Telefoonnummer/).fill(opts.phone)
    await next()
  }
  await page.getByLabel(/Ik ben 18 jaar of ouder/).check()
  await page.getByRole('button', { name: 'Klaar, laten we gaan!' }).click()
  // Wait until the profile is saved and we left onboarding, so the next step doesn't race the save.
  await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'))
}

/** Signs in as the e2e admin (ADMIN_EMAILS in playwright.config.ts). On a reused server the account may already exist. */
export async function signInAdmin(browser: Browser) {
  const admin = await newPerson(browser)
  const page = admin.page
  await page.goto('/signup')
  await page.getByLabel('Voornaam').fill('Beheer')
  await page.getByLabel('E-mailadres').fill('admin@e2e.test')
  await page.getByLabel('Wachtwoord').fill('wandelen-123')
  await page.getByRole('button', { name: 'Account maken' }).click()
  const exists = page.getByText(/Er bestaat al een account/)
  await Promise.race([page.waitForURL(/\/onboarding/), exists.waitFor()])
  if (await exists.isVisible()) {
    await page.goto('/login?next=/admin')
    await page.getByLabel('E-mailadres').fill('admin@e2e.test')
    await page.getByLabel('Wachtwoord').fill('wandelen-123')
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
    // Not /\/admin/: the login URL itself contains "next=/admin".
    await page.waitForURL((url) => url.pathname === '/admin')
  } else {
    await onboard(page, { birthDate: '1990-01-01', city: 'Utrecht', bio: 'Beheer', phone: '', walker: false, owner: false })
  }
  return admin
}

/** A tiny valid PNG (1×1, white), to upload as a photo without fixtures on disk. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC',
  'base64',
)
