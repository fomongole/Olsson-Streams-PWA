import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppConfigProvider } from '@/features/config/AppConfigProvider'
import { ConnectingGate } from '@/features/connection/ConnectingGate'
import { DeviceCheckRunner } from '@/features/auth/DeviceCheckRunner'
import { SplashGate } from '@/features/splash/SplashGate'
import { BootGate, useBootReady } from '@/features/capabilities/presentation-hooks'
import { ToastHost } from '@/components/ui/ToastHost'
import { QuickSheetHost } from '@/features/details/QuickSheetHost'
import { AppRouter } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

function BootAwareShell() {
  const ready = useBootReady()
  return (
    <>
      {/* Overlays the gate on cold launch; unmounts itself after the fade. */}
      <SplashGate bootReady={ready} />
      <ConnectingGate pending={!ready}>
        <AppRouter />
      </ConnectingGate>
    </>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider>
        <DeviceCheckRunner />
        <BootGate>
          <BootAwareShell />
        </BootGate>
        {/* Outlives route changes so a success toast survives the flip from
            the access screen into the shell. */}
        <ToastHost />
        {/* Held outside the router: Android's quick sheet lives in the
            ViewModel graph, not on a screen, so navigation doesn't close it. */}
        <QuickSheetHost />
      </AppConfigProvider>
    </QueryClientProvider>
  )
}
