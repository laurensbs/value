import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { cityList } from './cities'
import { parseFrontMatter } from './front-matter'
import { breadcrumbs, canonicalUrl, clampDescription, DESCRIPTION_MAX, groupWalkEvent, pageMetadata, serializeJsonLd, siteGraph } from './seo'
import { APP_NAME } from './site'

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_URL', 'https://rondje.test')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('canonicalUrl', () => {
  it('is this site plus the path, without query, anchor or trailing slash', () => {
    expect(canonicalUrl('/')).toBe('https://rondje.test/')
    expect(canonicalUrl('/shelter?claim=nl-doa')).toBe('https://rondje.test/shelter')
    expect(canonicalUrl('/dogs?org=o1#top')).toBe('https://rondje.test/dogs')
    expect(canonicalUrl('/cities/madrid/')).toBe('https://rondje.test/cities/madrid')
  })

  it('keeps only a parameter that makes it another page', () => {
    expect(canonicalUrl('/dogs?org=o1&q=x', { org: 'o1' })).toBe('https://rondje.test/dogs?org=o1')
  })
})

describe('clampDescription', () => {
  it('keeps short texts and cuts long ones at a word, with an ellipsis', () => {
    expect(clampDescription('  Kort  en\ngoed. ')).toBe('Kort en goed.')
    const long = 'woord '.repeat(60)
    const cut = clampDescription(long)
    expect(cut.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(cut).toMatch(/woord…$/)
  })
})

describe('pageMetadata', () => {
  it('gives a page its own canonical, card and X fields, with the name from one place', () => {
    const meta = pageMetadata({ path: '/cities/madrid?x=1', title: 'Honden uitlaten in Madrid', description: 'Gratis wandelen.' })
    expect(meta.alternates?.canonical).toBe('https://rondje.test/cities/madrid')
    expect(meta.openGraph).toMatchObject({ title: 'Honden uitlaten in Madrid', url: 'https://rondje.test/cities/madrid', siteName: APP_NAME, images: ['/og.png'] })
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', title: 'Honden uitlaten in Madrid', description: 'Gratis wandelen.' })
    expect(meta.robots).toBeUndefined()
  })

  it('keeps pages out of search results on request', () => {
    expect(pageMetadata({ path: '/login', title: 'x', description: 'y', robots: 'noindex' }).robots).toEqual({ index: false, follow: true })
    expect(pageMetadata({ path: '/dogs/a', title: 'x', description: 'y', robots: 'none' }).robots).toEqual({ index: false, follow: false })
    expect(pageMetadata({ path: '/', title: 'Home', absoluteTitle: true, description: 'y' }).title).toEqual({ absolute: 'Home' })
  })
})

describe('structured data', () => {
  it('names the organisation and the website after APP_NAME, with Instagram only when it is set', () => {
    const graph = siteGraph() as { '@graph': Record<string, unknown>[] }
    const [organization, website] = graph['@graph']
    expect(organization).toMatchObject({ '@type': 'Organization', name: APP_NAME, url: 'https://rondje.test/', logo: 'https://rondje.test/icon-512.png' })
    expect(organization.sameAs).toBeUndefined()
    expect(website).toMatchObject({ '@type': 'WebSite', name: APP_NAME, url: 'https://rondje.test/' })
    expect(serializeJsonLd(graph)).toContain(`"@type":"WebSite","@id":"https://rondje.test/#website","name":"${APP_NAME}"`)
    const withInstagram = siteGraph({ instagram: 'rondje.app' }) as { '@graph': Record<string, unknown>[] }
    expect(withInstagram['@graph'][0].sameAs).toEqual(['https://www.instagram.com/rondje.app/'])
  })

  it('makes breadcrumbs with absolute addresses', () => {
    expect(breadcrumbs([{ name: 'Steden', path: '/cities' }, { name: 'Madrid', path: '/cities/madrid' }])).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Steden', item: 'https://rondje.test/cities' },
        { '@type': 'ListItem', position: 2, name: 'Madrid', item: 'https://rondje.test/cities/madrid' },
      ],
    })
  })

  it('describes a group walk as a free, scheduled event at its meeting point', () => {
    const walk = {
      name: 'Paseo en grupo con Protectora',
      description: 'Paseo tranquilo por la huerta.',
      startsAt: new Date('2026-10-10T08:00:00Z'),
      durationMin: 75,
      path: '/cities/madrid#groepswandeling-gw1',
      meetingPoint: 'Entrada de la protectora',
      city: 'Madrid',
      country: 'ES',
      image: null,
      shelter: { name: 'Protectora', website: 'https://protectora.example' },
    }
    const event = groupWalkEvent(walk)
    expect(event).toMatchObject({
      '@type': 'Event',
      description: 'Paseo tranquilo por la huerta.',
      startDate: '2026-10-10T08:00:00.000Z',
      endDate: '2026-10-10T09:15:00.000Z',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      isAccessibleForFree: true,
      url: 'https://rondje.test/cities/madrid#groepswandeling-gw1',
      image: ['https://rondje.test/og.png'],
      location: { '@type': 'Place', name: 'Entrada de la protectora', address: { '@type': 'PostalAddress', addressLocality: 'Madrid', addressCountry: 'ES' } },
      organizer: { '@type': 'Organization', name: 'Protectora', url: 'https://protectora.example' },
    })
    // Never a street address: the place is the meeting point in the city.
    expect((event.location as { address: Record<string, unknown> }).address).not.toHaveProperty('streetAddress')
    // Without a meeting point, the shelter's name; the shelter's own image when it has one.
    expect(groupWalkEvent({ ...walk, meetingPoint: ' ', image: 'https://blob.example/cover.jpg' })).toMatchObject({
      location: { name: 'Protectora' },
      image: ['https://blob.example/cover.jpg'],
    })
  })

  it('can never close its script block early', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('<')
  })
})

type Tree = { [key: string]: string | Tree }
const get = (tree: Tree, key: string) => key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part], tree) as string

describe('descriptions fit in a search result, in every language', () => {
  // The descriptions of the pages in the sitemap (see each page's generateMetadata).
  const KEYS = [
    'meta.description',
    'dogs.lede',
    'directory.metaDescription',
    'groupWalks.lede',
    'shelter.lede',
    'about.metaDescription',
    'impact.page.metaDescription',
    'support.metaDescription',
    'suggest.metaDescription',
    'flyer.lede',
    'help.metaDescription',
    'contact.lede',
    'safety.lede',
    'cities.indexDescription',
    'cities.metaDescription',
  ]
  const longestCity = cityList().reduce((a, b) => (b.name.length > a.length ? b.name : a), '')

  for (const [locale, messages] of Object.entries({ nl, en, es, fr })) {
    it(`${locale}: at most ${DESCRIPTION_MAX} characters, also for the longest city name`, () => {
      for (const key of KEYS) {
        const text = get(messages as Tree, key).replaceAll('{app}', APP_NAME).replaceAll('{city}', longestCity)
        expect(text.length, `${locale}: ${key}`).toBeLessThanOrEqual(DESCRIPTION_MAX)
      }
    })

    it(`${locale}: each legal text has its own description`, () => {
      const docs = ['terms', 'privacy', 'conduct', 'safety', 'shelters', 'cookies']
      const descriptions = docs.map((doc) => {
        const raw = readFileSync(path.join(import.meta.dirname, '../../content/legal', locale, `${doc}.md`), 'utf8')
        return parseFrontMatter(raw).data.description ?? ''
      })
      for (const [i, text] of descriptions.entries()) {
        expect(text.length, `${locale}/${docs[i]}`).toBeGreaterThan(40)
        expect(text.length, `${locale}/${docs[i]}`).toBeLessThanOrEqual(DESCRIPTION_MAX)
      }
      expect(new Set(descriptions).size).toBe(docs.length)
    })
  }
})
