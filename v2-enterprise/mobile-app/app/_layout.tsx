import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { LoadingState } from '../src/components/ui/LoadingState'
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary'
import { AppLockGate } from '../src/components/security/AppLockGate'
import { configureNotificationHandling } from '../src/services/notificationService'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
})

function InitialLayout() {
  const { isHydrated, isAuthenticated, sessionType, capabilities, hydrate } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    configureNotificationHandling()
    hydrate()
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login')
      }
      return
    }

    // Authenticated user routing based on Capabilities
    if (sessionType === 'customer') {
      if (segments[0] !== '(customer)') {
        router.replace('/(customer)')
      }
      return
    }

    if (capabilities.canViewExecutiveDashboard) {
      if (segments[0] !== '(owner)') {
        router.replace('/(owner)')
      }
    } else if (capabilities.canManageSales) {
      if (segments[0] !== '(sales)') {
        router.replace('/(sales)')
      }
    } else if (capabilities.canCollectPayments) {
      if (segments[0] !== '(cashier)') {
        router.replace('/(cashier)')
      }
    } else {
      if (!inAuthGroup) {
        router.replace('/(auth)/login')
      }
    }
  }, [isHydrated, isAuthenticated, sessionType, capabilities, segments])

  if (!isHydrated) {
    return <LoadingState message="جاري التحقق من الجلسة..." />
  }

  return <Slot />
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppLockGate>
          <InitialLayout />
        </AppLockGate>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
