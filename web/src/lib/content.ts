import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { marked } from 'marked'
import { parseFrontMatter } from './front-matter'

export interface MarkdownContent {
  html: string
  data: Record<string, string>
  /** The locale the text was actually found in (Dutch is the fallback). */
  locale: string
}

/** Loads content/<dir>/<locale>/<name>.md (falling back to Dutch) and renders it. */
export async function loadMarkdown(dir: string, name: string, locale: string): Promise<MarkdownContent | null> {
  for (const l of [...new Set([locale, 'nl'])]) {
    try {
      const raw = await readFile(path.join(process.cwd(), 'content', dir, l, `${name}.md`), 'utf8')
      const { data, body } = parseFrontMatter(raw)
      return { html: await marked.parse(body, { gfm: true }), data, locale: l }
    } catch {
      // try the next locale
    }
  }
  return null
}
