import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DogFace } from '@/components/DogFace'
import { lookFor } from '@/lib/avatar'

export default async function NotFound() {
  const t = await getTranslations('errors')
  return (
    <div className="narrow-page stack error-page">
      <DogFace look={lookFor({ id: 'lost-dog' })} size={140} />
      <h1>{t('notFound')}</h1>
      <div>
        <Link href="/" className="button primary">
          {t('home')}
        </Link>
      </div>
    </div>
  )
}
