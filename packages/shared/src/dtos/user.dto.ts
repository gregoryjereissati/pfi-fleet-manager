import { UserRole } from '../enums';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRoleDto {
  role: UserRole;
}
