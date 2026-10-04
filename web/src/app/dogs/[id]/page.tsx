/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */
import Link from 'next/link'
import { ViewTransition } from 'react'
import { notFound } from 'next/navigation'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Avatar } from '@/components/Avatar'
import { DogOwnerActions } from '@/components/DogOwnerActions'
import { DogPortrait } from '@/components/DogPortrait'
import { DogShare } from '@/components/DogShare'
import { EnergyDots } from '@/components/EnergyDots'
import { GroupWalkButton } from '@/components/GroupWalkButton'
import { Icon } from '@/components/Icon'
import { PlanBar } from '@/components/PlanBar'
import { ReportButton } from '@/components/ReportButton'
import { RequestForm } from '@/components/RequestForm'
import { isNewDog } from '@/lib/nudges'
import { pageMetadata } from '@/lib/seo'
import { canRequestMeeting, canRequestSolo, openRequestConflict } from '@/lib/rules'
import { fromNow, nextWeekday, toZonedParts } from '@/lib/time'
import { dogFacts, getDogDetail, myGroupSignups, openRequestsFor, walkerFacts } from '@/server/queries'
import { getViewer } from '@/server/session'
import { dogShareFor, localeOf } from '@/server/share'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getDogDetail(id, null)
  if (!detail) return {}
  const { dog, host } = detail
  // Owners share this page with their neighbours: the preview in a chat shows the dog and what it is
  // looking for, in the owner's language like the message they sent (chat apps fetch it without one).
  const owned = host.kind === 'owner'
  const t = await getTranslations({ locale: owned ? await localeOf(host.id) : await getLocale(), namespace: 'dogShare' })
  const description = dog.story || (owned ? t('posterText', { name: dog.name, minutes: dog.walkMinutes, city: dog.city }) : '') || dog.name
  const photo = dog.photos.find((src) => src.startsWith('https://'))
  return pageMetadata({
    path: `/dogs/${dog.id}`,
    title: dog.name,
    description,
    shareTitle: owned ? t('posterHeadline', { name: dog.name }) : dog.name,
    images: [photo ?? '/og.png'],
    // A private owner's dog page names a first name and a city: kept out of search engines, links too.
    // An example dog is made up: out of search results as well, whoever it belongs to.
    robots: owned ? 'none' : dog.isDemo ? 'noindex' : undefined,
  })
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
  const { dog, host, slots, groupWalks, canSeePrivate, isMine, relation } = detail
  const [t, format, facts, joined, share, open] = await Promise.all([
    getTranslations(),
    getFormatter(),
    viewer?.profile ? walkerFacts(viewer) : null,
    viewer ? myGroupSignups(viewer.userId) : new Set<string>(),
    dogShareFor(detail, viewer),
    viewer?.profile && !isMine && host.kind === 'owner' ? openRequestsFor(viewer.userId, dog.id) : [],
  ])
  // Already a request or appointment with this dog: say so, instead of a form for a second one.
  // After an agreed first call the form stays, to plan meeting in person.
  // An agreed weekly solo walk leaves room for an extra one: then the form stays (rules.ts).
  const openRequest = openRequestConflict(open, { kind: 'meet', meetVia: 'walk' }) && openRequestConflict(open, { kind: 'solo', meetVia: 'walk' })

  let meetReason: string | null = 'not-signed-in'
  let soloReason: string | null = 'not-signed-in'
  if (facts && relation) {
    meetReason = canRequestMeeting(facts, dogFacts(dog), relation)
    soloReason = canRequestSolo(facts, dogFacts(dog), relation)
  } else if (viewer) {
    meetReason = soloReason = 'not-onboarded'
  }

  // The dog's weekly moments on their next dates, soonest first: one tap fills in the request.
  const moments = slots
    .map((slot) => ({ date: nextWeekday(slot.weekday), time: slot.time }))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 4)
    .map((m) => ({
      ...m,
      label: `${format.dateTime(new Date(`${m.date}T12:00:00Z`), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${m.time}`,
    }))
  const defaultDate = moments[0]?.date ?? toZonedParts(fromNow(24 * 3600_000)).date
  const defaultTime = moments[0]?.time ?? '10:00'
  const plan = encodeURIComponent(`/dogs/${dog.id}#plan`)
  // On a phone, the one main action stays at hand until the plan itself is in view: the quiz first,
  // an account first, or straight to the plan. Not for your own dog, an example dog, a shelter dog
  // (group walks), or when you already asked.
  const planBar =
    isMine || dog.isDemo || host.kind !== 'owner' || openRequest
      ? null
      : !viewer
        ? { href: `/signup?intent=walker&next=${plan}`, label: t('request.signupFirst', { name: dog.name }) }
        : meetReason === 'needs-quiz'
          ? { href: `/profile/quiz?next=${plan}`, label: t('request.quizFirst') }
          : meetReason === null || soloReason === null
            ? { href: '#plan', label: t('request.title') }
            : null

  return (
    <div className="dog-page">
      <div className="stack">
        <Link href="/dogs" className="link-button">
          ← {t('nav.dogs')}
        </Link>
        {saved ? (
          <p className="notice success" role="status">
            <span>
              {t('dog.saved', { name: dog.name })}{' '}
              {/* What happens next: walkers nearby see the dog as new, or with few of them, the neighbours can be told. */}
              {share?.walkersNearby != null
                ? t('dog.savedWalkers', { n: share.walkersNearby, name: dog.name })
                : share
                  ? t.rich('dog.savedShare', { name: dog.name, link: (chunks) => <a href="#share">{chunks}</a> })
                  : null}
            </span>
          </p>
        ) : null}
        <ViewTransition name={`dog-${dog.id}`}>
          <DogPortrait dog={dog} large />
        </ViewTransition>
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
            {isNewDog(dog, new Date()) ? <span className="pill ball">{t('dogs.new')}</span> : null}
            <span className={`pill ${host.kind === 'shelter' ? 'blue' : 'green'}`}>
              {host.kind === 'shelter' ? t('dogs.fromShelter') : t('dogs.fromOwner')}
            </span>
            {dog.level === 'experienced' ? <span className="pill">{t('dogs.level.experienced')}</span> : null}
            {dog.ppp && dog.country === 'ES' ? <span className="pill warn">{t('dogs.ppp')}</span> : null}
            {dog.status === 'draft' ? (
              <span className="pill ball">{t('myDogs.status.draft')}</span>
            ) : dog.status !== 'active' ? (
              <span className="pill warn">{t('dog.paused')}</span>
            ) : null}
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

        {share ? <DogShare dogId={dog.id} name={dog.name} message={share.message} /> : null}

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
            {host.walkingTimes ? (
              <p className="small">
                <strong>{t('dog.walkingTimes')}:</strong> {host.walkingTimes}
              </p>
            ) : null}
            {host.website || host.instagram ? (
              <div className="row">
                {host.website ? (
                  <a href={host.website} target="_blank" rel="noopener noreferrer" className="link-button small">
                    <Icon name="globe" size={15} /> {t('dog.website')}
                  </a>
                ) : null}
                {host.instagram ? (
                  <a href={`https://www.instagram.com/${host.instagram}/`} target="_blank" rel="noopener noreferrer" className="link-button small">
                    @{host.instagram}
                  </a>
                ) : null}
              </div>
            ) : null}
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
          <dl className="facts one-card">
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
                      <GroupWalkButton
                        id={gw.id}
                        joined={joined.has(gw.id)}
                        full={gw.booked >= gw.capacity}
                        signedIn={Boolean(viewer?.profile)}
                        needsQuiz={Boolean(viewer?.profile && !viewer.profile.quizPassedAt)}
                        next={`/dogs/${dog.id}`}
                      />
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
          viewer && meetReason === 'needs-quiz' ? (
            // Walkers do the safety quiz before asking for anything; it brings them straight back here.
            <div id="plan" className="card flat stack-s quiz-first">
              <p>{t('request.quizFirstText', { dog: dog.name })}</p>
              <div className="row">
                <Link href={`/profile/quiz?next=${plan}`} className="button primary">
                  {t('request.quizFirst')}
                </Link>
              </div>
            </div>
          ) : viewer ? (
            <div id="plan">
              <RequestForm
              dogId={dog.id}
              dogName={dog.name}
              ownerName={host.name || dog.name}
              open={
                openRequest
                  ? {
                      pending: openRequest.status === 'pending',
                      when: format.dateTime(openRequest.startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
                    }
                  : null
              }
              walkerName={viewer.profile?.firstName ?? ''}
              meetReason={meetReason}
              soloReason={soloReason}
              defaultDate={defaultDate}
              defaultTime={defaultTime}
              moments={moments}
              />
            </div>
          ) : (
            // Often someone the owner sent the link to: an account first, then straight back here to plan.
            <div id="plan" className="card flat stack-s">
              <Link href={`/signup?intent=walker&next=${plan}`} className="button primary wide">
                {t('request.signupFirst', { name: dog.name })}
              </Link>
              <p className="muted small">{t('request.signupFirstText')}</p>
              <p className="small">
                {t('auth.hasAccount')} <Link href={`/login?next=${plan}`}>{t('nav.login')}</Link>
              </p>
            </div>
          )
        ) : null}

        {viewer?.profile && !isMine && !dog.isDemo ? (
          <ReportButton dogId={dog.id} subjectUserId={dog.ownerId} orgId={dog.orgId} />
        ) : null}
      </div>
      {planBar ? <PlanBar href={planBar.href} label={planBar.label} /> : null}
    </div>
  )
}
