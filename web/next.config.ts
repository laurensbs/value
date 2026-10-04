import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // When this version was built: the sitemap's last change for pages without their own date.
  env: { SITE_BUILT_AT: new Date().toISOString() },
  // PGlite ships WebAssembly and data files; load it from node_modules at runtime.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Legal texts and the about story are read from disk at request time; ship them with the function.
  outputFileTracingIncludes: {
    '/legal/*': ['./content/legal/**/*.md'],
    // The sitemap reads each legal text's date.
    '/sitemap.xml': ['./content/legal/**/*.md'],
    '/about': ['./content/about/**/*.md'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
  // Short, easy-to-say links for flyers and social media.
  async redirects() {
    return [
      { source: '/over-ons', destination: '/about', permanent: true },
      { source: '/steun', destination: '/support', permanent: true },
      { source: '/tip', destination: '/suggest', permanent: true },
      // The links people (and app stores) expect for the legal texts.
      { source: '/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/terms', destination: '/legal/terms', permanent: true },
      { source: '/voorwaarden', destination: '/legal/terms', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=()' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
