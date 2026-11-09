type Traduzir = (key: string) => string

/**
 * Mensagem legível para um erro devolvido pela API.
 *
 * A API responde com códigos estáveis (`LAST_ACTIVE_ADMIN`,
 * `DRIVER_LICENSE_EXPIRED`…). Quando existe tradução em `errors.<código>`, ela
 * é usada; senão, a mensagem original segue como está.
 */
export function mensagemDeErro(err: unknown, t: Traduzir): string {
  const mensagem = err instanceof Error ? err.message : String(err)
  const chave = `errors.${mensagem}`
  const traduzida = t(chave)
  return traduzida === chave ? mensagem : traduzida
}
