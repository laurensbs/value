import { getFormatter, getTranslations } from 'next-intl/server'
import { GroupWalkButton } from '../GroupWalkButton'
import { Icon } from '../Icon'
import type { publicOrg, upcomingGroupWalks } from '@/server/queries'

type Org = NonNullable<Awaited<ReturnType<typeof publicOrg>>>
type GroupWalks = Awaited<ReturnType<typeof upcomingGroupWalks>>

/** The shelter's card above its dogs (/dogs?org=…): who they are, when to walk, group walks. */
export async function OrgHeader({
  org,
  walks,
  joined,
  signedIn,
  needsQuiz = false,
}: {
  org: Org
  walks: GroupWalks
  joined: Set<string>
  signedIn: boolean
  /** A walker without the safety quiz: the quiz comes before joining (besluit 4 okt 2026). */
  needsQuiz?: boolean
}) {
  const t = await getTranslations()
  const format = await getFormatter()
  return (
    <section className="card stack-s org-header">
      {org.coverUrl ? (
        <div className="shelter-cover">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL or data URL */}
          <img src={org.coverUrl} alt="" />
        </div>
      ) : null}
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL or data URL */}
        {org.logoUrl ? <img src={org.logoUrl} alt="" className="org-logo" /> : <Icon name="building" />}
        <div style={{ minWidth: 0 }}>
          <h2>{org.name}</h2>
          <p className="muted small">
            {org.city} · {t(`common.countries.${org.country}`)} · <Icon name="shield" size={13} /> {t('common.verified')}
          </p>
        </div>
      </div>
      {org.description ? <p className="small prose">{org.description}</p> : null}
      {org.walkingTimes ? (
        <p className="small">
          <strong>{t('dog.walkingTimes')}:</strong> {org.walkingTimes}
        </p>
      ) : null}
      {org.openingHours ? (
        <p className="small">
          <strong>{t('dogs.orgOpeningHours')}:</strong> {org.openingHours}
        </p>
      ) : null}
      <p className="small">
        <strong>{t('dog.treatsLabel')}:</strong> {t(`dogs.orgTreats.${org.treatsPolicy === 'yes' || org.treatsPolicy === 'no' ? org.treatsPolicy : 'own'}`)}
      </p>
      {org.website || org.instagram ? (
        <div className="row">
          {org.website ? (
            <a href={org.website} target="_blank" rel="noopener noreferrer" className="link-button small">
              <Icon name="globe" size={15} /> {t('dog.website')}
            </a>
          ) : null}
          {org.instagram ? (
            <a href={`https://www.instagram.com/${org.instagram}/`} target="_blank" rel="noopener noreferrer" className="link-button small">
              @{org.instagram}
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="stack-s">
        <h3>{t('dog.groupWalks', { name: org.name })}</h3>
        {walks.length ? (
          <ul className="list">
            {walks.slice(0, 3).map((gw) => (
              <li key={gw.id} className="list-item">
                <div className="grow stack-s">
                  <strong>{format.dateTime(gw.startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>
                  <span className="muted small">
                    {t('groupWalks.at', { place: gw.meetingPoint })} · {t('common.minutes', { n: gw.durationMin })} · {t(`dogs.level.${gw.level}`)}
                  </span>
                  <span className="small">{t('groupWalks.spots', { left: Math.max(0, gw.capacity - gw.booked) })}</span>
                </div>
                <GroupWalkButton id={gw.id} joined={joined.has(gw.id)} full={gw.booked >= gw.capacity} signedIn={signedIn} needsQuiz={needsQuiz} next={`/dogs?org=${org.id}`} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{t('dog.noGroupWalks')}</p>
        )}
      </div>
    </section>
  )
}
