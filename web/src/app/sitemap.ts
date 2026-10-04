import type { MetadataRoute } from 'next'
import { LEGAL_DOCS, legalFrontMatter } from '@/lib/legal'
import { canonicalUrl } from '@/lib/seo'
import { indexableCities } from '@/server/cities'

// Asked on every request, not frozen at build time: a city enters the sitemap as soon as its page
// stops saying noindex (the first real dog, walk or partner shelter), not at the next deploy.
export const dynamic = 'force-dynamic'

const PAGES = ['/', '/aanmelden', '/dogs', '/shelters', '/group-walks', '/shelter', '/about', '/waarom', '/support', '/suggest', '/flyer', '/help', '/contact', '/safety', '/school', '/cities']

/** A day from front matter ("2026-10-02"), or undefined. */
function day(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

/**
 * The public pages, the legal texts, and only the cities with something real on them (see
 * indexableCities). Dog pages are left out on purpose: private owners' pages are not for search engines.
 * A last-change date only where it is true: a city's last real change and a legal text's own date.
 * The other pages have none, because a date that moves with every deploy teaches Google to ignore it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The legal texts carry the same date in every language; Dutch is the source.
  const [cities, legal] = await Promise.all([indexableCities(), Promise.all(LEGAL_DOCS.map((d) => legalFrontMatter(d, 'nl')))])
  return [
    ...PAGES.map((p) => ({ url: canonicalUrl(p), changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.7 })),
    // A city's date is only the day: when exactly a private owner changed their dog is nobody's business.
    ...[...cities]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slug, changed]) => ({ url: canonicalUrl(`/cities/${slug}`), lastModified: changed.toISOString().slice(0, 10), changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...LEGAL_DOCS.map((d, i) => ({ url: canonicalUrl(`/legal/${d}`), lastModified: day(legal[i]?.updated), changeFrequency: 'monthly' as const, priority: 0.3 })),
  ]
}
