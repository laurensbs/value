import { getFormatter, getTranslations } from 'next-intl/server'
import { appSupport, ROUND_EUR } from '@/lib/support'
import crowdfunding from '../../content/crowdfunding.json'
import { Icon } from './Icon'

/**
 * "Help ons via Whydonate" in the iOS and Android apps (Laurens, 5 okt 2026): one row low on the
 * profile and one link in the footer, never at the top, and one tap goes straight to the campaign.
 *
 * Nothing is paid inside the app. The link is a plain link to another site with target="_blank":
 * the Capacitor shell hands every link outside rondjemee.nl to Safari or the phone's browser
 * (WebViewDelegationHandler on iOS, Bridge.launchIntent on Android), never to an in-app webview.
 *
 * Shown only in the apps (`native`), while there is a campaign with a named recipient
 * (CROWDFUNDING_URL + OPERATOR_NAME), and not when the server switches it off (SUPPORT_IN_APP=0).
 */
export async function inAppHelp(native: boolean) {
  if (!native) return null
  const t = await getTranslations('helpApp')
  const help = appSupport(process.env, crowdfunding, (platform) => t('label', { platform }))
  if (!help?.inApp) return null
  const format = await getFormatter()
  const euro = (n: number) => format.number(n, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const round = euro(ROUND_EUR)
  return {
    url: help.crowdfundingUrl,
    label: help.label,
    // No countdown and no "nog maar": the amount raised next to the goal, that is all.
    text:
      help.goal !== null && help.raised !== null
        ? t('text', { round, raised: euro(help.raised), goal: euro(help.goal) })
        : t('textShort', { round }),
    opens: t('opens', { platform: help.platform }),
  }
}

/** The row at the bottom of the profile in the apps. */
export async function HelpUsRow({ native }: { native: boolean }) {
  const help = await inAppHelp(native)
  if (!help) return null
  return (
    <ul className="hub-list" id="help-ons">
      <li>
        <a href={help.url} target="_blank" rel="noopener noreferrer" className="hub-row">
          <span className="hub-icon ball" aria-hidden="true">
            <Icon name="heart" size={20} />
          </span>
          <span className="hub-row-text">
            <strong>{help.label}</strong>
            <span>{help.text}</span>
          </span>
          <span className="visually-hidden">({help.opens})</span>
          <span className="hub-chevron" aria-hidden="true">
            <Icon name="external" size={18} />
          </span>
        </a>
      </li>
    </ul>
  )
}

/** The footer link in the apps: straight to the campaign instead of /support. */
export async function HelpUsFooterLink({ native }: { native: boolean }) {
  const help = await inAppHelp(native)
  if (!help) return null
  return (
    <a href={help.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3em' }}>
      {help.label}
      <Icon name="external" size={14} />
      <span className="visually-hidden">({help.opens})</span>
    </a>
  )
}
