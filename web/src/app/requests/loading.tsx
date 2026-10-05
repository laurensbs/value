import { Bone, BoneCard, LoadingPage } from '@/components/Loading'

/** Walks and requests: the head, the two tabs and a few request cards. */
export default function Loading() {
  return (
    <LoadingPage narrow>
      <Bone w="45%" h="2.4rem" />
      <Bone w="85%" h="52px" round />
      <BoneCard lines={3} h="11rem" />
      <BoneCard lines={3} h="11rem" />
    </LoadingPage>
  )
}
