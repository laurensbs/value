import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { marked } from 'marked'

export const LEGAL_DOCS = ['terms', 'privacy', 'conduct', 'safety', 'shelters', 'cookies'] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]

export function isLegalDoc(value: string): value is LegalDoc {
  return (LEGAL_DOCS as readonly string[]).includes(value)
}

/** Legal texts live in content/legal/<locale>/<doc>.md; Dutch is the fallback. */
export async function legalHtml(doc: LegalDoc, locale: string): Promise<{ html: string; locale: string } | null> {
  for (const l of [locale, 'nl']) {
    try {
      const md = await readFile(path.join(process.cwd(), 'content', 'legal', l, `${doc}.md`), 'utf8')
      return { html: await marked.parse(md, { gfm: true }), locale: l }
    } catch {
      // try the next locale
    }
  }
  return null
}
