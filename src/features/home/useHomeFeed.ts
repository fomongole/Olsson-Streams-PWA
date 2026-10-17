import { useQuery } from '@tanstack/react-query'
import { fetchHome } from '@/shared/api/endpoints'

/**
 * The Home feed. The server caches GET /home per provider for 15 minutes
 * (content.cache.ttl_home), so the client uses a matching staleTime: a shelf
 * refetches only once it is genuinely stale, and never blanks the screen to
 * do it.
 */
export function useHomeFeed() {
  return useQuery({
    queryKey: ['home'],
    queryFn: fetchHome,
    staleTime: 5 * 60_000,
  })
}
