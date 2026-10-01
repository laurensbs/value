import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  try {
    localStorage.clear()
  } catch {
    // storage can be unavailable; tests then run without it
  }
})
