import { NavLink, Outlet } from 'react-router-dom'
import { downloadsEnabled } from '@/features/config/AppConfigProvider'
import { InstallBanners } from '@/features/install-banner/InstallBanners'

interface Tab {
  to: string
  label: string
  icon: string
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
  return [
    'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 pt-1 transition-colors',
    isActive ? 'text-accent' : 'text-text-muted',
  ].join(' ')
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <InstallBanners />
      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* Mobile: bottom navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => tabClass(isActive)}
          >
            <span className="msym text-[22px]" aria-hidden>
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
          </NavLink>
        ))}
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
        </div>
      </header>
    </div>
  )
}
