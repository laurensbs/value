export type PlaceKey = 'today' | 'dogs' | 'requests' | 'shelter' | 'myDogs'

/**
 * The places in the app for someone, in order. They follow why someone is here: walkers find
 * dogs, owners see their own dogs, shelter staff their shelter. The phone's tab bar and the
 * header on wide screens show the same ones (the tab bar adds Profiel, the header the avatar).
 */
export function appPlaces(roles: { walker: boolean; owner: boolean }, orgId?: string): { key: PlaceKey; href: string }[] {
  return [
    { key: 'today', href: '/' },
    ...(roles.walker ? [{ key: 'dogs' as const, href: '/dogs' }] : []),
    { key: 'requests', href: '/requests' },
    ...(orgId ? [{ key: 'shelter' as const, href: `/shelter/${orgId}` }] : roles.owner ? [{ key: 'myDogs' as const, href: '/my-dogs' }] : []),
  ]
}
