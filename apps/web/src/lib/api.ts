const API_URL = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '')

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const response = await fetch(`${API_URL}/api${normalizedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })

  const text = await response.text()
  const contentType = response.headers.get('content-type') ?? ''

  if (!text) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return {} as T
  }

  let payload: { error?: string } | null = null

  if (contentType.includes('application/json')) {
    payload = JSON.parse(text) as { error?: string }
  } else if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
    throw new Error('A API retornou HTML em vez de JSON. Reinicie o backend e tente novamente.')
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? text ?? `HTTP ${response.status}`)
  }

  return (payload ?? ({ raw: text } as T)) as T
}
