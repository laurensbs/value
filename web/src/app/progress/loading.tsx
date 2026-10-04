import { Bone, BoneCard, LoadingPage } from '@/components/Loading'

/** Progress: the level, the bar to the next one, the challenge and the badges. */
export default function Loading() {
  return (
    <LoadingPage narrow>
      <div className="row">
        <Bone w="88px" h="88px" round />
        <div className="stack-s grow">
          <Bone w="60%" h="1.8rem" />
          <Bone w="90%" h="10px" round />
        </div>
      </div>
      <BoneCard lines={2} />
      <div className="bone-grid small">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} h="6.5rem" className="block" />
        ))}
      </div>
    </LoadingPage>
  )
}
