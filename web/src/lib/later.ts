/**
 * "Later" on a friendly question, remembered in this browser only (the cookie statement names it).
 * Without storage, as in some private windows, the question simply comes back on the next visit.
 */
export const PUSH_LATER = 'rondje.pushAsk'
export const INSTALL_LATER = 'rondje.installAsk'

export function askLater(key: string, days: number, now = Date.now()) {
  try {
    localStorage.setItem(key, String(now + days * 86_400_000))
  } catch {
    // No storage: nothing to remember.
  }
}

export function snoozed(key: string, now = Date.now()): boolean {
  try {
    return Number(localStorage.getItem(key) ?? 0) > now
  } catch {
    return false
  }
}
