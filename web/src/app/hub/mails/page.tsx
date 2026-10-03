import Link from 'next/link'
import { MailComposer, type ComposerPartner } from '@/components/hub/MailComposer'
import { TEMPLATES, templateById } from '@/lib/hub/content'
import { partnerList } from '@/lib/hub/game'
import { getHub } from '@/server/hub'

export const metadata = { title: 'Mails' }

/** Every mail ready to go, filled in with your details and the partner's. You send it yourself. */
export default async function HubMails({ searchParams }: { searchParams: Promise<{ t?: string; p?: string }> }) {
  const sp = await searchParams
  const { state } = await getHub()
  const now = new Date()
  const partners: ComposerPartner[] = partnerList(state, now).map((p) => ({
    id: p.id,
    name: p.name,
    generic: p.generic,
    email: p.state.email || p.email || '',
    contact: p.state.contact ?? '',
    phone: p.state.phone ?? '',
    template: p.template,
    status: p.state.status,
  }))
  const partner = partners.find((p) => p.id === sp.p) ?? null
  const template = templateById(sp.t ?? '')?.id ?? partner?.template ?? TEMPLATES[0].id

  return (
    <div className="hub-page">
      <div className="hub-head">
        <p className="eyebrow">Mails</p>
        <h1>Klaar om door te sturen</h1>
        <p className="lede">
          Kies voor wie en welke mail. Je naam, stad en wijk staan er al in. Lees hem na, pas aan wat je wilt en verstuur hem vanuit je eigen mail. De hub
          verstuurt zelf niets.
        </p>
      </div>

      <div className="hub-mail-layout">
        <nav className="hub-template-list stack-s" aria-label="Alle mails">
          {TEMPLATES.map((t) => (
            <Link key={t.id} href={`/hub/mails?t=${t.id}${partner ? `&p=${partner.id}` : ''}`} aria-current={t.id === template ? 'true' : undefined}>
              <strong className="small">{t.title}</strong>
              <span className="muted small">{t.audience}</span>
            </Link>
          ))}
        </nav>
        <MailComposer
          key={`${template}:${partner?.id ?? ''}`}
          templates={TEMPLATES}
          partners={partners}
          settings={state.settings}
          initialTemplate={template}
          initialPartner={partner?.id ?? null}
        />
      </div>
    </div>
  )
}
