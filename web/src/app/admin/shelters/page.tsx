import { asc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { OrgDecision } from '@/components/AdminTools'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { emailMatchesWebsite, registryLookupUrl } from '@/lib/org-fields'
import { requireAdmin } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminHub.pages.shelters')
  return { title: t('title') }
}

/** Shelters that signed up and wait for verification: oldest first, so nobody waits too long. */
export default async function SheltersPage() {
  await requireAdmin('/admin/shelters')
  const db = await getDb()
  const [t, th, format, pendingOrgs] = await Promise.all([
    getTranslations(),
    getTranslations('adminHub.pages.shelters'),
    getFormatter(),
    db
      .select()
      .from(s.organization)
      .where(eq(s.organization.status, 'pending'))
      .orderBy(asc(s.organization.createdAt)),
  ])

  return (
    <div className="admin-page stack-l">
      <header className="stack-s">
        <h1>{th('title')}</h1>
        <p className="lede">{th('lede')}</p>
      </header>

      <section className="stack-s">
        <div className="spread">
          <h2>{t('admin.orgs')}</h2>
          {pendingOrgs.length ? <span className="pill warn">{pendingOrgs.length}</span> : null}
        </div>
        {pendingOrgs.length === 0 ? (
          <p className="muted">{t('admin.none')}</p>
        ) : (
          <ul className="list">
            {pendingOrgs.map((o) => (
              <li key={o.id} className="list-item">
                <div className="grow stack-s">
                  <div className="spread">
                    <strong>{o.name}</strong>
                    <span className="muted small">{th('since', { date: format.dateTime(o.createdAt, { day: 'numeric', month: 'short' }) })}</span>
                  </div>
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
                    {[o.dogCount != null ? t('admin.orgDogCount', { n: o.dogCount }) : null, o.instagram ? `@${o.instagram}` : null, o.phone || null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {o.coordinatorName || o.coordinatorEmail || o.coordinatorPhone ? (
                    <p className="small">
                      <strong>{t('admin.orgCoordinator')}:</strong> {[o.coordinatorName, o.coordinatorEmail, o.coordinatorPhone].filter(Boolean).join(' · ')}
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
    </div>
  )
}
