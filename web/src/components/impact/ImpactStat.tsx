import { text, type Fact } from './facts'

/** One fact as a big number with a short label and a small, clickable source. */
export function ImpactStat({ fact, locale, sourceLabel }: { fact: Fact; locale: string; sourceLabel: string }) {
  return (
    <li className={`im-stat im-topic-${fact.topic}`}>
      <strong className="im-stat-value">{text(fact.value, locale)}</strong>
      <span className="im-stat-label">{text(fact.label, locale)}</span>
      <a className="im-stat-source" href={fact.source.url} target="_blank" rel="noopener noreferrer">
        {sourceLabel}
        <span aria-hidden="true"> ↗</span>
      </a>
    </li>
  )
}
