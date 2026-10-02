import { and, count, desc, eq, isNotNull, sql } from 'drizzle-orm'
import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { BanUser, HideDog, OrgDecision, RemoveDemo, ResolveReport } from '@/components/AdminTools'
import { dbMode, getDb } from '@/db'
import * as s from '@/db/schema'
import { enabledSocialProviders } from '@/lib/auth'
import { adminEmails } from '@/lib/site'
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
    db.select({ n: count() }).from(s.dog).where(eq(s.dog.isDemo, false)),
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
  const pendingOrgs = await db.select().from(s.organization).where(eq(s.organization.status, 'pending')).orderBy(desc(s.organization.createdAt))
  const banned = await db
    .select({ userId: s.profile.userId, firstName: s.profile.firstName, reason: s.profile.banReason })
    .from(s.profile)
    .where(and(isNotNull(s.profile.bannedAt)))
    .limit(50)

  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  const mode = dbMode()

  return (
    <div className="stack-l">
      <h1>{t('admin.title')}</h1>

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
                  <p className="muted small">{t('admin.verifyHint')}</p>
                  <OrgDecision orgId={o.id} />
                </div>
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
