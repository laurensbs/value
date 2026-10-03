import 'server-only'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins/bearer'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import * as schema from '@/db/schema'
import { passwordResetEmail, sendEmail, toLocale, verifyEmail } from '@/server/email'
import { cleanAuthUser } from './photos'
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

async function localeOf(userId: string) {
  const [profile] = await db.select({ locale: schema.profile.locale }).from(schema.profile).where(eq(schema.profile.userId, userId))
  return toLocale(profile?.locale)
}

export const enabledSocialProviders = [...Object.keys(google), ...Object.keys(apple)] as ('google' | 'apple')[]

export const auth = betterAuth({
  appName: 'Rondje',
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? 'rondje-local-development-secret-change-me-0000',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  // Every page looks up the session: with a join, the session and its person come back in one question.
  advanced: { database: { joins: true } },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    // "Forgot password": a link that works for one hour; resetting signs out every other device.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(await passwordResetEmail(url, await localeOf(user.id), user.email))
    },
    // The reset link went to their inbox, so the address is theirs.
    onPasswordReset: async ({ user }) => {
      if (!user.emailVerified) await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, user.id))
    },
  },
  // Only sent on request, from /admin: before admin rights by address are given (src/server/session.ts).
  // Its public endpoint stays closed, so nobody can send this email to someone else's address.
  disabledPaths: ['/send-verification-email'],
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!(await sendEmail(await verifyEmail(url, await localeOf(user.id), user.email)))) throw new Error('verification email not sent')
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
  // Sign-up and "update user" accept any name and picture address: keep only what is safe to show.
  databaseHooks: {
    user: {
      create: { before: async (user) => ({ data: cleanAuthUser(user) }) },
      update: { before: async (user) => ({ data: cleanAuthUser(user) }) },
    },
  },
  plugins: [
    passkey({ rpID: new URL(baseURL).hostname, rpName: 'Rondje', origin: baseURL }),
    // The native iOS app signs in with email and password and keeps the session token in the
    // Keychain; it sends it as "Authorization: Bearer …" instead of a cookie (src/server/api.ts).
    bearer({ requireSignature: true }),
    nextCookies(),
  ],
})
