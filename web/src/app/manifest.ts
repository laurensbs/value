import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rondje',
    short_name: 'Rondje',
    description: 'Een vast rondje met een hond die op je wacht.',
    start_url: '/dogs',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f6f0',
    theme_color: '#1f5a3d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
