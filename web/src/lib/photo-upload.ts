'use client'

/** Shrinks a photo in the browser so uploads stay small and fast on mobile data. */
export async function resizePhoto(file: File, maxSide: number, quality: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    // JPEG has no transparency: paint white first so transparent logos do not turn black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Resizes and uploads one photo; returns its URL (Vercel Blob, or a data URL without Blob). */
export async function uploadPhoto(file: File, maxSide: number): Promise<string> {
  // Try a normal size first, then a smaller one if the server says it is too large.
  for (const [side, quality] of [
    [maxSide, 0.84],
    [Math.round(maxSide * 0.66), 0.72],
  ] as const) {
    const blob = await resizePhoto(file, side, quality)
    const body = new FormData()
    body.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
    const res = await fetch('/api/upload', { method: 'POST', body })
    if (res.ok) return ((await res.json()) as { url: string }).url
    if (res.status !== 413) throw new Error(`upload ${res.status}`)
  }
  throw new Error('too-large')
}
