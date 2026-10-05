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

/** Reads content/<dir>/<locale>/<name>.md, falling back to Dutch, without rendering it. */
async function readMarkdown(dir: string, name: string, locale: string) {
  for (const l of [...new Set([locale, 'nl'])]) {
    try {
      const raw = await readFile(path.join(process.cwd(), 'content', dir, l, `${name}.md`), 'utf8')
      return { ...parseFrontMatter(raw), locale: l }
    } catch {
      // try the next locale
    }
  }
  return null
}

/** The front matter and the markdown body of content/<dir>/<locale>/<name>.md (Dutch as fallback), unrendered. */
export async function loadText(dir: string, name: string, locale: string): Promise<{ data: Record<string, string>; body: string; locale: string } | null> {
  return readMarkdown(dir, name, locale)
}

/** Loads content/<dir>/<locale>/<name>.md (falling back to Dutch) and renders it. */
export async function loadMarkdown(dir: string, name: string, locale: string): Promise<MarkdownContent | null> {
  const found = await readMarkdown(dir, name, locale)
  return found ? { html: await marked.parse(found.body, { gfm: true }), data: found.data, locale: found.locale } : null
}

/** Only the front matter (title, description, updated…) of a text, for metadata and the sitemap. */
export async function loadFrontMatter(dir: string, name: string, locale: string): Promise<Record<string, string> | null> {
  return (await readMarkdown(dir, name, locale))?.data ?? null
}
