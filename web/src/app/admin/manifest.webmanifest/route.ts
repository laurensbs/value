import type { MetadataRoute } from 'next'
import { APP_NAME } from '@/lib/site'

export const dynamic = 'force-static'

/**
 * Beheer as its own app on the home screen ("Zet op beginscherm"): it opens on /admin without
 * browser bars, and every admin page (/admin/**) stays inside it. The only admin manifest; the
 * admin layout links it. Public on purpose (browsers fetch manifests without cookies): it holds
 * nothing private, and the pages themselves stay admin only.
 */
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: '/admin',
    name: 'Beheer',
    short_name: 'Beheer',
    description: `Beheer van ${APP_NAME}: meldingen, opvangen, lancering, marketing en cijfers.`,
    lang: 'nl',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
    background_color: '#f4f6f0',
    theme_color: '#1f5a3d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Moderatie', url: '/admin/moderation', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Lancering', url: '/admin/launch', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Cijfers', url: '/admin/numbers', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  }
  return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json' } })
}
