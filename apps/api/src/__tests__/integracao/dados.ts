import { sql } from '../../config/database';

/**
 * Apoio dos testes de integração.
 *
 * Eles rodam contra o Supabase hospedado, sobre a base fictícia criada por
 * `db:seed`. Não criam nem alteram nada fora de transações revertidas: o que
 * cada teste grava desaparece ao final, e a base continua a mesma para a
 * execução seguinte.
 */

/** Verdadeiro quando há conexão configurada para rodar contra o banco. */
export const temBanco = Boolean(process.env.DATABASE_URL);

/** Códigos das empresas criadas pelo seed. */
export const CODIGO_EMPRESA_A = 'LITORAL2026';
export const CODIGO_EMPRESA_B = 'SERTAO2026';

export interface EmpresaDeTeste {
  companyId: string;
  adminId: string;
  gerenteId: string;
  /** Usuário e ficha do primeiro motorista, em ordem de criação. */
  motorista1UserId: string;
  motorista1Id: string;
  motorista2UserId: string;
  motorista2Id: string;
  /** Veículo com dois motoristas vinculados. */
  veiculoCompartilhadoId: string;
  segundoVeiculoId: string;
}

/**
 * Resolve os identificadores da empresa semeada a partir do código de acesso.
 *
 * Os identificadores são gerados pelo banco a cada `db:seed`, então nada pode
 * ser fixado no teste. As pessoas são localizadas pelo papel e pela ordem de
 * criação, e os veículos pela placa — dados estáveis entre execuções.
 */
export async function carregarEmpresa(joinCode: string): Promise<EmpresaDeTeste> {
  const [empresa] = await sql<{ id: string }[]>`
    select id from companies where join_code = ${joinCode}
  `;

  if (!empresa) {
    throw new Error(
      `A empresa de código ${joinCode} não existe. Execute "npm run db:seed" antes ` +
        'dos testes de integração.',
    );
  }

  const [admin] = await sql<{ id: string }[]>`
    select id from users
    where company_id = ${empresa.id} and role = 'ADMIN' and status = 'ACTIVE'
    order by created_at limit 1
  `;

  const [gerente] = await sql<{ id: string }[]>`
    select id from users
    where company_id = ${empresa.id} and role = 'MANAGER' and status = 'ACTIVE'
    order by created_at limit 1
  `;

  const motoristas = await sql<{ id: string; userId: string }[]>`
    select id, user_id from drivers
    where company_id = ${empresa.id} and user_id is not null
    order by created_at
  `;

  const veiculos = await sql<{ id: string; plate: string }[]>`
    select id, plate from vehicles where company_id = ${empresa.id} order by plate
  `;

  if (!admin || !gerente || motoristas.length < 2 || veiculos.length < 2) {
    throw new Error(
      `A base fictícia de ${joinCode} está incompleta. Recrie com db:reset, db:migrate e db:seed.`,
    );
  }

  return {
    companyId: empresa.id,
    adminId: admin.id,
    gerenteId: gerente.id,
    motorista1UserId: motoristas[0].userId,
    motorista1Id: motoristas[0].id,
    motorista2UserId: motoristas[1].userId,
    motorista2Id: motoristas[1].id,
    veiculoCompartilhadoId: veiculos[0].id,
    segundoVeiculoId: veiculos[1].id,
  };
}

/**
 * Executa o corpo dentro de uma transação e reverte ao final.
 *
 * Usado nos testes que precisam gravar. Nada sobrevive: a base fictícia não é
 * alterada por rodar a suíte.
 */
export async function emTransacaoRevertida(
  fn: (tx: typeof sql) => Promise<void>,
): Promise<void> {
  const marca = '__reverter_teste__';

  await sql
    .begin(async (tx) => {
      await fn(tx as unknown as typeof sql);
      throw new Error(marca);
    })
    .catch((erro: Error) => {
      if (erro.message !== marca) throw erro;
    });
}
