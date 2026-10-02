import { json } from '@/server/api'

/**
 * Public settings for the app. Giving money never happens inside the app (App Store rules, and
 * Rondje has no ANBI foundation yet): membership and donations open the website in Safari.
 */
export async function GET() {
  return json({
    apiVersion: 1,
    membership: { inApp: false, path: '/support' },
    legal: { terms: '/legal/terms', privacy: '/legal/privacy', conduct: '/legal/conduct', safety: '/safety' },
    emergencyNumber: '112',
  })
}
