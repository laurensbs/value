import 'server-only'
import { loadFrontMatter, loadMarkdown, type MarkdownContent } from './content'

export const LEGAL_DOCS = ['terms', 'privacy', 'conduct', 'safety', 'shelters', 'cookies'] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]

export function isLegalDoc(value: string): value is LegalDoc {
  return (LEGAL_DOCS as readonly string[]).includes(value)
}

/** Legal texts live in content/legal/<locale>/<doc>.md; Dutch is the fallback. */
export function legalHtml(doc: LegalDoc, locale: string): Promise<MarkdownContent | null> {
  return loadMarkdown('legal', doc, locale)
}

/** A legal text's front matter only (description, updated), without rendering the text. */
export function legalFrontMatter(doc: LegalDoc, locale: string): Promise<Record<string, string> | null> {
  return loadFrontMatter('legal', doc, locale)
}
