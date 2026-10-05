/**
 * The contact address has one source: CONTACT_EMAIL (read and checked by supportConfig()).
 * Texts never contain an address themselves; they hold this token, which is filled in when the page renders.
 */
export const CONTACT_TOKEN = '{{contact}}'

/** The page people land on when there is no address yet, or when they want all ways to reach Rondje. */
export const CONTACT_PATH = '/contact'

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * A mailto link to the contact address, or, while CONTACT_EMAIL is not set, a link to the contact page
 * with `fallbackLabel` (e.g. "our contact address"), so the sentence around it still works.
 */
export function contactLinkHtml(email: string | null, fallbackLabel: string): string {
  if (email) {
    const safe = escapeHtml(email)
    return `<a href="mailto:${safe}">${safe}</a>`
  }
  return `<a href="${CONTACT_PATH}">${escapeHtml(fallbackLabel)}</a>`
}

/** Replaces every contact token in rendered HTML with the link from contactLinkHtml. */
export function fillContact(html: string, email: string | null, fallbackLabel: string): string {
  return html.split(CONTACT_TOKEN).join(contactLinkHtml(email, fallbackLabel))
}
