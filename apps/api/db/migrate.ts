/**
 * Executor de migrations SQL.
 *
 * Substitui `prisma migrate`. Aplica, em ordem, os arquivos `.sql` de
 * `db/migrations/` que ainda não constam na tabela de controle.
 *
 * Uso:
 *   npm run db:migrate            -- aplica o que estiver pendente
 *   npm run db:migrate -- --status  -- apenas relata, sem aplicar
 *
 * Decisões que sustentam as garantias exigidas:
 *
 *   * **Conexão direta.** Usa DIRECT_URL (porta 5432, modo sessão). O pooler em
 *     modo transação não sustenta lock consultivo entre comandos nem DDL longo.
 *
 *   * **Uma transação por migration.** O registro na tabela de controle acontece
 *     dentro da mesma transação do DDL. Ou os dois efeitos existem, ou nenhum
 *     existe — não há janela em que uma migration conste como aplicada sem ter
 *     executado.
 *
 *   * **Escape para DDL não transacional.** Um arquivo que comece com
 *     `-- migrate: no-transaction` roda fora de transação, para comandos como
 *     CREATE INDEX CONCURRENTLY. Nesse caso o registro é gravado depois, em
 *     transação própria, e a falha no meio é relatada explicitamente como
 *     estado parcial que exige conferência manual.
 *
 *   * **Soma de verificação.** O conteúdo aplicado é registrado por hash. Editar
 *     um arquivo já aplicado passa a ser um erro, não uma alteração silenciosa
 *     que só apareceria ao recriar a base do zero.
 *
 *   * **Lock consultivo.** Duas execuções simultâneas não disputam o mesmo
 *     arquivo.
 */

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const PASTA_MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Chave do lock consultivo. Arbitrária, só precisa ser estável. */
const LOCK_ID = 4_120_2026;

const DIRETIVA_SEM_TRANSACAO = /^--\s*migrate:\s*no-transaction\s*$/im;

interface Migration {
  versao: string;
  nome: string;
  arquivo: string;
  conteudo: string;
  checksum: string;
  semTransacao: boolean;
}

function lerMigrations(): Migration[] {
  const arquivos = readdirSync(PASTA_MIGRATIONS)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();

  return arquivos.map((arquivo) => {
    const conteudo = readFileSync(join(PASTA_MIGRATIONS, arquivo), 'utf8');
    const versao = arquivo.split('_')[0];

    if (!/^\d+$/.test(versao)) {
      throw new Error(
        `Migration com nome fora do padrão: "${arquivo}". ` +
          'Esperado <numero>_<descricao>.sql, por exemplo 0002_adiciona_campo.sql',
      );
    }

    return {
      versao,
      nome: arquivo.replace(/\.sql$/, ''),
      arquivo,
      conteudo,
      checksum: createHash('sha256').update(conteudo).digest('hex'),
      semTransacao: DIRETIVA_SEM_TRANSACAO.test(conteudo),
    };
  });
}

function conferirVersoesUnicas(migrations: Migration[]): void {
  const vistas = new Map<string, string>();

  for (const migration of migrations) {
    const anterior = vistas.get(migration.versao);
    if (anterior) {
      throw new Error(
        `Duas migrations com a mesma versão ${migration.versao}: ` +
          `"${anterior}" e "${migration.arquivo}". A ordem de aplicação seria ambígua.`,
      );
    }
    vistas.set(migration.versao, migration.arquivo);
  }
}

async function main(): Promise<void> {
  const somenteRelatar = process.argv.includes('--status');

  const url = process.env.DIRECT_URL;
  if (!url) {
    console.error(
      'DIRECT_URL não definida. As migrations exigem a conexão direta (porta 5432);\n' +
        'o pooler em modo transação não sustenta DDL nem lock consultivo.\n' +
        'Copie .env.example para .env e preencha os valores do projeto.',
    );
    process.exit(1);
  }

  const migrations = lerMigrations();
  conferirVersoesUnicas(migrations);

  // `prepare: false` não é exigido aqui — a conexão direta é modo sessão — mas
  // manter uma conexão só deixa o lock consultivo previsível.
  const sql = postgres(url, { max: 1, onnotice: () => {} });

  try {
    await sql`
      create table if not exists schema_migrations (
        versao       text primary key,
        nome         text not null,
        checksum     text not null,
        aplicada_em  timestamptz not null default now(),
        duracao_ms   integer not null
      )
    `;

    // Mesma proteção das tabelas da aplicação: RLS habilitada e sem política
    // alguma nega acesso a `anon` e `authenticated`. Sem isso, o histórico de
    // migrations ficaria legível e alterável por quem tivesse a chave pública.
    // O executor conecta como dono da tabela, que não é afetado pela RLS.
    await sql`alter table schema_migrations enable row level security`;

    await sql`select pg_advisory_lock(${LOCK_ID})`;

    const aplicadas = await sql<
      { versao: string; nome: string; checksum: string; aplicada_em: Date }[]
    >`select versao, nome, checksum, aplicada_em from schema_migrations order by versao`;

    const porVersao = new Map(aplicadas.map((linha) => [linha.versao, linha]));

    // Um arquivo já aplicado que mudou de conteúdo indica que o histórico e o
    // banco divergiram. Aplicar o restante por cima esconderia a divergência.
    const alteradas = migrations.filter((migration) => {
      const registro = porVersao.get(migration.versao);
      return registro && registro.checksum !== migration.checksum;
    });

    if (alteradas.length > 0) {
      console.error('Migrations já aplicadas foram alteradas depois da aplicação:\n');
      for (const migration of alteradas) {
        console.error(`  ${migration.arquivo}`);
      }
      console.error(
        '\nO banco não corresponde mais ao histórico. Reverta a alteração no arquivo\n' +
          'e escreva uma migration nova com a mudança pretendida.',
      );
      process.exit(1);
    }

    const pendentes = migrations.filter((migration) => !porVersao.has(migration.versao));

    if (somenteRelatar) {
      console.log(`Aplicadas: ${aplicadas.length} | Pendentes: ${pendentes.length}\n`);
      for (const migration of migrations) {
        const registro = porVersao.get(migration.versao);
        const marca = registro ? '✓' : ' ';
        const quando = registro ? registro.aplicada_em.toISOString() : 'pendente';
        console.log(`  [${marca}] ${migration.nome.padEnd(48)} ${quando}`);
      }
      return;
    }

    if (pendentes.length === 0) {
      console.log('Nada a aplicar: o banco está em dia com as migrations.');
      return;
    }

    console.log(`Aplicando ${pendentes.length} migration(s)...\n`);

    for (const migration of pendentes) {
      const inicio = Date.now();

      try {
        if (migration.semTransacao) {
          // O arquivo declarou que não pode rodar em transação. Sem o
          // envelope transacional, uma falha no meio deixa efeito parcial —
          // por isso o aviso explícito no catch abaixo.
          await sql.unsafe(migration.conteudo);
          const duracao = Date.now() - inicio;
          await sql`
            insert into schema_migrations (versao, nome, checksum, duracao_ms)
            values (${migration.versao}, ${migration.nome}, ${migration.checksum}, ${duracao})
          `;
          console.log(`  ✓ ${migration.nome} (${duracao}ms, fora de transação)`);
        } else {
          const duracao = await sql.begin(async (tx) => {
            await tx.unsafe(migration.conteudo);
            const decorrido = Date.now() - inicio;
            await tx`
              insert into schema_migrations (versao, nome, checksum, duracao_ms)
              values (${migration.versao}, ${migration.nome}, ${migration.checksum}, ${decorrido})
            `;
            return decorrido;
          });
          console.log(`  ✓ ${migration.nome} (${duracao}ms)`);
        }
      } catch (erro) {
        console.error(`\n  ✗ ${migration.nome} falhou.\n`);
        console.error(erro instanceof Error ? erro.message : erro);

        if (migration.semTransacao) {
          console.error(
            '\nEsta migration roda fora de transação: parte dos comandos pode ter\n' +
              'sido aplicada. Confira o estado do banco antes de executar de novo.',
          );
        } else {
          console.error(
            '\nA transação foi revertida. O banco está como antes desta migration,\n' +
              'e ela não foi registrada como aplicada.',
          );
        }

        process.exit(1);
      }
    }

    console.log(`\n${pendentes.length} migration(s) aplicada(s).`);
  } finally {
    await sql`select pg_advisory_unlock(${LOCK_ID})`.catch(() => {});
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
