const LEVEL: Record<string, number> = { calm: 1, medium: 2, high: 3 }

export function EnergyDots({ energy, label }: { energy: string; label: string }) {
  const level = LEVEL[energy] ?? 2
  return (
    <span className="energy" aria-label={label}>
      <span className="energy-dots" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= level ? 'on' : undefined} />
        ))}
      </span>
      {label}
    </span>
  )
}
