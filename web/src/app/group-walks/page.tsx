import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { GroupWalkButton } from '@/components/GroupWalkButton'
import { Icon } from '@/components/Icon'
import { DogTile } from '@/components/landing/DogTile'
import { Flag } from '@/components/landing/Flag'
import { COLLIE, GOLDEN, TRIO } from '@/components/landing/looks'
import { PageHero } from '@/components/landing/PageHero'
import { COUNTRIES, isCountry } from '@/lib/countries'
import { guessCountry } from '@/lib/guess-country'
import { myGroupSignups, upcomingGroupWalks } from '@/server/queries'
import { getViewer } from '@/server/session'
import { pageMetadata } from '@/lib/seo'
import '../landing.css'

export async function generateMetadata() {
  const t = await getTranslations('groupWalks')
  return pageMetadata({ path: '/group-walks', title: t('title'), description: t('lede') })
}

export default async function GroupWalksPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const sp = await searchParams
  const viewer = await getViewer()
  const country = isCountry(sp.country) ? sp.country : isCountry(viewer?.profile?.country) ? viewer.profile.country : await guessCountry()
  const [t, format, walks, joined] = await Promise.all([
    getTranslations(),
    getFormatter(),
    upcomingGroupWalks({ country }),
    viewer ? myGroupSignups(viewer.userId) : new Set<string>(),
  ])

  const byDay = new Map<string, typeof walks>()
  for (const w of walks) {
    const day = format.dateTime(w.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })
    byDay.set(day, [...(byDay.get(day) ?? []), w])
  }

  return (
    <div className="stack-l">
      <PageHero
        eyebrow={t('landing.pages.groupWalks')}
        title={t('groupWalks.title')}
        lede={t('groupWalks.lede')}
        art={{ dog: GOLDEN, friend: COLLIE, tone: 'green', badge: <Icon name="users" /> }}
      />
      <nav className="choices lp-touch" aria-label={t('common.country')}>
        {COUNTRIES.map((c) => (
          <Link key={c} href={`/group-walks?country=${c}`} className={`chip${c === country ? ' on' : ''}`}>
            <Flag country={c} /> {t(`common.countries.${c}`)}
          </Link>
        ))}
      </nav>
      {walks.length === 0 ? (
        <div className="lp-card lp-tip lp-empty">
          <div className="lp-mini-fan" aria-hidden="true">
            {TRIO.map((dog, i) => (
              <span key={dog.tile} className={`n${i}`}>
                <DogTile dog={dog} />
              </span>
            ))}
          </div>
          <div>
            <p>{t('groupWalks.empty')}</p>
            <Link href={`/shelters?country=${country}`} className="button primary">
              {t('nav.shelters')}
            </Link>
          </div>
        </div>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <section key={day} className="stack-s">
            <h2 className="day-title">{day}</h2>
            <ul className="list lp-touch">
              {list.map((w) => (
                <li key={w.id} className="list-item lp-walk">
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
                      <GroupWalkButton
                        id={w.id}
                        joined={joined.has(w.id)}
                        full={w.booked >= w.capacity}
                        signedIn={Boolean(viewer?.profile)}
                        needsQuiz={Boolean(viewer?.profile && !viewer.profile.quizPassedAt && !viewer.orgs.some((o) => o.id === w.orgId))}
                      />
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
