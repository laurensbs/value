/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Avatar } from '@/components/Avatar'
import { DogOwnerActions } from '@/components/DogOwnerActions'
import { DogPortrait } from '@/components/DogPortrait'
import { EnergyDots } from '@/components/EnergyDots'
import { GroupWalkButton } from '@/components/GroupWalkButton'
import { Icon } from '@/components/Icon'
import { ReportButton } from '@/components/ReportButton'
import { RequestForm } from '@/components/RequestForm'
import { canRequestMeeting, canRequestSolo } from '@/lib/rules'
import { fromNow, nextWeekday, toZonedParts } from '@/lib/time'
import { dogFacts, getDogDetail, myGroupSignups, relationFor, walkerFacts } from '@/server/queries'
import { getViewer } from '@/server/session'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getDogDetail(id, null)
  return detail ? { title: detail.dog.name, description: detail.dog.story.slice(0, 160) } : {}
}

export default async function DogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const { saved } = await searchParams
  const viewer = await getViewer()
  const detail = await getDogDetail(id, viewer)
  if (!detail) notFound()
  const { dog, host, slots, groupWalks, canSeePrivate, isMine } = detail
  const t = await getTranslations()
  const format = await getFormatter()

  let meetReason: string | null = 'not-signed-in'
  let soloReason: string | null = 'not-signed-in'
  if (viewer?.profile) {
    const facts = await walkerFacts(viewer)
    const relation = await relationFor(viewer, dog)
    meetReason = canRequestMeeting(facts, dogFacts(dog), relation)
    soloReason = canRequestSolo(facts, dogFacts(dog), relation)
  } else if (viewer) {
    meetReason = soloReason = 'not-onboarded'
  }
  const joined = viewer ? await myGroupSignups(viewer.userId) : new Set<string>()

  const firstSlot = slots[0]
  const defaultDate = firstSlot ? nextWeekday(firstSlot.weekday) : toZonedParts(fromNow(24 * 3600_000)).date
  const defaultTime = firstSlot?.time ?? '10:00'

  return (
    <div className="dog-page">
      <div className="stack">
        <Link href="/dogs" className="link-button">
          ← {t('nav.dogs')}
        </Link>
        {saved ? (
          <p className="notice success" role="status">
            {t('dog.saved', { name: dog.name })}
          </p>
        ) : null}
        <DogPortrait dog={dog} large />
        {dog.photos.length > 1 ? (
          <div className="thumbs">
            {dog.photos.slice(1).map((src, i) => (
              <img key={i} src={src} alt="" className="thumb" />
            ))}
          </div>
        ) : null}
      </div>

      <div className="stack-l">
        <header className="stack-s">
          <div className="row">
            {dog.isDemo ? <span className="pill ball">{t('common.example')}</span> : null}
            <span className={`pill ${host.kind === 'shelter' ? 'blue' : 'green'}`}>
              {host.kind === 'shelter' ? t('dogs.fromShelter') : t('dogs.fromOwner')}
            </span>
            {dog.level === 'experienced' ? <span className="pill">{t('dogs.level.experienced')}</span> : null}
            {dog.ppp && dog.country === 'ES' ? <span className="pill warn">{t('dogs.ppp')}</span> : null}
            {dog.status !== 'active' ? <span className="pill warn">{t('dog.paused')}</span> : null}
          </div>
          <h1>{dog.name}</h1>
          <p className="muted">
            {[dog.breed, dog.ageYears != null ? t('dogs.years', { n: dog.ageYears }) : null, t(`dogs.sex.${dog.sex}`), dog.city]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {isMine ? (
            <DogOwnerActions dogId={dog.id} status={dog.status} editHref={dog.orgId ? `/shelter/${dog.orgId}/dogs/${dog.id}` : `/my-dogs/${dog.id}/edit`} />
          ) : null}
        </header>

        <div className="host card row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Avatar name={host.name} src={host.photoUrl} size="medium" />
          <div className="stack-s" style={{ minWidth: 0 }}>
            <strong>
              {host.kind === 'shelter'
                ? t('dog.hostShelter', { name: host.name, city: host.city })
                : t('dog.hostOwner', { name: host.name, city: host.city })}
            </strong>
            {host.kind === 'shelter' && host.verified ? (
              <span className="pill blue">
                <Icon name="shield" size={13} /> {t('common.verified')}
              </span>
            ) : null}
            {host.bio ? <p className="muted small">{host.bio}</p> : null}
          </div>
        </div>

        {dog.story ? (
          <section className="stack-s">
            <h2>{t('dog.story', { name: dog.name })}</h2>
            <p className="prose">{dog.story}</p>
          </section>
        ) : null}

        {dog.needs ? (
          <section className="card flat stack-s">
            <h3>{t('dog.needs')}</h3>
            <p>{dog.needs}</p>
          </section>
        ) : null}

        <section className="stack-s">
          <h2>{t('dog.facts')}</h2>
          <dl className="facts">
            <div>
              <dt>{t('dog.walk')}</dt>
              <dd>{t('common.minutes', { n: dog.walkMinutes })}</dd>
            </div>
            <div>
              <dt>{t('dog.energyLabel')}</dt>
              <dd>
                <EnergyDots energy={dog.energy} label={t(`dogs.energy.${dog.energy}`)} />
              </dd>
            </div>
            <div>
              <dt>{t('dog.levelLabel')}</dt>
              <dd>{t(`dogs.level.${dog.level}`)}</dd>
            </div>
            <div>
              <dt>{t('dog.sizeLabel')}</dt>
              <dd>{t(`dogs.size.${dog.size}`)}</dd>
            </div>
            <div>
              <dt>{t('dog.treatsLabel')}</dt>
              <dd>{t(`dog.treats.${dog.treats}`)}</dd>
            </div>
          </dl>
          {dog.treatsNote ? <p className="muted small">{dog.treatsNote}</p> : null}
          {dog.traits.length ? (
            <ul className="tags">
              {dog.traits.map((trait) => (
                <li key={trait}>{trait}</li>
              ))}
            </ul>
          ) : null}
          <p className="small">
            <Icon name="shield" size={15} /> {dog.offLeash ? t('dog.offLeash') : t('dog.onLeash')}
          </p>
          {dog.provides.length ? (
            <p className="small">
              <strong>{t('dog.providesLabel')}:</strong> {dog.provides.map((p) => t(`dog.provides.${p}`)).join(', ')}
            </p>
          ) : null}
        </section>

        {host.kind === 'owner' ? (
          <section className="stack-s">
            <h2>{t('dog.slots')}</h2>
            {slots.length ? (
              <ul className="tags">
                {slots.map((slot, i) => (
                  <li key={i}>
                    {t(`common.weekdays.${slot.weekday}`)} {slot.time}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t('dog.noSlots')}</p>
            )}
          </section>
        ) : (
          <section className="stack-s">
            <h2>{t('dog.groupWalks', { name: host.name })}</h2>
            <p className="muted small">{t('request.shelterNote')}</p>
            {groupWalks.length ? (
              <ul className="list">
                {groupWalks.map((gw) => (
                  <li key={gw.id} className="list-item">
                    <div className="grow stack-s">
                      <strong>{format.dateTime(gw.startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>
                      <span className="muted small">
                        {t('groupWalks.at', { place: gw.meetingPoint })} · {t('common.minutes', { n: gw.durationMin })} ·{' '}
                        {t(`dogs.level.${gw.level}`)}
                      </span>
                      <span className="small">{t('groupWalks.spots', { left: Math.max(0, gw.capacity - gw.booked) })}</span>
                    </div>
                    {isMine ? null : (
                      <GroupWalkButton id={gw.id} joined={joined.has(gw.id)} full={gw.booked >= gw.capacity} signedIn={Boolean(viewer?.profile)} />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t('dog.noGroupWalks')}</p>
            )}
          </section>
        )}

        {canSeePrivate && !isMine ? (
          <section className="card stack-s">
            <h2>{t('dog.private')}</h2>
            <p className="muted small">{t('dog.privateNote')}</p>
            {dog.meetingInfo ? (
              <p>
                <strong>{t('dog.meetingInfo')}:</strong> {dog.meetingInfo}
              </p>
            ) : null}
            {host.phone || host.email ? (
              <p>
                <strong>{t('dog.contact')}:</strong> {[host.phone, host.email].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {dog.vetInfo ? (
              <p>
                <strong>{t('dog.vetInfo')}:</strong> {dog.vetInfo}
              </p>
            ) : null}
          </section>
        ) : null}

        {!isMine && host.kind === 'owner' ? (
          viewer ? (
            <RequestForm
              dogId={dog.id}
              dogName={dog.name}
              meetReason={meetReason}
              soloReason={soloReason}
              defaultDate={defaultDate}
              defaultTime={defaultTime}
            />
          ) : (
            <Link href={`/login?next=/dogs/${dog.id}`} className="button primary wide">
              {t('request.loginFirst')}
            </Link>
          )
        ) : null}

        {viewer?.profile && !isMine && !dog.isDemo ? (
          <ReportButton dogId={dog.id} subjectUserId={dog.ownerId} orgId={dog.orgId} />
        ) : null}
      </div>
    </div>
  )
}
