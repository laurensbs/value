import { and, arrayOverlaps, desc, eq, gt, isNotNull, sql } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { BanUser, HideDog, ResolveReport } from '@/components/AdminTools'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { CHAT_WARN_FLAGS } from '@/lib/rules'
import { fromNow } from '@/lib/time'
import { requireAdmin } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminHub.pages.moderation')
  return { title: t('title') }
}

/** Moderation: open reports, signals (flagged feedback, requests and chats) and blocked accounts. */
export default async function ModerationPage() {
  await requireAdmin('/admin/moderation')
  const db = await getDb()

  const [t, th, format, reports, flaggedFeedback, flaggedRequests, flaggedChatRows, banned] = await Promise.all([
    getTranslations(),
    getTranslations('adminHub.pages.moderation'),
    getFormatter(),
    db
      .select({ report: s.report, subjectName: s.profile.firstName, subjectBanned: s.profile.bannedAt })
      .from(s.report)
      .leftJoin(s.profile, eq(s.profile.userId, s.report.subjectUserId))
      .where(eq(s.report.status, 'open'))
      .orderBy(desc(s.report.createdAt))
      .limit(50),
    db
      .select({ feedback: s.feedback, walk: s.walk, dogName: s.dog.name })
      .from(s.feedback)
      .innerJoin(s.walk, eq(s.walk.id, s.feedback.walkId))
      .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
      .where(eq(s.feedback.flagged, true))
      .orderBy(desc(s.feedback.createdAt))
      .limit(30),
    db
      .select({ request: s.walkRequest, walkerName: s.profile.firstName })
      .from(s.walkRequest)
      .innerJoin(s.profile, eq(s.profile.userId, s.walkRequest.walkerId))
      .where(sql`cardinality(${s.walkRequest.flags}) > 0`)
      .orderBy(desc(s.walkRequest.createdAt))
      .limit(30),
    // Chats stay private, also for admins: only who sent messages about money or with links, and how many.
    db
      .select({ senderId: s.chatMessage.senderId, name: s.profile.firstName, flags: s.chatMessage.flags })
      .from(s.chatMessage)
      .innerJoin(s.profile, eq(s.profile.userId, s.chatMessage.senderId))
      .where(and(arrayOverlaps(s.chatMessage.flags, [...CHAT_WARN_FLAGS]), gt(s.chatMessage.createdAt, fromNow(-30 * 24 * 60 * 60_000))))
      .limit(500),
    db
      .select({ userId: s.profile.userId, firstName: s.profile.firstName, reason: s.profile.banReason })
      .from(s.profile)
      .where(isNotNull(s.profile.bannedAt))
      .orderBy(desc(s.profile.bannedAt))
      .limit(50),
  ])
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

  return (
    <div className="admin-page stack-l">
      <header className="stack-s">
        <h1>{th('title')}</h1>
        <p className="lede">{th('lede')}</p>
      </header>

      <section id="meldingen" className="stack-s admin-anchor">
        <div className="spread">
          <h2>{t('admin.reports')}</h2>
          {reports.length ? <span className="pill warn">{reports.length}</span> : null}
        </div>
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

      <section id="signalen" className="stack-s admin-anchor">
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

      <section id="geblokkeerd" className="stack-s admin-anchor">
        <h2>{t('admin.banned')}</h2>
        {banned.length === 0 ? (
          <p className="muted">{th('noBans')}</p>
        ) : (
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
        )}
      </section>
    </div>
  )
}
