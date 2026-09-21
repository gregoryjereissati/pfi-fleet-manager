/**
 * Reconhecimento de erros do PostgreSQL.
 *
 * Substitui a checagem de `Prisma.PrismaClientKnownRequestError`. Os códigos
 * são os do próprio PostgreSQL, definidos no padrão e estáveis entre versões —
 * ao contrário dos códigos `P2002`/`P2025`, que eram uma tradução do Prisma.
 *
 * Reconhecer a violação no banco, em vez de consultar antes de gravar, é o que
 * torna a proteção válida sob concorrência: entre uma consulta de verificação
 * e a gravação seguinte cabe outra requisição, e só a restrição do banco
 * resolve a disputa.
 */

/** Violação de restrição de unicidade. */
const UNIQUE_VIOLATION = '23505';
/** Violação de chave estrangeira. */
const FOREIGN_KEY_VIOLATION = '23503';
/** Violação de restrição `check`. */
const CHECK_VIOLATION = '23514';

interface ErroPostgres {
  code?: string;
  constraint_name?: string;
}

function comoErroPostgres(erro: unknown): ErroPostgres | null {
  if (typeof erro !== 'object' || erro === null) return null;
  return erro as ErroPostgres;
}

/**
 * Violação de unicidade.
 *
 * `restricao` permite distinguir qual índice foi violado quando a mesma
 * operação pode esbarrar em mais de um — por exemplo, e-mail e CPF no cadastro
 * de usuário. Sem ela, qualquer violação de unicidade responde verdadeiro.
 */
export function ehViolacaoDeUnicidade(erro: unknown, restricao?: string): boolean {
  const postgres = comoErroPostgres(erro);
  if (postgres?.code !== UNIQUE_VIOLATION) return false;
  if (!restricao) return true;

  return postgres.constraint_name === restricao;
}

/** Violação de chave estrangeira: referência a uma linha que não existe. */
export function ehViolacaoDeChaveEstrangeira(erro: unknown): boolean {
  return comoErroPostgres(erro)?.code === FOREIGN_KEY_VIOLATION;
}

/** Violação de restrição `check` declarada no schema. */
export function ehViolacaoDeRegra(erro: unknown): boolean {
  return comoErroPostgres(erro)?.code === CHECK_VIOLATION;
}

/** Nome da restrição violada, quando o erro o informa. */
export function restricaoViolada(erro: unknown): string | null {
  return comoErroPostgres(erro)?.constraint_name ?? null;
}
