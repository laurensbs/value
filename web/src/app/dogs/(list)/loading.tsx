import { Bone, LoadingPage } from '@/components/Loading'

/** Find a dog: the search bar, Lijst | Kaart, the filter chips and a grid of dog cards. */
export default function Loading() {
  return (
    <LoadingPage>
      <Bone h="52px" round />
      <Bone h="52px" round />
      <div className="row">
        <Bone w="4.5rem" h="44px" round />
        <Bone w="4.5rem" h="44px" round />
        <Bone w="4.5rem" h="44px" round />
      </div>
      <div className="bone-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bone-card stack-s">
            <Bone h="9rem" className="block" />
            <Bone w="50%" h="1.2rem" />
            <Bone w="75%" />
          </div>
        ))}
      </div>
    </LoadingPage>
  )
}
