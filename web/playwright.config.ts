import { generateKeyPairSync } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'
import webpush from 'web-push'

const PORT = Number(process.env.E2E_PORT ?? 3200)
// Production sends web push, so the tests run with it too, on a throwaway key pair per run.
const vapid = webpush.generateVAPIDKeys()
// "Doorgaan met Apple": a throwaway key shaped like Apple's .p8 (P-256), pasted on one line with
// "\n" in it like a dashboard might, so the server signs its own client secret (src/lib/apple-secret.ts).
const appleKey = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  .privateKey.export({ format: 'pem', type: 'pkcs8' })
  .toString()
  .replace(/\n/g, '\\n')

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    // Opt-in desktop pass (E2E_DESKTOP=1 npx playwright test --project desktop), so CI time stays the same.
    ...(process.env.E2E_DESKTOP ? [{ name: 'desktop', use: { ...devices['Desktop Chrome'], browserName: 'chromium' as const } }] : []),
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.E2E_SERVER_CMD ?? `npx next dev --port ${PORT}`,
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          PGLITE_DIR: 'memory',
          SEED_DEMO: '1',
          ADMIN_EMAILS: 'admin@e2e.test',
          // Fake values, only to test that the support link shows on the website and never in the apps.
          SUPPORT_URL: 'https://www.patreon.com/example',
          OPERATOR_NAME: 'Voorbeeld',
          // A fake contact address, to test that the legal texts and /contact link to CONTACT_EMAIL.
          CONTACT_EMAIL: 'contact@example.org',
          VAPID_PUBLIC_KEY: vapid.publicKey,
          VAPID_PRIVATE_KEY: vapid.privateKey,
          VAPID_SUBJECT: 'mailto:e2e@example.com',
          // Fake Google and Apple clients: the buttons show on the website (never in the app shell)
          // and send the browser to Google/Apple, which the tests stop right there (e2e/social-login.spec.ts).
          GOOGLE_CLIENT_ID: 'e2e-client.apps.googleusercontent.com',
          GOOGLE_CLIENT_SECRET: 'e2e-google-secret',
          APPLE_CLIENT_ID: 'app.rondje.e2e',
          APPLE_KEY_ID: 'E2EKEY1234',
          APPLE_TEAM_ID: 'E2ETEAM123',
          APPLE_PRIVATE_KEY: appleKey,
        },
      },
})
