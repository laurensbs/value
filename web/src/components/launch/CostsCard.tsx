import { getFormatter, getTranslations } from 'next-intl/server'
import type { LaunchData } from '@/server/launch'

/** What Rondje costs per month (config in src/server/launch-core.ts), and two honest averages. */
export async function CostsCard({ costs, members }: Pick<LaunchData, 'costs' | 'members'>) {
  const t = await getTranslations('launch.costs')
  const format = await getFormatter()
  const euro = (n: number) => format.number(n, { style: 'currency', currency: 'EUR' })
  const dash = '—'

  return (
    <section className="card stack" aria-labelledby="launch-costs-title">
      <div className="stack-s">
        <h2 id="launch-costs-title">{t('title')}</h2>
        <p className="muted small">{t('hint')}</p>
      </div>
      <table className="launch-costs">
        <tbody>
          {costs.lines.map((line) => (
            <tr key={line.key} className={line.active ? undefined : 'inactive'}>
              <th scope="row">
                {t(`items.${line.key}`)}
                {line.perYear != null ? <span className="muted small"> · {t('perYear', { amount: euro(line.perYear) })}</span> : null}
                {!line.active ? <span className="launch-cost-when">{t(`when.${line.key}`)}</span> : null}
              </th>
              <td>{line.active ? euro(line.monthly) : <span className="muted">{euro(line.monthly)}</span>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t('total')}</th>
            <td>{euro(costs.total)}</td>
          </tr>
        </tfoot>
      </table>
      <dl className="launch-now two">
        <div>
          <dt>{t('perMember')}</dt>
          <dd>{costs.perMember == null ? dash : euro(costs.perMember)}</dd>
          <dd className="launch-now-hint">{t('members', { n: members })}</dd>
        </div>
        <div>
          <dt>{t('walksPerActive')}</dt>
          <dd>{costs.walksPerActive == null ? dash : format.number(costs.walksPerActive, { maximumFractionDigits: 1 })}</dd>
          <dd className="launch-now-hint">{t('walksPerActiveHint')}</dd>
        </div>
      </dl>
    </section>
  )
}
