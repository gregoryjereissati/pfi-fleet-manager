import { env } from '../config/env';
import { AppError } from '../middlewares/error-handler';

/**
 * Anexos no Supabase Storage.
 *
 * O navegador não fala mais com o Storage. Quem assina é a API, com a chave
 * `service_role`, depois de aplicar o mesmo recorte que aplica às linhas —
 * empresa, papel e vínculo. As políticas do bucket passaram a negar tudo para
 * `authenticated`, de modo que contornar a API não alcança arquivo algum.
 *
 * As chamadas usam `fetch` direto na API REST do Storage: a API não depende do
 * `@supabase/supabase-js`, e é o mesmo caminho já usado pelos scripts de
 * manutenção da base.
 */

const BUCKET = 'documents';

/** Validade da URL assinada de leitura, em segundos. Curta por ser suficiente. */
const VALIDADE_DE_LEITURA = 60;

function autenticacao(): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function falha(resposta: Response, acao: string): Promise<never> {
  const corpo = await resposta.text().catch(() => '');
  console.error(`[Storage] ${acao} falhou (${resposta.status}): ${corpo}`);
  throw new AppError(502, 'STORAGE_UNAVAILABLE');
}

/**
 * Endereço temporário de leitura de um anexo.
 *
 * A URL devolvida dispensa credencial — é a assinatura que autoriza — e expira
 * em pouco tempo. Quem chama já verificou que o documento está ao alcance de
 * quem pediu.
 */
export async function assinarLeitura(caminho: string): Promise<string> {
  const resposta = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${caminho}`,
    {
      method: 'POST',
      headers: { ...autenticacao(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: VALIDADE_DE_LEITURA }),
    },
  );

  if (!resposta.ok) await falha(resposta, 'assinatura de leitura');

  const { signedURL } = (await resposta.json()) as { signedURL: string };

  return `${env.SUPABASE_URL}/storage/v1${signedURL}`;
}

/**
 * Endereço temporário para o cliente enviar o arquivo, com `PUT`.
 *
 * O caminho já vem decidido pela API: o cliente envia o arquivo, não escolhe
 * onde ele cai.
 *
 * O pedido vai **sem corpo e sem `Content-Type`** — o Storage recusa com
 * `Body cannot be empty` um `application/json` vazio.
 */
export async function assinarEnvio(caminho: string): Promise<string> {
  const resposta = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${caminho}`,
    { method: 'POST', headers: autenticacao() },
  );

  if (!resposta.ok) await falha(resposta, 'assinatura de envio');

  const { url } = (await resposta.json()) as { url: string };

  return `${env.SUPABASE_URL}/storage/v1${url}`;
}
