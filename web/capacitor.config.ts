import type { CapacitorConfig } from '@capacitor/cli'

// The iOS and Android apps are a native shell around the live website, so every
// improvement ships to the apps without an App Store update. Set CAP_SERVER_URL to
// point the shell at another deployment (for example a preview) before `npx cap sync`.
const serverUrl = process.env.CAP_SERVER_URL ?? 'https://rondje-five.vercel.app'

const config: CapacitorConfig = {
  appId: 'app.rondje.mobile',
  appName: 'Rondje',
  webDir: 'native-shell',
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
