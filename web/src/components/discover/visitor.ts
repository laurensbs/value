import 'server-only'
import { headers } from 'next/headers'
import { isCountry, type Country } from '@/lib/countries'
import { isValidLatLng, type LatLng } from '@/lib/geo'
import { guessCountry } from '@/lib/guess-country'

// Where a visitor without a profile probably is, to show dogs nearby first. Vercel adds the
// country (and a city-level position) of the visitor's IP address to every request; locally
// and elsewhere we fall back to the browser's region and language. Nothing here is stored.

/** The country from the IP lookup when it is one of ours, else the browser's region or language. */
export async function visitorCountry(): Promise<Country> {
  const fromIp = (await headers()).get('x-vercel-ip-country')?.toUpperCase()
  if (isCountry(fromIp)) return fromIp
  return guessCountry()
}

/** The city-level position from the IP lookup, only when it lies in the country being shown. Used to sort, never shown. */
export async function visitorPosition(country: Country | undefined): Promise<LatLng | null> {
  const h = await headers()
  if (!country || h.get('x-vercel-ip-country')?.toUpperCase() !== country) return null
  const lat = h.get('x-vercel-ip-latitude')
  const lng = h.get('x-vercel-ip-longitude')
  if (!lat || !lng) return null
  const point = { lat: Number(lat), lng: Number(lng) }
  return isValidLatLng(point.lat, point.lng) ? point : null
}
