import { describe, expect, it } from 'vitest'
import crowdfunding from '../../content/crowdfunding.json'
import { campaign, crowdfundingUrl, roundsFor, supportConfig, supportUrl } from './support'

describe('supportUrl', () => {
  it('accepts https links to known support platforms only', () => {
    expect(supportUrl('https://www.patreon.com/rondje')).toBe('https://www.patreon.com/rondje')
    expect(supportUrl('https://ko-fi.com/rondje')).toBe('https://ko-fi.com/rondje')
    expect(supportUrl('http://www.patreon.com/rondje')).toBeNull()
    expect(supportUrl('https://patreon.com.evil.example/rondje')).toBeNull()
    expect(supportUrl('https://user:secret@www.patreon.com/rondje')).toBeNull()
    expect(supportUrl('javascript:alert(1)')).toBeNull()
    expect(supportUrl('')).toBeNull()
  })
})

describe('crowdfundingUrl', () => {
  it('accepts https links to known crowdfunding platforms', () => {
    expect(crowdfundingUrl('https://www.whydonate.com/fundraising/example')).toBe('https://www.whydonate.com/fundraising/example')
    expect(crowdfundingUrl('https://whydonate.nl/fundraising/example')).toBe('https://whydonate.nl/fundraising/example')
    expect(crowdfundingUrl(' https://www.gofundme.com/f/example ')).toBe('https://www.gofundme.com/f/example')
    expect(crowdfundingUrl('https://www.doneeractie.nl/example/-12345')).toBe('https://www.doneeractie.nl/example/-12345')
    expect(crowdfundingUrl('https://www.kickstarter.com/projects/example/example')).toBe('https://www.kickstarter.com/projects/example/example')
    expect(crowdfundingUrl('https://es.ulule.com/example/')).toBe('https://es.ulule.com/example/')
    expect(crowdfundingUrl('https://www.goteo.org/project/example')).toBe('https://www.goteo.org/project/example')
    expect(crowdfundingUrl('https://www.verkami.com/projects/1-example')).toBe('https://www.verkami.com/projects/1-example')
  })

  it('rejects anything else', () => {
    expect(crowdfundingUrl('http://www.whydonate.com/fundraising/example')).toBeNull()
    expect(crowdfundingUrl('https://whydonate.com.example.net/fundraising/example')).toBeNull()
    expect(crowdfundingUrl('https://notwhydonate.com/fundraising/example')).toBeNull()
    expect(crowdfundingUrl('https://user:secret@www.gofundme.com/f/example')).toBeNull()
    // Monthly support platforms are not a one-off campaign, and the other way round.
    expect(crowdfundingUrl('https://www.patreon.com/rondje')).toBeNull()
    expect(supportUrl('https://www.whydonate.com/fundraising/example')).toBeNull()
    expect(crowdfundingUrl('javascript:alert(1)')).toBeNull()
    expect(crowdfundingUrl('not a link')).toBeNull()
    expect(crowdfundingUrl(undefined)).toBeNull()
  })
})

describe('supportConfig', () => {
  it('hides everything that is not set', () => {
    expect(supportConfig({})).toEqual({
      url: null,
      platform: null,
      crowdfundingUrl: null,
      crowdfundingPlatform: null,
      operator: null,
      instagram: null,
      contactEmail: null,
    })
  })

  it('only shows the support and crowdfunding links when the recipient is named', () => {
    const unnamed = supportConfig({ SUPPORT_URL: 'https://www.patreon.com/rondje', CROWDFUNDING_URL: 'https://www.whydonate.com/fundraising/example' })
    expect(unnamed.url).toBeNull()
    expect(unnamed.crowdfundingUrl).toBeNull()
    expect(unnamed.crowdfundingPlatform).toBeNull()
    const full = supportConfig({
      SUPPORT_URL: 'https://www.patreon.com/rondje',
      CROWDFUNDING_URL: 'https://www.whydonate.com/fundraising/example',
      OPERATOR_NAME: ' Webstability ',
      INSTAGRAM_HANDLE: '@Rondje.App',
      CONTACT_EMAIL: 'hallo@example.org',
    })
    expect(full).toEqual({
      url: 'https://www.patreon.com/rondje',
      platform: 'Patreon',
      crowdfundingUrl: 'https://www.whydonate.com/fundraising/example',
      crowdfundingPlatform: 'Whydonate',
      operator: 'Webstability',
      instagram: 'rondje.app',
      contactEmail: 'hallo@example.org',
    })
  })

  it('shows a campaign on its own, without monthly support', () => {
    const cfg = supportConfig({ CROWDFUNDING_URL: 'https://www.gofundme.com/f/example', OPERATOR_NAME: 'Voorbeeld' })
    expect(cfg.url).toBeNull()
    expect(cfg.crowdfundingUrl).toBe('https://www.gofundme.com/f/example')
    expect(cfg.crowdfundingPlatform).toBe('GoFundMe')
  })

  it('drops a crowdfunding link on an unknown platform', () => {
    expect(supportConfig({ CROWDFUNDING_URL: 'https://example.com/give', OPERATOR_NAME: 'Voorbeeld' }).crowdfundingUrl).toBeNull()
  })

  it('ignores an invalid email address', () => {
    expect(supportConfig({ CONTACT_EMAIL: 'not an email' }).contactEmail).toBeNull()
  })
})

describe('campaign', () => {
  it('shows nothing until the numbers are filled in', () => {
    expect(campaign({ goal: null, raised: null, shareToCausesPercent: null, updated: '2026-10-03' })).toEqual({
      progress: null,
      shareToCausesPercent: null,
      updated: '2026-10-03',
    })
    expect(campaign(null)).toEqual({ progress: null, shareToCausesPercent: null, updated: null })
  })

  it('needs both a goal and the amount raised for a progress bar', () => {
    expect(campaign({ goal: 5000, raised: null }).progress).toBeNull()
    expect(campaign({ goal: null, raised: 100 }).progress).toBeNull()
    expect(campaign({ goal: 0, raised: 100 }).progress).toBeNull()
    expect(campaign({ goal: '5000', raised: 100 }).progress).toBeNull()
    expect(campaign({ goal: 5000, raised: -1 }).progress).toBeNull()
    expect(campaign({ goal: 5000, raised: 0 }).progress).toEqual({ goal: 5000, raised: 0, percent: 0 })
    expect(campaign({ goal: 5000, raised: 1250 }).progress).toEqual({ goal: 5000, raised: 1250, percent: 25 })
    // More than the goal: the bar stays full, the amount stays true.
    expect(campaign({ goal: 1000, raised: 1500 }).progress).toEqual({ goal: 1000, raised: 1500, percent: 100 })
  })

  it('only accepts a real percentage for the share that goes to good causes', () => {
    expect(campaign({ shareToCausesPercent: 10 }).shareToCausesPercent).toBe(10)
    expect(campaign({ shareToCausesPercent: 12.5 }).shareToCausesPercent).toBe(12.5)
    expect(campaign({ shareToCausesPercent: 0 }).shareToCausesPercent).toBeNull()
    expect(campaign({ shareToCausesPercent: 101 }).shareToCausesPercent).toBeNull()
    expect(campaign({ shareToCausesPercent: '10' }).shareToCausesPercent).toBeNull()
  })

  it('ignores a malformed date', () => {
    expect(campaign({ updated: 'gisteren' }).updated).toBeNull()
  })

  it('the content file has every field, so filling it in is all it takes', () => {
    expect(Object.keys(crowdfunding).sort()).toEqual(['goal', 'raised', 'shareToCausesPercent', 'updated'])
    expect(campaign(crowdfunding).updated).not.toBeNull()
  })
})

describe('roundsFor', () => {
  it('counts whole rounds of €5, like "Geef een rondje" on the campaign page', () => {
    expect(roundsFor(3000)).toBe(600)
    expect(roundsFor(0)).toBe(0)
    expect(roundsFor(4)).toBe(0)
    expect(roundsFor(12)).toBe(2)
    expect(roundsFor(-5)).toBe(0)
    expect(roundsFor(Number.NaN)).toBe(0)
  })
})
