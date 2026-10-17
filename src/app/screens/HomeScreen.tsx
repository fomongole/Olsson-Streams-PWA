import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/ui/ErrorState'
import { Icon } from '@/components/ui/Icon'
import { sectionCategoryPath } from '@/app/routes'
import { useOnlineStatus } from '@/features/connection/useOnlineStatus'
import { CategorySection } from '@/features/home/CategorySection'
import { HeroBanner } from '@/features/home/HeroBanner'
import { HomeSkeleton, ShelfSkeleton } from '@/features/home/HomeSkeleton'
import { HomeTopFloatingBar } from '@/features/home/HomeTopFloatingBar'
import { useHomeFeed } from '@/features/home/useHomeFeed'
import { useOpenMovie } from '@/features/details/useOpenMovie'
import { ApiError } from '@/shared/api/errors'
import type { HomeSection } from '@/shared/api/endpoints'
import { showToast } from '@/shared/ui/toast'

const OFFLINE_TOAST = "It looks like you're offline 👀."

function homeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.hasServerMessage && error.message) return error.message
    if (error.isNetworkError) {
      return 'Unable to reach the server. Check your connection and try again.'
    }
  }
  return 'Failed to load home feed. Please try again later.'
}

export function HomeScreen() {
  const navigate = useNavigate()
  const openMovie = useOpenMovie()
  const { data, error, isLoading, refetch } = useHomeFeed()
  const isOnline = useOnlineStatus()

  const hero = data?.hero ?? []
  const latest = data?.latest ?? []
  const sections = data?.sections ?? []
  const hasContent =
    hero.length > 0 ||
    latest.length > 0 ||
    sections.some((section) => section.items.length > 0)

  const hasShownOfflineToast = useRef(false)
  useEffect(() => {
    // Android toasts once when the connection drops over already-loaded
    // content, and rearms the flag as soon as it comes back.
    if (!isOnline && hasContent) {
      if (!hasShownOfflineToast.current) {
        hasShownOfflineToast.current = true
        showToast(OFFLINE_TOAST)
      }
    } else if (isOnline) {
      hasShownOfflineToast.current = false
    }
  }, [isOnline, hasContent])

  function openCategory(section: HomeSection) {
    void navigate(sectionCategoryPath(section))
  }

  return (
    <div className="relative min-h-full bg-bg">
      {error != null && !hasContent ? (
        <ErrorState
          title={isOnline ? 'Something went wrong' : "You're offline"}
          icon={isOnline ? 'error' : 'wifi_off'}
          message={homeErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : isLoading && !hasContent ? (
        <HomeSkeleton />
      ) : (
        <div className="pb-[8px]">
          {/* Occupies the hero slot until hero data arrives so the shelves
              below cannot jump to the top and look already scrolled. */}
          {hero.length > 0 ? (
            <HeroBanner items={hero} onMovieClick={openMovie} onWatchNow={openMovie} />
          ) : (
            <div className="h-[430px] w-full shimmer" />
          )}

          <div className="px-[16px] pt-[14px]">
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="flex w-full items-center rounded-[12px] border-[0.8px] border-border bg-surface-variant px-[16px] py-[13px] text-left"
            >
              <Icon name="search" className="text-[20px] text-text-subtle" />
              <span className="t-body-md ml-[12px] text-text-subtle">
                Search movies, genres, VJs...
              </span>
            </button>
          </div>
          <div className="h-[12px]" />

          {isLoading && latest.length === 0 ? (
            [0, 1, 2, 3, 4].map((row) => <ShelfSkeleton key={row} />)
          ) : (
            <>
              {sections.map((section) => (
                <div key={section.id}>
                  <CategorySection
                    section={section}
                    onMovieClick={openMovie}
                    onViewAllClick={openCategory}
                  />
                  <div className="h-[16px]" />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <HomeTopFloatingBar onNavigateToProfile={() => navigate('/profile')} />
    </div>
  )
}
