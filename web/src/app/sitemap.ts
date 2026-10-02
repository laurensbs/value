import type { MetadataRoute } from 'next'
import { LEGAL_DOCS } from '@/lib/legal'
import { siteUrl } from '@/lib/site'

const PAGES = ['', '/dogs', '/shelters', '/group-walks', '/shelter', '/about', '/support', '/suggest', '/help', '/safety']

/** The public pages. Dog pages are left out on purpose: private owners' pages are not for search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return [
    ...PAGES.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...LEGAL_DOCS.map((d) => ({ url: `${base}/legal/${d}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
  ]
}
