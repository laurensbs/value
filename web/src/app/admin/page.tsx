import { and, arrayOverlaps, count, desc, eq, gt, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { BanUser, HideDog, OrgDecision, RemoveDemo, ResolveReport, TipActions } from '@/components/AdminTools'
import { dbMode, getDb } from '@/db'
import * as s from '@/db/schema'
import { enabledSocialProviders } from '@/lib/auth'
import { emailMatchesWebsite, registryLookupUrl } from '@/lib/org-fields'
import { CHAT_WARN_FLAGS } from '@/lib/rules'
import { adminEmails, siteUrl } from '@/lib/site'
import { fromNow } from '@/lib/time'
import { tipKey } from '@/lib/tips'
import { growthKpis } from '@/server/kpis'
import { requireAdmin } from '@/server/session'

export const metadata = { robots: { index: false } }

export default async function AdminPage() {
  await requireAdmin()
  const t = await getTranslations()
  const format = await getFormatter()
  const db = await getDb()

  const [[users], [profiles], [dogs], [walks], [open]] = await Promise.all([
    db.select({ n: count() }).from(s.user),
    db.select({ n: count() }).from(s.profile),
    db.select({ n: count() }).from(s.dog).where(and(eq(s.dog.isDemo, false), ne(s.dog.status, 'draft'))),
    db.select({ n: count() }).from(s.walk).where(eq(s.walk.status, 'ended')),
    db.select({ n: count() }).from(s.report).where(eq(s.report.status, 'open')),
  ])
  const [demo] = await db.select({ n: count() }).from(s.dog).where(eq(s.dog.isDemo, true))

  const reports = await db
    .select({ report: s.report, subjectName: s.profile.firstName, subjectBanned: s.profile.bannedAt })
    .from(s.report)
    .leftJoin(s.profile, eq(s.profile.userId, s.report.subjectUserId))
    .where(eq(s.report.status, 'open'))
    .orderBy(desc(s.report.createdAt))
    .limit(50)
  const flaggedFeedback = await db
    .select({ feedback: s.feedback, walk: s.walk, dogName: s.dog.name })
    .from(s.feedback)
    .innerJoin(s.walk, eq(s.walk.id, s.feedback.walkId))
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(eq(s.feedback.flagged, true))
    .orderBy(desc(s.feedback.createdAt))
    .limit(30)
  const flaggedRequests = await db
    .select({ request: s.walkRequest, walkerName: s.profile.firstName })
    .from(s.walkRequest)
    .innerJoin(s.profile, eq(s.profile.userId, s.walkRequest.walkerId))
    .where(sql`cardinality(${s.walkRequest.flags}) > 0`)
    .orderBy(desc(s.walkRequest.createdAt))
    .limit(30)
  // Chats stay private, also for admins: only who sent messages about money or with links, and how many.
  const flaggedChatRows = await db
    .select({ senderId: s.chatMessage.senderId, name: s.profile.firstName, flags: s.chatMessage.flags })
    .from(s.chatMessage)
    .innerJoin(s.profile, eq(s.profile.userId, s.chatMessage.senderId))
    .where(and(arrayOverlaps(s.chatMessage.flags, [...CHAT_WARN_FLAGS]), gt(s.chatMessage.createdAt, fromNow(-30 * 24 * 60 * 60_000))))
    .limit(500)
  const flaggedChats = [
    ...flaggedChatRows
      .reduce((map, r) => {
        const entry = map.get(r.senderId) ?? { senderId: r.senderId, name: r.name, n: 0, flags: new Set<string>() }
        entry.n++
        for (const f of r.flags) if (CHAT_WARN_FLAGS.includes(f)) entry.flags.add(f)
        return map.set(r.senderId, entry)
      }, new Map<string, { senderId: string; name: string; n: number; flags: Set<string> }>())
      .values(),
  ].sort((a, b) => b.n - a.n)
  const pendingOrgs = await db.select().from(s.organization).where(eq(s.organization.status, 'pending')).orderBy(desc(s.organization.createdAt))
  const banned = await db
    .select({ userId: s.profile.userId, firstName: s.profile.firstName, reason: s.profile.banReason })
    .from(s.profile)
    .where(and(isNotNull(s.profile.bannedAt)))
    .limit(50)

  // Tips and votes for shelters, grouped per shelter: most asked-for first.
  const openTips = await db
    .select()
    .from(s.suggestion)
    .where(inArray(s.suggestion.status, ['new', 'contacted']))
    .orderBy(desc(s.suggestion.createdAt))
    .limit(500)
  const tipGroups = [
    ...openTips
      .reduce((groups, tip) => {
        const key = tip.directoryId ?? `${tip.country}:${tipKey(tip.name)}`
        const group = groups.get(key) ?? { key, first: tip, ids: [] as string[], notes: [] as string[], contacted: false }
        group.ids.push(tip.id)
        if (tip.note) group.notes.push(tip.note)
        if (tip.status === 'contacted') group.contacted = true
        return groups.set(key, group)
      }, new globalThis.Map<string, { key: string; first: (typeof openTips)[number]; ids: string[]; notes: string[]; contacted: boolean }>())
      .values(),
  ]
    .sort((a, b) => b.ids.length - a.ids.length)
    .slice(0, 40)
  const referrals = await db
    .select({ code: s.profile.referredBy, n: count() })
    .from(s.profile)
    .where(isNotNull(s.profile.referredBy))
    .groupBy(s.profile.referredBy)
    .orderBy(desc(count()))
    .limit(20)
  const referrers = referrals.length
    ? await db
        .select({ code: s.profile.referralCode, firstName: s.profile.firstName })
        .from(s.profile)
        .where(inArray(s.profile.referralCode, referrals.map((r) => r.code ?? '')))
    : []
  const referrerName = Object.fromEntries(referrers.map((r) => [r.code, r.firstName]))

  const kpi = await growthKpis()

  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  const mode = dbMode()

  return (
    <div className="stack-l">
      <h1>{t('admin.title')}</h1>

      <Link href="/admin/launch" className="card spread" style={{ color: 'inherit', textDecoration: 'none', flexWrap: 'nowrap' }}>
        <span className="stack-s">
          <strong>{t('launch.entry.title')}</strong>
          <span className="muted small">{t('launch.entry.text')}</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>

      <section className="stack-s">
        <h2>{t('admin.stats')}</h2>
        <dl className="facts">
          <div>
            <dt>{t('admin.users')}</dt>
            <dd>
              {users.n} <span className="muted small">({profiles.n} {t('admin.onboarded')})</span>
            </dd>
          </div>
          <div>
            <dt>{t('admin.dogs')}</dt>
            <dd>{dogs.n}</dd>
          </div>
          <div>
            <dt>{t('admin.walks')}</dt>
            <dd>{walks.n}</dd>
          </div>
          <div>
            <dt>{t('admin.openReports')}</dt>
            <dd>{open.n}</dd>
          </div>
        </dl>
      </section>

      <section className="stack-s">
        <h2>{t('admin.growth')}</h2>
        <p className="muted small">{t('admin.growthHint')}</p>
        <dl className="facts">
          <div>
            <dt>{t('admin.kpi.steadyWalksWeek')}</dt>
            <dd>
              <strong>{kpi.steadyWalksWeek}</strong> <span className="muted small">({t('admin.kpi.steadyPairs', { n: kpi.steadyPairs })})</span>
            </dd>
          </div>
          <div>
            <dt>{t('admin.kpi.dogsOnline')}</dt>
            <dd>
              {kpi.dogsOnline} <span className="muted small">({t('admin.kpi.dogsSplit', { owner: kpi.ownerDogs, shelter: kpi.shelterDogs })})</span>
            </dd>
          </div>
          <div>
            <dt>{t('admin.kpi.sheltersLive')}</dt>
            <dd>{kpi.sheltersLive}</dd>
          </div>
          <div>
            <dt>{t('admin.kpi.newPeopleWeek')}</dt>
            <dd>{kpi.newPeopleWeek}</dd>
          </div>
          <div>
            <dt>{t('admin.kpi.walksWeek')}</dt>
            <dd>{kpi.walksWeek}</dd>
          </div>
          <div>
            <dt>{t('admin.kpi.groupSignupsWeek')}</dt>
            <dd>
              {kpi.groupSignupsWeek}
              {kpi.groupFill != null ? <span className="muted small"> ({t('admin.kpi.groupFill', { pct: kpi.groupFill })})</span> : null}
            </dd>
          </div>
          <div>
            <dt>{t('admin.kpi.tipsWeek')}</dt>
            <dd>{kpi.tipsWeek}</dd>
          </div>
        </dl>
      </section>

      <section className="stack-s">
        <h2>{t('admin.reports')}</h2>
        {reports.length === 0 ? (
          <p className="muted">{t('admin.noReports')}</p>
        ) : (
          <ul className="list">
            {reports.map(({ report: r, subjectName, subjectBanned }) => (
              <li key={r.id} className="list-item">
                <div className="grow stack-s">
                  <div className="row">
                    <span className={`pill ${r.category === 'abuse' || r.category === 'safety' ? 'danger' : 'warn'}`}>{t(`report.categories.${r.category}`)}</span>
                    <span className="muted small">{format.dateTime(r.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <p>{r.description}</p>
                  <p className="muted small">
                    {subjectName ? `${t('admin.about')}: ${subjectName}` : null}
                    {r.dogId ? (
                      <>
                        {' · '}
                        <Link href={`/dogs/${r.dogId}`}>{t('admin.dog')}</Link>
                      </>
                    ) : null}
                    {r.walkId ? (
                      <>
                        {' · '}
                        <Link href={`/follow/${r.walkId}`}>{t('admin.walk')}</Link>
                      </>
                    ) : null}
                  </p>
                  <ResolveReport reportId={r.id} />
                  <div className="row">
                    {r.subjectUserId ? <BanUser userId={r.subjectUserId} banned={Boolean(subjectBanned)} /> : null}
                    {r.dogId ? <HideDog dogId={r.dogId} /> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack-s">
        <h2>{t('admin.flagged')}</h2>
        {flaggedFeedback.length === 0 ? (
          <p className="muted">{t('admin.none')}</p>
        ) : (
          <ul className="list">
            {flaggedFeedback.map(({ feedback: f, walk: w, dogName }) => (
              <li key={f.id} className="list-item">
                <div className="grow stack-s">
                  <strong>
                    {dogName} · {f.role === 'owner' ? t('admin.fromOwner') : t('admin.fromWalker')}
                  </strong>
                  <code className="small">{JSON.stringify(f.answers)}</code>
                  {f.note ? <p>{f.note}</p> : null}
                  <div className="row">
                    <Link href={`/follow/${w.id}`} className="link-button small">
                      {t('admin.walk')}
                    </Link>
                    {f.role === 'owner' ? <BanUser userId={w.walkerId} banned={false} /> : <HideDog dogId={w.dogId} />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack-s">
        <h2>{t('admin.flaggedRequests')}</h2>
        {flaggedRequests.length === 0 ? (
          <p className="muted">{t('admin.none')}</p>
        ) : (
          <ul className="list">
            {flaggedRequests.map(({ request: r, walkerName }) => (
              <li key={r.id} className="list-item">
                <div className="grow stack-s">
                  <div className="row">
                    <strong>{walkerName}</strong>
                    {r.flags.map((f) => (
                      <span key={f} className="pill warn">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="small">{r.message}</p>
                  <BanUser userId={r.walkerId} banned={false} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <h3>{t('admin.flaggedChats')}</h3>
        <p className="muted small">{t('admin.flaggedChatsHint')}</p>
        {flaggedChats.length === 0 ? (
          <p className="muted">{t('admin.none')}</p>
        ) : (
          <ul className="list">
            {flaggedChats.map((c) => (
              <li key={c.senderId} className="list-item">
                <div className="grow stack-s">
                  <div className="row">
                    <strong>{c.name}</strong>
                    <span className="muted small">{t('admin.flaggedChatCount', { n: c.n })}</span>
                    {[...c.flags].map((f) => (
                      <span key={f} className="pill warn">
                        {f}
                      </span>
                    ))}
                  </div>
                  <BanUser userId={c.senderId} banned={false} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack-s">
        <h2>{t('admin.orgs')}</h2>
        {pendingOrgs.length === 0 ? (
          <p className="muted">{t('admin.none')}</p>
        ) : (
          <ul className="list">
            {pendingOrgs.map((o) => (
              <li key={o.id} className="list-item">
                <div className="grow stack-s">
                  <strong>{o.name}</strong>
                  <p className="muted small">
                    {o.city}, {o.country} · {o.registrationNumber} · {o.email}
                    {o.website ? (
                      <>
                        {' · '}
                        <a href={o.website} target="_blank" rel="noopener noreferrer">
                          {o.website}
                        </a>
                      </>
                    ) : null}
                  </p>
                  {o.description ? <p className="small">{o.description}</p> : null}
                  <p className="small">
                    {[
                      o.dogCount != null ? t('admin.orgDogCount', { n: o.dogCount }) : null,
                      o.instagram ? `@${o.instagram}` : null,
                      o.phone || null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {o.coordinatorName || o.coordinatorEmail || o.coordinatorPhone ? (
                    <p className="small">
                      <strong>{t('admin.orgCoordinator')}:</strong>{' '}
                      {[o.coordinatorName, o.coordinatorEmail, o.coordinatorPhone].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {o.walkingTimes ? (
                    <p className="muted small">
                      {t('dog.walkingTimes')}: {o.walkingTimes}
                    </p>
                  ) : null}
                  <div className="row small">
                    {registryLookupUrl(o.country, o.registrationNumber) ? (
                      <a href={registryLookupUrl(o.country, o.registrationNumber)!} target="_blank" rel="noopener noreferrer">
                        {t('admin.orgLookup')} ↗
                      </a>
                    ) : null}
                    {emailMatchesWebsite(o.email, o.website) ? <span className="pill green">{t('admin.orgDomainMatch')}</span> : null}
                  </div>
                  <p className="muted small">{t('admin.verifyHint')}</p>
                  <OrgDecision orgId={o.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack-s">
        <h2>{t('admin.tips')}</h2>
        <p className="muted small">{t('admin.tipsHint')}</p>
        {tipGroups.length === 0 ? (
          <p className="muted">{t('admin.none')}</p>
        ) : (
          <ul className="list">
            {tipGroups.map(({ key, first, ids, notes, contacted }) => (
              <li key={key} className="list-item">
                <div className="grow stack-s">
                  <div className="spread">
                    <strong>{first.name}</strong>
                    <span className="pill blue">{t('admin.tipCount', { n: ids.length })}</span>
                  </div>
                  <p className="muted small">
                    {[first.city, first.country].filter(Boolean).join(', ')}
                    {first.website ? (
                      <>
                        {' · '}
                        <a href={first.website} target="_blank" rel="noopener noreferrer">
                          {first.website}
                        </a>
                      </>
                    ) : null}
                    {contacted ? ` · ${t('admin.tipStatus.contacted')}` : ''}
                  </p>
                  {notes.slice(0, 3).map((note, i) => (
                    <p key={i} className="small">
                      “{note}”
                    </p>
                  ))}
                  {first.directoryId ? (
                    <p className="small">
                      {t('admin.tipClaimLink')}: <code>{`${siteUrl()}/shelter?claim=${first.directoryId}`}</code>
                    </p>
                  ) : null}
                  <TipActions ids={ids} contacted={contacted} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack-s">
        <h2>{t('admin.referrals')}</h2>
        {referrals.length === 0 ? (
          <p className="muted">{t('admin.none')}</p>
        ) : (
          <ul className="list">
            {referrals.map((r) => (
              <li key={r.code} className="list-item compact">
                <code>{r.code}</code>
                <span className="grow muted small">{referrerName[r.code ?? ''] ?? t('admin.referralCampaign')}</span>
                <span className="pill">{t('admin.referralCount', { n: r.n })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {banned.length ? (
        <section className="stack-s">
          <h2>{t('admin.banned')}</h2>
          <ul className="list">
            {banned.map((b) => (
              <li key={b.userId} className="list-item compact">
                <div className="grow">
                  <strong>{b.firstName}</strong>
                  <p className="muted small">{b.reason}</p>
                </div>
                <BanUser userId={b.userId} banned />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card stack-s">
        <h2>{t('admin.setup')}</h2>
        <ul className="setup-list">
          <li className={mode === 'pglite' ? 'todo' : 'ok'}>
            <strong>{t('admin.database')}:</strong> {mode === 'neon' ? 'Neon Postgres' : mode === 'postgres' ? 'Postgres' : t('admin.databaseDemo')}
          </li>
          <li className={blob ? 'ok' : 'todo'}>
            <strong>{t('admin.photos')}:</strong> {blob ? 'Vercel Blob' : t('admin.photosInline')}
          </li>
          <li className={enabledSocialProviders.length ? 'ok' : 'todo'}>
            <strong>{t('admin.social')}:</strong> {enabledSocialProviders.length ? enabledSocialProviders.join(', ') : t('admin.socialOff')}
          </li>
          <li className={adminEmails().length ? 'ok' : 'todo'}>
            <strong>ADMIN_EMAILS:</strong> {adminEmails().length}
          </li>
          <li className={process.env.CRON_SECRET ? 'ok' : 'todo'}>
            <strong>CRON_SECRET:</strong> {process.env.CRON_SECRET ? '✓' : '—'}
          </li>
        </ul>
      </section>

      {demo.n > 0 ? (
        <section className="card flat stack-s">
          <h2>{t('admin.demo')}</h2>
          <p className="muted">{t('admin.demoText')}</p>
          <div>
            <RemoveDemo />
          </div>
        </section>
      ) : null}
    </div>
  )
}
