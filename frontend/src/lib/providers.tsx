'use client'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Always log API errors to the browser console so they're visible
            console.error(
              `[API Error] queryKey=${JSON.stringify(query.queryKey)}`,
              error
            )
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            retryDelay: 1_000,
            refetchOnWindowFocus: false,
            // Never stay in loading state indefinitely:
            // after retry exhaustion, isLoading becomes false
          },
        },
      })
  )

  useEffect(() => {
    const saved = localStorage.getItem('dashboardTheme') || 'dark'
    document.documentElement.classList.toggle('light', saved === 'light')
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors dir="rtl" />
    </QueryClientProvider>
  )
}
