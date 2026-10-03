import type { MetadataRoute } from 'next'
import { LEGAL_DOCS } from '@/lib/legal'
import { siteUrl } from '@/lib/site'
import { publicCities } from '@/server/cities'

const PAGES = ['', '/dogs', '/shelters', '/group-walks', '/shelter', '/about', '/waarom', '/support', '/suggest', '/flyer', '/help', '/safety', '/cities']

/** The public pages and one page per city. Dog pages are left out on purpose: private owners' pages are not for search engines. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const cities = await publicCities()
  return [
    ...PAGES.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...cities.map((c) => ({ url: `${base}/cities/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...LEGAL_DOCS.map((d) => ({ url: `${base}/legal/${d}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
  ]
}
