import 'server-only'
import { loadMarkdown, type MarkdownContent } from './content'

export const LEGAL_DOCS = ['terms', 'privacy', 'conduct', 'safety', 'shelters', 'cookies'] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]

export function isLegalDoc(value: string): value is LegalDoc {
  return (LEGAL_DOCS as readonly string[]).includes(value)
}

/** Legal texts live in content/legal/<locale>/<doc>.md; Dutch is the fallback. */
export function legalHtml(doc: LegalDoc, locale: string): Promise<MarkdownContent | null> {
  return loadMarkdown('legal', doc, locale)
}
