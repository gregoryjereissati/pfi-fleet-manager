import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Cliente do Supabase.
 *
 * Responde por duas funções no Fleet Manager:
 * 1. autenticação (e-mail e senha), com a sessão persistida e renovada
 *    automaticamente pelo próprio cliente;
 * 2. envio dos arquivos anexados aos documentos, para o Supabase Storage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

/** Token de acesso da sessão atual, ou string vazia quando não há sessão. */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

/** Indica se existe sessão ativa no navegador. */
export async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

/** Autentica com e-mail e senha. Lança erro com a mensagem do Supabase. */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw error
}

/**
 * Cria a conta de acesso no Supabase Auth.
 *
 * Retorna `true` quando a sessão já fica ativa (confirmação de e-mail
 * desativada no projeto) e `false` quando o Supabase exige confirmação por
 * e-mail antes de liberar o acesso.
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw error
  return Boolean(data.session)
}

/** Encerra a sessão atual. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/** Altera a senha do usuário autenticado. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

const BUCKET_DOCUMENTOS = 'documents'

/** Validade da URL assinada de leitura, em segundos. */
const VALIDADE_DA_URL = 60

/**
 * Envia o anexo e devolve o **caminho** dele no bucket.
 *
 * O caminho começa pelo identificador da empresa, e é isso que torna possível
 * recortar o acesso aos arquivos: as políticas do bucket comparam esse primeiro
 * segmento com a empresa de quem pede. Sem ele, não havia como uma política
 * distinguir o anexo de uma empresa do de outra — e não distinguia: qualquer
 * pessoa autenticada alcançava o arquivo de qualquer empresa.
 *
 * O retorno deixou de ser uma URL pública. O bucket é privado, e o endereço de
 * leitura é gerado na hora de exibir, com validade curta.
 */
export async function uploadDocumentFile(
  file: File,
  entityId: string,
  companyId: string,
): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase()
  const path = `${companyId}/${entityId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET_DOCUMENTOS).upload(path, file)

  if (error) {
    throw new Error(error.message)
  }

  return path
}

/**
 * Endereço temporário para ler um anexo.
 *
 * Só é emitido se as políticas do bucket autorizarem quem está pedindo — a
 * mesma verificação que barra o acesso ao arquivo de outra empresa. Uma URL
 * assinada expira; uma URL pública valeria para sempre, para qualquer pessoa
 * que a tivesse visto uma vez.
 */
export async function signedDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(path, VALIDADE_DA_URL)

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível abrir o arquivo.')
  }

  return data.signedUrl
}
