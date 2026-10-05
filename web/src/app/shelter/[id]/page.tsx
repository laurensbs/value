import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Avatar } from '@/components/Avatar'
import { Disclosure } from '@/components/Disclosure'
import { DogPortrait } from '@/components/DogPortrait'
import { Icon } from '@/components/Icon'
import { AttendanceButtons, CancelGroupWalkButton, GroupWalkForm, ImportForm, StaffForm } from '@/components/ShelterTools'
import { ageBand } from '@/lib/rules'
import { fromNow, nextWeekday } from '@/lib/time'
import { isOrgMember, requireOnboarded } from '@/server/session'
import { shelterDashboard } from '@/server/shelter'

const STATUS_PILL: Record<string, string> = { active: 'green', draft: 'ball', paused: 'warn', adopted: 'blue' }

export default async function ShelterDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const { id } = await params
  const { created } = await searchParams
  const viewer = await requireOnboarded(`/shelter/${id}`)
  if (!isOrgMember(viewer, id) && !viewer.isAdmin) notFound()
  const data = await shelterDashboard(id)
  if (!data) notFound()
  const { org, dogs, walks, members } = data
  const t = await getTranslations()
  const format = await getFormatter()
  const active = dogs.filter((d) => d.status === 'active')
  const cutoff = fromNow(-4 * 3600_000)
  const upcoming = walks.filter((w) => w.startsAt > cutoff)
  const booked = walks.reduce((n, w) => n + w.signups.filter((x) => x.status === 'booked').length, 0)

  const drafts = dogs.filter((d) => d.status === 'draft')
  const detailsDone = Boolean(org.logoUrl && org.walkingTimes.trim() && org.description.trim())
  const steps = [
    { key: 'details', done: detailsDone, href: `/shelter/${org.id}/edit` },
    { key: 'dogs', done: active.length > 0, href: `/shelter/${org.id}/dogs/bulk` },
    { key: 'walk', done: upcoming.length > 0, href: '#groepswandelingen' },
    { key: 'verified', done: org.status === 'verified', href: null },
  ]

  return (
    <div className="stack-l">
      {org.coverUrl ? (
        <div className="shelter-cover">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL or data URL */}
          <img src={org.coverUrl} alt="" />
        </div>
      ) : null}
      <header className="stack-s">
        <p className="eyebrow">{t('nav.shelter')}</p>
        <div className="spread">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL or data URL */}
            {org.logoUrl ? <img src={org.logoUrl} alt="" className="org-logo" /> : null}
            <h1>{org.name}</h1>
          </div>
          <span className={`pill ${org.status === 'verified' ? 'green' : org.status === 'rejected' ? 'danger' : 'warn'}`}>
            {t(`shelter.status.${org.status}`)}
          </span>
        </div>
        <p className="muted">
          {org.city} · {t(`common.countries.${org.country}`)}
        </p>
        <div className="row">
          <Link href={`/shelter/${org.id}/edit`} className="button secondary small">
            <Icon name="edit" size={16} /> {t('shelter.details')}
          </Link>
          <Link href={`/shelter/${org.id}/poster`} className="button ghost small">
            <Icon name="download" size={16} /> {t('shelter.poster')}
          </Link>
          {org.status === 'verified' ? (
            <Link href={`/dogs?org=${org.id}`} className="button ghost small">
              <Icon name="eye" size={16} /> {t('shelter.publicPage')}
            </Link>
          ) : null}
        </div>
      </header>

      {created ? (
        <p className="notice success">{t('shelter.createdPending')}</p>
      ) : org.status === 'pending' ? (
        <p className="notice warn">{t('shelter.pending')}</p>
      ) : null}
      {org.status === 'rejected' ? <p className="notice danger">{t('shelter.rejected')}</p> : null}

      {steps.some((step) => !step.done) ? (
        <section className="card stack-s">
          <h2>{t('shelter.checklistTitle')}</h2>
          <ul className="checklist">
            {steps.map((step) => (
              <li key={step.key} className={step.done ? 'done' : ''}>
                <span className="tick" aria-hidden>
                  <Icon name="check" size={14} />
                </span>
                <span className="grow">
                  <span className="label">{t(`shelter.checklist.${step.key}`)}</span>
                  {!step.done && step.href ? (
                    <>
                      {' '}
                      <Link href={step.href} className="small">
                        {t('shelter.checklistGo')}
                      </Link>
                    </>
                  ) : null}
                </span>
                <span className="visually-hidden">{step.done ? t('shelter.checklistDone') : t('shelter.checklistTodo')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="dog-tag-stats">
        <div className="dog-tag">
          <strong>{active.length}</strong>
          <span>{t('shelter.statDogs')}</span>
        </div>
        <div className="dog-tag">
          <strong>{upcoming.length}</strong>
          <span>{t('shelter.statWalks')}</span>
        </div>
        <div className="dog-tag">
          <strong>{booked}</strong>
          <span>{t('shelter.statSignups')}</span>
        </div>
      </div>

      <section className="stack" id="honden">
        <div className="spread">
          <h2>{t('shelter.dogs')}</h2>
          <div className="row">
            <Link href={`/shelter/${org.id}/dogs/bulk`} className="button primary small">
              <Icon name="camera" size={16} /> {t('shelter.bulkAdd')}
            </Link>
            <Link href={`/shelter/${org.id}/dogs/new`} className="button secondary small">
              <Icon name="plus" size={16} /> {t('shelter.addDog')}
            </Link>
          </div>
        </div>
        {org.dogCount ? (
          <div className="dog-progress">
            <progress max={org.dogCount} value={Math.min(active.length, org.dogCount)} aria-label={t('shelter.progressLabel')} />
            <p className="muted small">{t('shelter.progress', { online: active.length, total: org.dogCount })}</p>
          </div>
        ) : null}
        {drafts.length ? (
          <p className="notice">
            {t('shelter.draftsWaiting', { n: drafts.length })} <Link href={`/shelter/${org.id}/dogs/bulk`}>{t('shelter.draftsOpen')}</Link>
          </p>
        ) : null}
        {dogs.length ? (
          <ul className="list">
            {dogs.map((dog) => (
              <li key={dog.id} className="list-item compact">
                <DogPortrait dog={dog} size={52} />
                <div className="grow">
                  <strong>{dog.name || t('shelter.unnamed')}</strong>
                  <p className="muted small">{[dog.breed, t(`dogs.level.${dog.level}`)].filter(Boolean).join(' · ')}</p>
                </div>
                {dog.status === 'active' && org.status !== 'verified' ? (
                  <span className="pill">{t('shelter.visibleAfterCheck')}</span>
                ) : (
                  <span className={`pill ${STATUS_PILL[dog.status] ?? ''}`}>{t(`myDogs.status.${dog.status}`)}</span>
                )}
                <Link href={`/shelter/${org.id}/dogs/${dog.id}`} className="button ghost small">
                  {t('common.edit')}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('shelter.noDogs')}</p>
        )}
        <Disclosure className="card disclosure" defaultOpen={dogs.length === 0} summary={<strong>{t('shelter.import')}</strong>}>
          <ImportForm orgId={org.id} />
        </Disclosure>
      </section>

      <section className="stack" id="groepswandelingen">
        <h2>{t('shelter.groupWalks')}</h2>
        {upcoming.length ? (
          <ul className="list">
            {upcoming.map((w) => (
              <li key={w.id} className="list-item group-walk">
                <div className="grow stack-s">
                  <div className="spread">
                    <strong>{format.dateTime(w.startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>
                    <span className="pill">{t('groupWalks.spots', { left: Math.max(0, w.capacity - w.signups.filter((x) => x.status !== 'no_show').length) })}</span>
                  </div>
                  <p className="muted small">
                    {t('groupWalks.at', { place: w.meetingPoint })} · {t('common.minutes', { n: w.durationMin })} · {t(`dogs.level.${w.level}`)}
                  </p>
                  <strong className="small">{t('shelter.signups')}</strong>
                  {w.signups.length ? (
                    <ul className="signups">
                      {w.signups.map((x) => (
                        <li key={x.userId}>
                          <Avatar name={x.firstName} src={x.photoUrl} size="small" />
                          <div className="grow">
                            <strong>{x.firstName}</strong>
                            <p className="muted small">
                              {t('profile.ageBand', { band: ageBand(x.birthDate) })}
                              {x.phone ? ` · ${x.phone}` : ''}
                              {x.idChecked ? ` · ${t('shelter.idChecked')}` : ''}
                            </p>
                          </div>
                          <AttendanceButtons groupWalkId={w.id} userId={x.userId} status={x.status} idChecked={x.idChecked} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted small">{t('shelter.noSignups')}</p>
                  )}
                  {/* Next to "ID gezien": only looking, nothing kept (DPIA maatregel M6). */}
                  {w.signups.length ? <p className="muted small">{t('requests.idHow')}</p> : null}
                  <div>
                    <CancelGroupWalkButton groupWalkId={w.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('shelter.noGroupWalks')}</p>
        )}
        <Disclosure className="card disclosure" defaultOpen={upcoming.length === 0} summary={<strong>{t('shelter.newGroupWalk')}</strong>}>
          <GroupWalkForm orgId={org.id} defaultDate={nextWeekday(6)} />
        </Disclosure>
      </section>

      <section className="stack">
        <h2>{t('shelter.staff')}</h2>
        <ul className="list">
          {members.map((m) => (
            <li key={m.userId} className="list-item compact">
              <Avatar name={m.name} size="small" />
              <div className="grow">
                <strong>{m.name}</strong>
                <p className="muted small">
                  {m.email} · {t(`shelter.roles.${m.role}`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <StaffForm orgId={org.id} />
      </section>
    </div>
  )
}
