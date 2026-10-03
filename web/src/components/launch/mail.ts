// Filling in a message template and turning it into a mailto: link. Nothing is ever sent from
// Rondje: the link opens the admin's own mail app with the text ready, and they send it themselves.

export const PLACEHOLDERS = ['naam', 'organisatie', 'stad', 'link', 'afzender', 'telefoon', 'datum', 'dagen', 'app'] as const
export type Placeholder = (typeof PLACEHOLDERS)[number]
export type Values = Partial<Record<Placeholder, string>>

const PATTERN = /\{(naam|organisatie|stad|link|afzender|telefoon|datum|dagen|app)\}/g

/** The placeholders a text uses, in order of first appearance. */
export function placeholdersIn(...texts: string[]): Placeholder[] {
  const found: Placeholder[] = []
  for (const text of texts) for (const m of text.matchAll(PATTERN)) if (!found.includes(m[1] as Placeholder)) found.push(m[1] as Placeholder)
  return found
}

/** Replaces {placeholders} that have a value. Empty ones stay visible as {naam}, so nothing goes out half-filled by accident. */
export function fillTemplate(text: string, values: Values): string {
  return text.replace(PATTERN, (whole, key: Placeholder) => {
    const value = values[key]?.trim()
    return value ? value : whole
  })
}

/** Splits a text into plain parts and {placeholder} parts, to highlight what is still empty. */
export function segments(text: string): { text: string; placeholder: boolean }[] {
  const out: { text: string; placeholder: boolean }[] = []
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), placeholder: false })
    out.push({ text: m[0], placeholder: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), placeholder: false })
  return out
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/

export function isEmail(value: string | null | undefined): value is string {
  return Boolean(value && EMAIL.test(value.trim()))
}

/**
 * A mailto: link (RFC 6068). Subject and body are percent-encoded with encodeURIComponent, so
 * spaces become %20 (never "+"), "&", "?" and "#" cannot end the field early, and line breaks
 * become %0D%0A. An invalid or missing address leaves the recipient empty.
 */
export function mailtoHref({ to, subject, body }: { to?: string | null; subject: string; body: string }): string {
  const encode = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, '\r\n'))
  const address = isEmail(to) ? encodeURIComponent(to.trim()).replace(/%40/g, '@') : ''
  const params = [subject ? `subject=${encode(subject)}` : '', `body=${encode(body)}`].filter(Boolean).join('&')
  return `mailto:${address}?${params}`
}

/** What "Kopieer" puts on the clipboard: the subject on top when there is one. */
export function clipboardText(subject: string, body: string): string {
  return subject ? `${subject}\n\n${body}` : body
}
