import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { DogPortrait } from '@/components/DogPortrait'
import { Icon } from '@/components/Icon'
import { MeetChecklist } from '@/components/MeetChecklist'
import { PushAsk } from '@/components/PushAsk'
import { CancelButton, DecideButtons, StartButton, TrustForm } from '@/components/RequestActions'
import { WalkerCard } from '@/components/WalkerCard'
import { canStartWalk, START_WINDOW_BEFORE_MIN } from '@/lib/rules'
import {
  hostContacts,
  incomingRequests,
  outgoingRequests,
  trustGrantsFor,
  trustSignals,
  type HostContact,
  type RequestRow,
} from '@/server/queries'
import { meetChecklist, unreadChats } from '@/server/chat'
import { webPushKey } from '@/server/push'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('requests')
  return { title: t('title') }
}

const OPEN = ['pending', 'accepted']

function statusPill(status: string) {
  return status === 'accepted' ? 'green' : status === 'pending' ? 'warn' : status === 'completed' ? 'blue' : ''
}

function ChatLink({ requestId, label, unread }: { requestId: string; label: string; unread: boolean }) {
  return (
    <Link href={`/chat/${requestId}`} className="button secondary">
      <Icon name="chat" size={16} /> {label}
      {unread ? <span className="unread-dot" aria-hidden="true" /> : null}
    </Link>
  )
}

/** The appointment as a calendar file, with a reminder an hour before. */
function CalendarLink({ requestId, label }: { requestId: string; label: string }) {
  return (
    <a href={`/requests/${requestId}/calendar.ics`} className="button ghost">
      <Icon name="calendar" size={16} /> {label}
    </a>
  )
}

function Contact({ contact, label }: { contact: HostContact | { name: string; phone: string | null; email?: string | null }; label: string }) {
  const phone = contact.phone?.replace(/[^\d+]/g, '')
  return (
    <div className="contact">
      <span className="eyebrow">{label}</span>
      <div className="row">
        <strong>{contact.name}</strong>
        {contact.phone ? (
          <a className="button secondary small" href={`tel:${phone}`}>
            <Icon name="phone" size={15} /> {contact.phone}
          </a>
        ) : null}
        {contact.email ? (
          <a className="button ghost small" href={`mailto:${contact.email}`}>
            <Icon name="chat" size={15} /> {contact.email}
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const viewer = await requireOnboarded('/requests')
  const t = await getTranslations()
  const format = await getFormatter()
  const now = new Date()

  const [outgoing, incoming, unread] = await Promise.all([outgoingRequests(viewer.userId), incomingRequests(viewer), unreadChats(viewer.userId)])
  const hasIncoming = incoming.length > 0 || viewer.profile.hasDogs || viewer.orgs.length > 0
  const pendingIncoming = incoming.filter((r) => r.request.status === 'pending').length
  const openIncoming = incoming.filter((r) => OPEN.includes(r.request.status)).length
  const openOutgoing = outgoing.filter((r) => OPEN.includes(r.request.status)).length
  // Without an explicit choice, show whichever side needs attention (and stay there after accepting).
  const tab =
    view === 'mine' || !hasIncoming
      ? 'mine'
      : view === 'incoming' || pendingIncoming > 0 || (openIncoming > 0 && openOutgoing === 0)
        ? 'incoming'
        : 'mine'

  const contacts = await hostContacts(outgoing.filter((r) => OPEN.includes(r.request.status) || r.request.status === 'completed').map((r) => r.dog))
  const grants = await trustGrantsFor([...new Set(incoming.map((r) => r.dog.id))])
  const walkerIds = [...new Set(incoming.map((r) => r.walker.id))]
  const signals = new Map(await Promise.all(walkerIds.map(async (id) => [id, await trustSignals(id)] as const)))

  const when = (r: RequestRow) =>
    format.dateTime(r.request.startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  const mineOpen = outgoing.filter((r) => OPEN.includes(r.request.status))
  const minePast = outgoing.filter((r) => !OPEN.includes(r.request.status))
  const inOpen = incoming.filter((r) => OPEN.includes(r.request.status))
  const inPast = incoming.filter((r) => !OPEN.includes(r.request.status))
  // A first meeting gets a list of what to talk about, for each side.
  const meetings = new Map(
    await Promise.all(
      [...mineOpen.map((r) => ['walker', r] as const), ...inOpen.map((r) => ['host', r] as const)]
        .filter(([, r]) => r.request.kind === 'meet' && r.request.status === 'accepted' && r.walkStatus !== 'active')
        .map(async ([side, r]) => [r.request.id, await meetChecklist(side, r.dog.name, r.walker.firstName)] as const),
    ),
  )
  // Waiting for an answer is the moment a heads-up matters most.
  const waitingFor = mineOpen.find((r) => r.request.status === 'pending')
  const pushKey = webPushKey()

  return (
    <div className="stack-l">
      <header className="stack-s">
        <h1>{t('requests.title')}</h1>
        {hasIncoming ? (
          <nav className="segmented" aria-label={t('requests.title')}>
            <Link href="/requests?view=mine" aria-current={tab === 'mine' ? 'page' : undefined}>
              {t('requests.mine')}
            </Link>
            <Link href="/requests?view=incoming" aria-current={tab === 'incoming' ? 'page' : undefined}>
              {t('requests.incoming')}
              {pendingIncoming ? <span className="count">{pendingIncoming}</span> : null}
            </Link>
          </nav>
        ) : null}
      </header>

      {tab === 'mine' ? (
        <section className="stack">
          {pushKey && waitingFor ? <PushAsk publicKey={pushKey} text={t('pushAsk.request', { dog: waitingFor.dog.name })} /> : null}
          {mineOpen.length === 0 ? (
            <div className="empty card flat stack-s">
              <p>{t('requests.empty')}</p>
              <div className="row">
                <Link href="/dogs" className="button primary small">
                  {t('nav.dogs')}
                </Link>
                <Link href="/group-walks" className="button secondary small">
                  {t('nav.groupWalks')}
                </Link>
              </div>
            </div>
          ) : (
            <ul className="list">
              {mineOpen.map((r) => {
                const contact = contacts.get(r.dog.id)
                const accepted = r.request.status === 'accepted'
                const active = r.walkStatus === 'active'
                return (
                  <li key={r.request.id} className="list-item request">
                    <Link href={`/dogs/${r.dog.id}`} className="request-dog">
                      <DogPortrait dog={r.dog} size={72} />
                    </Link>
                    <div className="grow stack-s">
                      <div className="spread">
                        <strong className="request-title">
                          {r.dog.name} · {r.request.kind === 'meet' ? t('request.kindMeet') : t('request.kindSolo')}
                        </strong>
                        <span className={`pill ${statusPill(r.request.status)}`}>{t(`requests.status.${r.request.status}`)}</span>
                      </div>
                      <p className="muted small">
                        <Icon name="calendar" size={14} /> {when(r)} · {t('common.minutes', { n: r.request.durationMin })}
                        {r.request.weekly ? ` · ${t('requests.weekly')}` : ''}
                      </p>
                      {accepted && contact ? (
                        <>
                          {r.dog.meetingInfo ? (
                            <p className="small">
                              <strong>{t('requests.meeting')}:</strong> {r.dog.meetingInfo}
                            </p>
                          ) : null}
                          <Contact contact={contact} label={t('requests.contact')} />
                        </>
                      ) : null}
                      <div className="row">
                        <ChatLink requestId={r.request.id} label={t('chat.button')} unread={unread.has(r.request.id)} />
                        {active && r.walkId ? (
                          <Link href={`/walk/${r.walkId}`} className="button primary">
                            <span className="live-dot" aria-hidden="true" /> {t('requests.resume')}
                          </Link>
                        ) : accepted ? (
                          <StartButton
                            requestId={r.request.id}
                            enabled={canStartWalk(r.request, viewer.userId, now)}
                            hint={t('requests.startHint', { n: START_WINDOW_BEFORE_MIN })}
                          />
                        ) : null}
                        {accepted && !active ? <CalendarLink requestId={r.request.id} label={t('requests.calendar')} /> : null}
                        {!active ? <CancelButton requestId={r.request.id} /> : null}
                      </div>
                      {meetings.has(r.request.id) ? (
                        <MeetChecklist requestId={r.request.id} title={t('meetCheck.title', { dog: r.dog.name })} items={meetings.get(r.request.id)!} />
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {minePast.length ? (
            <details className="past">
              <summary>{t('requests.past', { n: minePast.length })}</summary>
              <ul className="list">
                {minePast.map((r) => (
                  <li key={r.request.id} className="list-item compact">
                    <DogPortrait dog={r.dog} size={44} />
                    <div className="grow">
                      <strong>{r.dog.name}</strong>
                      <p className="muted small">{when(r)}</p>
                    </div>
                    {r.walkId ? (
                      <Link href={`/walk/${r.walkId}`} className="link-button small">
                        {t('requests.summary')}
                      </Link>
                    ) : (
                      <span className={`pill ${statusPill(r.request.status)}`}>{t(`requests.status.${r.request.status}`)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : (
        <section className="stack">
          {inOpen.length === 0 ? (
            <div className="empty card flat stack-s">
              <p>{t('requests.emptyIncoming')}</p>
              <div className="row">
                <Link href="/profile#invite" className="button secondary small">
                  {t('profile.invite')}
                </Link>
              </div>
            </div>
          ) : (
            <ul className="list">
              {inOpen.map((r) => {
                const accepted = r.request.status === 'accepted'
                const active = r.walkStatus === 'active'
                const grant = grants.get(`${r.dog.id}:${r.walker.id}`) ?? { idSeen: false, soloAllowed: false }
                return (
                  <li key={r.request.id} className="list-item request incoming">
                    <div className="grow stack">
                      <div className="spread">
                        <span className="request-title">
                          <DogPortrait dog={r.dog} size={36} />
                          <strong>
                            {r.dog.name} · {r.request.kind === 'meet' ? t('request.kindMeet') : t('request.kindSolo')}
                          </strong>
                        </span>
                        <span className={`pill ${statusPill(r.request.status)}`}>{t(`requests.status.${r.request.status}`)}</span>
                      </div>
                      <p className="small">
                        <Icon name="calendar" size={14} /> {when(r)} · {t('common.minutes', { n: r.request.durationMin })}
                        {r.request.weekly ? ` · ${t('requests.weekly')}` : ''}
                      </p>
                      <WalkerCard walker={r.walker} signals={signals.get(r.walker.id)!} />
                      {r.request.message ? <blockquote className="message">{r.request.message}</blockquote> : null}
                      <div className="row">
                        <ChatLink requestId={r.request.id} label={t('chat.button')} unread={unread.has(r.request.id)} />
                      </div>
                      {r.request.flags.length ? (
                        <p className="notice warn small" role="note">
                          <Icon name="alert" size={16} /> {t('requests.flagged')}
                        </p>
                      ) : null}
                      {r.request.status === 'pending' ? <DecideButtons requestId={r.request.id} /> : null}
                      {accepted ? (
                        <>
                          <Contact contact={{ name: r.walker.firstName, phone: r.walker.phone, email: r.walker.email }} label={t('requests.contact')} />
                          {meetings.has(r.request.id) ? (
                            <MeetChecklist requestId={r.request.id} title={t('meetCheck.title', { dog: r.dog.name })} items={meetings.get(r.request.id)!} />
                          ) : null}
                          <TrustForm
                            dogId={r.dog.id}
                            dogName={r.dog.name}
                            walkerId={r.walker.id}
                            walkerName={r.walker.firstName}
                            initial={grant}
                            allowSolo={!r.dog.orgId}
                          />
                          <div className="row">
                            {active && r.walkId ? (
                              <Link href={`/follow/${r.walkId}`} className="button primary">
                                <span className="live-dot" aria-hidden="true" /> {t('requests.follow')}
                              </Link>
                            ) : null}
                            {!active ? <CalendarLink requestId={r.request.id} label={t('requests.calendar')} /> : null}
                            {!active ? <CancelButton requestId={r.request.id} /> : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {inPast.length ? (
            <details className="past">
              <summary>{t('requests.past', { n: inPast.length })}</summary>
              <ul className="list">
                {inPast.map((r) => (
                  <li key={r.request.id} className="list-item compact">
                    <DogPortrait dog={r.dog} size={44} />
                    <div className="grow">
                      <strong>
                        {r.dog.name} · {r.walker.firstName}
                      </strong>
                      <p className="muted small">{when(r)}</p>
                    </div>
                    {r.walkId ? (
                      <Link href={`/follow/${r.walkId}`} className="link-button small">
                        {t('requests.summary')}
                      </Link>
                    ) : (
                      <span className={`pill ${statusPill(r.request.status)}`}>{t(`requests.status.${r.request.status}`)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      )}
    </div>
  )
}
