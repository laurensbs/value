import { getTranslations } from 'next-intl/server'
import { getViewer } from '@/server/session'

export default async function BannedPage() {
  const viewer = await getViewer()
  const t = await getTranslations('banned')
  return (
    <div className="narrow-page stack">
      <h1>{t('title')}</h1>
      <p>{t('text', { reason: viewer?.profile?.banReason || t('noReason') })}</p>
      <p className="muted small">{t('contact')}</p>
    </div>
  )
}
