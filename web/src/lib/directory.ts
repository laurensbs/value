import shelters from '../../content/shelters.json'
import { isCountry, type Country } from './countries'

export interface DirectoryShelter {
  id: string
  country: Country
  name: string
  city: string | null
  region: string | null
  website: string | null
  walkingProgram: 'yes' | 'no' | 'unknown'
  lat: number | null
  lng: number | null
  confidence: 'high' | 'medium' | 'low'
  note: string | null
}

/** Shelters from public sources (content/shelters.json), not yet partners. */
export const DIRECTORY: DirectoryShelter[] = (shelters as unknown as DirectoryShelter[]).filter((s) => isCountry(s.country))

export function directoryEntry(id: string | undefined): DirectoryShelter | undefined {
  return id ? DIRECTORY.find((s) => s.id === id) : undefined
}
