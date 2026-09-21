/**
 * Limpeza do ambiente de desenvolvimento/teste.
 *
 * Apaga **apenas** o que pertence ao Fleet Manager: as tabelas da aplicação, os
 * tipos enumerados que ela declara, as contas de acesso criadas para ela e os
 * arquivos que ela enviou. Não toca em schemas internos do Supabase, não mexe
 * diretamente nas tabelas do Auth e não apaga o projeto.
 *
 * Uso:
 *   npm run db:reset -- --confirmar=<project_ref>
 *
 * O identificador do projeto precisa ser digitado e precisa bater com o da
 * conexão configurada. É proposital: um reset não deve depender apenas de uma
 * variável de ambiente que pode estar apontando para o lugar errado.
 */

import 'dotenv/config';
import postgres from 'postgres';

/** Tabelas da aplicação, na ordem inversa da dependência. */
const TABELAS = [
  'change_logs',
  'documents',
  'maintenances',
  'expenses',
  'vehicle_driver_assignments',
  'drivers',
  'vehicles',
  'users',
  'companies',
  'schema_migrations',
];

/**
 * Tabelas do esquema anterior, gerado pelo Prisma.
 *
 * Nomes em PascalCase entre aspas, mais a tabela de junção implícita do N:M e a
 * tabela de controle de migrations do próprio Prisma.
 */
const TABELAS_ANTERIORES = [
  '"ChangeLog"',
  '"Document"',
  '"Maintenance"',
  '"Expense"',
  '"VehicleDriverAssignment"',
  '"_VehicleDrivers"',
  '"Driver"',
  '"Vehicle"',
  '"User"',
  '"Company"',
  '"_prisma_migrations"',
];

const TIPOS = [
  'user_role',
  'user_status',
  'company_status',
  'vehicle_status',
  'driver_status',
  'expense_type',
  'maintenance_type',
  'maintenance_status',
  'entry_status',
  'document_type',
  'audit_entity',
  'audit_action',
  // Tipos do esquema anterior, com os nomes que o Prisma gerava.
  '"UserRole"',
  '"UserStatus"',
  '"CompanyStatus"',
  '"VehicleStatus"',
  '"DriverStatus"',
  '"ExpenseType"',
  '"MaintenanceType"',
  '"MaintenanceStatus"',
  '"EntryStatus"',
  '"DocumentType"',
  '"AuditEntity"',
  '"AuditAction"',
];

/** Bucket do Storage onde ficam os anexos de documento. */
const BUCKET = 'documents';

function lerArgumento(nome: string): string | null {
  const prefixo = `--${nome}=`;
  const argumento = process.argv.find((valor) => valor.startsWith(prefixo));
  return argumento ? argumento.slice(prefixo.length) : null;
}

function projectRefDaUrl(url: string): string | null {
  return /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(url)?.[1] ?? null;
}

/** Remove todas as contas do Supabase Auth, pela API administrativa. */
async function limparContasDeAcesso(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<number> {
  const cabecalhos = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  let removidas = 0;

  // A listagem é paginada. Como cada volta apaga o que leu, a primeira página
  // é relida até vir vazia.
  for (;;) {
    const resposta = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=200`, {
      headers: cabecalhos,
    });

    if (!resposta.ok) {
      throw new Error(
        `Falha ao listar contas do Auth (${resposta.status}): ${await resposta.text()}`,
      );
    }

    const { users } = (await resposta.json()) as { users: { id: string; email?: string }[] };
    if (users.length === 0) break;

    for (const conta of users) {
      const apagada = await fetch(`${supabaseUrl}/auth/v1/admin/users/${conta.id}`, {
        method: 'DELETE',
        headers: cabecalhos,
      });

      if (!apagada.ok) {
        throw new Error(
          `Falha ao remover a conta ${conta.email ?? conta.id} (${apagada.status}): ` +
            (await apagada.text()),
        );
      }

      removidas += 1;
    }
  }

  return removidas;
}

/** Esvazia o bucket de anexos, se ele existir. */
async function limparArquivos(supabaseUrl: string, serviceRoleKey: string): Promise<number> {
  const cabecalhos = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const listagem = await fetch(`${supabaseUrl}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: cabecalhos,
    body: JSON.stringify({ prefix: '', limit: 1000 }),
  });

  if (listagem.status === 404) return 0;

  if (!listagem.ok) {
    throw new Error(
      `Falha ao listar arquivos do bucket "${BUCKET}" (${listagem.status}): ` +
        (await listagem.text()),
    );
  }

  const arquivos = (await listagem.json()) as { name: string }[];
  if (arquivos.length === 0) return 0;

  const remocao = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: cabecalhos,
    body: JSON.stringify({ prefixes: arquivos.map((arquivo) => arquivo.name) }),
  });

  if (!remocao.ok) {
    throw new Error(
      `Falha ao remover arquivos do bucket "${BUCKET}" (${remocao.status}): ` +
        (await remocao.text()),
    );
  }

  return arquivos.length;
}

async function main(): Promise<void> {
  const url = process.env.DIRECT_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !supabaseUrl) {
    console.error('DIRECT_URL e SUPABASE_URL precisam estar definidas. Confira o .env.');
    process.exit(1);
  }

  const projetoConfigurado = projectRefDaUrl(supabaseUrl);
  const confirmacao = lerArgumento('confirmar');

  if (!projetoConfigurado) {
    console.error(`Não consegui identificar o projeto a partir de SUPABASE_URL: ${supabaseUrl}`);
    process.exit(1);
  }

  if (confirmacao !== projetoConfigurado) {
    console.error(
      'Este comando apaga todos os dados da aplicação, as contas de acesso e os\n' +
        'arquivos enviados. Para confirmar, informe o identificador do projeto:\n\n' +
        `  npm run db:reset -- --confirmar=${projetoConfigurado}\n\n` +
        `Projeto configurado agora: ${projetoConfigurado}`,
    );
    process.exit(1);
  }

  console.log(`Projeto: ${projetoConfigurado}`);
  console.log('Removendo dados da aplicação...\n');

  const sql = postgres(url, { max: 1, onnotice: () => {} });

  try {
    await sql.begin(async (tx) => {
      for (const tabela of [...TABELAS, ...TABELAS_ANTERIORES]) {
        await tx.unsafe(`drop table if exists ${tabela} cascade`);
      }

      for (const tipo of TIPOS) {
        await tx.unsafe(`drop type if exists ${tipo} cascade`);
      }

      await tx.unsafe('drop function if exists set_updated_at() cascade');
    });

    console.log(`  ✓ tabelas e tipos da aplicação removidos`);

    const restantes = await sql<{ tabela: string }[]>`
      select tablename as tabela
      from pg_tables
      where schemaname = 'public'
      order by tablename
    `;

    if (restantes.length > 0) {
      console.log(
        `  · sobraram em public (não pertencem à aplicação): ${restantes
          .map((linha) => linha.tabela)
          .join(', ')}`,
      );
    }
  } finally {
    await sql.end();
  }

  if (!serviceRoleKey) {
    console.log(
      '\n  · SUPABASE_SERVICE_ROLE_KEY ausente: contas de acesso e arquivos NÃO foram\n' +
        '    removidos. O banco está limpo, mas o Auth e o Storage continuam como estavam.',
    );
    return;
  }

  const contas = await limparContasDeAcesso(supabaseUrl, serviceRoleKey);
  console.log(`  ✓ ${contas} conta(s) removida(s) do Supabase Auth`);

  const arquivos = await limparArquivos(supabaseUrl, serviceRoleKey);
  console.log(`  ✓ ${arquivos} arquivo(s) removido(s) do Storage`);

  console.log('\nAmbiente limpo. Execute `npm run db:migrate` para recriar a estrutura.');
}

main().catch((erro) => {
  console.error('\nFalhou:', erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
