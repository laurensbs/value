import { getTranslations } from 'next-intl/server'
import { COUNTRY_INFO, type Country } from '@/lib/countries'

/**
 * The suicide prevention line(s) of a country, as tap-to-call links ("113 Zelfmoordpreventie
 * (0800-0113)" in the Netherlands). Always next to a text about how people feel (113 guidelines).
 */
export async function SuicideLines({ country }: { country: Country }) {
  const t = await getTranslations('impact.page')
  const lines = COUNTRY_INFO[country].helpLines.filter((l) => l.key === 'suicide')
  if (!lines.length) return null
  return (
    <p>
      {t('suicideLines')}{' '}
      {lines.map((l, i) => (
        <span key={l.id}>
          {i > 0 ? ' · ' : null}
          {l.phone ? (
            <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="im-help-line">
              {t('helpLine', { name: l.name, phone: l.phone })}
            </a>
          ) : (
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="im-help-line">
              {l.name}
            </a>
          )}
        </span>
      ))}
    </p>
  )
}
