import { z } from 'zod';

/**
 * Formato dos anexos: extensões aceitas e caminho dentro do bucket.
 *
 * Separado de `lib/storage` de propósito. Aqui está o que um anexo **é** —
 * regra pura, sem ambiente e sem rede —; lá, a conversa com o Supabase.
 */

/** Extensões aceitas para anexo. */
export const EXTENSOES_DE_ANEXO = ['jpg', 'jpeg', 'png', 'webp', 'pdf'] as const;

export type ExtensaoDeAnexo = (typeof EXTENSOES_DE_ANEXO)[number];

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/**
 * Caminho do anexo dentro do bucket: `<companyId>/<entityId>/<uuid>.<ext>`.
 *
 * O primeiro segmento é a empresa. Ele vem sempre do recorte de acesso, nunca
 * do corpo da requisição — é o que dá ao arquivo a mesma fronteira que a linha.
 */
export function caminhoDoAnexo(
  companyId: string,
  entityId: string,
  extensao: ExtensaoDeAnexo,
): string {
  return `${companyId}/${entityId}/${crypto.randomUUID()}.${extensao}`;
}

/**
 * `fileUrl` guarda o **caminho**, não uma URL: o bucket é privado e o endereço
 * de leitura é assinado pela API na hora de abrir. Validar como URL recusaria
 * justamente o valor que a aplicação grava.
 *
 * O caminho aceito é só o que a própria API emite em
 * `POST /documents/arquivo/url-de-envio`.
 */
export const caminhoDeAnexo = z
  .string()
  .trim()
  .regex(
    new RegExp(`^${UUID}/${UUID}/${UUID}[.](?:${EXTENSOES_DE_ANEXO.join('|')})$`),
    'fileUrl deve ser o caminho devolvido por /documents/arquivo/url-de-envio',
  );

/**
 * Corpo do pedido de URL de envio.
 *
 * A empresa não aparece aqui: ela vem do recorte de acesso. O que o cliente
 * informa é a entidade dona do documento e a extensão do arquivo.
 */
export const uploadUrlSchema = z
  .object({
    vehicleId: z.string().trim().min(1).optional(),
    driverId: z.string().trim().min(1).optional(),
    extensao: z.string().trim().toLowerCase().pipe(z.enum(EXTENSOES_DE_ANEXO)),
  })
  .refine((data) => Boolean(data.vehicleId) !== Boolean(data.driverId), {
    message: 'Provide either vehicleId or driverId',
  });
