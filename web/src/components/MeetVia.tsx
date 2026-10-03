import { useTranslations } from 'next-intl'
import { isMeetVia, type MeetVia } from '@/lib/rules'
import { Icon, type IconName } from './Icon'

/** One icon per way of meeting, the same as in the iPhone app (figure.walk, house, phone, video). */
export const MEET_VIA_ICONS: Record<MeetVia, IconName> = { walk: 'paw', home: 'home', phone: 'phone', video: 'video' }

/** How a first meeting happens, as a small label with its icon: "Eerst bellen". */
export function MeetViaLabel({ via }: { via: string }) {
  const t = useTranslations('meet.via')
  const known = isMeetVia(via) ? via : 'walk'
  return (
    <span className={`pill meet-via ${known}`}>
      <Icon name={MEET_VIA_ICONS[known]} size={14} /> {t(known)}
    </span>
  )
}
