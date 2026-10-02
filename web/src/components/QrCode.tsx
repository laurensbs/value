import { qrPath } from '@/lib/qr'

/** A scannable QR code (inline SVG, black on white with the quiet zone QR readers need). */
export function QrCode({ value, label, size = 180 }: { value: string; label: string; size?: number }) {
  const { size: n, d } = qrPath(value)
  return (
    <svg className="qr" viewBox={`-4 -4 ${n + 8} ${n + 8}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect x={-4} y={-4} width={n + 8} height={n + 8} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  )
}
