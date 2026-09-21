import { apiFetch } from '@/lib/api'

/**
 * Anexos dos documentos.
 *
 * O navegador não fala mais com o Supabase Storage. Quem assina leitura e
 * envio é a API, depois de aplicar o recorte de acesso — empresa, papel e
 * vínculo. É o que faz o arquivo obedecer à mesma regra que a linha: um
 * motorista não alcança o anexo do documento pessoal de um colega, nem
 * contornando a tela.
 */

/** Extensões aceitas para anexo. A API recusa as demais. */
export const EXTENSOES_DE_ANEXO = ['jpg', 'jpeg', 'png', 'webp', 'pdf'] as const

export type ExtensaoDeAnexo = (typeof EXTENSOES_DE_ANEXO)[number]

interface Alvo {
  vehicleId?: string
  driverId?: string
}

/** Extensão do arquivo escolhido, em minúsculas, ou `null` se não for aceita. */
export function extensaoAceita(file: File): ExtensaoDeAnexo | null {
  const extensao = (file.name.split('.').pop() ?? '').toLowerCase()

  return (EXTENSOES_DE_ANEXO as readonly string[]).includes(extensao)
    ? (extensao as ExtensaoDeAnexo)
    : null
}

/**
 * Endereço temporário para exibir o anexo de um documento.
 *
 * A URL vem assinada e expira em pouco tempo; não vale guardá-la.
 */
export async function urlDeLeitura(documentId: string, token: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/documents/${documentId}/arquivo`, token)

  return url
}

/**
 * Envia o anexo e devolve o **caminho** dele no bucket, que é o valor gravado
 * em `fileUrl`.
 *
 * São dois passos: a API assina um endereço de envio — decidindo o caminho, que
 * começa pela empresa de quem pede — e o navegador envia o arquivo nele.
 */
export async function enviarAnexo(file: File, alvo: Alvo, token: string): Promise<string> {
  const extensao = extensaoAceita(file)

  if (!extensao) throw new Error('EXTENSAO_NAO_ACEITA')

  const { url, caminho } = await apiFetch<{ url: string; caminho: string }>(
    '/documents/arquivo/url-de-envio',
    token,
    { method: 'POST', body: JSON.stringify({ ...alvo, extensao }) },
  )

  const envio = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })

  if (!envio.ok) {
    throw new Error(`Falha ao enviar o arquivo (HTTP ${envio.status})`)
  }

  return caminho
}
