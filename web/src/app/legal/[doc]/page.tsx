import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { isLegalDoc, LEGAL_DOCS, legalHtml } from '@/lib/legal'

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params
  if (!isLegalDoc(doc)) return {}
  const t = await getTranslations('legal')
  return { title: t(`titles.${doc}`) }
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params
  if (!isLegalDoc(doc)) notFound()
  const locale = await getLocale()
  const content = await legalHtml(doc, locale)
  if (!content) notFound()
  const t = await getTranslations('legal')

  return (
    <div className="legal-layout">
      <nav className="legal-nav" aria-label={t('nav')}>
        {LEGAL_DOCS.map((d) => (
          <Link key={d} href={`/legal/${d}`} aria-current={d === doc ? 'page' : undefined}>
            {t(`titles.${d}`)}
          </Link>
        ))}
      </nav>
      <article className="prose legal stack">
        {content.locale !== locale ? <p className="notice small">{t('fallback')}</p> : null}
        {content.data.status || content.data.version ? (
          <p className="muted small">
            {[content.data.status, content.data.version ? t('version', { version: content.data.version }) : null, content.data.updated]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: content.html }} />
      </article>
    </div>
  )
}
