/**
 * Where the app runs and where its database is. Every database question travels between the two,
 * so they belong in the same region: across an ocean each question takes up to 100 ms longer.
 */

/** Vercel function regions and the AWS region each one runs in. */
const VERCEL_AWS: Record<string, string> = {
  arn1: 'eu-north-1',
  bom1: 'ap-south-1',
  cdg1: 'eu-west-3',
  cle1: 'us-east-2',
  cpt1: 'af-south-1',
  dub1: 'eu-west-1',
  dxb1: 'me-central-1',
  fra1: 'eu-central-1',
  gru1: 'sa-east-1',
  hkg1: 'ap-east-1',
  hnd1: 'ap-northeast-1',
  iad1: 'us-east-1',
  icn1: 'ap-northeast-2',
  kix1: 'ap-northeast-3',
  lhr1: 'eu-west-2',
  pdx1: 'us-west-2',
  sfo1: 'us-west-1',
  sin1: 'ap-southeast-1',
  syd1: 'ap-southeast-2',
  yul1: 'ca-central-1',
}

/** Neon on Azure names its regions differently: the part of the world each one is in. */
const AZURE_AREA: Record<string, string> = { eastus2: 'us', westus3: 'us', germanywestcentral: 'eu' }

/** The region in a Neon connection address ("ep-x-pooler.eu-central-1.aws.neon.tech"), or null. */
export function databaseRegion(url: string | undefined): string | null {
  if (!url) return null
  try {
    const labels = new URL(url).hostname.split('.')
    if (labels.slice(-2).join('.') !== 'neon.tech') return null
    const cloud = labels.findIndex((l) => l === 'aws' || l === 'azure')
    return cloud > 0 ? labels[cloud - 1] : null
  } catch {
    return null
  }
}

const areaOf = (region: string) => AZURE_AREA[region] ?? region.split('-')[0]

export type RegionFit = 'same' | 'near' | 'far'

/** How far apart a Vercel function region and a database region are; null when either is unknown. */
export function regionFit(functionRegion: string | undefined, dbRegion: string | null): RegionFit | null {
  const app = functionRegion ? VERCEL_AWS[functionRegion] : undefined
  if (!app || !dbRegion) return null
  if (app === dbRegion) return 'same'
  return areaOf(app) === areaOf(dbRegion) ? 'near' : 'far'
}

/** The Vercel region closest to a database region (the same AWS region when there is one). */
export function vercelRegionFor(dbRegion: string): string | null {
  const exact = Object.entries(VERCEL_AWS).find(([, aws]) => aws === dbRegion)
  if (exact) return exact[0]
  const area = areaOf(dbRegion)
  return { us: 'iad1', eu: 'fra1' }[area] ?? null
}
