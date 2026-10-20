import { empresaAtiva } from './empresa-ativa'

/**
 * URL base da API.
 *
 * Vazia quando frontend e API são servidos pelo mesmo domínio — caso da
 * publicação em projeto único na Vercel —, situação em que as chamadas usam
 * caminho relativo e não há requisição entre origens diferentes.
 */
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

/**
 * Cabeçalho em que o super administrador informa a empresa que está operando.
 *
 * Enviado sempre que houver uma escolha registrada. Para qualquer perfil que
 * não seja super administrador o servidor o ignora — a empresa dele vem do
 * cadastro, e nada que o navegador mande altera isso.
 */
const CABECALHO_EMPRESA = 'X-Company-Id'

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const { payload } = await requisitar<T>(path, token, options)
  return payload
}

/** Uma página de uma listagem e o total de registros que atendem aos filtros. */
export interface Pagina<T> {
  items: T[]
  total: number
}

/**
 * Busca uma página de uma listagem paginada.
 *
 * O corpo é a lista da página; o total vem no cabeçalho `X-Total-Count`. Sem o
 * cabeçalho, a página é tratada como a lista inteira.
 */
export async function apiFetchPage<T>(path: string, token: string): Promise<Pagina<T>> {
  const { payload, response } = await requisitar<T[]>(path, token)
  const items = Array.isArray(payload) ? payload : []
  const total = Number(response.headers.get('X-Total-Count') ?? items.length)
  return { items, total: Number.isFinite(total) ? total : items.length }
}

async function requisitar<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<{ payload: T; response: Response }> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const response = await fetch(`${API_URL}/api${normalizedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(empresaAtiva() ? { [CABECALHO_EMPRESA]: empresaAtiva() as string } : {}),
      ...options?.headers,
    },
  })

  const text = await response.text()
  const contentType = response.headers.get('content-type') ?? ''

  if (!text) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return { payload: {} as T, response }
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

  return { payload: (payload ?? ({ raw: text } as T)) as T, response }
}

/**
 * Indica que a requisição foi cancelada porque outra a substituiu.
 *
 * Um pedido cancelado não é uma falha: quem digita rápido troca o que pediu, e
 * a tela não deve exibir erro por isso.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
