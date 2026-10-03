import { Bone, BoneCard, BoneHead, LoadingPage } from '@/components/Loading'

/** Home (Today for members): a greeting, the next walk, the week and a tip. */
export default function Loading() {
  return (
    <LoadingPage narrow>
      <BoneHead />
      <Bone h="7.5rem" className="block" />
      <BoneCard lines={2} />
      <BoneCard lines={3} />
    </LoadingPage>
  )
}
