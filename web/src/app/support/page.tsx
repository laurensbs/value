import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { COLLIE } from '@/components/landing/looks'
import { IconTile, PageHero } from '@/components/landing/PageHero'
import { SupportButton } from '@/components/SupportButton'
import { APP_NAME } from '@/lib/site'
import { appQuestion, campaign, roundsFor, showsRaised, supportConfig } from '@/lib/support'
import { isNativeRequest } from '@/server/native'
import costs from '../../../content/costs.json'
import crowdfunding from '../../../content/crowdfunding.json'
import { pageMetadata } from '@/lib/seo'
import '../landing.css'
import '../impact.css'

type Cost = (typeof costs.items)[number]

const perMonth = (c: Cost, v: number) => (c.per === 'month' ? v : c.per === 'year' ? v / 12 : 0)

export async function generateMetadata() {
  const t = await getTranslations('support')
  return pageMetadata({ path: '/support', title: t('title'), description: t('metaDescription', { app: APP_NAME }) })
}

/** How Rondje stays free: the promise, what it costs, and how people can help (with or without money). */
export default async function SupportPage() {
  const t = await getTranslations()
  const format = await getFormatter()
  const native = await isNativeRequest()
  const cfg = supportConfig()
  const drive = campaign(crowdfunding)
  // The amount raised once something came in; before that only the goal (in rounds in Dutch, in euros in the other languages).
  const raised = showsRaised(drive.progress) ? drive.progress : null
  const euro = (n: number) => format.number(n, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const day = (d: string) => format.dateTime(new Date(d), { day: 'numeric', month: 'long', year: 'numeric' })
  const operator = cfg.operator ?? t('support.operatorUnknown')
  const canGive = Boolean(cfg.operator && (cfg.url || cfg.crowdfundingUrl))
  // Until there are real agreements, an honest intention instead of a promised share or names.
  const share =
    drive.shareToCausesPercent !== null ? t('support.shareSet', { percent: format.number(drive.shareToCausesPercent) }) : t('support.shareSoon', { app: APP_NAME })
  // "Help ons via Whydonate" in the apps (HelpUsInApp): the question about the app says where to find
  // it, and in which app when the switch is off for the other one (SUPPORT_IN_APP_IOS / _ANDROID), but
  // only while the row really shows: a campaign link, a named recipient and the switch on (appQuestion).
  const { key: appFaq, apps } = appQuestion(process.env, crowdfunding)
  const faq = native
    ? (['free', 'sponsors'] as const)
    : ([...(['free', 'where', 'tax', 'perks', appFaq, 'share'] as const), ...(cfg.crowdfundingUrl ? (['once'] as const) : []), 'sponsors'] as const)
  const total = costs.items.reduce((sum, c) => ({ min: sum.min + perMonth(c, c.min), max: sum.max + perMonth(c, c.max) }), { min: 0, max: 0 })
  // The amount stays on one line; "per maand" may move under it on a small phone.
  const amount = (c: Cost) => (
    <>
      <span className="cost-amount">{c.min === c.max ? euro(c.min) : `${euro(c.min)}–${euro(c.max)}`}</span> {t(`support.per.${c.per}`)}
    </>
  )

  return (
    <div className="narrow-page stack-l">
      <PageHero
        eyebrow={t('support.eyebrow')}
        title={t('support.title')}
        lede={t('support.lede')}
        art={{ dog: COLLIE, tone: 'ball', badge: <Icon name="heart" /> }}
      />

      <section className="lp-card pad soft-green stack-s">
        <div className="lp-block-title">
          <IconTile tone="ball" size="s">
            <Icon name="shield" size={20} />
          </IconTile>
          <h2>{t('support.promiseTitle')}</h2>
        </div>
        <ul className="check-list">
          {(['free', 'ads', 'data', 'sponsors', 'equal'] as const).map((k) => (
            <li key={k}>
              <Icon name="check" size={18} /> <span>{t(`support.promise.${k}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-card lp-tip">
        <IconTile tone="green">
          <Icon name="leaf" />
        </IconTile>
        <div>
          <h2 className="im-tip-title">{t('support.whyTitle')}</h2>
          <p className="muted">{t('support.whyText', { app: APP_NAME })}</p>
          <Link href="/waarom" className="link-button">
            {t('support.whyLink')} →
          </Link>
        </div>
      </section>

      {native ? null : (
        <section className="lp-card pad stack-s">
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

      {native ? null : canGive ? (
        <section className="lp-card pad soft-blue stack" id="steun" aria-labelledby="give-title">
          <div className="stack-s">
            <h2 id="give-title">{t('support.giveTitle')}</h2>
            <p>{t('support.giveIntro', { operator, app: APP_NAME })}</p>
          </div>
          <div className="im-give">
            {cfg.crowdfundingUrl ? (
              <article className="im-give-option stack-s" id="crowdfunding">
                <span className="pill ball">{t('support.oncePill')}</span>
                <h3 id="once-title">{t('support.onceTitle')}</h3>
                <p className="muted">{t('support.onceText', { app: APP_NAME })}</p>
                {raised ? (
                  <div className="stack-s">
                    <div
                      className="lp-progress im-progress"
                      role="progressbar"
                      aria-labelledby="once-title"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={raised.percent}
                      aria-valuetext={t('support.progress', { raised: euro(raised.raised), goal: euro(raised.goal) })}
                    >
                      <span style={{ width: `${Math.max(raised.percent, 3)}%` }} />
                    </div>
                    <p className="im-progress-numbers">
                      <strong>{t('support.progress', { raised: euro(raised.raised), goal: euro(raised.goal) })}</strong>
                      {drive.updated ? <span className="muted small">{t('support.progressUpdated', { date: day(drive.updated), platform: cfg.crowdfundingPlatform ?? '' })}</span> : null}
                    </p>
                  </div>
                ) : drive.progress ? (
                  <p className="im-progress-numbers">
                    <strong>{t('support.goalRounds', { total: roundsFor(drive.progress.goal), goal: euro(drive.progress.goal) })}</strong>
                  </p>
                ) : null}
                <div>
                  {/* Straight to the campaign in a new tab; the arrow says it leaves the site. */}
                  <a href={cfg.crowdfundingUrl} target="_blank" rel="noopener noreferrer" className="button primary">
                    <Icon name="heart" size={18} /> {t('support.onceGive', { platform: cfg.crowdfundingPlatform ?? '' })}
                    <Icon name="external" size={16} />
                    <span className="visually-hidden">{t('support.newTab')}</span>
                  </a>
                </div>
                <p className="muted small">{t('support.platformNote', { platform: cfg.crowdfundingPlatform ?? '' })}</p>
              </article>
            ) : null}
            {cfg.url ? (
              <article className="im-give-option stack-s">
                <span className="pill blue">{t('support.monthlyPill')}</span>
                <h3>{t('support.monthlyTitle')}</h3>
                <p className="muted">{t('support.monthlyText', { app: APP_NAME })}</p>
                <div>
                  <SupportButton url={cfg.url} label={t('support.giveButton', { app: APP_NAME, platform: cfg.platform ?? '' })} />
                </div>
                <p className="muted small">{t('support.platformNote', { platform: cfg.platform ?? '' })}</p>
              </article>
            ) : null}
          </div>
          <p className="muted small">{t('support.giveNoteAll', { app: APP_NAME })}</p>
        </section>
      ) : (
        <section className="lp-card pad soft-blue stack-s" id="steun">
          <h2>{t('support.giveTitle')}</h2>
          <p className="muted">{t('support.giveSoon')}</p>
        </section>
      )}

      {native ? null : (
        <section className="lp-card pad stack" aria-labelledby="open-title">
          <div className="lp-block-title">
            <IconTile tone="green" size="s">
              <Icon name="eye" size={20} />
            </IconTile>
            <h2 id="open-title">{t('support.openTitle')}</h2>
          </div>
          <dl className="im-open">
            <div>
              <dt>{t('support.open.paysTitle')}</dt>
              <dd>{t('support.open.pays', { app: APP_NAME })}</dd>
            </div>
            <div>
              <dt>{t('support.open.whoTitle')}</dt>
              <dd>{cfg.operator ? t('support.open.who', { operator: cfg.operator, app: APP_NAME }) : t('support.open.whoSoon', { app: APP_NAME })}</dd>
            </div>
            <div>
              <dt>{t('support.open.shareTitle')}</dt>
              <dd>{share}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="stack">
        <h2>{t('support.helpTitle')}</h2>
        <ul className="benefits">
          <li className="lp-card pad">
            <IconTile tone="blue" size="s">
              <Icon name="building" size={20} />
            </IconTile>
            <h3>{t('support.help.tipTitle')}</h3>
            <p className="muted small">{t('support.help.tip')}</p>
            <Link href="/suggest" className="link-button small">
              {t('support.help.tipLink')} →
            </Link>
          </li>
          <li className="lp-card pad">
            <IconTile tone="green" size="s">
              <Icon name="users" size={20} />
            </IconTile>
            <h3>{t('support.help.inviteTitle')}</h3>
            <p className="muted small">{t('support.help.invite')}</p>
            <Link href="/profile#invite" className="link-button small">
              {t('support.help.inviteLink')} →
            </Link>
          </li>
          <li className="lp-card pad">
            <IconTile tone="warm" size="s">
              <Icon name="share" size={20} />
            </IconTile>
            <h3>{t('support.help.shareTitle')}</h3>
            <p className="muted small">{cfg.instagram ? t('support.help.shareInstagram', { handle: cfg.instagram }) : t('support.help.share')}</p>
            <Link href="/about#delen" className="link-button small">
              {t('support.help.shareLink')} →
            </Link>
          </li>
          <li className="lp-card pad">
            <IconTile tone="rose" size="s">
              <Icon name="heart" size={20} />
            </IconTile>
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

      <section className="stack-s lp-faq">
        <h2>{t('support.faqTitle')}</h2>
        {faq.map((k) => (
          <details key={k} className="lp-card disclosure">
            <summary>
              <strong>{t(`support.faq.${k}.q`, { app: APP_NAME })}</strong>
            </summary>
            <p>{k === 'share' ? share : t(`support.faq.${k}.a`, { operator, app: APP_NAME, platform: cfg.crowdfundingPlatform ?? '', apps })}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
