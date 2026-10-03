import type { Country } from '@/lib/countries'

/** A small drawn flag. Emoji flags look different on every device (and are letters on Windows). */
export function Flag({ country }: { country: Country }) {
  return <span className={`lp-flag lp-flag-${country.toLowerCase()}`} aria-hidden="true" />
}
