import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { fillContact } from '@/lib/contact'
import { isLegalDoc, LEGAL_DOCS, legalHtml } from '@/lib/legal'
import { pageMetadata } from '@/lib/seo'
import { supportConfig } from '@/lib/support'

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params
  if (!isLegalDoc(doc)) return {}
  const [t, content] = await Promise.all([getTranslations('legal'), legalHtml(doc, await getLocale())])
  // Each document describes itself in its front matter, so search results tell the six apart.
  return pageMetadata({ path: `/legal/${doc}`, title: t(`titles.${doc}`), description: content?.data.description || t(`titles.${doc}`) })
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params
  if (!isLegalDoc(doc)) notFound()
  const locale = await getLocale()
  const content = await legalHtml(doc, locale)
  if (!content) notFound()
  const t = await getTranslations('legal')
  // The contact address comes from CONTACT_EMAIL; the link text without one is in the language of the text itself.
  const tText = await getTranslations({ locale: content.locale, namespace: 'legal' })
  const html = fillContact(content.html, supportConfig().contactEmail, tText('contactFallback'))

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
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  )
}
