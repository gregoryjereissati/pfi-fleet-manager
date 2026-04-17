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
  const payload = text ? (JSON.parse(text) as { error?: string }) : {}

  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`)
  }

  return payload as T
}
