import { describe, expect, it } from 'vitest'
import { installWayFor, iosPushAfterInstall } from './install-client'

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1'
const OLD_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1'
// iPadOS shows the desktop site by default and then presents itself as a Mac.
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15'
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G86 Instagram 390.0.0.28.85 (iPhone15,3; iOS 18_6; nl_NL; nl; scale=3.00; 1290x2796; 0)'
const FACEBOOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 [FBAN/FBIOS;FBAV/470.0.0.40.97;FBBV/621000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/nl_NL;FBOP/5]'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'

const env = (ua: string, more: Partial<Parameters<typeof installWayFor>[0]> = {}) => ({ ua, touchPoints: 5, standalone: false, native: false, canPrompt: false, ...more })

describe('installWayFor', () => {
  it('shows the steps in the share menu on iPhone and iPad, in Safari and other browsers', () => {
    expect(installWayFor(env(SAFARI))).toBe('ios')
    expect(installWayFor(env(CHROME_IOS))).toBe('ios')
    expect(installWayFor(env(IPAD))).toBe('ios')
  })

  it("sends people in another app's browser to Safari first", () => {
    expect(installWayFor(env(INSTAGRAM))).toBe('ios-in-app')
    expect(installWayFor(env(FACEBOOK))).toBe('ios-in-app')
  })

  it("elsewhere uses the browser's own question, only when it offers one", () => {
    expect(installWayFor(env(ANDROID, { canPrompt: true }))).toBe('prompt')
    expect(installWayFor(env(ANDROID))).toBeNull()
    // A Mac has no touch screen: no steps for the share menu there.
    expect(installWayFor(env(IPAD, { touchPoints: 0 }))).toBeNull()
  })

  it('asks nothing on the home screen or inside the app', () => {
    expect(installWayFor(env(SAFARI, { standalone: true }))).toBeNull()
    expect(installWayFor(env(ANDROID, { canPrompt: true, standalone: true }))).toBeNull()
    expect(installWayFor(env(SAFARI, { native: true }))).toBeNull()
  })
})

describe('iosPushAfterInstall', () => {
  it('promises a heads-up only from iOS 16.4 on', () => {
    expect(iosPushAfterInstall(SAFARI)).toBe(true)
    expect(iosPushAfterInstall(CHROME_IOS)).toBe(true)
    expect(iosPushAfterInstall(OLD_IOS)).toBe(false)
    expect(iosPushAfterInstall(SAFARI.replace('18_6', '16_4'))).toBe(true)
    expect(iosPushAfterInstall(SAFARI.replace('18_6', '16_10'))).toBe(true)
    // Without a version (iPadOS as a Mac), assume a recent one.
    expect(iosPushAfterInstall(IPAD)).toBe(true)
  })
})
