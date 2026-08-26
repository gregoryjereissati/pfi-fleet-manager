import { UserRole, UserStatus } from '../enums';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUserDto extends UserDto {
  cpf: string;
  phone: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

/**
 * Dados do perfil enviados à API após a criação da conta no Supabase Auth.
 * A senha não faz parte deste contrato: ela é gerenciada pelo Supabase.
 */
export interface RegisterProfileDto {
  name: string;
  cpf: string;
  phone: string;
  email: string;
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
