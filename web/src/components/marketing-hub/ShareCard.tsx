import { DogFace } from '@/components/DogFace'
import { LOOKS, TONES, type PostDef } from './posts'

export const CARD = { width: 1080, height: 1350 } as const

interface Props {
  post: PostDef
  app: string
  title: string
  sub: string
  free: string
  host: string
  /** The font family for the handwritten headline, or undefined to use the default font. */
  hand?: string
}

const DOG_SIZE = [0, 440, 330, 270, 206] as const

/**
 * A share image (1080 × 1350, the portrait size Instagram and TikTok show in full) for one post,
 * rendered by ImageResponse (Satori): flexbox only, inline styles, the drawn dogs as SVG and the
 * brand colours. No photos and no people, so nobody is ever in an image without consent.
 */
export function ShareCard({ post, app, title, sub, free, host, hand }: Props) {
  const tone = TONES[post.tone]
  const size = DOG_SIZE[Math.min(post.dogs.length, 4)]
  const steps = post.steps ? sub.split(' · ') : null
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px 64px',
        background: tone.bg,
        color: tone.ink,
        fontFamily: 'Geist',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontFamily: hand, fontSize: 76, lineHeight: 1, color: tone.ink }}>{app}</div>
        <div
          style={{
            display: 'flex',
            padding: '12px 26px',
            borderRadius: 999,
            background: tone.accent,
            color: tone.onAccent,
            fontSize: 30,
          }}
        >
          {free}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20 }}>
        {post.dogs.map((breed, i) => (
          <div
            key={`${breed}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: size,
              height: size,
              borderRadius: size,
              background: tone.tile,
              // A little up and down, as if they are walking along.
              marginBottom: post.dogs.length > 1 && i % 2 === 1 ? 36 : 0,
            }}
          >
            <DogFace look={LOOKS[breed]} size={Math.round(size * 0.86)} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', fontFamily: hand, fontSize: title.length > 34 ? 88 : 108, lineHeight: 1.02, letterSpacing: -1 }}>{title}</div>
        {steps ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 36 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 46,
                    height: 46,
                    borderRadius: 46,
                    background: tone.accent,
                    color: tone.onAccent,
                    fontSize: 26,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: 'flex' }}>{step}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 42, lineHeight: 1.3, color: tone.ink, opacity: 0.88 }}>{sub}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* The dashed walking route, the brand's motif. */}
        <svg width="920" height="24" viewBox="0 0 920 24">
          <path d="M4 16 C 200 0, 360 28, 520 12 S 820 4, 916 14" fill="none" stroke={tone.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray="2 18" />
        </svg>
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.8 }}>{host}</div>
      </div>
    </div>
  )
}
