import { getTranslations } from 'next-intl/server'
import type { CSSProperties, ReactNode } from 'react'
import { LoadingRetry } from './LoadingRetry'

/**
 * Grey shapes where the page will be, instead of a spinner (onderzoek §3.8): nothing for the first
 * 400 ms, so fast pages don't flash; then the shapes breathe softly (opacity only); after 10 seconds
 * a plain line with "Probeer opnieuw". All timing is CSS (.loading-page in globals.css).
 */
export async function LoadingPage({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  const t = await getTranslations()
  return (
    <div className={`loading-page stack-l${narrow ? ' narrow-page' : ''}`} role="status" aria-live="polite">
      <span className="visually-hidden">{t('loading.label')}</span>
      <div className="stack-l" aria-hidden="true">
        {children}
      </div>
      <div className="loading-slow">
        <p className="muted">{t('loading.slow')}</p>
        <LoadingRetry label={t('errors.retry')} />
      </div>
    </div>
  )
}

/** One grey shape. Sizes are in CSS units: `w` and `h` default to a full-width line of text. */
export function Bone({ w = '100%', h = '1em', round = false, className }: { w?: string; h?: string; round?: boolean; className?: string }) {
  return <span className={`bone${round ? ' round' : ''}${className ? ` ${className}` : ''}`} style={{ '--w': w, '--h': h } as CSSProperties} />
}

/** A title with a short line under it, like most page heads. */
export function BoneHead() {
  return (
    <div className="stack-s">
      <Bone w="55%" h="2.2rem" />
      <Bone w="80%" />
    </div>
  )
}

/** A card-shaped block with a few lines inside. */
export function BoneCard({ lines = 2, h }: { lines?: number; h?: string }) {
  return (
    <div className="bone-card stack-s" style={h ? ({ minHeight: h } as CSSProperties) : undefined}>
      <Bone w="40%" h="1.2rem" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} w={i === lines - 1 ? '65%' : '100%'} />
      ))}
    </div>
  )
}
