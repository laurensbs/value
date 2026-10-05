import { getTranslations } from 'next-intl/server'
import { appPlatform, PLATFORM_HEADER } from '@/lib/app-platform'
import { appleNativeEnabled, enabledSocialProviders } from '@/lib/auth'
import { appSupport } from '@/lib/support'
import { json } from '@/server/api'
import crowdfunding from '../../../../../content/crowdfunding.json'

/**
 * Public settings for the app. Giving money never happens inside the app (App Store rules, and
 * Rondje has no ANBI foundation yet).
 *
 * `support` is "Help ons via Whydonate" (Laurens, 5 okt 2026): one row low in the app that opens
 * `crowdfundingUrl` in Safari or the phone's browser, never in an in-app webview or checkout. Only
 * present while there is a campaign with a named recipient (CROWDFUNDING_URL + OPERATOR_NAME).
 * `inApp` follows the switch for the app that asks: the iPhone app sends `X-Rondje-Platform: ios`
 * (SUPPORT_IN_APP_IOS), Android SUPPORT_IN_APP_ANDROID, both defaulting to SUPPORT_IN_APP
 * (lib/support.ts). `inApp: false` means the app shows no entry at all. The route does not localise,
 * so `label` is Dutch; the apps have their own translations.
 *
 * `membership` stays as it was for app builds from before `support`: they open /support in Safari.
 *
 * `auth.providers` lists the sign-in buttons the server can handle right now (keys set in
 * Vercel); `auth.appleNative` says the system Apple sheet works (identity token to
 * /api/auth/sign-in/social). Google, and Apple without it, go through /api/auth/native/start.
 */
export async function GET(request: Request) {
  const t = await getTranslations({ locale: 'nl', namespace: 'helpApp' })
  const app = appPlatform(request.headers.get('user-agent'), request.headers.get(PLATFORM_HEADER))
  const support = appSupport(process.env, crowdfunding, (platform) => t('label', { platform }), app)
  return json({
    apiVersion: 1,
    membership: { inApp: false, path: '/support' },
    ...(support ? { support } : {}),
    legal: { terms: '/legal/terms', privacy: '/legal/privacy', conduct: '/legal/conduct', safety: '/safety' },
    emergencyNumber: '112',
    auth: { providers: enabledSocialProviders, appleNative: appleNativeEnabled },
  })
}
