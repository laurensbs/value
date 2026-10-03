import { NextResponse } from 'next/server'
import { canRequestMeeting, canRequestSolo } from '@/lib/rules'
import { apiViewer, dogLook, fail, json } from '@/server/api'
import { dogFacts, getDogDetail, myGroupSignups, relationFor, walkerFacts } from '@/server/queries'
import { dogShareFor } from '@/server/share'

/** One dog, with what the viewer may do next. Private details only after an accepted request. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const detail = await getDogDetail(id, viewer)
  if (!detail) return fail('dog-unavailable', 404)
  const d = detail.dog

  let canMeet: string | null = 'not-onboarded'
  let canSolo: string | null = 'not-onboarded'
  if (viewer.profile) {
    const facts = await walkerFacts(viewer)
    const relation = await relationFor(viewer, d)
    canMeet = canRequestMeeting(facts, dogFacts(d), relation)
    canSolo = canRequestSolo(facts, dogFacts(d), relation)
  }
  const booked = await myGroupSignups(viewer.userId)
  // The owner's own dog, online: the same ready message for the neighbours as on the website.
  const share = await dogShareFor(detail, viewer)

  return json({
    dog: {
      id: d.id,
      name: d.name,
      breed: d.breed,
      sex: d.sex,
      ageYears: d.ageYears,
      size: d.size,
      energy: d.energy,
      level: d.level,
      ppp: d.ppp,
      photos: d.photos,
      look: dogLook(d),
      story: d.story,
      needs: d.needs,
      traits: d.traits,
      treats: d.treats,
      treatsNote: d.treatsNote,
      provides: d.provides,
      offLeash: d.offLeash,
      walkMinutes: d.walkMinutes,
      city: d.city,
      country: d.country,
      lat: d.lat,
      lng: d.lng,
      biteHistory: d.biteHistory,
      biteNote: d.biteNote,
      isDemo: d.isDemo,
      // Empty unless the viewer may see them (see getDogDetail).
      meetingInfo: d.meetingInfo,
      vetInfo: d.vetInfo,
    },
    host: detail.host,
    slots: detail.slots,
    groupWalks: detail.groupWalks.map((g) => ({ ...g, booked: g.booked, mine: booked.has(g.id) })),
    canSeePrivate: detail.canSeePrivate,
    isMine: detail.isMine,
    canRequest: { meet: canMeet, solo: canSolo },
    share,
  })
}
