export type EarStyle = 'pointy' | 'floppy' | 'fold' | 'bat'
export type HeadShape = 'round' | 'wide' | 'narrow'

export interface DogLook {
  fur: string
  ears: string
  muzzle: string
  earStyle: EarStyle
  head?: HeadShape
  /** White stripe from muzzle to forehead (collies, beagles, staffies). */
  blaze?: string
  /** Patch around one eye. */
  patch?: string
  /** Tan dots above the eyes (black-and-tan breeds). */
  brows?: string
  tongue?: boolean
  collar: string
}

/**
 * How the dog looks right now, the same as the iPhone app's DogMood (ios/Rondje/UI/DogFace.swift).
 * Only the eyes, brows and mouth change; the dog stays itself. For now just the three the
 * Hondenschool's body-language lesson needs; without a mood the face is as it always was.
 */
export type DogMood = 'neutral' | 'happy' | 'sleepy' | 'uneasy'

interface Props {
  look: DogLook
  size?: number
  title?: string
  mood?: DogMood
}

const INK = '#1d2421'
const TAG = '#e9c46a'
const INNER_EAR = '#e9b3a6'

/** True for coats so dark that ink lines (closed eyes, worried brows) would vanish into them. */
function isDark(css: string): boolean {
  const v = /^#[0-9a-f]{6}$/i.test(css) ? parseInt(css.slice(1), 16) : NaN
  if (Number.isNaN(v)) return false
  return 0.299 * ((v >> 16) & 0xff) + 0.587 * ((v >> 8) & 0xff) + 0.114 * (v & 0xff) < 80
}

const HEADS: Record<HeadShape, { rx: number; ry: number; cy: number; muzzle: [number, number, number] }> = {
  round: { rx: 34, ry: 32, cy: 62, muzzle: [76, 18, 14] },
  wide: { rx: 38, ry: 30, cy: 63, muzzle: [77, 20, 13] },
  narrow: { rx: 28, ry: 34, cy: 61, muzzle: [80, 14, 14] },
}

/** Flat front-facing dog portrait, drawn from a handful of traits. */
export function DogFace({ look, size = 96, title, mood = 'neutral' }: Props) {
  const { fur, ears, muzzle, earStyle, blaze, patch, brows, collar } = look
  // Happy dogs show their tongue; the quieter moods never do.
  const tongue = mood === 'happy' ? true : mood === 'neutral' ? look.tongue : false
  const line = isDark(fur) ? '#c9beb8' : INK
  const { rx, ry, cy, muzzle: [mcy, mrx, mry] } = HEADS[look.head ?? 'round']
  const left = 60 - rx
  const right = 60 + rx
  const top = cy - ry
  const eyeDx = Math.round(rx * 0.38)
  const eyeY = cy - 5
  const noseY = mcy - 6
  const collarY = cy + ry - 5

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className="dog-face"
    >
      {earStyle === 'pointy' && (
        <g fill={ears} stroke={ears} strokeWidth="6" strokeLinejoin="round">
          <polygon points={`${left + 1},${top + 22} ${left - 1},${top - 13} ${left + 24},${top + 6}`} />
          <polygon points={`${right - 1},${top + 22} ${right + 1},${top - 13} ${right - 24},${top + 6}`} />
        </g>
      )}
      {earStyle === 'bat' && (
        <g>
          <ellipse cx={left + 7} cy={top + 2} rx="13" ry="19" transform={`rotate(-24 ${left + 7} ${top + 2})`} fill={ears} />
          <ellipse cx={right - 7} cy={top + 2} rx="13" ry="19" transform={`rotate(24 ${right - 7} ${top + 2})`} fill={ears} />
          <ellipse cx={left + 8} cy={top + 3} rx="6.5" ry="12" transform={`rotate(-24 ${left + 8} ${top + 3})`} fill={INNER_EAR} />
          <ellipse cx={right - 8} cy={top + 3} rx="6.5" ry="12" transform={`rotate(24 ${right - 8} ${top + 3})`} fill={INNER_EAR} />
        </g>
      )}

      <ellipse cx="60" cy={cy} rx={rx} ry={ry} fill={fur} />

      {blaze && (
        <path
          d={`M${60 - 6} ${mcy - 8} C ${60 - 5} ${cy - 6}, ${60 - 2} ${top + 10}, 60 ${top + 3} C ${60 + 2} ${top + 10}, ${60 + 5} ${cy - 6}, ${60 + 6} ${mcy - 8} Z`}
          fill={blaze}
        />
      )}

      {earStyle === 'floppy' && (
        <g fill={ears}>
          <ellipse cx={left + 5} cy={cy} rx="11" ry="24" transform={`rotate(14 ${left + 5} ${cy})`} />
          <ellipse cx={right - 5} cy={cy} rx="11" ry="24" transform={`rotate(-14 ${right - 5} ${cy})`} />
        </g>
      )}
      {earStyle === 'fold' && (
        <g fill={ears}>
          <ellipse cx={left + 11} cy={top + 7} rx="13" ry="9" transform={`rotate(-32 ${left + 11} ${top + 7})`} />
          <ellipse cx={right - 11} cy={top + 7} rx="13" ry="9" transform={`rotate(32 ${right - 11} ${top + 7})`} />
        </g>
      )}

      {patch && <ellipse cx={60 + eyeDx + 1} cy={eyeY - 1} rx="10" ry="9.5" fill={patch} />}
      {brows && (
        <g fill={brows}>
          <ellipse cx={60 - eyeDx} cy={eyeY - 8} rx="3.4" ry="2.3" />
          <ellipse cx={60 + eyeDx} cy={eyeY - 8} rx="3.4" ry="2.3" />
        </g>
      )}
      {mood === 'happy' ? (
        // Smiling eyes: two upward arcs.
        <path
          d={[60 - eyeDx, 60 + eyeDx].map((x) => `M${x - 4.5} ${eyeY + 2} Q${x} ${eyeY - 6} ${x + 4.5} ${eyeY + 2}`).join(' ')}
          fill="none"
          stroke={line}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : mood === 'sleepy' ? (
        // Closed eyes: two soft lids.
        <path
          d={[60 - eyeDx, 60 + eyeDx].map((x) => `M${x - 4} ${eyeY + 1} Q${x} ${eyeY + 3} ${x + 4} ${eyeY + 1}`).join(' ')}
          fill="none"
          stroke={line}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ) : (
        // A <g>, not a fragment: the share images (satori) only take real SVG elements inside <svg>.
        <g>
          {/* Uneasy: the white of the eye shows while the pupils look aside, under worried brows. */}
          {mood === 'uneasy' ? (
            <g fill="#fff">
              <circle cx={60 - eyeDx} cy={eyeY} r="5.2" />
              <circle cx={60 + eyeDx} cy={eyeY} r="5.2" />
            </g>
          ) : null}
          <g fill={INK}>
            <circle cx={60 - eyeDx - (mood === 'uneasy' ? 1.8 : 0)} cy={eyeY} r="4.3" />
            <circle cx={60 + eyeDx - (mood === 'uneasy' ? 1.8 : 0)} cy={eyeY} r="4.3" />
          </g>
          <g fill="#fff">
            <circle cx={60 - eyeDx + 1.5 - (mood === 'uneasy' ? 1.8 : 0)} cy={eyeY - 1.4} r="1.4" />
            <circle cx={60 + eyeDx + 1.5 - (mood === 'uneasy' ? 1.8 : 0)} cy={eyeY - 1.4} r="1.4" />
          </g>
          {mood === 'uneasy' ? (
            <path
              d={`M${60 - eyeDx - 5} ${eyeY - 8} L${60 - eyeDx + 3} ${eyeY - 11} M${60 + eyeDx + 5} ${eyeY - 8} L${60 + eyeDx - 3} ${eyeY - 11}`}
              fill="none"
              stroke={line}
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : null}
        </g>
      )}

      <ellipse cx="60" cy={mcy} rx={mrx} ry={mry} fill={muzzle} />
      {tongue && <path d={`M55.5 ${mcy + 4.5} q4.5 11 9 0 z`} fill="#e8798a" />}
      <ellipse cx="60" cy={noseY} rx="7" ry="5" fill={INK} />
      <ellipse cx="58" cy={noseY - 1.6} rx="2.2" ry="1.2" fill="#fff" opacity="0.35" />
      <path
        // Uneasy: a tight, flat mouth instead of the relaxed curves.
        d={mood === 'uneasy' ? `M60 ${noseY + 5} v5 M55 ${noseY + 10} h10` : `M60 ${noseY + 5} v4 M60 ${noseY + 9} q-5 4 -9 1 M60 ${noseY + 9} q5 4 9 1`}
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x={60 - rx * 0.68} y={collarY} width={rx * 1.36} height="7" rx="3.5" fill={collar} />
      <circle cx="60" cy={collarY + 12} r="5.5" fill={TAG} stroke={INK} strokeWidth="1.5" />
    </svg>
  )
}
