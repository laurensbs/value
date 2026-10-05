import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import type { Answer } from '@/server/marketing-core'

type T = Awaited<ReturnType<typeof getTranslations>>

/** The values of an answer, with the ones that are message keys (labels) translated. */
function valuesOf(t: T, answer: Answer): Record<string, string | number> {
  const labels = Object.fromEntries(Object.entries(answer.labels ?? {}).map(([name, key]) => [name, t(`labels.${key}`)]))
  return { ...answer.values, ...labels }
}

const external = (href: string) => /^https?:\/\//.test(href)

function Go({ href, label }: { href: string; label: string }) {
  return external(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="mk-go">
      {label} ↗
    </a>
  ) : (
    <Link href={href} className="mk-go">
      {label} →
    </Link>
  )
}

/** "Deze week": the first questions that ask for action, plus the next post to place. */
export async function ThisWeek({ answers, nextPost }: { answers: Answer[]; nextPost: string | null }) {
  const t = await getTranslations('marketing')
  return (
    <section className="mk-week stack" aria-labelledby="mk-week-title">
      <div className="stack-s">
        <h2 id="mk-week-title">{t('week.title')}</h2>
        <p className="small">{answers.length ? t('week.hint') : t('week.none')}</p>
      </div>
      {answers.length ? (
        <ol className="mk-week-list">
          {answers.map((a) => (
            <li key={a.id}>
              <a href={`#q-${a.id}`} className="mk-week-q">
                {t(`questions.${a.id}.q`)}
              </a>
              <span>{t(`questions.${a.id}.action.${a.action}`, valuesOf(t, a))}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {nextPost ? (
        <p className="mk-week-post">
          <Icon name="calendar" size={18} /> <a href="#posts">{nextPost}</a>
        </p>
      ) : null}
    </section>
  )
}

/** De beste vragen: one card per question, with the live answer, why it matters and what to do now. */
export async function Questions({ answers }: { answers: Answer[] }) {
  const t = await getTranslations('marketing')
  return (
    <ol className="mk-questions">
      {answers.map((a, i) => {
        const values = valuesOf(t, a)
        const q = (key: string) => t(`questions.${a.id}.${key}`, values)
        return (
          <li key={a.id} id={`q-${a.id}`} className={`mk-q card s-${a.status}`}>
            <div className="mk-q-head">
              <span className="mk-q-n" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{q('q')}</h3>
              <span className={`mk-status s-${a.status}`}>{t(`status.${a.status}`)}</span>
            </div>
            <p className="mk-q-answer">{q(`answer.${a.variant}`)}</p>

            {a.steps ? <Funnel steps={a.steps} t={t} /> : null}
            {a.rows?.length ? <Rows answer={a} t={t} /> : null}
            {a.id === 'demand' && a.rows?.length ? <p className="muted small">{t('questions.demand.note')}</p> : null}

            <p className="mk-q-why">
              <strong>{t('questions.why')}:</strong> {q('why')}
            </p>
            <div className="mk-q-now">
              <span className="eyebrow">{t('questions.now')}</span>
              <p>{q(`action.${a.action}`)}</p>
              {a.href ? <Go href={a.href} label={t('questions.open')} /> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Funnel({ steps, t }: { steps: NonNullable<Answer['steps']>; t: T }) {
  const max = Math.max(1, ...steps.map((s) => s.n))
  return (
    <ol className="mk-funnel">
      <li className="mk-funnel-visits">
        <span className="mk-funnel-name">{t('funnelSteps.visits')}</span>
        <span className="muted small">{t('funnelSteps.visitsHint')}</span>
      </li>
      {steps.map((s) => (
        <li key={s.key}>
          <span className="mk-funnel-name">
            {t(`funnelSteps.${s.key}`)}
            {s.key === 'firstStep' ? <span className="muted small"> · {t('funnelSteps.firstStepHint')}</span> : null}
          </span>
          <span className="mk-funnel-bar" aria-hidden="true">
            <span style={{ width: `${Math.max(s.n ? 4 : 0, (s.n / max) * 100)}%` }} />
          </span>
          <strong className="mk-funnel-n">{s.n}</strong>
        </li>
      ))}
    </ol>
  )
}

function Rows({ answer, t }: { answer: Answer; t: T }) {
  const cols =
    answer.id === 'demand'
      ? [t('questions.cols.city'), t('questions.cols.demand'), t('questions.cols.supply')]
      : answer.id === 'referrals'
        ? [t('questions.cols.code'), t('questions.cols.signups')]
        : [t('questions.cols.shelter'), t('questions.cols.votes')]
  return (
    <div className="mk-table-wrap">
      <table className="mk-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {answer.rows!.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.href ? <Link href={r.href}>{r.label}</Link> : r.label}</th>
              <td>{r.value}</td>
              {r.extra !== undefined ? <td>{r.extra}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
