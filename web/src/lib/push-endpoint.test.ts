import { describe, expect, it } from 'vitest'
import { webPushSubscription } from './push-endpoint'

const keys = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' }

describe('webPushSubscription', () => {
  it('accepts the push services of Chrome, Firefox, Safari and Edge', () => {
    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/abc:def',
      'https://updates.push.services.mozilla.com/wpush/v2/gAAAA',
      'https://web.push.apple.com/QGz7',
      'https://wns2-db5p.notify.windows.com/w/?token=BQYAAAB',
    ]) {
      expect(webPushSubscription({ endpoint, keys })).toEqual({ endpoint, keys })
    }
  })

  it('refuses any other address, so the server never calls someone else', () => {
    for (const endpoint of ['https://evil.example/push', 'http://fcm.googleapis.com/fcm/send/x', 'https://fcm.googleapis.com:8443/x', 'https://fcm.googleapis.com.evil.example/x', 'not a url']) {
      expect(webPushSubscription({ endpoint, keys })).toBeNull()
    }
  })

  it('refuses missing or oversized keys', () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/abc'
    expect(webPushSubscription({ endpoint })).toBeNull()
    expect(webPushSubscription({ endpoint, keys: { ...keys, auth: 'x'.repeat(5000) } })).toBeNull()
    expect(webPushSubscription({ endpoint, keys: { ...keys, p256dh: 42 } })).toBeNull()
    expect(webPushSubscription(null)).toBeNull()
  })
})
