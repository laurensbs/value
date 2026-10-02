'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { banUser, deleteDemoContent, hideDog, resolveReport, setOrganizationStatus, unbanUser } from '@/server/actions/admin'

export function ResolveReport({ reportId }: { reportId: string }) {
  const t = useTranslations('admin')
  const [pending, start] = useTransition()
  const [text, setText] = useState('')
  return (
    <div className="inline-form">
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('resolution')} aria-label={t('resolution')} />
      <button type="button" className="button secondary small" disabled={pending || text.trim().length < 3} onClick={() => start(() => resolveReport(reportId, text))}>
        {t('resolve')}
      </button>
    </div>
  )
}

export function BanUser({ userId, banned }: { userId: string; banned: boolean }) {
  const t = useTranslations('admin')
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  if (banned) {
    return (
      <button type="button" className="button ghost small" disabled={pending} onClick={() => start(() => unbanUser(userId))}>
        {t('unban')}
      </button>
    )
  }
  if (!open) {
    return (
      <button type="button" className="button ghost small" onClick={() => setOpen(true)}>
        {t('ban')}
      </button>
    )
  }
  return (
    <div className="inline-form">
      <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('banReason')} aria-label={t('banReason')} />
      <button type="button" className="button danger small" disabled={pending || reason.trim().length < 5} onClick={() => start(() => banUser(userId, reason))}>
        {t('ban')}
      </button>
    </div>
  )
}

export function OrgDecision({ orgId }: { orgId: string }) {
  const t = useTranslations('admin')
  const [pending, start] = useTransition()
  return (
    <div className="row">
      <button type="button" className="button primary small" disabled={pending} onClick={() => start(() => setOrganizationStatus(orgId, 'verified'))}>
        {t('verify')}
      </button>
      <button type="button" className="button ghost small" disabled={pending} onClick={() => start(() => setOrganizationStatus(orgId, 'rejected'))}>
        {t('reject')}
      </button>
    </div>
  )
}

export function HideDog({ dogId }: { dogId: string }) {
  const t = useTranslations('admin')
  const [pending, start] = useTransition()
  return (
    <button type="button" className="button ghost small" disabled={pending} onClick={() => start(() => hideDog(dogId))}>
      {t('hideDog')}
    </button>
  )
}

export function RemoveDemo() {
  const t = useTranslations('admin')
  const [pending, start] = useTransition()
  const [sure, setSure] = useState(false)
  return sure ? (
    <button type="button" className="button danger small" disabled={pending} onClick={() => start(() => deleteDemoContent())}>
      {t('demoConfirm')}
    </button>
  ) : (
    <button type="button" className="button secondary small" onClick={() => setSure(true)}>
      {t('demoRemove')}
    </button>
  )
}
