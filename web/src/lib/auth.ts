import 'server-only'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins/bearer'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import * as schema from '@/db/schema'
import { passwordResetEmail, sendEmail, toLocale } from '@/server/email'
import { siteUrl, trustedOrigins } from './site'

const baseURL = siteUrl()

// Never sign real sessions with the development fallback.
if (process.env.VERCEL_ENV === 'production' && !process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET is not set for production')
}

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : {}

const apple =
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
          appBundleIdentifier: process.env.APPLE_APP_BUNDLE_ID,
        },
      }
    : {}

export const enabledSocialProviders = [...Object.keys(google), ...Object.keys(apple)] as ('google' | 'apple')[]

export const auth = betterAuth({
  appName: 'Rondje',
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? 'rondje-local-development-secret-change-me-0000',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    // "Forgot password": a link that works for one hour; resetting signs out every other device.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const [profile] = await db.select({ locale: schema.profile.locale }).from(schema.profile).where(eq(schema.profile.userId, user.id))
      await sendEmail(await passwordResetEmail(url, toLocale(profile?.locale), user.email))
    },
  },
  socialProviders: { ...google, ...apple },
  account: { accountLinking: { enabled: true, trustedProviders: ['google', 'apple'] } },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user', input: false },
    },
  },
  trustedOrigins: [...trustedOrigins(), ...(Object.keys(apple).length ? ['https://appleid.apple.com'] : [])],
  plugins: [
    passkey({ rpID: new URL(baseURL).hostname, rpName: 'Rondje', origin: baseURL }),
    // The native iOS app signs in with email and password and keeps the session token in the
    // Keychain; it sends it as "Authorization: Bearer …" instead of a cookie (src/server/api.ts).
    bearer({ requireSignature: true }),
    nextCookies(),
  ],
})
