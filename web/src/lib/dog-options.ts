/** What an owner or shelter can hand the walker. Shown as "De eigenaar zorgt voor …". */
export const PROVIDES = ['bags', 'leash', 'harness', 'treats', 'water', 'towel'] as const
export type Provide = (typeof PROVIDES)[number]

/** Treats: allowed, only the owner's/shelter's own, or better not. */
export const TREATS = ['yes', 'own', 'no'] as const
export type Treats = (typeof TREATS)[number]

/** How many dogs a shelter can have waiting as drafts at once (photo-first bulk add). */
export const MAX_DRAFT_DOGS = 60


/** What a new shelter dog starts with: the shelter's own defaults, cleaned up. */
export function shelterDogDefaults(org: { treatsPolicy: string; provides: string[]; defaultWalkMinutes: number | null }): {
  treats: Treats
  provides: Provide[]
  walkMinutes: number
} {
  const treats = (TREATS as readonly string[]).includes(org.treatsPolicy) ? (org.treatsPolicy as Treats) : 'own'
  const provides = [...new Set(org.provides.filter((p): p is Provide => (PROVIDES as readonly string[]).includes(p)))]
  const minutes = Number.isFinite(org.defaultWalkMinutes) ? Math.round(org.defaultWalkMinutes as number) : 45
  return {
    treats,
    provides: provides.length ? provides : ['bags', 'leash'],
    walkMinutes: Math.min(180, Math.max(10, minutes)),
  }
}
