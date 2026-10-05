import type { MetadataRoute } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

const ICON = [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]

/**
 * The web app manifest, in the visitor's language. Rondje opens on Today, and a long press on its
 * icon (Android) leads straight to the dogs, the walks or the notifications. The id is the old start
 * address, so phones that already have Rondje on their home screen keep it as the same app.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations()
  return {
    id: '/dogs',
    name: 'Rondje',
    short_name: 'Rondje',
    description: t('manifest.description'),
    lang: await getLocale(),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f6f0',
    theme_color: '#1f5a3d',
    categories: ['lifestyle', 'social'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: t('manifest.dogs'), short_name: t('nav.dogs'), url: '/dogs', icons: ICON },
      { name: t('manifest.requests'), short_name: t('nav.requests'), url: '/requests', icons: ICON },
      { name: t('manifest.notifications'), short_name: t('manifest.notifications'), url: '/notifications', icons: ICON },
    ],
  }
}
