import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { HubCelebration } from '@/components/hub/HubCelebration'
import { HubIcon } from '@/components/hub/HubIcon'
import { HubSideNav, HubTabs } from '@/components/hub/HubNav'
import { HubToasts } from '@/components/hub/HubToasts'
import { followUpsDue, partnerList } from '@/lib/hub/game'
import { getHub } from '@/server/hub'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'
import './hub.css'

export const metadata: Metadata = {
  title: { default: 'Hub', template: '%s · Rondje Hub' },
  description: 'Jouw marketing-hub voor Rondje: plan, partners, mails, content, cijfers en kosten.',
  robots: { index: false, follow: false },
  manifest: '/hub/manifest.webmanifest',
  icons: { icon: '/hub-icon-192.png', apple: '/hub-apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Rondje Hub', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1310' },
  ],
}

/**
 * The founder's hub: only for admins (ADMIN_EMAILS or the admin role). It keeps its own notes and
 * only counts what happens in the app; it never sends anything by itself.
 */
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (!viewer) redirect('/login?next=/hub')
  if (!viewer.isAdmin) notFound()

  const [hub, native] = await Promise.all([getHub(), isNativeRequest()])
  const now = new Date()
  const followUps = followUpsDue(partnerList(hub.state, now), now).length
  const celebrate = hub.levelUp || hub.fresh.length > 0

  return (
    <div className="hub-root">
      <aside className="hub-side">
        <Link href="/hub" className="hub-brand">
          <span className="hub-brand-mark">
            <HubIcon name="paw" size={20} />
          </span>
          <span>
            Rondje Hub
            <small>Alles voor de lancering</small>
          </span>
        </Link>
        <Link href="/hub" className="hub-side-level">
          <span className="level-badge" style={{ '--p': hub.level.progress } as React.CSSProperties}>
            {hub.level.level}
          </span>
          <span>
            <strong>{hub.level.name}</strong>
            <span className="small">{hub.xp.total} punten</span>
          </span>
        </Link>
        <HubSideNav followUps={followUps} native={native} />
        <div className="hub-side-foot">
          <Link href="/">Naar de app</Link>
          <Link href="/admin">Beheer</Link>
        </div>
      </aside>

      <div className="hub-body">
        <header className="hub-top">
          <Link href="/hub" className="hub-brand">
            <span className="hub-brand-mark">
              <HubIcon name="paw" size={20} />
            </span>
            <span>
              Hub
              <small>Rondje</small>
            </span>
          </Link>
          <Link href="/hub" className="hub-top-level" aria-label={`Niveau ${hub.level.level}, ${hub.level.name}, ${hub.xp.total} punten`}>
            <span>{hub.xp.total} pt</span>
            <span className="level-badge" style={{ '--p': hub.level.progress } as React.CSSProperties}>
              {hub.level.level}
            </span>
          </Link>
        </header>
        {children}
      </div>

      <HubTabs followUps={followUps} />
      <HubToasts />
      {celebrate ? (
        <HubCelebration
          level={hub.levelUp ? { level: hub.level.level, name: hub.level.name } : null}
          milestones={hub.fresh.map((m) => ({ id: m.id, title: m.title, text: m.text, xp: m.xp }))}
        />
      ) : null}
    </div>
  )
}
