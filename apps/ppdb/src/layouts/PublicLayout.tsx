import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'

export default function PublicLayout() {
  const { pathname } = useLocation()

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans antialiased text-foreground">
      <PublicNavbar />
      <main className="flex-1 w-full overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
