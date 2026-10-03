import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CONTACT_PATH } from '@/lib/contact'
import { supportConfig } from '@/lib/support'
import { getViewer } from '@/server/session'

export default async function BannedPage() {
  const viewer = await getViewer()
  const t = await getTranslations('banned')
  const { contactEmail } = supportConfig()
  return (
    <div className="narrow-page stack">
      <h1>{t('title')}</h1>
      <p>{t('text', { reason: viewer?.profile?.banReason || t('noReason') })}</p>
      <p className="muted small">
        {contactEmail
          ? t.rich('contact', { email: () => <a href={`mailto:${contactEmail}`}>{contactEmail}</a> })
          : t.rich('contactPage', { link: (chunks) => <Link href={CONTACT_PATH}>{chunks}</Link> })}
      </p>
    </div>
  )
}
