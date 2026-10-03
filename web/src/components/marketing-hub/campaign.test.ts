import { describe, expect, it } from 'vitest'
import en from '../../../messages/en.json'
import es from '../../../messages/es.json'
import fr from '../../../messages/fr.json'
import nl from '../../../messages/nl.json'
import { campaignUrl, codeUrl, mediumFor, safePath, slug, SOURCES, suggestCode, utmSource } from './campaign'
import { INTERVIEWS, interviewText, questionKeys } from './interviews'
import { nextPost, POST_IDS, postLink, POSTS } from './posts'

const SITE = 'https://rondje.test'

describe('campaign links', () => {
  it('builds a link to a page of this site with utm tags', () => {
    expect(campaignUrl(SITE, { path: '/dogs', source: 'flyer', detail: 'Bibliotheek Oost', campaign: 'Start oktober' })).toBe(
      'https://rondje.test/dogs?utm_source=flyer-bibliotheek-oost&utm_medium=print&utm_campaign=start-oktober',
    )
    expect(campaignUrl(`${SITE}/`, { path: '/flyer?for=owner', source: 'buurtapp', campaign: '', content: 'p03' })).toBe(
      'https://rondje.test/flyer?for=owner&utm_source=buurtapp&utm_medium=community&utm_campaign=start&utm_content=p03',
    )
  })

  it('never points to another site', () => {
    expect(safePath('//evil.example/x')).toBe('/')
    expect(safePath('https://evil.example')).toBe('/')
    expect(safePath('/\\evil')).toBe('/')
    expect(campaignUrl(SITE, { path: '//evil.example', source: 'mail', campaign: 'x' })).toMatch(/^https:\/\/rondje\.test\/\?/)
  })

  it('every source has a medium, and names become readable slugs', () => {
    for (const s of SOURCES) expect(mediumFor(s)).toMatch(/^[a-z]+$/)
    expect(slug("Dierenasiel 's-Hertogenbosch!")).toBe('dierenasiel-s-hertogenbosch')
    expect(slug('València · Huerta')).toBe('valencia-huerta')
    expect(utmSource('opvang', 'Dierenasiel Utrecht')).toBe('opvang-dierenasiel-utrecht')
  })

  it('suggests sign-up codes that never look like a member’s own 6-letter code', () => {
    expect(suggestCode('flyer', 'bibliotheek', 'start')).toBe('FLBIBLIOTHEE')
    expect(suggestCode('instagram', '', 'x')).toBe('IGXXXXX')
    for (const s of SOURCES) expect(suggestCode(s, '', '').length).toBeGreaterThanOrEqual(7)
    expect(codeUrl(SITE, 'flbib-1')).toBe('https://rondje.test/r/FLBIB1')
    expect(codeUrl(`${SITE}/`, 'OPDOA2026', true)).toBe('https://rondje.test/r/OPDOA2026?intent=owner')
    expect(codeUrl(SITE, '--')).toBeNull()
  })
})

type Tree = { [key: string]: string | Tree }
const LOCALES = { nl, en, es, fr } as unknown as Record<string, { marketing: Tree }>
const text = (tree: Tree, path: string) => path.split('.').reduce<Tree | string | undefined>((node, k) => (typeof node === 'object' ? node[k] : undefined), tree)

describe('post planner', () => {
  it('has 12 posts over six weeks, two a week, with unique ids', () => {
    expect(POSTS).toHaveLength(12)
    expect(new Set(POST_IDS).size).toBe(12)
    for (let week = 1; week <= 6; week++) expect(POSTS.filter((p) => p.week === week)).toHaveLength(2)
  })

  it('links each post to its page with the channel and the post in the tags', () => {
    expect(postLink(SITE, POSTS[0])).toBe('https://rondje.test/?utm_source=instagram&utm_medium=social&utm_campaign=start-week-1&utm_content=p01')
    expect(nextPost(new Set(['p01', 'p02']))?.id).toBe('p03')
    expect(nextPost(new Set(POST_IDS))).toBeNull()
  })

  it('has every text in all four languages, with the app name as a placeholder', () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      for (const post of POSTS) {
        for (const key of ['title', 'sub', 'goal', 'caption', 'visual']) {
          expect(text(messages.marketing, `posts.${post.id}.${key}`), `${locale} ${post.id}.${key}`).toEqual(expect.any(String))
        }
        const caption = text(messages.marketing, `posts.${post.id}.caption`) as string
        expect(caption, `${locale} ${post.id}`).toContain('{app}')
        // The brand name is never written out: a rename only changes APP_NAME.
        expect(caption, `${locale} ${post.id}`).not.toMatch(/Rondje/)
        // Instagram and TikTok cannot link from a caption; the others always carry their link.
        if (post.channel === 'linkedin' || post.channel === 'buurtapp') expect(caption, `${locale} ${post.id}`).toContain('{link}')
        if (post.fillIn) expect(caption).toMatch(/\[/)
      }
    }
  })

  it('makes no health claims and invents no numbers', () => {
    const forbidden = /depress|somber|angst|anxiety|ansiedad|anxiété|eenzaamheid|loneliness|soledad|solitude|therap|terapi|thérap|geneest|cures|cura |guérit|helpt tegen|helps against|ayuda contra|aide contre|\d+\s?%/i
    for (const [locale, messages] of Object.entries(LOCALES)) {
      for (const post of POSTS) {
        const caption = text(messages.marketing, `posts.${post.id}.caption`) as string
        expect(caption, `${locale} ${post.id}`).not.toMatch(forbidden)
      }
    }
  })
})

describe('interview questions', () => {
  it('has every question in all four languages, 6 to 10 per audience', () => {
    for (const [audience, n] of Object.entries(INTERVIEWS)) {
      expect(n).toBeGreaterThanOrEqual(6)
      expect(n).toBeLessThanOrEqual(10)
      for (const [locale, messages] of Object.entries(LOCALES)) {
        for (const key of [...questionKeys(audience as keyof typeof INTERVIEWS), 'title', 'who', 'goal', 'listen']) {
          expect(text(messages.marketing, `interviews.${audience}.${key}`), `${locale} ${audience}.${key}`).toEqual(expect.any(String))
        }
        expect(text(messages.marketing, `interviews.${audience}.q${n + 1}`)).toBeUndefined()
      }
    }
  })

  it('copies a set as numbered questions plus what to listen for', () => {
    expect(interviewText({ title: 'Opvang', who: 'x', goal: 'Doel', questions: ['Hoe?', 'Wanneer?'], listen: 'Data.' }, 'Waar je op let')).toBe(
      'Opvang\nDoel\n\n1. Hoe?\n2. Wanneer?\n\nWaar je op let: Data.',
    )
  })
})
