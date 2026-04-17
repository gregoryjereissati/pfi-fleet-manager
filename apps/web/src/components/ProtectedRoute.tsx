import { useAuth0 } from '@auth0/auth0-react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, error } = useAuth0()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="text-gray-500 text-sm">Carregando...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-2 max-w-sm px-4">
          <p className="text-red-600 font-medium">Erro de autenticação</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
          <button
            onClick={() => window.location.replace('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
