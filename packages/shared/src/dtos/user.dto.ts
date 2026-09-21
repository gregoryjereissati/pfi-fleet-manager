import { UserRole, UserStatus } from '../enums';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  /** Papel efetivo. Só vale quando a situação é ACTIVE. */
  role: UserRole;
  /**
   * Papel pedido no cadastro. Guardado à parte para que uma solicitação nunca
   * se converta sozinha em permissão efetiva — o administrador vê o que foi
   * pedido e decide o que concede.
   */
  requestedRole: UserRole;
  status: UserStatus;
  /** Ficha de motorista da mesma pessoa, quando existe. */
  driverId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUserDto extends UserDto {
  cpf: string;
  phone: string;
  companyId: string | null;
  companyName: string | null;
  /**
   * Perfil da plataforma. Verdadeiro apenas para o super administrador, que
   * não pertence a empresa alguma e escolhe em qual opera. O frontend usa isto
   * para exibir o seletor de empresa e o acesso à tela de empresas.
   */
  isSuperAdmin: boolean;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

/**
 * Dados do perfil enviados à API após a criação da conta no Supabase Auth.
 *
 * A senha não faz parte deste contrato: ela é gerenciada pelo Supabase. O
 * papel indicado é uma **solicitação**, e o código da empresa apenas endereça
 * essa solicitação ao administrador correto — nenhum dos dois concede acesso.
 */
export interface RegisterProfileDto {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  companyJoinCode: string;
  requestedRole: UserRole;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

export interface RegisterProfileResponseDto {
  message: string;
  user: CurrentUserDto;
}

export interface UpdateUserRoleDto {
  role: UserRole;
}

export interface UpdateUserStatusDto {
  status: UserStatus;
  role?: UserRole;
}

export interface UpdateCurrentUserDto {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}
