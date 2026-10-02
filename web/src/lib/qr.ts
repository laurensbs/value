import qrcode from 'qrcode-generator'

/** A QR code as one SVG path (one 1×1 square per dark module), so it prints sharply at any size. */
export function qrPath(text: string): { size: number; d: string } {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const size = qr.getModuleCount()
  let d = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`
  }
  return { size, d }
}
