import { getFormatter, getTranslations } from 'next-intl/server'
import type { LaunchData } from '@/server/launch'

const METRICS = ['members', 'dogs', 'shelters', 'intros', 'walks'] as const

/**
 * Counts per week for the last 8 weeks, from real data only (no names): one small bar chart per
 * number, each on its own scale, with the exact numbers on hover and in a table.
 */
export async function WeeklyNumbers({ weeks, kpi }: Pick<LaunchData, 'weeks' | 'kpi'>) {
  const t = await getTranslations('launch.numbers')
  const tk = await getTranslations('admin.kpi')
  const format = await getFormatter()
  const label = (d: Date) => format.dateTime(d, { day: 'numeric', month: 'short' })

  return (
    <section className="stack" aria-labelledby="launch-numbers-title">
      <div className="stack-s">
        <h2 id="launch-numbers-title">{t('title')}</h2>
        <p className="muted small">{t('hint')}</p>
      </div>

      <dl className="launch-now">
        <div>
          <dt>{tk('dogsOnline')}</dt>
          <dd>{kpi.dogsOnline}</dd>
        </div>
        <div>
          <dt>{tk('sheltersLive')}</dt>
          <dd>{kpi.sheltersLive}</dd>
        </div>
        <div>
          <dt>{t('steadyPairs')}</dt>
          <dd>{kpi.steadyPairs}</dd>
        </div>
      </dl>

      <ul className="launch-metrics">
        {METRICS.map((key) => {
          const values = weeks.series[key]
          const max = Math.max(1, ...values)
          const total = values.reduce((a, b) => a + b, 0)
          const name = t(`metrics.${key}`)
          return (
            <li key={key} className="launch-metric">
              <div className="launch-metric-head">
                <span className="launch-metric-name">{name}</span>
                <span className="launch-metric-now">
                  <strong>{values[values.length - 1]}</strong> <span className="muted small">{t('thisWeek')}</span>
                </span>
              </div>
              <div className="launch-spark" role="img" aria-label={t('chartLabel', { name, total })}>
                {values.map((v, i) => (
                  // The whole column is the hover target, so even a tiny bar is easy to point at.
                  <span key={i} className={`launch-spark-col${i === values.length - 1 ? ' now' : ''}`} data-tip={t('tip', { week: label(weeks.starts[i]), n: v })}>
                    <span className={`launch-spark-bar${v === 0 ? ' zero' : ''}`} style={{ height: v === 0 ? undefined : `${Math.max(8, (v / max) * 100)}%` }} />
                  </span>
                ))}
              </div>
              <span className="muted small">{t('total', { n: total })}</span>
            </li>
          )
        })}
      </ul>

      <details className="launch-table-toggle">
        <summary>{t('asTable')}</summary>
        <div className="launch-table-wrap">
          <table className="launch-table">
            <thead>
              <tr>
                <th scope="col">{t('weekOf')}</th>
                {METRICS.map((key) => (
                  <th key={key} scope="col">
                    {t(`metrics.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.starts.map((start, i) => (
                <tr key={start.toISOString()}>
                  <th scope="row">{label(start)}</th>
                  {METRICS.map((key) => (
                    <td key={key}>{weeks.series[key][i]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
