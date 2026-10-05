import './sources.css'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { campaign, supportConfig } from '@/lib/support'
import { isNativeRequest } from '@/server/native'
import { requireAdmin } from '@/server/session'
import { sourcesData } from '@/server/sources'
import { DIRECT, INVITE, ROLES, type RoleCounts, type SourceCount, type WeekReport } from '@/server/sources-core'
import crowdfunding from '../../../../content/crowdfunding.json'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminHub.pages.sources')
  return { title: t('title') }
}

/** A number cell that reads quiet when it is zero, so the few real numbers stand out. */
function Count({ n, strong = false }: { n: number; strong?: boolean }) {
  return <td className={n === 0 ? 'src-zero' : strong ? 'src-strong' : undefined}>{n}</td>
}

/**
 * Bronnen: where new people come from (the code of their sign-up link), per ISO week for the last
 * eight weeks and per role, the new real dogs, and the crowdfunding as it stands in
 * content/crowdfunding.json. Only counts: never a name, an e-mail address or a member's own code.
 * Admin only.
 */
export default async function SourcesPage() {
  await requireAdmin('/admin/sources')
  const [t, format, data, native] = await Promise.all([getTranslations('adminHub.pages.sources'), getFormatter(), sourcesData(), isNativeRequest()])

  const weeks = [...data.weeks].reverse()
  const range = (w: WeekReport) => format.dateTimeRange(w.start, w.end, { day: 'numeric', month: 'short' })
  const source = (key: string) => (key === DIRECT ? t('direct') : key === INVITE ? t('invite') : <code>{key}</code>)
  const roleCells = (c: RoleCounts) => ROLES.map((role) => <Count key={role} n={c[role]} />)
  const sourceRows = (rows: SourceCount[]) =>
    rows.map((r) => (
      <tr key={r.key}>
        <th scope="row">{source(r.key)}</th>
        {roleCells(r.counts)}
        <Count n={r.counts.total} strong />
      </tr>
    ))
  const sourceHead = (
    <tr>
      <th scope="col">{t('col.source')}</th>
      {ROLES.map((role) => (
        <th key={role} scope="col">
          {t(`col.${role}`)}
        </th>
      ))}
      <th scope="col">{t('col.total')}</th>
    </tr>
  )

  const cfg = supportConfig()
  const drive = campaign(crowdfunding)
  const euro = (n: number) => format.number(n, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <div className="admin-page stack-l">
      <header className="stack-s">
        <h1>{t('title')}</h1>
        <p className="lede">{t('lede')}</p>
      </header>

      <section className="stack-s" aria-labelledby="src-weeks-title">
        <h2 id="src-weeks-title">{t('weeksTitle')}</h2>
        <div className="src-table-wrap">
          <table className="src-table" aria-labelledby="src-weeks-title">
            <thead>
              <tr>
                <th scope="col">{t('col.week')}</th>
                <th scope="col">{t('col.total')}</th>
                {ROLES.map((role) => (
                  <th key={role} scope="col">
                    {t(`col.${role}`)}
                  </th>
                ))}
                <th scope="col" className="src-dogs">
                  {t('col.dogs')}
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start.toISOString()}>
                  <th scope="row">
                    <span className="src-week">{t('week', { week: w.isoWeek })}</span>
                    {/* A small phone shows the Monday only, so the dates never break over lines. */}
                    <span className="src-range">
                      <span className="src-range-full">{range(w)}</span>
                      <span className="src-range-start">{format.dateTime(w.start, { day: 'numeric', month: 'short' })}</span>
                    </span>
                  </th>
                  <Count n={w.signups.total} strong />
                  {roleCells(w.signups)}
                  <td className={`src-dogs${w.dogs === 0 ? ' src-zero' : ''}`}>{w.dogs}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('together')}</th>
                <td>{data.totals.total}</td>
                {ROLES.map((role) => (
                  <td key={role}>{data.totals[role]}</td>
                ))}
                <td className="src-dogs">{data.dogs}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="stack-s" aria-labelledby="src-sources-title">
        <h2 id="src-sources-title">{t('sourcesTitle')}</h2>
        {data.bySource.length ? (
          <div className="src-table-wrap">
            <table className="src-table" aria-labelledby="src-sources-title">
              <thead>{sourceHead}</thead>
              <tbody>{sourceRows(data.bySource)}</tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t('none')}</p>
        )}
      </section>

      {data.bySource.length ? (
        <details className="src-detail">
          <summary>{t('detailTitle')}</summary>
          <div className="src-table-wrap">
            <table className="src-table" aria-label={t('detailTitle')}>
              <thead>{sourceHead}</thead>
              {/* Only the weeks with sign-ups: the table above already shows the quiet ones. */}
              {weeks
                .filter((w) => w.sources.length)
                .map((w) => (
                  <tbody key={w.start.toISOString()}>
                    <tr className="src-group">
                      <th scope="rowgroup" colSpan={ROLES.length + 2}>
                        {t('week', { week: w.isoWeek })} <span className="src-range">{range(w)}</span>
                      </th>
                    </tr>
                    {sourceRows(w.sources)}
                  </tbody>
                ))}
            </table>
          </div>
        </details>
      ) : null}

      <section className="card flat stack-s" aria-labelledby="src-notes-title">
        <h2 id="src-notes-title">{t('notesTitle')}</h2>
        <ul className="src-notes small">
          <li>{t('notes.signup')}</li>
          <li>{t('notes.sources')}</li>
          <li>{t('notes.roles')}</li>
          <li>{t('notes.real')}</li>
        </ul>
      </section>

      {/* The app shells never show money (only "Help ons via Whydonate", a link out: HelpUsInApp). */}
      {native ? null : (
        <section className="card stack-s" aria-labelledby="src-fund-title">
          <h2 id="src-fund-title">{t('fund.title')}</h2>
          {drive.progress ? (
            <div className="stack-s">
              <div
                className="src-progress"
                role="progressbar"
                aria-labelledby="src-fund-title"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={drive.progress.percent}
                aria-valuetext={t('fund.progress', { raised: euro(drive.progress.raised), goal: euro(drive.progress.goal) })}
              >
                <span style={{ width: `${drive.progress.percent}%` }} />
              </div>
              <p className="src-fund-numbers">
                <strong>{t('fund.progress', { raised: euro(drive.progress.raised), goal: euro(drive.progress.goal) })}</strong>
                <span className="muted small">{t('fund.percent', { percent: drive.progress.percent })}</span>
              </p>
              <p className="muted small">
                {drive.updated ? t('fund.updated', { date: format.dateTime(new Date(drive.updated), { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('fund.notUpdated')}
              </p>
            </div>
          ) : (
            <p className="muted">{t('fund.missing')}</p>
          )}
          <h3>{t('fund.howTitle')}</h3>
          <p className="small">{t.rich('fund.how', { code: (chunks) => <code>{chunks}</code> })}</p>
          <p className="muted small">{t('fund.manual')}</p>
          {cfg.crowdfundingUrl ? (
            <div>
              <a href={cfg.crowdfundingUrl} target="_blank" rel="noopener noreferrer" className="button secondary small">
                {t('fund.open')} <Icon name="external" size={16} />
              </a>
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}
