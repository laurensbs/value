import { describe, expect, it } from 'vitest'
import { databaseRegion, regionFit, vercelRegionFor } from './regions'

describe('databaseRegion', () => {
  it('reads the region from a Neon address, pooled or not', () => {
    expect(databaseRegion('postgresql://u:p@ep-cool-sea-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require')).toBe('eu-central-1')
    expect(databaseRegion('postgres://u:p@ep-cool-sea-123.c-2.us-east-2.aws.neon.tech/neondb')).toBe('us-east-2')
    expect(databaseRegion('postgres://u:p@ep-cool-sea-123.germanywestcentral.azure.neon.tech/neondb')).toBe('germanywestcentral')
  })

  it('knows nothing about other databases or broken addresses', () => {
    expect(databaseRegion('postgres://u:p@db.abc.supabase.co:5432/postgres')).toBeNull()
    expect(databaseRegion('postgres://u:p@aws.neon.tech.evil.example/db')).toBeNull()
    expect(databaseRegion('not a url')).toBeNull()
    expect(databaseRegion(undefined)).toBeNull()
  })
})

describe('regionFit', () => {
  it('same region, same part of the world, or far apart', () => {
    expect(regionFit('fra1', 'eu-central-1')).toBe('same')
    expect(regionFit('cdg1', 'eu-central-1')).toBe('near')
    expect(regionFit('iad1', 'us-east-2')).toBe('near')
    expect(regionFit('iad1', 'eu-central-1')).toBe('far')
    expect(regionFit('fra1', 'germanywestcentral')).toBe('near')
  })

  it('says nothing when a region is unknown', () => {
    expect(regionFit(undefined, 'eu-central-1')).toBeNull()
    expect(regionFit('dev1', 'eu-central-1')).toBeNull()
    expect(regionFit('fra1', null)).toBeNull()
  })
})

describe('vercelRegionFor', () => {
  it('suggests the Vercel region next to the database', () => {
    expect(vercelRegionFor('eu-central-1')).toBe('fra1')
    expect(vercelRegionFor('us-east-2')).toBe('cle1')
    expect(vercelRegionFor('germanywestcentral')).toBe('fra1')
    expect(vercelRegionFor('eastus2')).toBe('iad1')
  })
})
