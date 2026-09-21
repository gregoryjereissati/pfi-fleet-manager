import { UserRole, UserStatus } from '@fleet-manager/shared';
import { sql, type Sql } from '../config/database';
import type { CompanyStatus, User } from '../types/db';

interface CreateUserData {
  companyId: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  authUserId: string;
  requestedRole: UserRole;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

interface UpdateUserProfileData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

export interface UserFilters {
  status?: UserStatus;
  role?: UserRole;
}

/** Perfil com a ficha de motorista vinculada, quando existe. */
export type UserWithDriverProfile = User & {
  driverProfile: { id: string; status: string } | null;
};

/** Perfil como a autenticação precisa dele: com empresa e ficha resolvidas. */
export type UserForAuth = User & {
  company: { id: string; status: CompanyStatus } | null;
  driverProfile: { id: string } | null;
};

const CAMPOS_PERFIL = [
  'name',
  'email',
  'cpf',
  'phone',
  'addressStreet',
  'addressNumber',
  'addressDistrict',
  'addressCity',
  'addressState',
  'addressZip',
] as const satisfies readonly (keyof UpdateUserProfileData)[];

/**
 * Ficha de motorista da mesma pessoa, ou `null`.
 *
 * A relação é de um para um pela coluna `drivers.user_id`, que é única.
 */
const fichaDeMotorista = sql`
  (
    select json_build_object('id', d.id, 'status', d.status)
    from drivers d
    where d.user_id = u.id
  ) as driver_profile
`;

export const userRepository = {
  /** Usuários da empresa. Nenhuma tela lista usuários de outra empresa. */
  findAllByCompany(
    companyId: string,
    filters: UserFilters = {},
  ): Promise<UserWithDriverProfile[]> {
    return sql<UserWithDriverProfile[]>`
      select u.*, ${fichaDeMotorista}
      from users u
      where u.company_id = ${companyId}
        ${filters.status ? sql`and u.status = ${filters.status}` : sql``}
        ${filters.role ? sql`and u.role = ${filters.role}` : sql``}
      order by u.created_at desc
    ` as unknown as Promise<UserWithDriverProfile[]>;
  },

  /**
   * Busca dentro da empresa. O administrador atua somente na própria empresa:
   * um identificador de fora não é encontrado.
   */
  async findByIdInCompany(
    id: string,
    companyId: string,
  ): Promise<UserWithDriverProfile | null> {
    const [usuario] = await sql<UserWithDriverProfile[]>`
      select u.*, ${fichaDeMotorista}
      from users u
      where u.id = ${id} and u.company_id = ${companyId}
    `;

    return usuario ?? null;
  },

  /**
   * O próprio perfil, com a ficha de motorista.
   *
   * Não recebe empresa porque não precisa: a linha é a da própria pessoa, e o
   * identificador vem do token já verificado. É o que permite responder
   * `/users/me` ao super administrador antes de ele escolher uma empresa.
   */
  async findOwnProfile(id: string): Promise<UserWithDriverProfile | null> {
    const [usuario] = await sql<UserWithDriverProfile[]>`
      select u.*, ${fichaDeMotorista}
      from users u
      where u.id = ${id}
    `;

    return usuario ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const [usuario] = await sql<User[]>`select * from users where id = ${id}`;
    return usuario ?? null;
  },

  /**
   * Busca global por e-mail e por CPF.
   *
   * A unicidade de pessoa é global por construção: um CPF corresponde a uma
   * pessoa, e uma pessoa tem uma conta. Só o cadastro usa estas buscas, e o
   * resultado nunca é devolvido ao cliente — apenas decide entre criar,
   * vincular ou recusar.
   */
  async findByEmail(email: string): Promise<User | null> {
    const [usuario] = await sql<User[]>`select * from users where email = ${email}`;
    return usuario ?? null;
  },

  async findByCpf(cpf: string): Promise<User | null> {
    const [usuario] = await sql<User[]>`select * from users where cpf = ${cpf}`;
    return usuario ?? null;
  },

  async findByAuthUserId(authUserId: string): Promise<User | null> {
    const [usuario] = await sql<User[]>`
      select * from users where auth_user_id = ${authUserId}
    `;
    return usuario ?? null;
  },

  /**
   * Perfil completo para a autenticação, a partir da conta do Supabase Auth.
   *
   * Traz junto a situação da empresa e a ficha de motorista porque o
   * middleware precisa das três coisas para montar o recorte de acesso — e
   * montá-lo em uma consulta evita que o recorte fique meio construído se uma
   * das buscas falhar.
   */
  async findForAuthentication(authUserId: string): Promise<UserForAuth | null> {
    const [usuario] = await sql<UserForAuth[]>`
      select
        u.*,
        case when c.id is null then null else
          json_build_object('id', c.id, 'status', c.status)
        end as company,
        (
          select json_build_object('id', d.id)
          from drivers d
          where d.user_id = u.id
        ) as driver_profile
      from users u
      left join companies c on c.id = u.company_id
      where u.auth_user_id = ${authUserId}
    `;

    return usuario ?? null;
  },

  /**
   * Atribui a empresa a um perfil que ainda não tinha nenhuma.
   *
   * Usado no cadastro, quando um perfil provisionado sem empresa apresenta o
   * código de uma. Não transfere perfis entre empresas: o serviço recusa antes
   * de chegar aqui quando a empresa já está preenchida e é outra.
   */
  async setCompany(id: string, companyId: string): Promise<User> {
    const [usuario] = await sql<User[]>`
      update users set company_id = ${companyId} where id = ${id} returning *
    `;
    return usuario;
  },

  /**
   * Vincula um perfil já existente a uma conta do Supabase Auth.
   * Usado quando o perfil foi criado previamente (por exemplo, pelo seed) e
   * a conta de acesso correspondente é criada depois.
   */
  async linkAuthUser(id: string, authUserId: string): Promise<User> {
    const [usuario] = await sql<User[]>`
      update users set auth_user_id = ${authUserId} where id = ${id} returning *
    `;
    return usuario;
  },

  /**
   * Cria o perfil como PENDING.
   *
   * O papel solicitado fica em `requestedRole` e o papel efetivo permanece no
   * padrão: uma solicitação não se converte em permissão sem aprovação.
   */
  async createUser(data: CreateUserData): Promise<User> {
    const [usuario] = await sql<User[]>`
      insert into users (
        company_id, name, email, cpf, phone, auth_user_id, requested_role, role, status,
        address_street, address_number, address_district, address_city, address_state, address_zip
      )
      values (
        ${data.companyId},
        ${data.name},
        ${data.email},
        ${data.cpf},
        ${data.phone},
        ${data.authUserId},
        ${data.requestedRole},
        ${UserRole.OPERATOR},
        ${UserStatus.PENDING},
        ${data.addressStreet},
        ${data.addressNumber},
        ${data.addressDistrict},
        ${data.addressCity},
        ${data.addressState},
        ${data.addressZip}
      )
      returning *
    `;

    return usuario;
  },

  async updateRole(client: Sql, id: string, role: UserRole): Promise<User> {
    const [usuario] = await client<User[]>`
      update users set role = ${role} where id = ${id} returning *
    `;
    return usuario;
  },

  async updateStatus(client: Sql, id: string, status: UserStatus): Promise<User> {
    const [usuario] = await client<User[]>`
      update users set status = ${status} where id = ${id} returning *
    `;
    return usuario;
  },

  async updateProfile(id: string, data: UpdateUserProfileData): Promise<User> {
    const [usuario] = await sql<User[]>`
      update users
      set ${sql(data, ...CAMPOS_PERFIL)}
      where id = ${id}
      returning *
    `;
    return usuario;
  },

  async deleteUser(client: Sql, id: string): Promise<User> {
    const [usuario] = await client<User[]>`
      delete from users where id = ${id} returning *
    `;
    return usuario;
  },
};
