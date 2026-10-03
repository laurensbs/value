import { getFormatter, getTranslations } from 'next-intl/server'
import { HubTiles } from '@/components/admin/HubTiles'
import { OpsQuestions } from '@/components/admin/OpsQuestions'
import { Icon } from '@/components/Icon'
import { SubmitButton } from '@/components/SubmitButton'
import { sendAdminConfirmation } from '@/server/actions/admin'
import { adminHub } from '@/server/admin-hub'
import { requireAdmin, requireViewer } from '@/server/session'

type Params = { sent?: string; failed?: string; error?: string }

/** On ADMIN_EMAILS, but the address is not confirmed yet: one email first, then this page opens. */
async function ConfirmAddress({ email, params }: { email: string; params: Params }) {
  const t = await getTranslations('admin.confirm')
  return (
    <div className="narrow-page stack">
      <h1>{t('title')}</h1>
      {params.error ? <p className="notice warn">{t('expired')}</p> : null}
      <p>{t('text', { email })}</p>
      {params.sent ? (
        <p className="notice success" role="status">
          {t('sent')}
        </p>
      ) : null}
      {params.failed ? (
        <p className="notice warn" role="alert">
          {t('failed')}
        </p>
      ) : null}
      <form action={sendAdminConfirmation}>
        <SubmitButton className="button primary">{t('send')}</SubmitButton>
      </form>
    </div>
  )
}

/**
 * The admin home, "Beheer": big tiles to every section with live counts, and the questions an
 * operations lead asks every day, answered from the data. The sections themselves are pages
 * under /admin (moderation, shelters, tips, numbers, launch, marketing).
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const viewer = await requireViewer('/admin')
  if (viewer.adminUnconfirmed) return <ConfirmAddress email={viewer.email} params={await searchParams} />
  await requireAdmin('/admin')

  const now = new Date()
  const [t, format, hub] = await Promise.all([getTranslations('adminHub'), getFormatter(), adminHub(now)])
  const name = viewer.profile?.firstName ?? viewer.name

  return (
    <div className="admin-home stack-l">
      <header className="admin-home-head">
        <p className="eyebrow">{format.dateTime(now, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>{t('title')}</h1>
        <p className="muted">{t('hello', { name })}</p>
      </header>

      <HubTiles tiles={hub.tiles} urgentReports={hub.questions.some((q) => q.id === 'reports' && q.level === 'urgent')} />

      <OpsQuestions questions={hub.questions} summary={hub.summary} />

      <aside className="card flat admin-install">
        <Icon name="home" size={22} />
        <div className="stack-s">
          <strong>{t('install.title')}</strong>
          <p className="small">{t('install.text')}</p>
        </div>
      </aside>
    </div>
  )
}
