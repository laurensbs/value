import { Bone, BoneCard, LoadingPage } from '@/components/Loading'

/** A dog's page: the portrait, the name, the story and the walk card. */
export default function Loading() {
  return (
    <LoadingPage narrow>
      <Bone w="6rem" />
      <Bone h="16rem" className="block" />
      <div className="stack-s">
        <Bone w="45%" h="2.4rem" />
        <Bone w="70%" />
      </div>
      <BoneCard lines={3} />
      <BoneCard lines={2} h="9rem" />
    </LoadingPage>
  )
}
