export type EarStyle = 'pointy' | 'floppy' | 'fold'

export interface DogLook {
  fur: string
  ears: string
  muzzle: string
  earStyle: EarStyle
  patch?: string
  tongue?: boolean
  collar: string
}

interface Props {
  look: DogLook
  size?: number
  title?: string
}

const INK = '#1d2421'
const TAG = '#e9c46a'

/** Flat front-facing dog portrait, drawn from a handful of traits. */
export function DogFace({ look, size = 96, title }: Props) {
  const { fur, ears, muzzle, earStyle, patch, tongue, collar } = look
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
          <polygon points="31,50 35,16 54,36" />
          <polygon points="89,50 85,16 66,36" />
        </g>
      )}
      <ellipse cx="60" cy="62" rx="34" ry="32" fill={fur} />
      {earStyle === 'floppy' && (
        <g fill={ears}>
          <ellipse cx="29" cy="62" rx="11" ry="24" transform="rotate(14 29 62)" />
          <ellipse cx="91" cy="62" rx="11" ry="24" transform="rotate(-14 91 62)" />
        </g>
      )}
      {earStyle === 'fold' && (
        <g fill={ears}>
          <ellipse cx="37" cy="37" rx="13" ry="9" transform="rotate(-32 37 37)" />
          <ellipse cx="83" cy="37" rx="13" ry="9" transform="rotate(32 83 37)" />
        </g>
      )}
      {patch && <ellipse cx="74" cy="56" rx="10" ry="9.5" fill={patch} />}
      <g fill={INK}>
        <circle cx="47" cy="57" r="4.3" />
        <circle cx="73" cy="57" r="4.3" />
      </g>
      <g fill="#fff">
        <circle cx="48.5" cy="55.6" r="1.4" />
        <circle cx="74.5" cy="55.6" r="1.4" />
      </g>
      <ellipse cx="60" cy="76" rx="18" ry="14" fill={muzzle} />
      {tongue && <path d="M55.5 80.5 q4.5 11 9 0 z" fill="#e8798a" />}
      <ellipse cx="60" cy="70" rx="7" ry="5" fill={INK} />
      <path
        d="M60 75 v4 M60 79 q-5 4 -9 1 M60 79 q5 4 9 1"
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="37" y="89" width="46" height="7" rx="3.5" fill={collar} />
      <circle cx="60" cy="101" r="5.5" fill={TAG} stroke={INK} strokeWidth="1.5" />
    </svg>
  )
}
