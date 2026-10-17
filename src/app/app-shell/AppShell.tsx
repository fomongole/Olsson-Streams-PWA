import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <InstallBanners />
      <main className="flex-1 pb-[calc(78px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* Mobile: floating pill dock (Box padding 6/16 + the 56dp row = 78px) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pt-1.5 pb-[calc(16px+env(safe-area-inset-bottom))] md:hidden"
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

      {/* Desktop: cinematic top navigation */}
      <header className="sticky top-0 z-40 hidden border-b border-border bg-bg/90 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <img src="/brand_wordmark.png" alt="Olsson Streams" className="h-7 w-auto" />
          <nav aria-label="Primary" className="flex items-center gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-surface-variant text-accent'
                      : 'text-text-muted hover:bg-surface hover:text-text',
                  ].join(' ')
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile reaches Profile through the Home floating pill; the
              desktop header is the only place it exists here. */}
          <button
            type="button"
            aria-label="Profile"
            onClick={() => navigate('/profile')}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <Icon name="person" className="text-[24px]" />
          </button>
        </div>
      </header>
    </div>
  )
}
