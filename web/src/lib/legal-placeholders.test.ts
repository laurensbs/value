import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFrontMatter } from './front-matter'
import { compareTermsVersions } from './rules'
import { TERMS_EFFECTIVE_AT, TERMS_NOTICE_FROM, TERMS_VERSION } from './site'
import { campaign } from './support'

const CONTENT = path.join(process.cwd(), 'content')

/**
 * Every published text in every language: the legal texts (content/legal/<locale>/<doc>.md) and the
 * stories on /about (content/about/<locale>/<name>.md).
 */
function textFiles(dir: 'legal' | 'about'): string[] {
  const root = path.join(CONTENT, dir)
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((locale) =>
      readdirSync(path.join(root, locale.name))
        .filter((name) => name.endsWith('.md'))
        .map((name) => path.join(dir, locale.name, name)),
    )
}

const read = (file: string) => parseFrontMatter(readFileSync(path.join(CONTENT, file), 'utf8'))

/** What a reader sees of a body: HTML comments (notes for whoever edits the file) and `code` left out. */
function visibleText(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, '').replace(/`[^`\n]*`/g, '')
}

/**
 * Text between square brackets that a reader would see: editorial notes ("[te controleren]",
 * "[to verify]", "[voorstel]") and placeholders ("[KvK-nummer]", "[adres]", "[bedrag]"). Markdown
 * links ("[text](url)") are fine.
 */
function visibleBrackets(text: string): string[] {
  return [...visibleText(text).matchAll(/\[[^\]\n]*\](?!\()/g)].map((m) => m[0])
}

/**
 * Editorial notes in any form, also without square brackets: "(te controleren)", "– to verify]",
 * "à vérifier :", "vast te stellen", and TODO/FIXME/TBD in capitals (Spanish "todo" is a normal word).
 * "om te controleren of" in a sentence is fine: a note sits right after an opening bracket or dash,
 * or right before a closing bracket or colon.
 */
const CHECK = 'te controleren|to verify|to be checked|à vérifier|pendiente de verificar|por verificar'
const PROPOSAL = 'voorstel|proposal|propuesta|proposition'
// Word edges that also work for "à": \b only knows ASCII letters.
const word = (alternatives: string) => `(?<!\\p{L})(?:${alternatives})(?!\\p{L})`
const NOTES = [
  new RegExp(`[([–]\\s*${word(`${CHECK}|${PROPOSAL}`)}`, 'giu'),
  new RegExp(`${word(CHECK)}\\s*[)\\]:]`, 'giu'),
  new RegExp(word('vast te stellen|nog te bepalen|to be decided|por decidir|à définir'), 'giu'),
  new RegExp(word('TODO|FIXME|TBD|XXX'), 'gu'),
]

function editorialNotes(text: string): string[] {
  const visible = visibleText(text)
  return NOTES.flatMap((pattern) => [...visible.matchAll(pattern)].map((m) => m[0]))
}

/** Company data or an unfinished operator: the operator is Laurens Bos, reachable through {{contact}}. */
const COMPANY = /Naam rechtspersoon|Stichting Rondje Mee i\.o\.|Webstability|KvK-nummer \[/i

describe('published texts (content/legal and content/about)', () => {
  const legal = textFiles('legal')
  const about = textFiles('about')
  const files = [...legal, ...about]

  it('are all found', () => {
    expect(legal.length).toBeGreaterThanOrEqual(24)
    expect(about.length).toBeGreaterThanOrEqual(4)
  })

  it.each(files)('%s shows no editorial notes or placeholders in brackets', (file) => {
    const { body } = read(file)
    expect(visibleBrackets(body)).toEqual([])
    expect(editorialNotes(body)).toEqual([])
  })

  it.each(files)('%s has no notes or placeholders in its front matter', (file) => {
    const { data } = read(file)
    for (const [key, value] of Object.entries(data)) {
      expect(visibleBrackets(value), `${key}: ${value}`).toEqual([])
      expect(editorialNotes(value), `${key}: ${value}`).toEqual([])
    }
  })

  it.each(files)('%s names no company data or unfinished operator', (file) => {
    expect(read(file).body).not.toMatch(COMPANY)
  })
})

describe('legal versions', () => {
  const docs = [...new Set(textFiles('legal').map((file) => path.basename(file, '.md')))]

  it('the terms in every language have the version people accept at sign-up (TERMS_VERSION)', () => {
    const terms = textFiles('legal').filter((file) => path.basename(file) === 'terms.md')
    expect(terms).toHaveLength(4)
    for (const file of terms) expect(read(file).data.version, file).toBe(TERMS_VERSION)
  })

  it.each(docs)('%s has the same version and date in every language', (doc) => {
    const versions = textFiles('legal')
      .filter((file) => path.basename(file, '.md') === doc)
      .map((file) => `${read(file).data.version} ${read(file).data.updated}`)
    expect(new Set(versions).size).toBe(1)
  })
})

describe('changed terms (art. 19)', () => {
  const changes = textFiles('legal').filter((file) => path.basename(file) === 'terms-changes.md')
  const terms = textFiles('legal').filter((file) => path.basename(file) === 'terms.md')
  const items = (file: string) => read(file).body.split('\n').filter((line) => line.startsWith('- '))

  it('say what changed for the current version, in every language, with the same points', () => {
    expect(changes).toHaveLength(4)
    for (const file of changes) {
      const { data } = read(file)
      expect(data.version, file).toBe(TERMS_VERSION)
      expect(compareTermsVersions(data.from, data.version), file).toBe(-1)
      expect(data.title, file).toBeTruthy()
      expect(items(file).length, file).toBeGreaterThan(0)
    }
    expect(new Set(changes.map((file) => items(file).length)).size).toBe(1)
  })

  // Art. 19: important changes are announced at least 30 days ahead, counted from the day the notice goes
  // live in the app (TERMS_NOTICE_FROM, set to the real live day when merging).
  const day = (value: string) => Date.parse(`${value}T00:00:00Z`)

  it('take effect at least 30 days after the notice goes live (TERMS_NOTICE_FROM, TERMS_EFFECTIVE_AT)', () => {
    for (const value of [TERMS_NOTICE_FROM, TERMS_EFFECTIVE_AT]) expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect((day(TERMS_EFFECTIVE_AT) - day(TERMS_NOTICE_FROM)) / 86_400_000).toBeGreaterThanOrEqual(30)
  })

  it('announce a text that already exists: the notice goes live on or after the terms changed', () => {
    for (const file of terms) expect(day(TERMS_NOTICE_FROM), file).toBeGreaterThanOrEqual(day(read(file).data.updated))
  })
})

describe('support in the terms (art. 8)', () => {
  // /support shows the share for good causes from content/crowdfunding.json; the terms promise the same number.
  const { shareToCausesPercent } = campaign(JSON.parse(readFileSync(path.join(CONTENT, 'crowdfunding.json'), 'utf8')))
  const terms = textFiles('legal').filter((file) => path.basename(file) === 'terms.md')

  it.each(terms)('%s names the share for good causes that /support shows', (file) => {
    expect(shareToCausesPercent, 'no share set in crowdfunding.json: take the sentence out of terms art. 8').not.toBeNull()
    const share = new RegExp(`(?<![\\d.,])${String(shareToCausesPercent).replace('.', '[.,]')}[\\s\\u00a0\\u202f]?%`)
    expect(read(file).body).toMatch(share)
  })
})

describe('the checks themselves', () => {
  it('catch placeholders and notes in brackets, not links or code', () => {
    expect(visibleBrackets('KvK-nummer [KvK-nummer], [adres].')).toEqual(['[KvK-nummer]', '[adres]'])
    expect(visibleBrackets('Mail ons. [Te controleren: of een FG verplicht is.]')).toHaveLength(1)
    expect(visibleBrackets('Zie [de privacyverklaring](/legal/privacy) en `[code]`.')).toEqual([])
  })

  it('catch notes without square brackets, in all four languages', () => {
    expect(editorialNotes('Veilig Thuis (0800-2000) (te controleren).')).not.toEqual([])
    expect(editorialNotes('Tot 2 jaar (voorstel).')).not.toEqual([])
    expect(editorialNotes('Up to 2 years – to verify.')).not.toEqual([])
    expect(editorialNotes('Région UE (à vérifier : laquelle).')).not.toEqual([])
    expect(editorialNotes('Hasta 2 años (pendiente de verificar).')).not.toEqual([])
    expect(editorialNotes('Bewaartermijn vast te stellen.')).not.toEqual([])
    expect(editorialNotes('TODO: adres invullen')).not.toEqual([])
  })

  it('leave normal sentences and hidden comments alone', () => {
    expect(editorialNotes('De eigenaar kijkt naar je ID om te controleren of het klopt.')).toEqual([])
    expect(editorialNotes('Un paseo no lo soluciona todo.')).toEqual([])
    expect(editorialNotes('Een voorstel doen mag altijd.')).toEqual([])
    expect(editorialNotes('<!-- TODO: foto vervangen (te controleren) -->Gewone tekst.')).toEqual([])
    expect(visibleBrackets('<!-- [notitie] -->Gewone tekst.')).toEqual([])
  })

  it('catch notes in front matter', () => {
    const { data } = parseFrontMatter('---\ntitle: Privacy\nstatus: "Concept [te controleren]"\n---\nTekst')
    expect(visibleBrackets(data.status)).toEqual(['[te controleren]'])
    expect(editorialNotes(data.status)).not.toEqual([])
  })
})
