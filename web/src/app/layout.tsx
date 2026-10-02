import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource-variable/figtree/wght.css'
import '@fontsource/caveat/latin-600.css'
import 'leaflet/dist/leaflet.css'
import './globals.css'
import './app-shell.css'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { isDemoMode } from '@/db'
import { Footer } from '@/components/Footer'
import { FooterSwitch } from '@/components/shell/FooterSwitch'
import { ActiveWalkBanner } from '@/components/ActiveWalkBanner'
import { Header } from '@/components/Header'
import { TabBar } from '@/components/TabBar'
import { siteUrl } from '@/lib/site'
import { unreadCount } from '@/server/queries'
import { getViewer } from '@/server/session'
import { activeWalkFor } from '@/server/walks'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('title'), template: '%s · Rondje' },
    description: t('description'),
    applicationName: 'Rondje',
    manifest: '/manifest.webmanifest',
    icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
    openGraph: { title: t('title'), description: t('description'), images: ['/og.png'], siteName: 'Rondje', type: 'website' },
    twitter: { card: 'summary_large_image' },
    appleWebApp: { capable: true, title: 'Rondje', statusBarStyle: 'default' },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1310' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const viewer = await getViewer()
  const t = await getTranslations()
  const unread = viewer ? await unreadCount(viewer.userId) : 0
  const activeWalk = viewer?.profile ? await activeWalkFor(viewer) : null
  // Signed in with a profile, the website works like the app: tab bar on phones, a short footer.
  const tabs = viewer?.profile
    ? [
        { href: '/dogs', label: t('shell.tabs.discover'), icon: 'paw' as const },
        { href: '/requests', label: t('shell.tabs.requests'), icon: 'calendar' as const, badge: unread },
        viewer.orgs[0]
          ? { href: `/shelter/${viewer.orgs[0].id}`, label: t('shell.tabs.shelter'), icon: 'building' as const }
          : { href: '/my-dogs', label: t('shell.tabs.myDogs'), icon: 'home' as const },
        { href: '/profile', label: t('shell.tabs.me'), icon: 'user' as const },
      ]
    : null

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <div className={`shell${tabs ? ' has-tabbar app-mode' : ''}`}>
            <a href="#main" className="skip-link">
              {t('nav.skip')}
            </a>
            {isDemoMode() ? <div className="demo-banner">{t('footer.demo')}</div> : null}
            <Header viewer={viewer} />
            {activeWalk ? <ActiveWalkBanner {...activeWalk} /> : null}
            <main className="main" id="main">
              {children}
            </main>
            {viewer ? <FooterSwitch full={<Footer />} compact={<Footer compact />} /> : <Footer />}
            {tabs ? <TabBar tabs={tabs} label={t('shell.tabsLabel')} /> : null}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
