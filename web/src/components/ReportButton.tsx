'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { createReport } from '@/server/actions/safety'
import type { FormState } from '@/server/actions/profile'
import { Icon } from './Icon'
import { SubmitButton } from './SubmitButton'

interface Props {
  subjectUserId?: string | null
  dogId?: string
  walkId?: string
  orgId?: string | null
}

/** A small "report" disclosure that works the same on every page. */
export function ReportButton({ subjectUserId, dogId, walkId, orgId }: Props) {
  const t = useTranslations('report')
  const [state, action] = useActionState<FormState, FormData>(createReport, { ok: false })
  return (
    <details className="report">
      <summary className="link-button">
        <Icon name="flag" size={15} /> {t('title')}
      </summary>
      {state.ok ? (
        <p className="notice success" role="status">
          {t('done')}
        </p>
      ) : (
        <form action={action} className="form card">
          {subjectUserId ? <input type="hidden" name="subjectUserId" value={subjectUserId} /> : null}
          {dogId ? <input type="hidden" name="dogId" value={dogId} /> : null}
          {walkId ? <input type="hidden" name="walkId" value={walkId} /> : null}
          {orgId ? <input type="hidden" name="orgId" value={orgId} /> : null}
          <label className="field">
            <span>{t('category')}</span>
            <select className="select" name="category" required defaultValue="safety">
              {(['abuse', 'safety', 'scam', 'harassment', 'fake', 'other'] as const).map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('description')}</span>
            <textarea className="textarea" name="description" minLength={10} maxLength={3000} required />
          </label>
          {state.error ? <p className="error-text">{state.error}</p> : null}
          <SubmitButton className="button secondary">{t('submit')}</SubmitButton>
        </form>
      )}
    </details>
  )
}
