'use client'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: any, query) => {
            // Do not log expected 403/404 errors for roles to console to keep it clean
            const isExpectedRolesError =
              query.queryKey[0] === 'roles' &&
              [403, 404].includes(error?.response?.status ?? error?.status)

            if (isExpectedRolesError) return

            // Always log API errors to the browser console so they're visible
            console.error(
              `[API Error] queryKey=${JSON.stringify(query.queryKey)}`,
              error
            )
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,      // 5min — don't refetch if fresh
            gcTime: 10 * 60 * 1000,         // 10min — keep in cache
            refetchOnWindowFocus: false,     // never — user controls refresh
            refetchOnMount: false,           // use cache first
            retry: (count, err: any) => {
              const status = err?.response?.status || err?.status
              if (status && status >= 400 && status < 500) return false
              return count < 2
            },
            retryDelay: 1_000,
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
