import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

/** Search engines see the public pages only; previews and test deployments are not indexed at all. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/walk/', '/follow/', '/chat/', '/my-dogs', '/requests', '/notifications', '/profile', '/onboarding', '/shelter/', '/r/', '/banned'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
