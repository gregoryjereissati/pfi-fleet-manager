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

export interface RegisterDto {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  requestedRole: UserRole;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
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
  password?: string;
  confirmPassword?: string;
}
