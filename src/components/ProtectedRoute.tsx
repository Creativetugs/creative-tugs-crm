import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { loading, userId } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading Creative Tugs CRM…
      </div>
    )
  }

  if (!userId) return <Navigate to="/login" replace />
  return <Outlet />
}
