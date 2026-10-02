import 'server-only'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { db } from '@/db'
import * as schema from '@/db/schema'
import { siteUrl, trustedOrigins } from './site'

const baseURL = siteUrl()

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
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
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
    nextCookies(),
  ],
})
