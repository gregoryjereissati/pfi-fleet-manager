import { sql, type Sql } from '../config/database';
import { CompanyStatus, type Company } from '../types/db';

/**
 * Empresa com contagens, para a tela de plataforma.
 *
 * As contagens vêm como texto porque `count(*)` é `bigint`; a conversão
 * acontece na camada acima, onde o contrato é numérico.
 */
export type CompanyWithSummary = Company & {
  activeUsers: string;
  pendingUsers: string;
  vehicles: string;
  drivers: string;
};

export const companyRepository = {
  /**
   * Cria a empresa.
   *
   * Chamado apenas pelo provisionamento, que roda fora da aplicação: criar
   * empresa é o único ato que não pode depender de aprovação, porque ainda não
   * existe quem aprove. Não há rota correspondente por isso.
   */
  async create(
    client: Sql,
    dados: { name: string; joinCode: string; cnpj: string | null },
  ): Promise<Company> {
    const [empresa] = await client<Company[]>`
      insert into companies (name, join_code, cnpj)
      values (${dados.name}, ${dados.joinCode}, ${dados.cnpj})
      returning *
    `;

    return empresa;
  },

  async findById(id: string): Promise<Company | null> {
    const [empresa] = await sql<Company[]>`
      select * from companies where id = ${id}
    `;

    return empresa ?? null;
  },

  /**
   * Todas as empresas, com um resumo do que cada uma tem.
   *
   * É a única consulta do sistema que atravessa a fronteira de empresa, e por
   * isso está isolada aqui: só o super administrador a alcança, pela rota de
   * plataforma. Nenhum dado operacional é exposto — apenas contagens, o
   * suficiente para escolher onde entrar.
   */
  listarComResumo(): Promise<CompanyWithSummary[]> {
    return sql<CompanyWithSummary[]>`
      select
        c.*,
        (select count(*) from users u
          where u.company_id = c.id and u.status = 'ACTIVE') as active_users,
        (select count(*) from users u
          where u.company_id = c.id and u.status = 'PENDING') as pending_users,
        (select count(*) from vehicles v where v.company_id = c.id) as vehicles,
        (select count(*) from drivers d where d.company_id = c.id) as drivers
      from companies c
      order by c.name
    ` as unknown as Promise<CompanyWithSummary[]>;
  },

  async atualizarSituacao(
    client: Sql,
    id: string,
    status: CompanyStatus,
  ): Promise<Company> {
    const [empresa] = await client<Company[]>`
      update companies set status = ${status} where id = ${id} returning *
    `;

    return empresa;
  },

  /** Empresa com o mesmo código, em qualquer situação. */
  async findAnyByJoinCode(joinCode: string): Promise<Company | null> {
    const [empresa] = await sql<Company[]>`
      select * from companies where join_code = ${joinCode.trim().toUpperCase()}
    `;

    return empresa ?? null;
  },

  /**
   * Localiza a empresa pelo código apresentado no cadastro.
   *
   * O código apenas direciona a solicitação ao administrador correto: quem o
   * apresenta entra como PENDING e não recebe permissão alguma até ser
   * aprovado. Empresas inativas não recebem novas solicitações.
   */
  async findByJoinCode(joinCode: string): Promise<Company | null> {
    const [empresa] = await sql<Company[]>`
      select *
      from companies
      where join_code = ${joinCode.trim().toUpperCase()}
        and status = ${CompanyStatus.ACTIVE}
    `;

    return empresa ?? null;
  },
};
