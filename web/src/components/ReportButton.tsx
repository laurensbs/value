'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { useForm } from '@/lib/use-form'
import { blockUser, createReport } from '@/server/actions/safety'
import type { FormState } from '@/server/actions/profile'
import { Icon } from './Icon'
import { SubmitButton } from './SubmitButton'

interface Props {
  subjectUserId?: string | null
  dogId?: string
  walkId?: string
  orgId?: string | null
}

function BlockButton({ userId }: { userId: string }) {
  const t = useTranslations('report')
  const [pending, start] = useTransition()
  const [stage, setStage] = useState<'idle' | 'confirm' | 'done'>('idle')
  if (stage === 'done') return <p className="notice success small">{t('blockDone')}</p>
  if (stage === 'idle') {
    return (
      <button type="button" className="link-button small" onClick={() => setStage('confirm')}>
        {t('block')}
      </button>
    )
  }
  return (
    <div className="stack-s">
      <p className="small">{t('blockConfirm')}</p>
      <div>
        <button
          type="button"
          className="button danger small"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await blockUser(userId)
              if (result.ok) setStage('done')
            })
          }
        >
          {t('block')}
        </button>
      </div>
    </div>
  )
}

/** A small "report" disclosure that works the same on every page, with a block option for people. */
export function ReportButton({ subjectUserId, dogId, walkId, orgId }: Props) {
  const t = useTranslations('report')
  const { state, pending, onSubmit } = useForm<FormState>(createReport, { ok: false })
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
        <form onSubmit={onSubmit} className="form card">
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
          {state.error ? <p className="error-text">{t('error')}</p> : null}
          <SubmitButton className="button secondary" pending={pending}>{t('submit')}</SubmitButton>
        </form>
      )}
      {subjectUserId ? <BlockButton userId={subjectUserId} /> : null}
    </details>
  )
}
