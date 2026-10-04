import { Bone, BoneHead, LoadingPage } from '@/components/Loading'

/** Home (Today for members): a greeting, the one big card with its button, then the dogs. */
export default function Loading() {
  return (
    <LoadingPage narrow>
      <BoneHead />
      <div className="bone-card stack">
        <Bone w="40%" h="1.2rem" />
        <Bone h="1.6rem" />
        <Bone w="70%" h="1.6rem" />
        <Bone h="56px" round />
      </div>
      <div className="row">
        <Bone w="132px" h="132px" />
        <Bone w="132px" h="132px" />
      </div>
    </LoadingPage>
  )
}
