import { normalizeInstagram } from './org-fields'

// Only these platforms can receive support: a typo or a lookalike link never shows up as a button.
// Monthly support (SUPPORT_URL).
const PLATFORMS: Record<string, string> = {
  'patreon.com': 'Patreon',
  'ko-fi.com': 'Ko-fi',
  'opencollective.com': 'Open Collective',
  'buymeacoffee.com': 'Buy Me a Coffee',
}

// A one-off crowdfunding campaign (CROWDFUNDING_URL): Dutch and international platforms,
// plus Kickstarter, Ulule, Goteo and Verkami, which people in Spain and Belgium know.
const CROWDFUNDING_PLATFORMS: Record<string, string> = {
  'whydonate.com': 'Whydonate',
  'whydonate.nl': 'Whydonate',
  'gofundme.com': 'GoFundMe',
  'doneeractie.nl': 'Doneeractie',
  'kickstarter.com': 'Kickstarter',
  'ulule.com': 'Ulule',
  'goteo.org': 'Goteo',
  'verkami.com': 'Verkami',
}

export interface SupportConfig {
  /** Where people can support Rondje every month. Only set when the recipient (operator) is named too. */
  url: string | null
  /** The platform's name, e.g. "Patreon". */
  platform: string | null
  /** A one-off crowdfunding campaign. Only set when the recipient (operator) is named too. */
  crowdfundingUrl: string | null
  /** The crowdfunding platform's name, e.g. "Whydonate". */
  crowdfundingPlatform: string | null
  /** Who receives the support and runs Rondje, e.g. a company or foundation. */
  operator: string | null
  instagram: string | null
  contactEmail: string | null
}

function platformOf(url: URL, platforms: Record<string, string>): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const match = Object.keys(platforms).find((h) => host === h || host.endsWith(`.${h}`))
  return match ? platforms[match] : null
}

function allowedUrl(raw: string | undefined, platforms: Record<string, string>): { url: string; platform: string } | null {
  if (!raw?.trim()) return null
  try {
    const url = new URL(raw.trim())
    const platform = platformOf(url, platforms)
    // No passwords in the link, nothing but https, and only a known platform.
    return url.protocol === 'https:' && !url.username && !url.password && platform ? { url: url.toString(), platform } : null
  } catch {
    return null
  }
}

export function supportUrl(raw: string | undefined): string | null {
  return allowedUrl(raw, PLATFORMS)?.url ?? null
}

export function crowdfundingUrl(raw: string | undefined): string | null {
  return allowedUrl(raw, CROWDFUNDING_PLATFORMS)?.url ?? null
}

/** Support, Instagram and contact details come from environment variables, so they can change without a code change. */
export function supportConfig(env: Record<string, string | undefined> = process.env): SupportConfig {
  const operator = env.OPERATOR_NAME?.trim().slice(0, 120) || null
  // Money only ever goes to someone who is named on the page.
  const monthly = operator ? allowedUrl(env.SUPPORT_URL, PLATFORMS) : null
  const once = operator ? allowedUrl(env.CROWDFUNDING_URL, CROWDFUNDING_PLATFORMS) : null
  const email = env.CONTACT_EMAIL?.trim() ?? ''
  return {
    url: monthly?.url ?? null,
    platform: monthly?.platform ?? null,
    crowdfundingUrl: once?.url ?? null,
    crowdfundingPlatform: once?.platform ?? null,
    operator,
    instagram: normalizeInstagram(env.INSTAGRAM_HANDLE ?? ''),
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
  }
}

export interface Campaign {
  /** Goal and amount raised, in whole euros; both or neither. */
  progress: { goal: number; raised: number; percent: number } | null
  /** The share of all support that goes on to good causes, 0–100. Null until there are agreements. */
  shareToCausesPercent: number | null
  /** When someone last updated the numbers (YYYY-MM-DD), or null. */
  updated: string | null
}

/** "Geef een rondje": on the campaign page one round is €5 (€3,000 = 600 rounds). */
export const ROUND_EUR = 5

/** How many rounds an amount in euros is, rounded down. */
export function roundsFor(euros: number): number {
  return Number.isFinite(euros) && euros > 0 ? Math.floor(euros / ROUND_EUR) : 0
}

const amount = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null)

/**
 * The campaign numbers from content/crowdfunding.json, checked: a progress bar only shows when both the
 * goal and the amount raised are real numbers, and a share for good causes only when it is a percentage.
 */
export function campaign(raw: unknown): Campaign {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const goal = amount(c.goal)
  const raised = amount(c.raised)
  const share = c.shareToCausesPercent
  return {
    progress: goal && raised !== null ? { goal, raised, percent: Math.min(100, Math.floor((raised / goal) * 100)) } : null,
    shareToCausesPercent: typeof share === 'number' && Number.isFinite(share) && share > 0 && share <= 100 ? Math.round(share * 10) / 10 : null,
    updated: typeof c.updated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.updated) ? c.updated : null,
  }
}

/**
 * The server's off-switch for the "Help ons" link inside the iOS and Android apps (for App Review):
 * SUPPORT_IN_APP=0 hides every entry in the apps; unset or "1" shows it. The website never changes.
 */
export function supportInApp(env: Record<string, string | undefined> = process.env): boolean {
  return !/^(0|false|off|no)$/i.test(env.SUPPORT_IN_APP?.trim() ?? '')
}

/** "Help ons via Whydonate" in the apps: everything the app needs for one row that opens the campaign. */
export interface AppSupport {
  /** False when SUPPORT_IN_APP=0: the apps then show nothing about it. */
  inApp: boolean
  label: string
  crowdfundingUrl: string
  platform: string
  operator: string
  /** Goal and amount raised in whole euros; null until both are filled in (content/crowdfunding.json). */
  goal: number | null
  raised: number | null
  /** The same numbers in rounds of €5 ("Geef een rondje"). */
  rounds: { goal: number; raised: number } | null
  shareToCausesPercent: number | null
}

/**
 * The campaign for the apps, or null while there is no campaign link with a named recipient
 * (CROWDFUNDING_URL + OPERATOR_NAME). The apps only ever open the link in the phone's browser:
 * nothing is paid inside an app. `label` gets the platform's name, e.g. "Whydonate".
 */
export function appSupport(env: Record<string, string | undefined>, raw: unknown, label: (platform: string) => string): AppSupport | null {
  const cfg = supportConfig(env)
  if (!cfg.crowdfundingUrl || !cfg.crowdfundingPlatform || !cfg.operator) return null
  const drive = campaign(raw)
  const progress = drive.progress
  return {
    inApp: supportInApp(env),
    label: label(cfg.crowdfundingPlatform),
    crowdfundingUrl: cfg.crowdfundingUrl,
    platform: cfg.crowdfundingPlatform,
    operator: cfg.operator,
    goal: progress?.goal ?? null,
    raised: progress?.raised ?? null,
    rounds: progress ? { goal: roundsFor(progress.goal), raised: roundsFor(progress.raised) } : null,
    shareToCausesPercent: drive.shareToCausesPercent,
  }
}
