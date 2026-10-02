import { describe, expect, it } from 'vitest'
import { qrPath } from './qr'

describe('qrPath', () => {
  it('draws a QR code for a link', () => {
    const { size, d } = qrPath('https://rondje-five.vercel.app/r/ABC234?intent=owner')
    expect(size).toBeGreaterThanOrEqual(21)
    expect(size % 4).toBe(1) // QR sizes are 21, 25, 29, …
    expect(d.startsWith('M0 0h1v1h-1z')).toBe(true) // the top-left finder pattern is dark
  })

  it('is stable for the same input', () => {
    expect(qrPath('https://example.org').d).toBe(qrPath('https://example.org').d)
  })
})
