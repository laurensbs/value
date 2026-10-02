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

export async function newPerson(browser: Browser, geo?: { latitude: number; longitude: number }) {
  const context = await browser.newContext({
    colorScheme: process.env.SHOTS_DARK ? 'dark' : 'light',
    geolocation: geo ?? { latitude: 52.0907, longitude: 5.1214 },
    permissions: ['geolocation'],
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

export async function onboard(page: Page, opts: { birthDate: string; city: string; bio: string; phone: string; walker: boolean; owner: boolean }) {
  await page.getByLabel('Geboortedatum').fill(opts.birthDate)
  const walk = page.getByLabel('Ik wil wandelen met honden')
  if ((await walk.isChecked()) !== opts.walker) await walk.click()
  const dogs = page.getByLabel(/Ik heb een hond/)
  if ((await dogs.isChecked()) !== opts.owner) await dogs.click()
  await page.getByLabel('Over jou').fill(opts.bio)
  await page.getByLabel('Plaats').fill(opts.city)
  await page.getByRole('button', { name: 'Gebruik mijn locatie' }).click()
  await page.getByLabel(/Telefoonnummer/).fill(opts.phone)
  await page.getByLabel(/Ik ben 18 jaar of ouder/).check()
  await page.getByRole('button', { name: 'Profiel opslaan' }).click()
}
