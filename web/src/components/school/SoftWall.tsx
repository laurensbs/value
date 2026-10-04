import Link from 'next/link'
import { useTranslations } from 'next-intl'

/**
 * After lesson 1 without an account: what an account adds, in one sentence, and two ways on. Never
 * about saving or losing anything (onderzoek §4: no "Bewaar je voortgang"). `next` is where someone
 * lands once the account is there.
 */
export function SoftWall({ next }: { next: string }) {
  const t = useTranslations('school')
  const to = encodeURIComponent(next)
  return (
    <section className="school-wall card stack" aria-labelledby="school-wall-title">
      <h2 id="school-wall-title">{t('wallTitle')}</h2>
      <p>{t('wallText')}</p>
      <div className="stack-s">
        <Link href={`/signup?intent=walker&next=${to}`} className="button primary big wide lesson-button">
          {t('wallSignup')}
        </Link>
        <Link href={`/login?next=${to}`} className="button ghost wide lesson-button">
          {t('wallLogin')}
        </Link>
      </div>
    </section>
  )
}
