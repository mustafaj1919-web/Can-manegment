'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { getCurrentUser } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'

const EXPANDED_W  = 240   // matches Sidebar animated width
const COLLAPSED_W =  56   // matches Sidebar collapsed width

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname            = usePathname()
  const router              = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore()
  const { setBranches, setActiveBranch }        = useBranchStore()

  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Verify Flask session on mount — skip on the login page itself
  useEffect(() => {
    if (pathname === '/login') return
    setLoading(true)
    getCurrentUser()
      .then(({ user, branches, active_branch }) => {
        setAuth(user)
        setBranches(branches)
        if (active_branch) setActiveBranch(active_branch)
      })
      .catch(() => {
        clearAuth()
        router.push('/login')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side redirect when not authenticated (useEffect = browser-only, no SSR issues)
  useEffect(() => {
    if (pathname !== '/login' && !isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1280) setCollapsed(true)
      else setCollapsed(false)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggle       = useCallback(() => setCollapsed((v) => !v), [])
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), [])
  const closeMobile  = useCallback(() => setMobileOpen(false), [])

  // Login page: render without the shell (no sidebar / topnav)
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Not authenticated: render nothing while useEffect handles the redirect
  if (isLoading || !isAuthenticated) {
    return null
  }

  return (
    <div className="app-shell-root relative min-h-screen bg-background">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="app-mobile-backdrop fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={toggle}
        onCloseMobile={closeMobile}
      />

      {/* Main */}
      <motion.div
        className="app-shell-main flex min-h-screen flex-col"
        animate={{ marginInlineStart: collapsed ? COLLAPSED_W : EXPANDED_W }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      >
        <TopNav
          collapsed={collapsed}
          onToggleSidebar={toggle}
          onToggleMobile={toggleMobile}
        />
        <main className="app-shell-content flex-1 overflow-auto">
          <div className="page-container" style={{ paddingTop: 16 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.22,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </motion.div>
    </div>
  )
}
