// The hub installs as its own app ("Rondje Hub") next to Rondje, opening straight on /hub.
export function GET() {
  return Response.json(
    {
      id: '/hub',
      name: 'Rondje Hub',
      short_name: 'Hub',
      description: 'Plan, partners, mails, content, cijfers en kosten voor Rondje.',
      start_url: '/hub',
      scope: '/hub',
      display: 'standalone',
      background_color: '#f4f6f0',
      theme_color: '#1f5a3d',
      icons: [
        { src: '/hub-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/hub-icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/hub-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Mails', url: '/hub/mails' },
        { name: 'Partners', url: '/hub/partners' },
        { name: 'Cijfers', url: '/hub/cijfers' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  )
}
