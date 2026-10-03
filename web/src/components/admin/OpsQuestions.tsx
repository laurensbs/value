import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import type { Level, Question, QuestionItem } from '@/server/admin-questions'

const LEVEL_ICON = { urgent: 'alert', attention: 'clock', calm: 'check' } as const

/**
 * "De beste vragen": the daily questions of a trust & safety / operations lead, each with a live
 * answer and a link to act. Most urgent first; when nothing needs attention it says so on top.
 */
export async function OpsQuestions({ questions, summary }: { questions: Question[]; summary: { level: Level; count: number } }) {
  const [t, format] = await Promise.all([getTranslations('adminHub'), getFormatter()])
  // Dates in the answers in the app's own time zone (Europe/Amsterdam), short: "za 14:00".
  const when = (d: Date) => format.dateTime(d, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  const itemText = (item: QuestionItem) =>
    t(`items.${item.kind}`, Object.fromEntries(Object.entries(item.values).map(([k, v]) => [k, v instanceof Date ? when(v) : v])))

  return (
    <section className="stack admin-questions-section" aria-labelledby="admin-questions-title">
      <div className="stack-s">
        <h2 id="admin-questions-title">{t('questionsTitle')}</h2>
        <p className="muted small">{t('questionsHint')}</p>
      </div>

      <p className={`admin-status is-${summary.level}`} role="status">
        <Icon name={LEVEL_ICON[summary.level]} size={20} />
        <span>{summary.level === 'calm' ? t('status.calm') : t(`status.${summary.level}`, { n: summary.count })}</span>
      </p>

      <ol className="admin-questions">
        {questions.map((q) => (
          <li key={q.id} className={`admin-q is-${q.level}`}>
            <span className="admin-q-mark" aria-hidden="true">
              <Icon name={LEVEL_ICON[q.level]} size={18} />
            </span>
            <div className="admin-q-body">
              <div className="admin-q-head">
                <h3>{t(`questions.${q.id}.q`)}</h3>
                <span className={`pill ${q.level === 'urgent' ? 'danger' : q.level === 'attention' ? 'warn' : 'green'}`}>{t(`level.${q.level}`)}</span>
              </div>
              <p className="admin-q-answer">{t(`questions.${q.id}.${q.answer}`, q.values)}</p>
              {q.items.length ? (
                <ul className="admin-q-items">
                  {q.items.map((item, i) => (
                    <li key={i}>
                      {item.href ? <Link href={item.href}>{item.label}</Link> : <strong>{item.label}</strong>}
                      <span className="muted small">{itemText(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link href={q.href} className={`admin-q-act${q.level === 'calm' ? ' quiet' : ''}`}>
                {q.level === 'calm' ? t('open') : t(`questions.${q.id}.act`)} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
