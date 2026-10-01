import { useEffect, useState } from 'react'
import { load, save } from './storage'

/** useState that mirrors its value to localStorage when it is available. */
export function usePersistent<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() =>
    load<T>(key, typeof initial === 'function' ? (initial as () => T)() : initial),
  )
  useEffect(() => {
    save(key, value)
  }, [key, value])
  return [value, setValue] as const
}
