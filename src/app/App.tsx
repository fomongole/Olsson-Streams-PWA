import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppConfigProvider } from '@/features/config/AppConfigProvider'
import { ConnectingGate } from '@/features/connection/ConnectingGate'
import { DeviceCheckRunner } from '@/features/auth/DeviceCheckRunner'
import { BootGate, useBootReady } from '@/features/capabilities/presentation-hooks'
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
    <ConnectingGate pending={!ready}>
      <AppRouter />
    </ConnectingGate>
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
      </AppConfigProvider>
    </QueryClientProvider>
  )
}
