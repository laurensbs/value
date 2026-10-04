import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signUp, unique } from './helpers'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G86 Instagram 390.0.0.28.85 (iPhone15,3; iOS 18_6; nl_NL; nl; scale=3.00; 1290x2796; 0)'

test.skip(({ isMobile }) => !isMobile, 'Putting Rondje on the home screen is about phones')

test('iPhone: the steps to the home screen on Today and in the profile, and Safari first from another app', async ({ browser }) => {
  const fleur = await newPerson(browser, undefined, { userAgent: IPHONE })
  // A browser there may say it can do push; only Rondje on the home screen really can.
  await fleur.context.grantPermissions(['notifications'])
  await signUp(fleur.page, { name: 'Fleur', email: `fleur-${unique()}@example.com`, intent: 'walker' })
  await onboard(fleur.page, { birthDate: '2003-05-01', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false })
  await expect(fleur.page).toHaveURL(/\/\?welcome=1$/)

  // On iPhone a heads-up only works from the home screen, so Rondje shows the three taps and asks nothing else.
  const ask = fleur.page.getByRole('region', { name: 'Zet je Rondje op je beginscherm?' })
  await expect(ask).toContainText('Dan open je Rondje met één tik, net als een app, en kan ik je een seintje geven als er nieuws is.')
  await expect(ask.getByRole('listitem')).toHaveText([/Tik op Delen/, 'Kies “Zet op beginscherm”', 'Tik op “Voeg toe”'])
  await expect(fleur.page.getByRole('region', { name: 'Zal ik je een seintje geven?' })).toHaveCount(0)
  await expect(ask.getByRole('button', { name: 'Staat er al op' })).toBeVisible()
  await shot(fleur.page, '20-install-ask-iphone')
  await ask.getByRole('button', { name: 'Later' }).click()
  await expect(ask).toHaveCount(0)
  expect(await fleur.page.evaluate(() => Number(localStorage.getItem('rondje.installAsk')) > Date.now())).toBe(true)

  // The profile explains why there is no switch for heads-ups yet, with the same steps.
  await fleur.page.goto('/profile')
  await expect(fleur.page.getByText('Seintjes op je iPhone? Die werken zodra Rondje op je beginscherm staat:')).toBeVisible()
  await expect(fleur.page.getByText('Kies “Zet op beginscherm”')).toBeVisible()
  await shot(fleur.page, '21-install-profile')

  // In Instagram's browser it cannot be done: open Safari first, with the link to paste there.
  const inApp = await browser.newContext({ userAgent: INSTAGRAM, permissions: ['clipboard-read', 'clipboard-write'] })
  await inApp.addCookies(await fleur.context.cookies())
  const page = await inApp.newPage()
  await page.goto('/')
  const inAppAsk = page.getByRole('region', { name: 'Zet je Rondje op je beginscherm?' })
  await expect(inAppAsk).toContainText('Open Rondje in Safari')
  await inAppAsk.getByRole('button', { name: 'Kopieer link' }).click()
  await expect(inAppAsk).toContainText('Gekopieerd. Plak de link in Safari.')
  await shot(page, '22-install-in-app')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^http:\/\/localhost:\d+\/$/)
  await inApp.close()
  await fleur.context.close()
})

test('Android: the push question first, then the browser installs Rondje after one tap', async ({ browser }) => {
  const sam = await newPerson(browser)
  await sam.context.grantPermissions(['notifications'])
  await signUp(sam.page, { name: 'Sam', email: `sam-${unique()}@example.com`, intent: 'walker' })
  await onboard(sam.page, { birthDate: '2001-09-12', city: 'Utrecht', bio: 'Ik loop graag.', phone: '', walker: true, owner: false })
  await expect(sam.page).toHaveURL(/\/\?welcome=1$/)

  // The browser offers its install question; a stand-in plays its part and says yes.
  const offer = () =>
    sam.page.evaluate(() => {
      const event = Object.assign(new Event('beforeinstallprompt'), {
        prompt: async () => {},
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      })
      window.dispatchEvent(event)
    })
  // One question at a time: while the push question is open, the install question waits.
  const push = sam.page.getByRole('region', { name: 'Zal ik je een seintje geven?' })
  await expect(push).toBeVisible()
  await offer()
  const install = sam.page.getByRole('region', { name: 'Zet je Rondje op je beginscherm?' })
  await expect(install).toHaveCount(0)
  await push.getByRole('button', { name: 'Later' }).click()
  await offer()
  await expect(install).toContainText('Dan open je Rondje met één tik, net als een app.')
  await shot(sam.page, '23-install-android')
  await install.getByRole('button', { name: 'Ja, graag' }).click()
  await expect(sam.page.getByText('Gelukt! Je vindt Rondje nu op je beginscherm.')).toBeVisible()
  await sam.context.close()
})
