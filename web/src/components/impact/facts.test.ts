import { describe, expect, it } from 'vitest'
import { LOCALES } from '@/i18n/config'
import raw from '../../../content/impact.json'
import { SCOPES, TOPICS, factsFor, featuredFacts, impact, sourceHost, text } from './facts'

// Organisations whose figures we trust for these pages. A new source is fine, but then it is added here on purpose.
const TRUSTED_HOSTS = [
  'cbs.nl',
  'rivm.nl',
  'vzinfo.nl',
  'trimbos.nl',
  'ggdghor.nl',
  'monitorgezondheid.nl',
  'dierenbescherming.nl',
  'ipsos-publiek.nl',
  'vlaanderen.be',
  'licg.nl',
  'dibevo.nl',
  'wur.nl',
  'uu.nl',
  'who.int',
  'ec.europa.eu',
  'sciensano.be',
  'statbel.fgov.be',
  'ine.es',
  'fundacion-affinity.org',
  'nature.com',
  'pubmed.ncbi.nlm.nih.gov',
  'pmc.ncbi.nlm.nih.gov',
  'jamanetwork.com',
  'journals.plos.org',
  'bmccomplementmedtherapies.biomedcentral.com',
  'mdpi.com',
  'journals.sagepub.com',
  'sciencedirect.com',
]

describe('impact facts (content/impact.json)', () => {
  it('has a check date', () => {
    expect(raw.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('has facts with unique ids', () => {
    expect(impact.facts.length).toBeGreaterThan(0)
    const ids = impact.facts.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const fact of impact.facts) {
    describe(fact.id, () => {
      it('has a source with an https link on a trusted site, and a year', () => {
        expect(fact.source.name.trim()).not.toBe('')
        const url = new URL(fact.source.url)
        expect(url.protocol).toBe('https:')
        const host = sourceHost(fact.source.url)
        expect(TRUSTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)), host).toBe(true)
        expect(Number.isInteger(fact.year)).toBe(true)
        expect(fact.year).toBeGreaterThanOrEqual(2010)
        expect(fact.year).toBeLessThanOrEqual(new Date().getFullYear())
        expect(fact.check.trim().length).toBeGreaterThan(10)
      })

      it('has a topic and a scope', () => {
        expect(TOPICS).toContain(fact.topic)
        expect(SCOPES).toContain(fact.scope)
      })

      it('has a value with a number and a label in every language', () => {
        for (const locale of LOCALES) {
          expect(fact.value[locale], `${locale} value`).toMatch(/\d/)
          expect(fact.label[locale]?.trim().length, `${locale} label`).toBeGreaterThan(10)
        }
      })

      it('never promises a cure or calls walking a treatment', () => {
        const words = /\b(geneest|genezen|behandeling|therapie|helpt tegen|cures?|treatment|therapy|cura|tratamiento|terapia|guérit|traitement|thérapie)\b/i
        for (const locale of LOCALES) expect(fact.label[locale]).not.toMatch(words)
      })
    })
  }

  it('features three or four facts on the home page', () => {
    expect(featuredFacts().length).toBeGreaterThanOrEqual(3)
    expect(featuredFacts().length).toBeLessThanOrEqual(4)
  })

  it('has something for every topic', () => {
    for (const topic of TOPICS) expect(factsFor(topic).length, topic).toBeGreaterThan(0)
  })

  it('falls back to Dutch for an unknown language', () => {
    expect(text({ nl: 'hond', en: 'dog', es: 'perro', fr: 'chien' }, 'de')).toBe('hond')
  })
})
