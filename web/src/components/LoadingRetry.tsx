'use client'

/** "Probeer opnieuw" under a page that keeps loading: a fresh load of the same address. */
export function LoadingRetry({ label }: { label: string }) {
  return (
    <button type="button" className="button primary big" onClick={() => window.location.reload()}>
      {label}
    </button>
  )
}
