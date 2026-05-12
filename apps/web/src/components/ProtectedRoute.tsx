import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('fm_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
