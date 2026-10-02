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
