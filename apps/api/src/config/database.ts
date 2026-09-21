import postgres from 'postgres';
import { env } from './env';

/**
 * Conexão única com o PostgreSQL, via postgres.js.
 *
 * Substitui o `PrismaClient`. Toda consulta do sistema passa por aqui; o SQL
 * mora nos repositórios.
 */

/** OID do tipo `date` no PostgreSQL. */
const OID_DATE = 1082;
/** OID do tipo `timestamp` sem fuso. */
const OID_TIMESTAMP = 1114;
/** OID do tipo `timestamptz`. */
const OID_TIMESTAMPTZ = 1184;

/**
 * Conversão de nomes entre o banco (snake_case) e a aplicação (camelCase).
 *
 * Deliberadamente **não** usa o atalho `postgres.camel`: além dos nomes de
 * coluna, ele instala um `value.from` que reescreve recursivamente as chaves
 * de dentro de colunas `json` e `jsonb`. Isso alcançaria `change_logs.changes`,
 * onde as chaves são nomes de campo gravados por cópia — reescrevê-las
 * corromperia o histórico de alterações silenciosamente, na leitura.
 *
 * Aqui só os nomes de coluna são convertidos. O conteúdo dos jsonb chega como
 * foi gravado.
 */
const transform = {
  column: {
    to: postgres.fromCamel,
    from: postgres.toCamel,
  },
};

/**
 * Tipos com tratamento próprio.
 *
 * O postgres.js aplica, por padrão, o mesmo analisador a `date`, `timestamp` e
 * `timestamptz`: os três viram `new Date(texto)`. Para `date` isso é errado. O
 * texto `'2026-03-15'` é interpretado como meia-noite **UTC**, e em qualquer
 * fuso a oeste de Greenwich — o Brasil inteiro — a data exibida retrocede um
 * dia. Vencimento de documento e de CNH é data civil: não tem hora e não
 * depende do fuso de quem consulta.
 *
 * A separação abaixo devolve `date` como texto `YYYY-MM-DD`, preservando esse
 * significado do banco até a resposta da API, e mantém os dois tipos com
 * instante no tempo como `Date`.
 *
 * `numeric` não aparece aqui de propósito: o padrão do postgres.js já é
 * entregá-lo como texto, e é assim que deve permanecer. Converter para `number`
 * perderia precisão em valores monetários.
 */
const types = {
  dataCivil: {
    to: OID_DATE,
    from: [OID_DATE],
    serialize: (valor: Date | string) =>
      valor instanceof Date ? valor.toISOString().slice(0, 10) : valor,
    parse: (valor: string) => valor,
  },
  instante: {
    to: OID_TIMESTAMPTZ,
    from: [OID_TIMESTAMP, OID_TIMESTAMPTZ],
    serialize: (valor: Date | string) =>
      valor instanceof Date ? valor.toISOString() : valor,
    parse: (valor: string) => new Date(valor),
  },
};

function criarConexao() {
  return postgres(env.DATABASE_URL, {
    // O pooler do Supabase em modo transação (porta 6543) devolve a conexão a
    // cada transação. Prepared statements nomeados ficam atados à conexão e
    // deixariam de existir na requisição seguinte.
    prepare: false,

    // O runtime serverless da Vercel reaproveita a instância entre invocações,
    // mas cada uma atende poucas requisições simultâneas. Um teto baixo evita
    // que instâncias paralelas somem conexões até esgotar o pooler.
    max: env.NODE_ENV === 'production' ? 1 : 10,

    idle_timeout: 20,
    connect_timeout: 10,

    transform,
    types,
    onnotice: () => {},
  });
}

const globalParaPostgres = globalThis as unknown as {
  sql?: ReturnType<typeof criarConexao>;
};

export const sql = globalParaPostgres.sql ?? criarConexao();

if (env.NODE_ENV !== 'production') {
  globalParaPostgres.sql = sql;
}

export type Sql = ReturnType<typeof criarConexao>;

/**
 * Executa um conjunto de escritas em uma única transação.
 *
 * Recebe a conexão da transação e a repassa aos repositórios, para que as
 * escritas de um mesmo caso de uso compartilhem o mesmo envelope. Qualquer
 * exceção lançada dentro do callback reverte tudo — nenhuma escrita parcial
 * sobrevive a uma falha no meio.
 */
export async function emTransacao<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
  return sql.begin((tx) => fn(tx as unknown as Sql)) as Promise<T>;
}
