import { vi } from 'vitest';
import { UserRole } from '@fleet-manager/shared';
import type { AccessScope } from '../lib/access-scope';
import type { FieldChange } from '../lib/audit';

/**
 * Duplos para os testes de serviço.
 *
 * Substitui o duplo do cliente do Prisma. Os testes continuam sem banco: eles
 * verificam **as regras** — recorte por empresa, autoria, vínculo e histórico —
 * e não o SQL gerado.
 *
 * A diferença em relação ao duplo anterior é o ponto de observação do
 * histórico. Antes os testes afirmavam sobre a chamada de persistência
 * (`changeLog.create`), o que os prendia ao mecanismo de gravação. Agora
 * afirmam sobre `recordChange`, que é a intenção: registrou-se uma alteração,
 * com tal ação, tal autor e tais campos. Trocar de driver deixa de quebrar
 * teste de regra.
 */

/** Resultado vazio no formato que o postgres.js devolve. */
function resultadoVazio() {
  return Object.assign([] as unknown[], { count: 0 });
}

/**
 * Duplo da conexão.
 *
 * É chamável como literal marcado — `sql\`select ...\`` — e traz os auxiliares
 * que os repositórios usam. Nenhuma consulta é interpretada: os repositórios
 * são substituídos nos testes de serviço, e o que sobra aqui são as chamadas
 * incidentais, que devem apenas não quebrar.
 */
function criarSqlMock() {
  const sql = vi.fn(() => Promise.resolve(resultadoVazio())) as unknown as SqlMock;

  sql.json = (valor: unknown) => valor;
  sql.unsafe = (texto: string) => texto;
  sql.begin = (fn: (tx: unknown) => unknown) => Promise.resolve(fn(sql));
  sql.end = () => Promise.resolve();

  return sql;
}

type SqlMock = ReturnType<typeof vi.fn> & {
  json: (valor: unknown) => unknown;
  unsafe: (texto: string) => string;
  begin: (fn: (tx: unknown) => unknown) => Promise<unknown>;
  end: () => Promise<void>;
};

export const sqlMock = criarSqlMock();

/**
 * Duplo da transação. Executa o corpo com o próprio duplo da conexão, para que
 * o conteúdo da transação seja exercitado de verdade — inclusive a ordem das
 * chamadas e as exceções que a interrompem.
 */
export const emTransacaoMock = vi.fn(async (fn: (tx: unknown) => unknown) => fn(sqlMock));

/** Entrada de histórico, como os testes a inspecionam. */
export interface RegistroDeAuditoria {
  companyId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  changes?: Record<string, FieldChange> | null;
  reason?: string | null;
}

/** Entrada recebida por `recordChange`, antes de ser achatada. */
interface EntradaDeAuditoria {
  entityType: string;
  entityId: string;
  action: string;
  scope: AccessScope;
  changes?: Record<string, FieldChange> | null;
  reason?: string | null;
}

/** Duplo de `recordChange`. */
export const recordChangeMock = vi.fn(
  async (_cliente: unknown, _entrada: EntradaDeAuditoria) => {},
);

/**
 * Entradas registradas no histórico desde o último `resetDbMock`, achatadas:
 * o recorte de acesso vira empresa e autor, que é como o histórico as guarda.
 */
export function registrosDeAuditoria(): RegistroDeAuditoria[] {
  return recordChangeMock.mock.calls.map(([, entrada]) => {
    return {
      companyId: entrada.scope.companyId,
      entityType: entrada.entityType,
      entityId: entrada.entityId,
      action: entrada.action,
      actorId: entrada.scope.userId,
      actorName: entrada.scope.userName,
      changes: entrada.changes ?? null,
      reason: entrada.reason ?? null,
    };
  });
}

/** Zera o estado entre testes, sem trocar as instâncias observadas. */
export function resetDbMock(): void {
  sqlMock.mockClear();
  sqlMock.mockImplementation(() => Promise.resolve(resultadoVazio()));

  emTransacaoMock.mockClear();
  emTransacaoMock.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(sqlMock));

  recordChangeMock.mockClear();
  recordChangeMock.mockImplementation(async () => {});
}

/** Recorte de acesso pronto para os testes. */
export function makeScope(overrides: Partial<AccessScope> = {}): AccessScope {
  return {
    userId: 'user-1',
    userName: 'Fulano',
    companyId: 'company-a',
    role: UserRole.MANAGER,
    driverId: null,
    isSuperAdmin: false,
    ...overrides,
  };
}

/** Recorte de um motorista, com a ficha vinculada. */
export function makeDriverScope(overrides: Partial<AccessScope> = {}): AccessScope {
  return makeScope({
    userId: 'driver-user-1',
    userName: 'Motorista',
    role: UserRole.OPERATOR,
    driverId: 'driver-1',
    ...overrides,
  });
}
