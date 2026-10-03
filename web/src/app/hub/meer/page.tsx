import Link from 'next/link'
import { HubIcon, type HubIconName } from '@/components/hub/HubIcon'
import { costSummary, euro } from '@/lib/hub/game'
import { getHub } from '@/server/hub'
import { isNativeRequest } from '@/server/native'

export const metadata = { title: 'Meer' }

/** On a phone, the bottom tabs hold the daily things; the rest lives here. */
export default async function HubMore() {
  const [hub, native] = await Promise.all([getHub(), isNativeRequest()])
  const posted = Object.values(hub.state.content).filter((c) => c.postedAt).length
  const items: { href: string; title: string; text: string; icon: HubIconName }[] = [
    { href: '/hub/cijfers', title: 'Cijfers', text: `${hub.counts.walks} rondjes, ${hub.counts.walkers} wandelaars`, icon: 'chart' },
    // The app shells never show anything about money (App Store and Play rules).
    ...(native ? [] : [{ href: '/hub/kosten', title: 'Kosten', text: `${euro(costSummary(hub.state.costs).perMonth, 0)} per maand`, icon: 'euro' as const }]),
    { href: '/hub/content', title: 'Content', text: `${posted} video’s gepost`, icon: 'video' },
    { href: '/hub/jij', title: 'Jij', text: 'Gegevens, ritme, punten', icon: 'user' },
  ]
  return (
    <div className="hub-page">
      <div className="hub-head">
        <h1>Meer</h1>
      </div>
      <nav className="hub-more" aria-label="Meer">
        {items.map((i) => (
          <Link key={i.href} href={i.href}>
            <span className="hub-more-icon">
              <HubIcon name={i.icon} />
            </span>
            <span className="stack-s" style={{ gap: 2 }}>
              <strong>{i.title}</strong>
              <span className="muted small">{i.text}</span>
            </span>
          </Link>
        ))}
      </nav>
      <div className="hub-actions">
        <Link href="/" className="button ghost small">
          Naar de app
        </Link>
        <Link href="/admin" className="button ghost small">
          Beheer
        </Link>
      </div>
    </div>
  )
}
