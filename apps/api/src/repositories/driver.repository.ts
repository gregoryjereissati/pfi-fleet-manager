import { DriverStatus } from '@fleet-manager/shared';
import { sql, type Sql } from '../config/database';
import type { Driver } from '../types/db';
import { usuarioDaFicha } from './fragments';

export interface DriverFilters {
  /** Busca por nome ou CPF, tanto na ficha quanto no usuário vinculado. */
  search?: string;
  status?: DriverStatus;
  /** Restringe a um conjunto — usado no escopo do próprio motorista. */
  driverIds?: string[];
}

/** Dados operacionais da ficha. Nome e CPF vêm do usuário vinculado. */
export interface UpdateDriverData {
  cnh?: string | null;
  cnhExpiry?: string | null;
  phone?: string | null;
  status?: DriverStatus;
}

/** Ficha com o usuário vinculado, quando existe. */
export type DriverWithUser = Driver & {
  user: { id: string; name: string; cpf: string; email: string } | null;
};

const CAMPOS_ALTERAVEIS = [
  'cnh',
  'cnhExpiry',
  'phone',
  'status',
] as const satisfies readonly (keyof UpdateDriverData)[];

/**
 * Ficha com o usuário aninhado. O LEFT JOIN é obrigatório em toda leitura:
 * sem ele, a identidade das fichas vinculadas ficaria vazia.
 */
const fichaComUsuario = sql`
  d.*, ${usuarioDaFicha('u')} as "user"
  from drivers d
  left join users u on u.id = d.user_id
`;

export const driverRepository = {
  findMany(companyId: string, filters: DriverFilters = {}): Promise<DriverWithUser[]> {
    const { search, status, driverIds } = filters;
    const busca = search ? `%${search}%` : null;

    return sql<DriverWithUser[]>`
      select ${fichaComUsuario}
      where d.company_id = ${companyId}
        ${driverIds ? sql`and d.id = any(${driverIds}::uuid[])` : sql``}
        ${status ? sql`and d.status = ${status}` : sql``}
        ${
          busca
            ? sql`and (
                d.name ilike ${busca}
                or d.cpf like ${busca}
                or u.name ilike ${busca}
                or u.cpf like ${busca}
              )`
            : sql``
        }
      order by d.created_at desc
    ` as unknown as Promise<DriverWithUser[]>;
  },

  async findById(id: string, companyId: string): Promise<DriverWithUser | null> {
    const [ficha] = await sql<DriverWithUser[]>`
      select ${fichaComUsuario}
      where d.id = ${id} and d.company_id = ${companyId}
    `;

    return ficha ?? null;
  },

  /** Ficha do motorista correspondente a uma conta de usuário. */
  async findByUserId(userId: string, client: Sql = sql): Promise<DriverWithUser | null> {
    const [ficha] = await client<DriverWithUser[]>`
      select ${fichaComUsuario}
      where d.user_id = ${userId}
    `;

    return ficha ?? null;
  },

  /**
   * Ficha **sem** conta vinculada que tenha o mesmo CPF.
   *
   * É o que permite reaproveitar uma ficha anterior à integração em vez de
   * criar uma segunda pessoa quando o próprio motorista abre sua conta.
   */
  async findUnlinkedByCpf(
    companyId: string,
    cpf: string,
    client: Sql = sql,
  ): Promise<Driver | null> {
    const [ficha] = await client<Driver[]>`
      select * from drivers
      where company_id = ${companyId} and cpf = ${cpf} and user_id is null
    `;

    return ficha ?? null;
  },

  /** Qualquer ficha da empresa com este CPF, vinculada ou não. */
  async findAnyByCpf(companyId: string, cpf: string): Promise<DriverWithUser | null> {
    const [ficha] = await sql<DriverWithUser[]>`
      select ${fichaComUsuario}
      where d.company_id = ${companyId} and d.cpf = ${cpf}
    `;

    return ficha ?? null;
  },

  async findByCnh(companyId: string, cnh: string): Promise<Driver | null> {
    const [ficha] = await sql<Driver[]>`
      select * from drivers where company_id = ${companyId} and cnh = ${cnh}
    `;

    return ficha ?? null;
  },

  findManyByIds(companyId: string, ids: string[]): Promise<DriverWithUser[]> {
    return sql<DriverWithUser[]>`
      select ${fichaComUsuario}
      where d.company_id = ${companyId} and d.id = any(${ids}::uuid[])
    ` as unknown as Promise<DriverWithUser[]>;
  },

  /**
   * Cria a ficha operacional de um usuário já existente na empresa.
   *
   * A identidade não é redigitada: nome e CPF continuam pertencendo ao
   * usuário. Falha com violação de unicidade quando a ficha já existe — é
   * assim que aprovações repetidas ou simultâneas deixam de duplicar o
   * motorista.
   */
  async createForUser(
    client: Sql,
    data: { companyId: string; userId: string; phone?: string | null },
  ): Promise<DriverWithUser> {
    const [ficha] = await client<DriverWithUser[]>`
      with nova as (
        insert into drivers (company_id, user_id, phone)
        values (${data.companyId}, ${data.userId}, ${data.phone ?? null})
        returning *
      )
      select d.*, ${usuarioDaFicha('u')} as "user"
      from nova d
      left join users u on u.id = d.user_id
    `;

    return ficha;
  },

  /** Vincula uma ficha preexistente, sem conta, à conta do mesmo CPF. */
  async linkToUser(client: Sql, driverId: string, userId: string): Promise<DriverWithUser> {
    const [ficha] = await client<DriverWithUser[]>`
      with vinculada as (
        update drivers
        -- A identidade passa a ser a do usuário; as cópias antigas saem da
        -- ficha para que não exista uma segunda versão dos mesmos dados.
        set user_id = ${userId}, name = null, cpf = null
        where id = ${driverId}
        returning *
      )
      select d.*, ${usuarioDaFicha('u')} as "user"
      from vinculada d
      left join users u on u.id = d.user_id
    `;

    return ficha;
  },

  async update(client: Sql, id: string, data: UpdateDriverData): Promise<DriverWithUser> {
    const chaves = CAMPOS_ALTERAVEIS.filter((campo) => campo in data);

    if (chaves.length === 0) {
      const [inalterada] = await client<DriverWithUser[]>`
        select d.*, ${usuarioDaFicha('u')} as "user"
        from drivers d left join users u on u.id = d.user_id
        where d.id = ${id}
      `;
      return inalterada;
    }

    const [ficha] = await client<DriverWithUser[]>`
      with alterada as (
        update drivers set ${client(data, ...chaves)} where id = ${id} returning *
      )
      select d.*, ${usuarioDaFicha('u')} as "user"
      from alterada d
      left join users u on u.id = d.user_id
    `;

    return ficha;
  },

  async setInactive(client: Sql, id: string): Promise<DriverWithUser> {
    const [ficha] = await client<DriverWithUser[]>`
      with inativada as (
        update drivers set status = ${DriverStatus.INACTIVE} where id = ${id} returning *
      )
      select d.*, ${usuarioDaFicha('u')} as "user"
      from inativada d
      left join users u on u.id = d.user_id
    `;

    return ficha;
  },

  async hardDelete(client: Sql, id: string): Promise<Driver> {
    const [ficha] = await client<Driver[]>`
      delete from drivers where id = ${id} returning *
    `;

    return ficha;
  },

  async countDependents(id: string, companyId: string) {
    const [contagem] = await sql<{ documents: string; assignments: string }[]>`
      select
        (select count(*) from documents
          where driver_id = ${id} and company_id = ${companyId}) as documents,
        (select count(*) from vehicle_driver_assignments
          where driver_id = ${id} and company_id = ${companyId}) as assignments
    `;

    return {
      documents: Number(contagem.documents),
      assignments: Number(contagem.assignments),
    };
  },
};
