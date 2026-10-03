import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DogPortrait } from '@/components/DogPortrait'
import { Icon } from '@/components/Icon'
import { myDogs } from '@/server/queries'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('myDogs')
  return { title: t('title') }
}

export default async function MyDogsPage() {
  const viewer = await requireOnboarded('/my-dogs')
  const dogs = await myDogs(viewer)
  const t = await getTranslations()

  return (
    <div className="stack-l">
      <header className="spread">
        <h1>{t('myDogs.title')}</h1>
        <Link href="/my-dogs/new" className="button primary">
          <Icon name="plus" size={18} /> {t('myDogs.add')}
        </Link>
      </header>
      {dogs.length === 0 ? (
        <div className="empty card flat stack">
          <p>{t('myDogs.empty')}</p>
          <div className="row">
            <Link href="/my-dogs/new" className="button primary small">
              {t('myDogs.add')}
            </Link>
            <Link href="/profile#invite" className="button secondary small">
              {t('dogs.inviteOwner')}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="dog-grid">
          {dogs.map((dog) => (
            <li key={dog.id}>
              <Link href={`/dogs/${dog.id}`} className="dog-card">
                <DogPortrait dog={dog} decorative />
                <div className="dog-card-body">
                  <span className="dog-name">{dog.name}</span>
                  <span className="meta">
                    <span>{dog.breed}</span>
                    <span>{dog.city}</span>
                  </span>
                  <span>
                    <span className={`pill ${dog.status === 'active' ? 'green' : 'warn'}`}>{t(`myDogs.status.${dog.status}`)}</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="card flat stack-s">
        <h2>{t('myDogs.tipsTitle')}</h2>
        <ul className="ticks">
          <li>{t('myDogs.tip1')}</li>
          <li>{t('myDogs.tip2')}</li>
          <li>{t('myDogs.tip3')}</li>
        </ul>
      </section>
    </div>
  )
}
