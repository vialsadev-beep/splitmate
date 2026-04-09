import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { PageLoader } from '@/shared/components/LoadingSpinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (isAuthenticated === undefined) return <PageLoader />
  if (!isAuthenticated) {
    // Guardar en sessionStorage para que el callback de Google también pueda usarlo
    sessionStorage.setItem('authRedirect', location.pathname + location.search)
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) return <Navigate to="/groups" replace />

  return <>{children}</>
}
