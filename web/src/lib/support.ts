import { normalizeInstagram } from './org-fields'

// Only these platforms can receive support: a typo or a lookalike link never shows up as a button.
const PLATFORMS: Record<string, string> = {
  'patreon.com': 'Patreon',
  'ko-fi.com': 'Ko-fi',
  'opencollective.com': 'Open Collective',
  'buymeacoffee.com': 'Buy Me a Coffee',
}

export interface SupportConfig {
  /** Where people can support Rondje. Only set when the recipient (operator) is named too. */
  url: string | null
  /** The platform's name, e.g. "Patreon". */
  platform: string | null
  /** Who receives the support and runs Rondje, e.g. a company or foundation. */
  operator: string | null
  instagram: string | null
  contactEmail: string | null
}

function platformOf(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const match = Object.keys(PLATFORMS).find((h) => host === h || host.endsWith(`.${h}`))
  return match ? PLATFORMS[match] : null
}

export function supportUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'https:' && platformOf(url) ? url.toString() : null
  } catch {
    return null
  }
}

/** Support, Instagram and contact details come from environment variables, so they can change without a code change. */
export function supportConfig(env: Record<string, string | undefined> = process.env): SupportConfig {
  const operator = env.OPERATOR_NAME?.trim().slice(0, 120) || null
  const url = supportUrl(env.SUPPORT_URL)
  const email = env.CONTACT_EMAIL?.trim() ?? ''
  return {
    url: url && operator ? url : null,
    platform: url && operator ? platformOf(new URL(url)) : null,
    operator,
    instagram: normalizeInstagram(env.INSTAGRAM_HANDLE ?? ''),
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
  }
}
