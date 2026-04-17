import { useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string

export function useToken() {
  const { getAccessTokenSilently } = useAuth0()
  return useCallback(
    () => getAccessTokenSilently({ authorizationParams: { audience } }),
    [getAccessTokenSilently],
  )
}
