import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon, type IconName } from '@/components/Icon'
import { APP_NAME } from '@/lib/site'

interface Item {
  key: 'flyerOwner' | 'flyerWalker' | 'poster' | 'cities' | 'shelters' | 'suggest' | 'messages'
  icon: IconName
  href: string | null
  extra?: React.ReactNode
}

/** What is ready already (flyers, posters, city pages …), each with a line on how to use it. */
export async function Material({ topCities, shelters }: { topCities: { label: string; href: string }[]; shelters: { id: string; name: string }[] }) {
  const t = await getTranslations('marketing.material')
  const items: Item[] = [
    { key: 'flyerOwner', icon: 'home', href: '/flyer?for=owner' },
    { key: 'flyerWalker', icon: 'paw', href: '/flyer?for=walker' },
    {
      key: 'poster',
      icon: 'building',
      href: shelters[0] ? `/shelter/${shelters[0].id}/poster` : null,
      extra:
        shelters.length > 1 ? (
          <span className="mk-material-links">
            {shelters.map((s) => (
              <Link key={s.id} href={`/shelter/${s.id}/poster`}>
                {s.name}
              </Link>
            ))}
          </span>
        ) : null,
    },
    {
      key: 'cities',
      icon: 'map',
      href: '/cities',
      extra: topCities.length ? (
        <span className="mk-material-links">
          <span className="muted">{t('cities.top')}</span>
          {topCities.map((c) => (
            <Link key={c.href} href={c.href}>
              {c.label}
            </Link>
          ))}
        </span>
      ) : null,
    },
    { key: 'shelters', icon: 'list', href: '/shelters' },
    { key: 'suggest', icon: 'heart', href: '/suggest' },
    { key: 'messages', icon: 'chat', href: '/admin/launch#berichten' },
  ]

  return (
    <ul className="mk-material">
      {items.map((item) => (
        <li key={item.key} className="card mk-material-item">
          <span className="mk-material-icon" aria-hidden="true">
            <Icon name={item.icon} size={20} />
          </span>
          <div className="stack-s">
            <h3>{t(`${item.key}.title`)}</h3>
            <p className="small">{t(`${item.key}.how`, { app: APP_NAME })}</p>
            {item.href ? null : <p className="muted small">{t('poster.none')}</p>}
            {item.extra}
            {item.href ? (
              <Link href={item.href} className="mk-go">
                {t('open')} →
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
