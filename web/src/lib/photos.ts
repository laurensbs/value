/** Photos must come from our own upload: Vercel Blob, or an inline image when Blob is not set up. */
export function isAllowedPhotoUrl(url: string): boolean {
  if (url.length > 600_000) return false
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) return true
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

/** The profile picture Google gives when someone signs in with it (Apple gives none). */
export function isProviderPhoto(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.googleusercontent.com')
  } catch {
    return false
  }
}

/**
 * What the sign-in may store about a person: a short name, and a picture only from our own
 * storage or Google. Anything else could point at someone's server and tell it who looked.
 */
export function cleanAuthUser<T extends { name?: unknown; image?: unknown }>(data: T): T {
  const clean: Record<string, unknown> = { ...data }
  if (typeof data.name === 'string') clean.name = data.name.trim().slice(0, 100)
  if (data.image != null) {
    clean.image = typeof data.image === 'string' && (isAllowedPhotoUrl(data.image) || isProviderPhoto(data.image)) ? data.image : null
  }
  return clean as T
}
