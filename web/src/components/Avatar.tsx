/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */
export function Avatar({
  name,
  src,
  size = 'medium',
}: {
  name: string
  src?: string | null
  size?: 'small' | 'medium' | 'large'
}) {
  const px = size === 'small' ? 34 : size === 'large' ? 72 : 44
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return src ? (
    <img src={src} alt="" width={px} height={px} className="avatar" style={{ width: px, height: px }} />
  ) : (
    <span className="avatar" style={{ width: px, height: px, fontSize: px / 2.4 }} aria-hidden="true">
      {initial}
    </span>
  )
}
