import { ShelfSkeleton } from '@/features/home/HomeSkeleton'
import { BACKDROP_HEIGHT } from './DetailsBackdrop'

/**
 * DetailsScreenSkeleton.kt.
 *
 * Android nests the poster row inside the fixed 280dp backdrop box, which
 * constrains it to the backdrop's remaining height. Here the header flows in
 * document order instead, so the placeholder matches the loaded layout it
 * stands in for. The right-hand pill placeholder is dropped along with the
 * pill itself (bookmark/cast are not wired yet).
 */
export function DetailsSkeleton() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className={`relative w-full ${BACKDROP_HEIGHT}`}>
        <div className="absolute inset-0 shimmer" />
        <div
          className="absolute left-4 z-10 h-[48px] w-[48px] rounded-full shimmer"
          style={{ top: 'max(8px, env(safe-area-inset-top))' }}
        />
      </div>

      <div className="page-container flex items-end gap-[14px] px-4 pt-[160px] lg:px-8 lg:pt-[240px]">
        <div className="h-[168px] w-[115px] shrink-0 rounded-[12px] shimmer lg:h-[360px] lg:w-[246px]" />
        <div className="min-w-0 flex-1 pb-[4px]">
          <div className="h-[22px] w-[90%] rounded-[8px] shimmer" />
          <div className="mt-[10px] h-[22px] w-[60%] rounded-[8px] shimmer" />
          <div className="mt-[14px] h-[16px] w-[120px] rounded-[8px] shimmer" />
          <div className="mt-[8px] h-[18px] w-[70px] rounded-[5px] shimmer" />
        </div>
      </div>

      <div className="body-fade page-container mt-[14px] px-4 pb-[24px] lg:px-8">
        <div className="flex flex-wrap gap-[8px]">
          {[62, 74, 56].map((width) => (
            <span
              key={width}
              className="h-[24px] rounded-[6px] shimmer"
              style={{ width: `${String(width)}px` }}
            />
          ))}
        </div>
        <div className="mt-[16px] h-[50px] rounded-[12px] shimmer" />
        <div className="mt-[10px] h-[50px] rounded-[12px] shimmer" />
        <div className="mt-[20px] h-[20px] w-[100px] rounded-[8px] shimmer" />
        <div className="mt-[8px] h-[14px] rounded-[6px] shimmer" />
        <div className="mt-[6px] h-[14px] w-[92%] rounded-[6px] shimmer" />
        <div className="mt-[6px] h-[14px] w-[70%] rounded-[6px] shimmer" />
      </div>

      <ShelfSkeleton />
    </div>
  )
}
