import type { Metadata } from 'next'
import { APP_NAME, siteUrl } from './site'

/** Google shows about 155–160 characters of a description; longer ones are cut off mid-sentence. */
export const DESCRIPTION_MAX = 155

/** A description of at most `max` characters: whitespace tidied, cut at a word when it is too long. */
export function clampDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`
}

/** The one address search engines should use for a page: this site's origin and the path, never a query or anchor. */
export function canonicalUrl(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '')
  return new URL(clean || '/', `${siteUrl()}/`).href
}

export interface PageSeo {
  /** The page's path; a query (?org=, ?claim=, ?q=) never becomes part of the canonical address. */
  path: string
  /** The page title; the layout adds " · <name>". */
  title: string
  /** True when `title` already is the whole title (the home page), so the name is not added twice. */
  absoluteTitle?: boolean
  description: string
  /** The title of the preview card in a chat app, when it differs from `title`. */
  shareTitle?: string
  images?: string[]
  /** 'noindex': keep it out of search results but follow its links; 'none': neither. */
  robots?: 'noindex' | 'none'
}

/**
 * Everything a public page tells search engines and chat apps: title, description, canonical address,
 * the preview card (og:title, og:description, og:url) and the same for X. The layout's openGraph is
 * replaced as a whole by a page's, so the site name and image are set here again.
 */
export function pageMetadata(page: PageSeo): Metadata {
  const url = canonicalUrl(page.path)
  const description = clampDescription(page.description)
  const shareTitle = page.shareTitle ?? page.title
  const images = page.images ?? ['/og.png']
  return {
    title: page.absoluteTitle ? { absolute: page.title } : page.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: shareTitle, description, url, siteName: APP_NAME, type: 'website', images },
    twitter: { card: 'summary_large_image', title: shareTitle, description, images },
    ...(page.robots ? { robots: { index: false, follow: page.robots === 'noindex' } } : {}),
  }
}

// Structured data (JSON-LD). Only what is really there: no ratings, reviews or business listings.

type Thing = Record<string, unknown>

/** The organisation and the website, for the home page: the name Google shows next to results comes from here. */
export function siteGraph(options: { instagram?: string | null } = {}): Thing {
  const home = canonicalUrl('/')
  const organization = {
    '@type': 'Organization',
    '@id': `${home}#organization`,
    name: APP_NAME,
    url: home,
    logo: new URL('/icon-512.png', home).href,
    ...(options.instagram ? { sameAs: [`https://www.instagram.com/${options.instagram}/`] } : {}),
  }
  const website = {
    '@type': 'WebSite',
    '@id': `${home}#website`,
    name: APP_NAME,
    url: home,
    publisher: { '@id': organization['@id'] },
  }
  return { '@context': 'https://schema.org', '@graph': [organization, website] }
}

/** Broodkruimels: from the list of cities to one city. */
export function breadcrumbs(items: { name: string; path: string }[]): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: canonicalUrl(item.path) })),
  }
}

export interface GroupWalkEvent {
  name: string
  startsAt: Date
  durationMin: number
  /** The page that lists the walk. */
  path: string
  shelter: { name: string; address: string; city: string; country: string; website: string | null }
}

/** A real group walk at a shelter as a schema.org Event. Never call this for example walks. */
export function groupWalkEvent(walk: GroupWalkEvent): Thing {
  const { shelter } = walk
  const end = new Date(walk.startsAt.getTime() + walk.durationMin * 60_000)
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: walk.name,
    startDate: walk.startsAt.toISOString(),
    endDate: end.toISOString(),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    isAccessibleForFree: true,
    url: canonicalUrl(walk.path),
    location: {
      '@type': 'Place',
      name: shelter.name,
      address: {
        '@type': 'PostalAddress',
        ...(shelter.address.trim() ? { streetAddress: shelter.address.trim() } : {}),
        addressLocality: shelter.city,
        addressCountry: shelter.country,
      },
    },
    organizer: { '@type': 'Organization', name: shelter.name, ...(shelter.website ? { url: shelter.website } : {}) },
  }
}

/**
 * JSON for inside a <script type="application/ld+json">. "<" is escaped, so a name with "</script>"
 * in it can never end the block early and become markup.
 */
export function serializeJsonLd(data: Thing | Thing[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
