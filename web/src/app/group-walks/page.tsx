import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { GroupWalkButton } from '@/components/GroupWalkButton'
import { Icon } from '@/components/Icon'
import { COUNTRIES, COUNTRY_INFO, isCountry } from '@/lib/countries'
import { guessCountry } from '@/lib/guess-country'
import { myGroupSignups, upcomingGroupWalks } from '@/server/queries'
import { getViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('groupWalks')
  return { title: t('title'), description: t('lede') }
}

export default async function GroupWalksPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const sp = await searchParams
  const viewer = await getViewer()
  const country = isCountry(sp.country) ? sp.country : isCountry(viewer?.profile?.country) ? viewer.profile.country : await guessCountry()
  const t = await getTranslations()
  const format = await getFormatter()
  const walks = await upcomingGroupWalks({ country })
  const joined = viewer ? await myGroupSignups(viewer.userId) : new Set<string>()

  const byDay = new Map<string, typeof walks>()
  for (const w of walks) {
    const day = format.dateTime(w.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })
    byDay.set(day, [...(byDay.get(day) ?? []), w])
  }

  return (
    <div className="stack-l">
      <header className="stack-s">
        <h1>{t('groupWalks.title')}</h1>
        <p className="lede">{t('groupWalks.lede')}</p>
      </header>
      <nav className="choices" aria-label={t('common.country')}>
        {COUNTRIES.map((c) => (
          <Link key={c} href={`/group-walks?country=${c}`} className={`chip${c === country ? ' on' : ''}`}>
            {COUNTRY_INFO[c].flag} {t(`common.countries.${c}`)}
          </Link>
        ))}
      </nav>
      {walks.length === 0 ? (
        <div className="card flat stack-s">
          <p>{t('groupWalks.empty')}</p>
          <div>
            <Link href={`/shelters?country=${country}`} className="button secondary small">
              {t('nav.shelters')}
            </Link>
          </div>
        </div>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <section key={day} className="stack-s">
            <h2 className="day-title">{day}</h2>
            <ul className="list">
              {list.map((w) => (
                <li key={w.id} className="list-item">
                  <div className="time-badge" aria-hidden="true">
                    {format.dateTime(w.startsAt, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="grow stack-s">
                    <div className="row">
                      <strong>{w.orgName}</strong>
                      {w.isDemo ? <span className="pill ball">{t('common.example')}</span> : null}
                    </div>
                    <p className="muted small">
                      <Icon name="pin" size={14} /> {w.city} · {t('groupWalks.at', { place: w.meetingPoint })}
                    </p>
                    <p className="small">
                      {t('common.minutes', { n: w.durationMin })} · {t('groupWalks.level', { level: t(`dogs.level.${w.level}`) })} ·{' '}
                      <strong>{t('groupWalks.spots', { left: Math.max(0, w.capacity - w.booked) })}</strong>
                    </p>
                    {w.notes ? <p className="muted small">{w.notes}</p> : null}
                    <div className="spread">
                      <Link href={`/dogs?org=${w.orgId}`} className="link-button small">
                        {t('groupWalks.meetDogs')}
                      </Link>
                      <GroupWalkButton id={w.id} joined={joined.has(w.id)} full={w.booked >= w.capacity} signedIn={Boolean(viewer?.profile)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="notice small">
        <Icon name="shield" size={16} /> {t('groupWalks.idNote')}
      </p>
    </div>
  )
}
