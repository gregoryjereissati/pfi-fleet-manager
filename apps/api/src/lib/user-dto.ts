import type { User } from '@prisma/client';
import { type CurrentUserDto, type UserDto, UserRole, UserStatus } from '@fleet-manager/shared';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toCurrentUserDto(user: User): CurrentUserDto {
  return {
    ...toUserDto(user),
    cpf: user.cpf,
    phone: user.phone,
    addressStreet: user.addressStreet,
    addressNumber: user.addressNumber,
    addressDistrict: user.addressDistrict,
    addressCity: user.addressCity,
    addressState: user.addressState,
    addressZip: user.addressZip,
  };
}
