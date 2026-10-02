import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { SupportButton } from '@/components/SupportButton'
import { supportConfig } from '@/lib/support'
import { isNativeRequest } from '@/server/native'
import costs from '../../../content/costs.json'

type Cost = (typeof costs.items)[number]

const perMonth = (c: Cost, v: number) => (c.per === 'month' ? v : c.per === 'year' ? v / 12 : 0)

export async function generateMetadata() {
  const t = await getTranslations('support')
  return { title: t('title'), description: t('lede') }
}

/** How Rondje stays free: the promise, what it costs, and how people can help (with or without money). */
export default async function SupportPage() {
  const t = await getTranslations()
  const format = await getFormatter()
  const native = await isNativeRequest()
  const cfg = supportConfig()
  const euro = (n: number) => format.number(n, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const total = costs.items.reduce((sum, c) => ({ min: sum.min + perMonth(c, c.min), max: sum.max + perMonth(c, c.max) }), { min: 0, max: 0 })
  const amount = (c: Cost) => `${c.min === c.max ? euro(c.min) : `${euro(c.min)}–${euro(c.max)}`} ${t(`support.per.${c.per}`)}`

  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <p className="eyebrow">{t('support.eyebrow')}</p>
        <h1>{t('support.title')}</h1>
        <p className="lede">{t('support.lede')}</p>
      </header>

      <section className="card stack-s">
        <h2>{t('support.promiseTitle')}</h2>
        <ul className="check-list">
          {(['free', 'ads', 'data', 'sponsors', 'equal'] as const).map((k) => (
            <li key={k}>
              <Icon name="check" size={18} /> <span>{t(`support.promise.${k}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {native ? null : (
        <section className="stack-s">
          <h2>{t('support.costsTitle')}</h2>
          <p className="muted">{t('support.costsLede')}</p>
          <div className="table-wrap">
            <table className="cost-table">
              <tbody>
                {costs.items.map((c) => (
                  <tr key={c.key}>
                    <th scope="row">
                      {t(`support.costs.${c.key}.label`)}
                      <span className="muted small">{t(`support.costs.${c.key}.why`)}</span>
                    </th>
                    <td>{amount(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>{t('support.costsTotal', { min: euro(Math.round(total.min)), max: euro(Math.round(total.max)) })}</strong>
          </p>
          <p className="muted small">{t('support.costsNote', { date: format.dateTime(new Date(costs.updated), { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>
        </section>
      )}

      {native ? null : cfg.url && cfg.operator ? (
        <section className="card support-card stack-s" id="steun">
          <h2>{t('support.giveTitle')}</h2>
          <p>{t('support.giveText', { operator: cfg.operator })}</p>
          <div>
            <SupportButton url={cfg.url} label={t('support.giveButton', { platform: cfg.platform ?? '' })} />
          </div>
          <p className="muted small">{t('support.giveNote', { platform: cfg.platform ?? '' })}</p>
        </section>
      ) : (
        <section className="card flat stack-s" id="steun">
          <h2>{t('support.giveTitle')}</h2>
          <p className="muted">{t('support.giveSoon')}</p>
        </section>
      )}

      <section className="stack">
        <h2>{t('support.helpTitle')}</h2>
        <ul className="benefits">
          <li className="card">
            <Icon name="building" />
            <h3>{t('support.help.tipTitle')}</h3>
            <p className="muted small">{t('support.help.tip')}</p>
            <Link href="/suggest" className="link-button small">
              {t('support.help.tipLink')} →
            </Link>
          </li>
          <li className="card">
            <Icon name="users" />
            <h3>{t('support.help.inviteTitle')}</h3>
            <p className="muted small">{t('support.help.invite')}</p>
            <Link href="/profile#invite" className="link-button small">
              {t('support.help.inviteLink')} →
            </Link>
          </li>
          <li className="card">
            <Icon name="share" />
            <h3>{t('support.help.shareTitle')}</h3>
            <p className="muted small">{cfg.instagram ? t('support.help.shareInstagram', { handle: cfg.instagram }) : t('support.help.share')}</p>
            <Link href="/about#delen" className="link-button small">
              {t('support.help.shareLink')} →
            </Link>
          </li>
          <li className="card">
            <Icon name="heart" />
            <h3>{t('support.help.partnerTitle')}</h3>
            <p className="muted small">{t('support.help.partner')}</p>
            {cfg.contactEmail ? (
              <a href={`mailto:${cfg.contactEmail}`} className="link-button small">
                {cfg.contactEmail}
              </a>
            ) : null}
          </li>
        </ul>
      </section>

      <section className="stack-s">
        <h2>{t('support.faqTitle')}</h2>
        {(native ? (['free', 'sponsors'] as const) : (['free', 'where', 'tax', 'perks', 'sponsors'] as const)).map((k) => (
          <details key={k} className="card disclosure">
            <summary>
              <strong>{t(`support.faq.${k}.q`)}</strong>
            </summary>
            <p>{t(`support.faq.${k}.a`, { operator: cfg.operator ?? t('support.operatorUnknown') })}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
