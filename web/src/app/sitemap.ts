import type { MetadataRoute } from 'next'
import { LEGAL_DOCS, legalHtml } from '@/lib/legal'
import { canonicalUrl } from '@/lib/seo'
import { indexableCities } from '@/server/cities'

// Asked on every request, not frozen at build time: a city enters the sitemap as soon as its page
// stops saying noindex (the first real dog, walk or partner shelter), not at the next deploy.
export const dynamic = 'force-dynamic'

const PAGES = ['/', '/dogs', '/shelters', '/group-walks', '/shelter', '/about', '/waarom', '/support', '/suggest', '/flyer', '/help', '/contact', '/safety', '/cities']

/** A date from front matter ("2026-10-02"), or null. */
function day(value: string | undefined): Date | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null
}

/**
 * The public pages, the legal texts, and only the cities with something real on them (see
 * indexableCities). Dog pages are left out on purpose: private owners' pages are not for search engines.
 * Last change: the city's own activity, a legal text's date, otherwise when this version was built.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const built = new Date(process.env.SITE_BUILT_AT ?? Date.now())
  // The legal texts carry the same date in every language; Dutch is the source.
  const [cities, legal] = await Promise.all([indexableCities(), Promise.all(LEGAL_DOCS.map((d) => legalHtml(d, 'nl')))])
  return [
    ...PAGES.map((p) => ({ url: canonicalUrl(p), lastModified: built, changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.7 })),
    ...[...cities].sort(([a], [b]) => a.localeCompare(b)).map(([slug, changed]) => ({ url: canonicalUrl(`/cities/${slug}`), lastModified: changed, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...LEGAL_DOCS.map((d, i) => ({ url: canonicalUrl(`/legal/${d}`), lastModified: day(legal[i]?.data.updated) ?? built, changeFrequency: 'monthly' as const, priority: 0.3 })),
  ]
}
