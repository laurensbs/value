import { describe, expect, it } from 'vitest'
import crowdfunding from '../../content/crowdfunding.json'
import { appSupport, supportInApp } from './support'

const label = (platform: string) => `Help ons via ${platform}`
const LIVE = {
  CROWDFUNDING_URL: 'https://whydonate.com/nl/fundraising/rondjemee',
  OPERATOR_NAME: 'Laurens Bos',
}

describe('supportInApp', () => {
  it('is on unless the server switches it off', () => {
    expect(supportInApp({})).toBe(true)
    expect(supportInApp({ SUPPORT_IN_APP: '1' })).toBe(true)
    expect(supportInApp({ SUPPORT_IN_APP: '' })).toBe(true)
    expect(supportInApp({ SUPPORT_IN_APP: '0' })).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP: ' 0 ' })).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP: 'false' })).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP: 'OFF' })).toBe(false)
  })
})

describe('appSupport', () => {
  it('gives the apps the campaign link, the recipient and the numbers', () => {
    expect(appSupport(LIVE, { goal: 3000, raised: 1250, shareToCausesPercent: 10, updated: '2026-10-05' }, label)).toEqual({
      inApp: true,
      label: 'Help ons via Whydonate',
      crowdfundingUrl: 'https://whydonate.com/nl/fundraising/rondjemee',
      platform: 'Whydonate',
      operator: 'Laurens Bos',
      goal: 3000,
      raised: 1250,
      // "Geef een rondje": €5 a round, so €3,000 is 600 rounds.
      rounds: { goal: 600, raised: 250 },
      shareToCausesPercent: 10,
    })
  })

  it('says inApp: false when SUPPORT_IN_APP=0, so the apps hide every entry', () => {
    const off = appSupport({ ...LIVE, SUPPORT_IN_APP: '0' }, crowdfunding, label)
    expect(off?.inApp).toBe(false)
    // The link itself stays right, for the website and for old app builds that ignore the switch.
    expect(off?.crowdfundingUrl).toBe(LIVE.CROWDFUNDING_URL)
  })

  it('is left out while there is no campaign with a named recipient', () => {
    expect(appSupport({}, crowdfunding, label)).toBeNull()
    expect(appSupport({ CROWDFUNDING_URL: LIVE.CROWDFUNDING_URL }, crowdfunding, label)).toBeNull()
    expect(appSupport({ OPERATOR_NAME: 'Laurens Bos' }, crowdfunding, label)).toBeNull()
    // Monthly support (Patreon) is not a campaign, and an unknown platform never shows.
    expect(appSupport({ SUPPORT_URL: 'https://www.patreon.com/rondje', OPERATOR_NAME: 'Laurens Bos' }, crowdfunding, label)).toBeNull()
    expect(appSupport({ CROWDFUNDING_URL: 'https://example.com/give', OPERATOR_NAME: 'Laurens Bos' }, crowdfunding, label)).toBeNull()
  })

  it('leaves the numbers out until both the goal and the amount raised are filled in', () => {
    const s = appSupport(LIVE, { goal: 3000, raised: null }, label)
    expect(s).toMatchObject({ goal: null, raised: null, rounds: null })
    expect(appSupport(LIVE, { goal: 3000, raised: 3 }, label)?.rounds).toEqual({ goal: 600, raised: 0 })
  })

  it('reads the real content file: a goal of €3,000 is 600 rounds', () => {
    const s = appSupport(LIVE, crowdfunding, label)
    expect(s?.goal).toBe(crowdfunding.goal)
    expect(s?.rounds?.goal).toBe(crowdfunding.goal / 5)
  })
})
