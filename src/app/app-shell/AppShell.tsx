import { useEffect, useState, type SyntheticEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { downloadsEnabled } from '@/features/config/AppConfigProvider'
import { InstallBanners } from '@/features/install-banner/InstallBanners'
import { Icon, type IconName } from '@/components/ui/Icon'

interface Tab {
  to: string
  label: string
  icon: IconName
}

const TABS: Tab[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/series', label: 'Series', icon: 'live_tv' },
  // Hidden until the downloads feature ships (feature flag).
  ...(downloadsEnabled
    ? [{ to: '/downloads', label: 'Downloads', icon: 'download' } satisfies Tab]
    : []),
  { to: '/genres', label: 'Genres', icon: 'category' },
  { to: '/search', label: 'Search', icon: 'search' },
]

/* The desktop header carries a search field, so its link row drops Search. */
const DESKTOP_TABS = TABS.filter((tab) => tab.to !== '/search')

const HEADER_HEIGHT_PX = 72

function tabClass(isActive: boolean): string {
  // BottomNavBar.kt: each tab is a 56dp capsule that widens 48 -> 124dp when
  // selected, fills AccentBlue, and only then reveals its label.
  return [
    'flex h-[56px] items-center justify-center overflow-hidden rounded-[28px] transition-all duration-300 ease-out',
    isActive
      ? 'w-[124px] bg-accent text-white'
      : 'w-[48px] bg-transparent text-text-subtle',
  ].join(' ')
}

export function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Transparent only while the header sits over the Home hero; every other
  // screen (and Home once scrolled) needs the solid surface to stay legible.
  const isTransparent = pathname === '/' && !scrolled

  function submitSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    void navigate(trimmed === '' ? '/search' : `/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <InstallBanners />

      {/* Desktop: fixed top header. Transparent over the Home hero, solid on
          scroll; below 1024px it does not exist and the bottom pill dock
          takes over. Fixed (not sticky) so it can overlay the hero — see
          AGENTS.md for the top-padding contract this creates. */}
      <header
        className={`fixed inset-x-0 top-0 z-40 hidden transition-colors duration-300 lg:block ${
          isTransparent
            ? 'bg-transparent'
            : 'border-b border-border bg-bg/85 backdrop-blur-md'
        }`}
        style={{ height: HEADER_HEIGHT_PX }}
      >
        <div className="page-container flex h-full items-center gap-5 px-4 lg:px-8">
          <img
            src="/brand_wordmark_desktop.png"
            alt="Olsson Streams"
            className="h-7 w-auto shrink-0"
          />

          <nav aria-label="Primary" className="flex shrink-0 items-center gap-1">
            {DESKTOP_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-muted hover:bg-surface hover:text-text',
                  ].join(' ')
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <form
            onSubmit={submitSearch}
            role="search"
            className="ml-auto flex h-10 w-[300px] shrink-0 items-center gap-2 rounded-full border border-border bg-surface/80 px-4 transition-colors focus-within:border-accent/60"
          >
            <Icon name="search" className="shrink-0 text-[17px] text-text-subtle" />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search movies, genres, VJs"
              placeholder="Search movies, genres, VJs..."
              autoComplete="off"
              className="w-full min-w-0 bg-transparent text-[13px] text-text outline-none placeholder:text-text-subtle"
            />
          </form>

          <button
            type="button"
            aria-label="Profile"
            onClick={() => void navigate('/profile')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/80 text-text-muted transition-colors hover:border-accent/50 hover:text-text"
          >
            <Icon name="person" className="text-[20px]" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-[calc(78px+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile: floating pill dock (Box padding 6/16 + the 56dp row = 78px) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pt-1.5 pb-[calc(16px+env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="flex items-center gap-0.5 rounded-[36px] border border-border/50 bg-surface/92 px-1.5 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) => tabClass(isActive)}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={tab.icon}
                    className={`text-[24px] transition-transform duration-300 ease-out ${isActive ? 'scale-110' : ''}`}
                  />
                  <span
                    className={`whitespace-nowrap text-[12px] font-bold tracking-[0.3px] text-white transition-all duration-300 ease-out ${
                      isActive
                        ? 'ml-2 max-w-[72px] opacity-100'
                        : 'ml-0 max-w-0 opacity-0'
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
