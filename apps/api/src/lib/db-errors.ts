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

/** Texto que não converte para o tipo da coluna. */
const INVALID_TEXT_REPRESENTATION = '22P02';

interface ErroPostgres {
  code?: string;
  constraint_name?: string;
  routine?: string;
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

/**
 * Texto que não é UUID usado onde o banco espera um.
 *
 * O código `22P02` cobre qualquer conversão de texto que falhe — valor de enum
 * inclusive. Só a rotina `string_to_uuid` indica que o problema é o
 * identificador enviado pelo cliente; as demais continuam sendo erro do
 * servidor, porque a validação deveria tê-las barrado antes.
 */
/**
 * Banco inalcançável: a conexão esgotou o prazo, foi recusada ou o endereço
 * não existe. Não é defeito da requisição nem do código — o serviço está
 * indisponível, e a resposta certa é 503, não 500.
 */
const CONEXAO_INDISPONIVEL = new Set([
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
]);

export function ehBancoIndisponivel(erro: unknown): boolean {
  const postgres = comoErroPostgres(erro);
  return postgres?.code !== undefined && CONEXAO_INDISPONIVEL.has(postgres.code);
}

export function ehIdentificadorInvalido(erro: unknown): boolean {
  const postgres = comoErroPostgres(erro);
  return postgres?.code === INVALID_TEXT_REPRESENTATION && postgres.routine === 'string_to_uuid';
}
