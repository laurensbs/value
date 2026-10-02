import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

/**
 * The launch hub as its own app on the home screen ("Zet op beginscherm"): it opens straight
 * in /admin/launch, without browser bars. Public on purpose (browsers fetch manifests without
 * cookies); it holds nothing private. The page itself stays admin only.
 */
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: '/admin/launch',
    name: 'Lanceerhub',
    short_name: 'Lanceerhub',
    description: 'Lanceerlijst, berichtenbank en cijfers van Rondje.',
    start_url: '/admin/launch',
    scope: '/admin/launch',
    display: 'standalone',
    background_color: '#f4f6f0',
    theme_color: '#1f5a3d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json' } })
}
