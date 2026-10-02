import { useTranslations } from 'next-intl'
import { Icon } from './Icon'

/** The three taps that put Rondje on the home screen of an iPhone or iPad, with the icons to look for. */
export function InstallSteps() {
  const t = useTranslations('installAsk.steps')
  return (
    <ol className="install-steps">
      <li>
        <span className="install-step-icon" aria-hidden="true">
          <Icon name="share" size={18} />
        </span>
        <span>
          {t('share')} <span className="muted small">{t('shareMore')}</span>
        </span>
      </li>
      <li>
        <span className="install-step-icon" aria-hidden="true">
          <Icon name="plus" size={18} />
        </span>
        <span>{t('add')}</span>
      </li>
      <li>
        <span className="install-step-icon" aria-hidden="true">
          <Icon name="check" size={18} />
        </span>
        <span>{t('confirm')}</span>
      </li>
    </ol>
  )
}
