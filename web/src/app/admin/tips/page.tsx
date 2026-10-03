import { desc, inArray } from 'drizzle-orm'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { TipActions } from '@/components/AdminTools'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { siteUrl } from '@/lib/site'
import { tipGroupKey } from '@/server/admin-hub'
import { groupTips } from '@/server/admin-questions'
import { requireAdmin } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminHub.pages.tips')
  return { title: t('title') }
}

/** Tips and votes for shelters, grouped per shelter: most asked-for first. */
export default async function TipsPage() {
  await requireAdmin('/admin/tips')
  const db = await getDb()
  const [t, th, openTips] = await Promise.all([
    getTranslations(),
    getTranslations('adminHub.pages.tips'),
    db.select().from(s.suggestion).where(inArray(s.suggestion.status, ['new', 'contacted'])).orderBy(desc(s.suggestion.createdAt)).limit(500),
  ])
  const tipGroups = groupTips(openTips, tipGroupKey).slice(0, 40)

  return (
    <div className="admin-page stack-l">
      <header className="stack-s">
        <h1>{th('title')}</h1>
        <p className="lede">{t('admin.tipsHint')}</p>
      </header>

      <section className="stack-s" aria-label={t('admin.tips')}>
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
    </div>
  )
}
