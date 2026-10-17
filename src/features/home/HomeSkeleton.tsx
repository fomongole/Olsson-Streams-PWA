/** Shimmer stand-ins for the Home shelves, mirroring HomeScreenSkeleton.kt. */

export function HomeSkeleton() {
  return (
    <div className="bg-bg">
      <HeroSkeleton />
      <div className="h-[14px]" />
      <div className="mx-[16px] h-[48px] rounded-[12px] shimmer" />
      <div className="h-[20px]" />
      {[0, 1, 2, 3].map((row) => (
        <ShelfSkeleton key={row} />
      ))}
    </div>
  )
}

/**
 * One shelf placeholder. Also rendered in-content while the section list is
 * still filling in, which Android does with `items(5) { ShimmerCategorySection() }`.
 */
export function ShelfSkeleton() {
  return (
    <div className="w-full pb-[16px]">
      <div className="mx-[16px] my-[8px] h-[16px] w-[140px] rounded-[8px] shimmer" />
      <div className="no-scrollbar flex gap-[12px] overflow-x-auto px-[16px]">
        {[0, 1, 2].map((card) => (
          <ShimmerMovieCard key={card} />
        ))}
      </div>
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="relative h-[430px] w-full shimmer lg:h-[70vh] lg:max-h-[700px] lg:min-h-[520px]">
      <div className="page-container absolute inset-x-0 bottom-[16px] px-[16px] lg:px-8">
        <div className="h-[22px] w-[240px] rounded-[8px] bg-bg/40" />
        <div className="mt-[10px] h-[16px] w-[150px] rounded-[8px] bg-bg/40" />
        <div className="mt-[18px] flex gap-[10px]">
          <div className="h-[42px] w-[120px] rounded-[12px] bg-bg/40" />
          <div className="h-[42px] w-[110px] rounded-[12px] bg-bg/40" />
        </div>
      </div>
    </div>
  )
}

function ShimmerMovieCard() {
  return (
    <div className="w-[130px] shrink-0">
      <div className="h-[190px] w-[130px] rounded-[12px] shimmer" />
      <div className="mt-[8px] h-[12px] w-full rounded-[6px] shimmer" />
      <div className="mt-[4px] h-[10px] w-[60%] rounded-[6px] shimmer" />
    </div>
  )
}
