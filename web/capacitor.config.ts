import type { CapacitorConfig } from '@capacitor/cli'

// The iOS and Android apps are a native shell around the live website, so every
// improvement ships to the apps without an App Store update. Set CAP_SERVER_URL to
// point the shell at another deployment (for example a preview) before `npx cap sync`.
const serverUrl = process.env.CAP_SERVER_URL ?? 'https://rondjemee.nl'

const config: CapacitorConfig = {
  appId: 'app.rondje.mobile',
  appName: 'Rondje Mee',
  webDir: 'native-shell',
  // Lets the website recognise the apps (src/server/native.ts): no costs, no /support page and no way to
  // pay in the apps. The only way to give is "Help ons via Whydonate", a plain link that opens the
  // campaign in Safari or the phone's browser (src/components/HelpUsInApp.tsx); the per-app switches
  // are SUPPORT_IN_APP_IOS and SUPPORT_IN_APP_ANDROID (src/lib/support.ts).
  appendUserAgent: 'RondjeApp',
  server: {
    url: serverUrl,
    cleartext: false,
    errorPath: 'offline.html',
  },
  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
