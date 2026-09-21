import { sql, type Sql } from '../config/database';
import type { AuditAction, AuditEntity, ChangeLog } from '../types/db';
import type { AccessScope } from './access-scope';

/**
 * Conexão dentro ou fora de uma transação.
 *
 * Recebida por parâmetro para que a gravação do histórico participe da mesma
 * transação da alteração que ela descreve.
 */
export type DbClient = Sql;

/** Valor de um campo depois de normalizado para o histórico. */
type AuditValue = string | number | boolean | null;

/**
 * Reduz os dados recebidos aos campos que a operação aceita.
 *
 * O que o cliente envia fora desta lista não chega ao banco. É o que mantém a
 * autoria fora do alcance do corpo da requisição, mesmo que a validação da
 * rota mude ou seja contornada.
 */
export function pickFields<T extends object>(data: object, fields: readonly string[]): T {
  const source = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    if (field in source) result[field] = source[field];
  }

  return result as T;
}

/** Alteração de um campo: o valor anterior e o novo. */
export interface FieldChange {
  de: AuditValue;
  para: AuditValue;
}

/**
 * Forma canônica de um valor monetário, como texto com duas casas.
 *
 * Existe porque os dois lados da comparação chegam em formatos diferentes: o
 * valor gravado vem do banco como texto (`numeric` não é convertido para
 * `number`, sob pena de perder precisão), e o valor informado vem do corpo da
 * requisição como número JSON. Sem normalizar, `"150.00"` e `150` seriam
 * tratados como valores distintos e toda edição registraria uma alteração de
 * valor que não houve.
 *
 * A normalização é feita sobre o texto, sem passar por ponto flutuante, exceto
 * na entrada que já é número — onde a imprecisão, se existir, é anterior a
 * este ponto.
 */
function normalizarDecimal(valor: string | number): AuditValue {
  const texto = typeof valor === 'number' ? valor.toFixed(2) : valor.trim();

  const partes = /^(-?)(\d+)(?:\.(\d*))?$/.exec(texto);
  if (!partes) return texto;

  const [, sinal, inteiro, fracionaria = ''] = partes;

  // A coluna é numeric(10,2): o banco já guarda duas casas. Completar com
  // zeros basta para igualar as duas origens.
  const centavos = (fracionaria + '00').slice(0, 2);
  const inteiroSemZeros = inteiro.replace(/^0+(?=\d)/, '');
  const canonico = `${sinal}${inteiroSemZeros}.${centavos}`;

  // O histórico guarda o valor como número, que é como a interface o exibe e
  // como ele já era registrado antes. A forma canônica acima existe para que
  // as duas origens — texto vindo do banco e número vindo do formulário —
  // cheguem ao mesmo valor; a conversão final é exata dentro da faixa de
  // numeric(10,2), muito abaixo do limite de inteiros exatos do JavaScript.
  return Number(canonico);
}

function normalize(value: unknown, ehDecimal: boolean): AuditValue {
  if (value === null || value === undefined) return null;

  if (ehDecimal && (typeof value === 'string' || typeof value === 'number')) {
    return normalizarDecimal(value);
  }

  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

/**
 * Compara o registro anterior com os campos recebidos e devolve apenas o que
 * mudou de fato. Campos ausentes na alteração não entram no histórico, e
 * campos enviados com o mesmo valor também não.
 *
 * `camposDecimais` indica quais campos são valores monetários, para que a
 * comparação use a forma canônica descrita em `normalizarDecimal`.
 *
 * Devolve `null` quando nada mudou — nesse caso não há o que registrar.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: object,
  fields: readonly string[],
  camposDecimais: readonly string[] = [],
): Record<string, FieldChange> | null {
  const changes: Record<string, FieldChange> = {};
  const applied = after as Record<string, unknown>;
  const decimais = new Set(camposDecimais);

  for (const field of fields) {
    if (!(field in applied)) continue;

    const ehDecimal = decimais.has(field);
    const de = normalize(before[field], ehDecimal);
    const para = normalize(applied[field], ehDecimal);

    if (de !== para) {
      changes[field] = { de, para };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

interface RecordChangeInput {
  entityType: AuditEntity;
  entityId: string;
  action: AuditAction;
  scope: AccessScope;
  changes?: Record<string, FieldChange> | null;
  reason?: string | null;
}

/**
 * Registra uma entrada no histórico de alterações.
 *
 * O autor vem sempre do recorte de acesso — jamais do corpo da requisição — e
 * o nome é gravado por cópia, para que o histórico continue legível caso o
 * usuário seja removido depois.
 */
export async function recordChange(
  client: DbClient,
  { entityType, entityId, action, scope, changes, reason }: RecordChangeInput,
): Promise<void> {
  await client`
    insert into change_logs (
      company_id, entity_type, entity_id, action, changes, reason, actor_id, actor_name
    )
    values (
      ${scope.companyId},
      ${entityType},
      ${entityId},
      ${action},
      ${changes ? client.json(changes as unknown as Record<string, never>) : null},
      ${reason ?? null},
      ${scope.userId},
      ${scope.userName}
    )
  `;
}

/** Histórico de uma entidade, do mais recente para o mais antigo. */
export function listChanges(
  companyId: string,
  entityType: AuditEntity,
  entityId: string,
): Promise<ChangeLog[]> {
  return sql<ChangeLog[]>`
    select *
    from change_logs
    where company_id = ${companyId}
      and entity_type = ${entityType}
      and entity_id = ${entityId}
    order by created_at desc
  ` as unknown as Promise<ChangeLog[]>;
}
