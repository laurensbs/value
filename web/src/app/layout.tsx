import 'leaflet/dist/leaflet.css'
import './globals.css'
import './app-shell.css'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { isDemoMode } from '@/db'
import { Footer } from '@/components/Footer'
import { Analytics } from '@/components/Analytics'
import { FooterSwitch } from '@/components/shell/FooterSwitch'
import { ActiveWalkBanner } from '@/components/ActiveWalkBanner'
import { Header } from '@/components/Header'
import { OfflineReady } from '@/components/OfflineReady'
import { TabBar, type Tab } from '@/components/TabBar'
import { siteUrl } from '@/lib/site'
import { fontVariables } from './fonts'
import { unreadCounts } from '@/server/queries'
import { rolesOf } from '@/server/progress'
import { getSession, getViewer } from '@/server/session'
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
  // Every page waits for this: once the session is known, everything else is asked at the same time.
  const userId = (await getSession())?.user.id
  const [locale, t, viewer, unread, activeWalk] = await Promise.all([
    getLocale(),
    getTranslations(),
    getViewer(),
    userId ? unreadCounts(userId) : { all: 0, walks: 0 },
    userId ? activeWalkFor(userId) : null,
  ])
  // The tabs follow why someone is here: walkers find dogs, owners see their own dogs, both get both.
  const roles = viewer?.profile ? rolesOf(viewer.profile) : null
  const tabs: Tab[] | null =
    viewer?.profile && roles
      ? [
          { href: '/', label: t('nav.today'), icon: 'sun' },
          ...(roles.walker ? [{ href: '/dogs', label: t('nav.dogs'), icon: 'paw' as const }] : []),
          { href: '/requests', label: t('nav.requests'), icon: 'route', badge: unread.walks },
          ...(viewer.orgs[0]
            ? [{ href: `/shelter/${viewer.orgs[0].id}`, label: t('nav.shelter'), icon: 'building' as const }]
            : roles.owner
              ? [{ href: '/my-dogs', label: t('nav.myDogs'), icon: 'home' as const }]
              : []),
          { href: '/profile', label: t('nav.profile'), icon: 'user' },
        ]
      : null

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <NextIntlClientProvider>
          <div className={`shell${tabs ? ' has-tabbar app-mode' : ''}`}>
            <a href="#main" className="skip-link">
              {t('nav.skip')}
            </a>
            {isDemoMode() ? <div className="demo-banner">{t('footer.demo')}</div> : null}
            <Header viewer={viewer} unread={unread.all} />
            {activeWalk ? <ActiveWalkBanner {...activeWalk} /> : null}
            <main className="main" id="main">
              {children}
            </main>
            {viewer ? <FooterSwitch full={<Footer />} compact={<Footer compact />} /> : <Footer />}
            {tabs ? <TabBar tabs={tabs} label={t('shell.tabsLabel')} /> : null}
          </div>
          <OfflineReady lang={locale} />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
