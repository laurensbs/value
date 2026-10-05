import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { DogPortrait } from '@/components/DogPortrait'
import { Icon } from '@/components/Icon'
import { MeetChecklist } from '@/components/MeetChecklist'
import { MEET_VIA_ICONS, MeetViaLabel } from '@/components/MeetVia'
import { InstallAsk } from '@/components/InstallAsk'
import { PushAsk } from '@/components/PushAsk'
import { TermsNotice } from '@/components/TermsNotice'
import { AcceptReveal, CancelButton, DecideButtons, DeclinedNote, StartButton, TrustForm, type SoloCaveat } from '@/components/RequestActions'
import { WalkerCard } from '@/components/WalkerCard'
import { isRemoteMeeting } from '@/lib/conversation'
import { canRequestSolo, canStartWalk, isInPerson, isMeetVia, liveLocationReason, START_WINDOW_BEFORE_MIN, walkHasLiveLocation } from '@/lib/rules'
import { rolesOf } from '@/server/progress'
import {
  hostContacts,
  incomingRequests,
  myDogs,
  outgoingRequests,
  trustGrantsFor,
  trustSignals,
  type HostContact,
  type RequestRow,
} from '@/server/queries'
import { meetChecklist, unreadChats } from '@/server/chat'
import { liveLocationNow } from '@/server/live-location'
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

/** A first call or video call: how to reach each other, and that it is not yet meeting in person. */
function CallNote({ via, text }: { via: string; text: string }) {
  return (
    <p className="notice small" role="note">
      <Icon name={isMeetVia(via) ? MEET_VIA_ICONS[via] : 'phone'} size={18} /> <span>{text}</span>
    </p>
  )
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

  const [outgoing, incoming, unread, liveLocation] = await Promise.all([
    outgoingRequests(viewer.userId),
    incomingRequests(viewer),
    unreadChats(viewer.userId),
    liveLocationNow(),
  ])
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

  const walkerIds = [...new Set(incoming.map((r) => r.walker.id))]
  const [contacts, grants, signals] = await Promise.all([
    hostContacts(outgoing.filter((r) => (OPEN.includes(r.request.status) || r.request.status === 'completed') && !r.blocked).map((r) => r.dog)),
    trustGrantsFor([...new Set(incoming.map((r) => r.dog.id))]),
    Promise.all(walkerIds.map(async (id) => [id, await trustSignals(id)] as const)).then((entries) => new Map(entries)),
  ])

  const when = (r: RequestRow) =>
    format.dateTime(r.request.startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  // A first call that took place shows as a call, not as a walk.
  const statusText = (r: RequestRow) =>
    t(`requests.status.${r.request.status === 'completed' && isRemoteMeeting(r.request) ? 'talked' : r.request.status}`)
  const callHow = (r: RequestRow) => t(r.request.meetVia === 'video' ? 'meet.videoHow' : 'meet.phoneHow')

  const mineOpen = outgoing.filter((r) => OPEN.includes(r.request.status))
  // A walk this walker is going to start: once changed terms take effect, starting waits for the yes.
  const upcomingWalk = mineOpen.some((r) => r.request.status === 'accepted' && isInPerson(r.request.meetVia))
  const minePast = outgoing.filter((r) => !OPEN.includes(r.request.status))
  const inOpen = incoming.filter((r) => OPEN.includes(r.request.status))
  const inPast = incoming.filter((r) => !OPEN.includes(r.request.status))
  // A first meeting gets a list of what to talk about, for each side.
  const meetings = new Map(
    await Promise.all(
      [...mineOpen.map((r) => ['walker', r] as const), ...inOpen.map((r) => ['host', r] as const)]
        .filter(([, r]) => r.request.kind === 'meet' && r.request.status === 'accepted' && r.walkStatus !== 'active')
        .map(async ([side, r]) => [r.request.id, await meetChecklist(side, r.dog.name, r.walker.firstName, r.request.meetVia)] as const),
    ),
  )
  // Walkers and dogs who met in person (rules.ts canRecordTrust): a walk together, or an accepted walk
  // or home visit whose moment has come. Trust is about the two of them, not about one appointment:
  // one form per pair, in its own section.
  const metPairs = new Map<string, RequestRow>()
  for (const r of incoming) {
    const key = `${r.dog.id}:${r.walker.id}`
    const met =
      Boolean(r.walkId) ||
      (isMeetVia(r.request.meetVia) && !isRemoteMeeting(r.request) && (r.request.status === 'completed' || (r.request.status === 'accepted' && r.request.startsAt <= now)))
    if (met && !metPairs.has(key)) metPairs.set(key, r)
  }
  // A walk alone with the dog, asked for or agreed, while live location is off: it waits, and both sides
  // read why on its card (rules.ts liveLocationReason). Walking together is not affected.
  const paused = (r: RequestRow) => Boolean(liveLocationReason(r.request.kind, liveLocation)) && OPEN.includes(r.request.status)
  const pausedNote = (
    <p className="notice small solo-paused" role="note">
      <Icon name="location" size={18} /> <span>{t('request.reasons.live-location-off')}</span>
    </p>
  )
  // What could still stop a solo walk once the owner allows it: the same rule the walker meets (rules.ts).
  // Only the walker's own steps: whether live location is on is said on its own (TrustForm liveLocation).
  const soloCaveat = (r: RequestRow): SoloCaveat => {
    const reason = canRequestSolo(
      {
        userId: r.walker.id,
        onboarded: true,
        banned: false,
        birthDate: r.walker.birthDate,
        quizPassed: signals.get(r.walker.id)?.quizPassed ?? false,
        pppLicense: r.walker.pppLicense,
        experience: r.walker.experience === 'none' || r.walker.experience === 'lots' ? r.walker.experience : 'some',
        pendingRequests: 0,
        // The walker's own step, not something the owner can help with.
        needsTerms: false,
      },
      { ownerId: r.dog.ownerId, orgId: r.dog.orgId, country: r.dog.country, status: 'active', isDemo: false, ppp: r.dog.ppp, level: r.dog.level === 'experienced' ? 'experienced' : 'starter' },
      { isStaff: false, blocked: false, soloAllowed: true, idSeen: true },
      true,
    )
    return reason === 'needs-quiz' || reason === 'experience' || reason === 'ppp-licence' ? reason : null
  }
  // Requests and answers arrive here, so this is where Rondje asks once whether it may give a heads-up,
  // and (on a phone) whether it may sit on the home screen. Waiting for an answer is when it matters most.
  const waitingFor = mineOpen.find((r) => r.request.status === 'pending')
  const pushKey = webPushKey()
  const roles = rolesOf(viewer.profile)
  const ownDog = roles.owner && !waitingFor ? (await myDogs(viewer)).find((d) => !d.isDemo) : undefined
  const pushText = waitingFor
    ? t('pushAsk.request', { dog: waitingFor.dog.name })
    : ownDog
      ? t('pushAsk.dog', { dog: ownDog.name })
      : roles.walker
        ? t('pushAsk.walker')
        : t('pushAsk.general')

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
        <DeclinedNote />
      </header>

      {/* Changed terms that took effect: accepting, asking and starting wait for the yes. Before that day,
          a walker with an accepted walk coming up hears about it here, not first at the owner's door. */}
      <TermsNotice profile={viewer.profile} onlyRequired ahead={upcomingWalk} from="/requests" />

      {tab === 'mine' ? (
        <section className="stack">
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
                const call = isRemoteMeeting(r.request)
                return (
                  <li key={r.request.id} className="list-item request">
                    <Link href={`/dogs/${r.dog.id}`} className="request-dog">
                      <DogPortrait dog={r.dog} size={72} />
                    </Link>
                    <div className="grow stack-s">
                      <strong className="request-title">
                        {r.dog.name} · {r.request.kind === 'meet' ? t('request.kindMeet') : t('request.kindSolo')}
                      </strong>
                      {/* Where it stands and how you meet, in one row. */}
                      <div className="request-tags">
                        <span className={`pill request-status ${statusPill(r.request.status)}`}>{statusText(r)}</span>
                        {r.request.kind === 'meet' ? <MeetViaLabel via={r.request.meetVia} /> : null}
                      </div>
                      <p className="muted small">
                        <Icon name="calendar" size={14} /> {when(r)} · {t('common.minutes', { n: r.request.durationMin })}
                        {r.request.weekly ? ` · ${t('requests.weekly')}` : ''}
                      </p>
                      {accepted && contact ? (
                        <>
                          {r.dog.meetingInfo && !call ? (
                            <p className="small">
                              <strong>{t('requests.meeting')}:</strong> {r.dog.meetingInfo}
                            </p>
                          ) : null}
                          <Contact contact={contact} label={t('requests.contact')} />
                        </>
                      ) : null}
                      {call ? <CallNote via={r.request.meetVia} text={accepted ? `${callHow(r)} ${t('meet.afterCallWalker', { dog: r.dog.name })}` : t('meet.remoteNote')} /> : null}
                      {r.request.meetVia === 'home' && r.request.kind === 'meet' ? (
                        <p className="notice small" role="note">
                          <Icon name="shield" size={18} /> <span>{t('meet.homeSafety')}</span>
                        </p>
                      ) : null}
                      {paused(r) && !active ? pausedNote : null}
                      <div className="row">
                        <ChatLink requestId={r.request.id} label={t('chat.button')} unread={unread.has(r.request.id)} />
                        {call ? (
                          // After a call, meeting in person comes next: walking together is already chosen.
                          accepted ? (
                            <Link href={`/dogs/${r.dog.id}#plan`} className="button primary">
                              <Icon name="paw" size={18} /> {t('meet.planInPerson')}
                            </Link>
                          ) : null
                        ) : active && r.walkId ? (
                          <Link href={`/walk/${r.walkId}`} className="button primary">
                            <span className="live-dot" aria-hidden="true" /> {t('requests.resume')}
                          </Link>
                        ) : accepted ? (
                          // Live location off: a walk alone with the dog does not start; the note above says why
                          // (rules.ts liveLocationReason). A first meeting never shares location: they walk together.
                          <StartButton
                            requestId={r.request.id}
                            enabled={canStartWalk(r.request, viewer.userId, now) && !paused(r)}
                            hint={paused(r) ? null : t('requests.startHint', { n: START_WINDOW_BEFORE_MIN })}
                            together={r.request.kind !== 'solo'}
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
                      <span className={`pill ${statusPill(r.request.status)}`}>{statusText(r)}</span>
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
                const call = isRemoteMeeting(r.request)
                return (
                  <li key={r.request.id} className="list-item request incoming">
                    <div className="grow stack">
                      <span className="request-title">
                        <DogPortrait dog={r.dog} size={36} />
                        <strong>
                          {r.dog.name} · {r.request.kind === 'meet' ? t('request.kindMeet') : t('request.kindSolo')}
                        </strong>
                      </span>
                      <div className="request-tags">
                        <span className={`pill request-status ${statusPill(r.request.status)}`}>{statusText(r)}</span>
                        {r.request.kind === 'meet' ? <MeetViaLabel via={r.request.meetVia} /> : null}
                      </div>
                      <p className="small">
                        <Icon name="calendar" size={14} /> {when(r)} · {t('common.minutes', { n: r.request.durationMin })}
                        {r.request.weekly ? ` · ${t('requests.weekly')}` : ''}
                      </p>
                      <WalkerCard walker={r.walker} signals={signals.get(r.walker.id)!} />
                      {r.request.message ? <blockquote className="message">{r.request.message}</blockquote> : null}
                      {r.request.flags.length ? (
                        <p className="notice warn small" role="note">
                          <Icon name="alert" size={16} /> {t('requests.flagged')}
                        </p>
                      ) : null}
                      {/* A walk alone while live location is off: it waits, and says why (rules.ts liveLocationReason). */}
                      {paused(r) && !active ? pausedNote : null}
                      {/* One main action: yes or no. Chatting first stays one tap away, right under it. Saying yes to a
                          walk alone waits while live location is off; saying no is always possible. */}
                      {r.request.status === 'pending' ? (
                        <DecideButtons requestId={r.request.id} walkerName={r.walker.firstName} dogName={r.dog.name} canAccept={!paused(r)} />
                      ) : null}
                      <div className="row">
                        <ChatLink requestId={r.request.id} label={t('chat.button')} unread={unread.has(r.request.id)} />
                      </div>
                      {accepted ? (
                        <AcceptReveal requestId={r.request.id} walkerName={r.walker.firstName}>
                          <Contact contact={{ name: r.walker.firstName, phone: r.walker.phone, email: r.walker.email }} label={t('requests.contact')} />
                          {meetings.has(r.request.id) ? (
                            <MeetChecklist requestId={r.request.id} title={t('meetCheck.title', { dog: r.dog.name })} items={meetings.get(r.request.id)!} />
                          ) : null}
                          {r.request.meetVia === 'home' && r.request.kind === 'meet' ? (
                            <p className="notice small" role="note">
                              <Icon name="shield" size={18} /> <span>{t('meet.homeSafety')}</span>
                            </p>
                          ) : null}
                          {call ? (
                            // A call never counts as meeting in person: no ID check, no solo walks from here.
                            <CallNote via={r.request.meetVia} text={`${callHow(r)} ${t('meet.afterCallHost', { dog: r.dog.name })}`} />
                          ) : metPairs.has(`${r.dog.id}:${r.walker.id}`) ? (
                            <p className="muted small">{t('requests.trustElsewhere', { walker: r.walker.firstName, dog: r.dog.name })}</p>
                          ) : (
                            // The ID is seen at the meeting itself: recording it waits until then.
                            <p className="muted small">{t('requests.trustLater', { walker: r.walker.firstName })}</p>
                          )}
                          <div className="row">
                            {active && r.walkId ? (
                              <Link href={`/follow/${r.walkId}`} className="button primary">
                                {/* "Live meekijken" only for a walk that shares location (rules.ts walkHasLiveLocation). */}
                                {walkHasLiveLocation(r.request.kind, liveLocation) ? (
                                  <>
                                    <span className="live-dot" aria-hidden="true" /> {t('requests.follow')}
                                  </>
                                ) : (
                                  t('requests.followWalk')
                                )}
                              </Link>
                            ) : null}
                            {!active ? <CalendarLink requestId={r.request.id} label={t('requests.calendar')} /> : null}
                            {!active ? <CancelButton requestId={r.request.id} /> : null}
                          </div>
                        </AcceptReveal>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {metPairs.size ? (
            <section className="stack-s trust-pairs" aria-labelledby="trust-pairs-title">
              <h2 id="trust-pairs-title">{t('requests.trustTitle')}</h2>
              <ul className="list">
                {[...metPairs.values()].map((r) => (
                  <li key={`${r.dog.id}:${r.walker.id}`} className="list-item trust-pair">
                    <div className="grow stack-s">
                      <TrustForm
                        dogId={r.dog.id}
                        dogName={r.dog.name}
                        walkerId={r.walker.id}
                        walkerName={r.walker.firstName}
                        title={t('requests.trustPair', { walker: r.walker.firstName, dog: r.dog.name })}
                        initial={grants.get(`${r.dog.id}:${r.walker.id}`) ?? { idSeen: false, soloAllowed: false }}
                        allowSolo={!r.dog.orgId}
                        caveat={soloCaveat(r)}
                        liveLocation={liveLocation}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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
                      <span className={`pill ${statusPill(r.request.status)}`}>{statusText(r)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      )}

      {/* After the list, so nothing above it moves when a question appears. */}
      {pushKey ? <PushAsk publicKey={pushKey} text={pushText} /> : null}
      <InstallAsk push={Boolean(pushKey)} />
    </div>
  )
}
