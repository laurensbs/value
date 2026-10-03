import { isNativeApp } from './native'

/**
 * How someone can put Rondje on their home screen from where they are: with the steps in the share
 * menu on iPhone and iPad, after first opening Safari when they are in another app's browser
 * (Instagram, Facebook, …), with the browser's own install question (Chrome, Edge, Samsung
 * Internet), or not at all: already installed, inside the app shell, or a browser that can't.
 */
export type InstallWay = 'ios' | 'ios-in-app' | 'prompt' | null

/** Browsers inside other apps. They cannot add a website to the home screen. */
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|GSA\//

export function isIos(ua: string, touchPoints = 0): boolean {
  // iPadOS presents itself as a Mac by default, but a Mac has no touch screen.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
}

/** Push works in a home screen app from iOS 16.4 on. Without a version in the user agent (iPadOS), assume a recent one. */
export function iosPushAfterInstall(ua: string): boolean {
  const m = /(?:iPhone OS|CPU OS) (\d+)_(\d+)/.exec(ua)
  return !m || Number(m[1]) * 100 + Number(m[2]) >= 1604
}

export function installWayFor(env: { ua: string; touchPoints: number; standalone: boolean; native: boolean; canPrompt: boolean }): InstallWay {
  if (env.native || env.standalone) return null
  if (isIos(env.ua, env.touchPoints)) return IN_APP.test(env.ua) ? 'ios-in-app' : 'ios'
  return env.canPrompt ? 'prompt' : null
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// The browser offers its install question once, often before the page is ready: keep it.
let offered: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    offered = event as InstallPromptEvent
    changed()
  })
  window.addEventListener('appinstalled', () => {
    offered = null
    changed()
  })
}

export function onInstallChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function installWay(): InstallWay {
  return installWayFor({
    ua: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints ?? 0,
    standalone: isStandalone(),
    native: isNativeApp(),
    canPrompt: offered != null,
  })
}

/** Shows the browser's own install question (it can be shown once). True when Rondje was installed. */
export async function promptInstall(): Promise<boolean> {
  const event = offered
  offered = null
  if (!event) return false
  await event.prompt()
  return (await event.userChoice).outcome === 'accepted'
}
