import { expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test'
import { QUIZ } from '../src/lib/quiz'

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

export async function newPerson(browser: Browser, geo?: { latitude: number; longitude: number }, options: BrowserContextOptions = {}) {
  const context = await browser.newContext({
    colorScheme: process.env.SHOTS_DARK ? 'dark' : 'light',
    geolocation: geo ?? { latitude: 52.0907, longitude: 5.1214 },
    permissions: ['geolocation'],
    extraHTTPHeaders: { 'x-forwarded-for': randomIp() },
    ...options,
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

/**
 * The step-by-step onboarding: role, name and age, place, (walkers) experience and weekly goal,
 * a few words about yourself (typed, or ready sentences tapped), and the promises. Someone who
 * neither walks nor has a dog is treated as shelter staff.
 */
export async function onboard(
  page: Page,
  opts: {
    birthDate: string
    city: string
    bio: string | string[]
    phone: string
    walker: boolean
    owner: boolean
    next?: boolean
    /** Do the safety quiz that follows for walkers (default); false leaves it for later. */
    quiz?: boolean
  },
) {
  const next = () => page.getByRole('button', { name: 'Verder' }).click()
  await page.getByRole('button', { name: 'Laten we beginnen' }).click()
  const role = opts.walker && opts.owner ? /^Allebei/ : opts.owner ? /^Ik heb een hond/ : opts.walker ? /^Ik wil wandelen/ : /^Ik werk bij een opvang/
  await page.getByRole('radio', { name: role }).check()
  await next()
  await page.getByLabel('Geboortedatum').fill(opts.birthDate)
  await next()
  await page.getByLabel('Plaats').fill(opts.city)
  await page.getByRole('button', { name: 'Gebruik mijn locatie' }).click()
  await next()
  if (opts.walker) {
    await page.getByRole('radio', { name: /^Een beetje/ }).check()
    await next()
    // The recommended weekly goal is already picked.
    await expect(page.getByRole('radio', { name: /^1 keer per week/ })).toBeChecked()
    await next()
  }
  if (typeof opts.bio === 'string') {
    await page.getByLabel('Over jou').fill(opts.bio)
  } else {
    const sentences = page.getByRole('group', { name: 'Tik om een zin toe te voegen' })
    for (const sentence of opts.bio) await sentences.getByRole('button', { name: sentence }).click()
    await expect(page.getByLabel('Over jou')).toHaveValue(opts.bio.join(' '))
  }
  await page.getByLabel(/Telefoonnummer/).fill(opts.phone)
  await next()
  await page.getByLabel(/Ik ben 18 jaar of ouder/).check()
  // The last button says where it leads: the dogs for walkers, your own dog for owners, the shelter for shelter staff.
  const finish = opts.walker ? 'Laat me de honden zien' : opts.owner ? 'Verder met mijn hond' : 'Verder met onze opvang'
  await page.getByRole('button', { name: opts.next ? 'Klaar, ga verder' : finish }).click()
  // Wait until the profile is saved and we left onboarding, so the next step doesn't race the save.
  await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'))
  // Walkers do the safety quiz straight away (besluit 4 okt 2026); then on to where they were going.
  if (opts.walker && (opts.quiz ?? true)) {
    await expect(page).toHaveURL(/\/profile\/quiz\?next=/)
    await passQuiz(page)
  }
}

/** The calm quiz: one question at a time, every answer right the first time, then "Verder". */
export async function passQuiz(page: Page) {
  for (const q of QUIZ) {
    await page.locator(`input[name="answer"][value="${q.correct}"]`).check()
    await page.getByRole('button', { name: 'Kijk na' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Klopt.' })).toBeVisible()
    await page.getByRole('button', { name: 'Verder' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Gehaald!' })).toBeVisible()
  await page.getByRole('link', { name: 'Verder' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/profile/quiz'))
}

/** A dog put online in the fewest taps: a name, the suggested walk and town, and the two safety promises. */
export async function addDog(page: Page, name: string) {
  await page.goto('/my-dogs/new')
  await page.getByLabel('Naam', { exact: true }).fill(name)
  const next = page.getByRole('button', { name: 'Verder' })
  // On past the name, the character, the story, the walk, where, and what only accepted walkers see.
  for (let step = 0; step < 6; step++) await next.click()
  await page.getByLabel(/Ik ben verzekerd/).check()
  await page.getByLabel(/gechipt en gevaccineerd/).check()
  await page.getByRole('button', { name: `Zet ${name} online` }).click()
  await expect(page).toHaveURL(/\/dogs\/[^/?]+\?saved=1$/)
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

/**
 * Tap targets on this screen lower than 44 px. A chip or tick row is tapped through its whole label,
 * so that is what counts; a link inside a sentence is exempt (WCAG 2.5.8), like in scripts/audit.mjs.
 */
export async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const small: string[] = []
    const measured = new Set<Element>()
    const root = document.querySelector('dialog[open]') ?? document.querySelector('main') ?? document.body
    for (const el of root.querySelectorAll<HTMLElement>('a, button, input:not([type=hidden]), select, summary, [role=button]')) {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height || getComputedStyle(el).visibility === 'hidden') continue
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li, label')) continue
      if (el.closest('.leaflet-control-attribution')) continue
      let target: Element = el
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        const label = el.closest('label')
        if (label) {
          if (measured.has(label)) continue
          measured.add(label)
          target = label
        }
      }
      const r = target.getBoundingClientRect()
      if (r.height < 44) small.push(`<${target.tagName.toLowerCase()}> "${(target.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return small
  })
}
