import { and, count, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { RemoveDemo } from '@/components/AdminTools'
import { dbMode, getDb } from '@/db'
import * as s from '@/db/schema'
import { enabledSocialProviders } from '@/lib/auth'
import { databaseRegion, regionFit, vercelRegionFor } from '@/lib/regions'
import { adminEmails } from '@/lib/site'
import { emailEnabled } from '@/server/email'
import { growthKpis } from '@/server/kpis'
import { requireAdmin } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminHub.pages.numbers')
  return { title: t('title') }
}

/** The numbers: totals, growth (from the marketing plan), invitations, and how everything is set up. */
export default async function NumbersPage() {
  await requireAdmin('/admin/numbers')
  const db = await getDb()
  const [t, th, [[users], [profiles], [dogs], [walks], [open], [demo]], referrals, kpi] = await Promise.all([
    getTranslations(),
    getTranslations('adminHub.pages.numbers'),
    Promise.all([
      db.select({ n: count() }).from(s.user),
      db.select({ n: count() }).from(s.profile),
      db.select({ n: count() }).from(s.dog).where(and(eq(s.dog.isDemo, false), ne(s.dog.status, 'draft'))),
      db.select({ n: count() }).from(s.walk).where(eq(s.walk.status, 'ended')),
      db.select({ n: count() }).from(s.report).where(eq(s.report.status, 'open')),
      db.select({ n: count() }).from(s.dog).where(eq(s.dog.isDemo, true)),
    ]),
    db
      .select({ code: s.profile.referredBy, n: count() })
      .from(s.profile)
      .where(isNotNull(s.profile.referredBy))
      .groupBy(s.profile.referredBy)
      .orderBy(desc(count()))
      .limit(20),
    growthKpis(),
  ])
  const referrers = referrals.length
    ? await db
        .select({ code: s.profile.referralCode, firstName: s.profile.firstName })
        .from(s.profile)
        .where(inArray(s.profile.referralCode, referrals.map((r) => r.code ?? '')))
    : []
  const referrerName = Object.fromEntries(referrers.map((r) => [r.code, r.firstName]))

  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  const mode = dbMode()
  // Every database question travels between the app and the database: they belong close together.
  const dbRegion = databaseRegion(process.env.DATABASE_URL || process.env.POSTGRES_URL)
  const regions = {
    fit: regionFit(process.env.VERCEL_REGION, dbRegion),
    values: { app: process.env.VERCEL_REGION ?? '', db: dbRegion ?? '', suggest: dbRegion ? (vercelRegionFor(dbRegion) ?? '') : '' },
  }

  return (
    <div className="admin-page stack-l">
      <header className="stack-s">
        <h1>{th('title')}</h1>
        <p className="lede">{th('lede')}</p>
      </header>

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
        <p className="small">
          <Link href="/admin/launch#cijfers">{th('weekly')} →</Link>
        </p>
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

      <section id="instellingen" className="card stack-s admin-anchor">
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
          <li className={emailEnabled() ? 'ok' : 'todo'}>
            <strong>{t('admin.email')}:</strong> {emailEnabled() ? t('admin.emailOn') : t('admin.emailOff')}
          </li>
          {regions.fit ? (
            <li className={regions.fit === 'far' ? 'todo' : 'ok'}>
              <strong>{t('admin.region')}:</strong>{' '}
              {t(regions.fit === 'same' ? 'admin.regionSame' : regions.fit === 'near' ? 'admin.regionNear' : 'admin.regionFar', regions.values)}
            </li>
          ) : null}
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
