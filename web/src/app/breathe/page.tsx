import '../progress.css'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Breathing } from '@/components/progress/Breathing'
import { getViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('breathe')
  return { title: t('title'), description: t('lede'), robots: { index: false } }
}

/** Only paths on this site, so the "Klaar" button can never send someone elsewhere. */
function safeNext(value: string | string[] | undefined, fallback: string): string {
  const next = Array.isArray(value) ? value[0] : value
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback
}

/** "Ademminuut": one calm minute, like the app's breathing screen before a walk. Open to everyone. */
export default async function BreathePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const viewer = await getViewer()
  const next = safeNext(params.next, viewer?.profile ? '/profile' : '/')
  const t = await getTranslations('breathe')
  const common = await getTranslations('common')
  return (
    <div className="narrow-page stack breathe-page">
      <header className="stack-s">
        <Link href={next} className="link-button">
          ← {common('back')}
        </Link>
        <p className="eyebrow">{t('title')}</p>
        <p className="lede">{t('lede')}</p>
      </header>
      <Breathing next={next} />
      <p className="muted small">{t('note')}</p>
      <p className="small">
        {t('help')} <Link href="/help">{t('helpLink')}</Link>
      </p>
    </div>
  )
}
