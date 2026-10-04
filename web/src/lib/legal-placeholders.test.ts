import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFrontMatter } from './front-matter'

const ROOT = path.join(process.cwd(), 'content', 'legal')

/** Every legal text in every language: content/legal/<locale>/<doc>.md. */
function legalFiles(): string[] {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dir) =>
      readdirSync(path.join(ROOT, dir.name))
        .filter((name) => name.endsWith('.md'))
        .map((name) => path.join(dir.name, name)),
    )
}

/**
 * Text between square brackets that a reader would see: editorial notes ("[te controleren]",
 * "[to verify]", "[voorstel]") and placeholders ("[KvK-nummer]", "[adres]", "[bedrag]"). Markdown
 * links ("[text](url)") are fine, and so is anything inside `code`.
 */
function visibleBrackets(body: string): string[] {
  const withoutCode = body.replace(/`[^`\n]*`/g, '')
  return [...withoutCode.matchAll(/\[[^\]\n]*\](?!\()/g)].map((m) => m[0])
}

describe('legal texts', () => {
  const files = legalFiles()

  it('are all found', () => {
    expect(files.length).toBeGreaterThanOrEqual(24)
  })

  it.each(files)('%s shows no editorial notes or placeholders in brackets', (file) => {
    const { body } = parseFrontMatter(readFileSync(path.join(ROOT, file), 'utf8'))
    expect(visibleBrackets(body)).toEqual([])
  })

  it.each(files)('%s names no company data or unfinished operator', (file) => {
    const { body } = parseFrontMatter(readFileSync(path.join(ROOT, file), 'utf8'))
    // The operator is Laurens Bos, reachable through {{contact}}: no address, KvK number or company name.
    expect(body).not.toMatch(/Naam rechtspersoon|Stichting Rondje Mee i\.o\.|Webstability/i)
  })

  it('catches the patterns it is meant to catch', () => {
    expect(visibleBrackets('KvK-nummer [KvK-nummer], [adres].')).toEqual(['[KvK-nummer]', '[adres]'])
    expect(visibleBrackets('Mail ons. [Te controleren: of een FG verplicht is.]')).toHaveLength(1)
    expect(visibleBrackets('Zie [de privacyverklaring](/legal/privacy) en `[code]`.')).toEqual([])
  })
})
