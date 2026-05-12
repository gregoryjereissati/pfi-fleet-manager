import { useCallback } from 'react'

export function useToken() {
  return useCallback(() => {
    const token = localStorage.getItem('fm_token') ?? ''
    return Promise.resolve(token)
  }, [])
}
