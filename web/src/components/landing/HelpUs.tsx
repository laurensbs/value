import type { CSSProperties } from 'react'
import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { APP_NAME } from '@/lib/site'
import { campaign, ROUND_EUR, roundsFor, showsRaised, supportConfig, supportInApp } from '@/lib/support'
import { requestPlatform } from '@/server/native'
import crowdfunding from '../../../content/crowdfunding.json'
import { DogTile } from './DogTile'
import { PawMark } from './LandingIcon'
import { GOLDEN } from './looks'

/**
 * "Help ons!": the crowdfunding, big and warm on the home page (Laurens, 5 okt 2026), only while a
 * campaign link and its recipient are set (CROWDFUNDING_URL + OPERATOR_NAME). The numbers come from
 * content/crowdfunding.json; no countdown, no urgency.
 *
 * In the apps too (Laurens, 5 okt 2026), but low on the page (the home page places it) and nothing
 * is paid inside the app: the button is a plain link to another site, which the Capacitor shell
 * opens in Safari or the phone's browser (WebViewDelegationHandler on iOS, Bridge.launchIntent on
 * Android). /support says nothing about money in the apps, so the link there is left out. In the
 * apps the lede does not promise "the app in the App Store and Google Play" (you are in it already):
 * it says the round keeps the app free and pays for the first year (home.helpUs.ledeApp).
 * The switch for this app (SUPPORT_IN_APP, _IOS or _ANDROID: lib/support.ts) hides it in the apps,
 * like every other entry (HelpUsInApp).
 *
 * The amount raised shows once something came in; before that only the goal. Dutch keeps the pun of
 * "Geef een rondje" and counts in rounds of €5 ("Doel: 600 rondjes", "24 van de 600 rondjes",
 * "€5 = 1 rondje"); English, Spanish and French name the goal in euros ("Goal: €3,000"), say "From €5"
 * and show how far along the route the campaign is ("4% of the way"), so nothing there reads like a
 * price per walk (Laurens, 5 okt 2026).
 */
export async function HelpUs({ native }: { native: boolean }) {
  const cfg = supportConfig()
  if (!cfg.crowdfundingUrl || !cfg.operator || (native && !supportInApp(process.env, await requestPlatform()))) return null
  const t = await getTranslations()
  const format = await getFormatter()
  const euro = (n: number) => format.number(n, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const { progress } = campaign(crowdfunding)
  const raised = showsRaised(progress) ? progress : null
  const numbers = raised ? t('support.progress', { raised: euro(raised.raised), goal: euro(raised.goal) }) : null
  // A sliver as soon as anything came in, so the first rounds show.
  const filled = raised ? Math.max(raised.percent, 3) : 0
  const platform = cfg.crowdfundingPlatform ?? ''

  return (
    <section className="lp-help" aria-labelledby="lp-help-title" id="help-ons">
      <div className="lp-help-copy">
        <p className="lp-eyebrow">{t('home.helpUs.eyebrow')}</p>
        <h2 id="lp-help-title" className="lp-help-title">
          {t('home.helpUs.title')}
        </h2>
        <p className="lp-help-lede">{t(native ? 'home.helpUs.ledeApp' : 'home.helpUs.lede', { app: APP_NAME })}</p>
        {raised && numbers ? (
          <div className="lp-help-progress">
            <div
              className="lp-progress im-progress"
              role="progressbar"
              aria-labelledby="lp-help-title"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={raised.percent}
              aria-valuetext={numbers}
            >
              <span style={{ width: `${filled}%` }} />
            </div>
            <p className="im-progress-numbers">
              <strong>{numbers}</strong>
              <span className="muted small">
                {t('home.helpUs.rounds', { n: roundsFor(raised.raised), total: roundsFor(raised.goal), percent: raised.percent, goal: euro(raised.goal) })}
              </span>
            </p>
          </div>
        ) : progress ? (
          <p className="im-progress-numbers">
            <strong>{t('support.goalRounds', { total: roundsFor(progress.goal), goal: euro(progress.goal) })}</strong>
          </p>
        ) : null}
        {/* ?bron= counts sign-ups that came through this block (lib/join.ts); the Whydonate link carries nothing. */}
        <div className="lp-help-actions">
          <a href={cfg.crowdfundingUrl} target="_blank" rel="noopener noreferrer" className="button primary lp-cta lp-help-give">
            <Icon name="heart" size={18} /> {t('home.helpUs.give')}
          </a>
          <Link href="/aanmelden?bron=helpons" className="lp-help-join">
            {t('home.helpUs.join')} →
          </Link>
        </div>
        <p className="muted small">
          {t('home.helpUs.note', { platform, operator: cfg.operator, app: APP_NAME })}
          {native ? null : (
            <>
              {' '}
              <Link href="/support#crowdfunding">{t('home.helpUs.more')} →</Link>
            </>
          )}
        </p>
      </div>
      <HelpArt percent={raised?.percent ?? 0} chip={t('home.helpUs.chip', { round: euro(ROUND_EUR) })} />
    </section>
  )
}

/** A dog in the middle of the dashed walking route; the part of the route already walked is the money raised. */
function HelpArt({ percent, chip }: { percent: number; chip: string }) {
  return (
    <div className="lp-help-art" aria-hidden="true">
      <svg className="lp-help-ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="86" className="lp-ring-fill" />
        <circle cx="100" cy="100" r="95" className="lp-ring-dash" pathLength="100" />
        {percent > 0 ? (
          <circle
            cx="100"
            cy="100"
            r="95"
            className="lp-help-walked"
            pathLength="100"
            transform="rotate(-90 100 100)"
            style={{ '--walked': Math.min(100, percent) } as CSSProperties}
          />
        ) : null}
      </svg>
      <span className="lp-help-dog">
        <DogTile dog={GOLDEN} />
      </span>
      <span className="lp-paw-badge lp-help-paw">
        <PawMark size={22} />
      </span>
      <span className="lp-chip lp-help-chip">
        <Icon name="heart" size={16} />
        {chip}
      </span>
    </div>
  )
}
