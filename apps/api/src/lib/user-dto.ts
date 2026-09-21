import type { User } from '../types/db';
import { type CurrentUserDto, type UserDto, UserRole, UserStatus } from '@fleet-manager/shared';

/** Perfil com a ficha de motorista, quando a consulta a incluiu. */
export type UserWithDriverProfile = User & {
  driverProfile?: { id: string; status: string } | null;
};

export function toUserDto(user: UserWithDriverProfile): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    /** O papel pedido no cadastro, para que o administrador saiba o que decide. */
    requestedRole: user.requestedRole as UserRole,
    status: user.status as UserStatus,
    driverId: user.driverProfile?.id ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toCurrentUserDto(
  user: UserWithDriverProfile,
  company?: { id: string; name: string } | null,
): CurrentUserDto {
  return {
    ...toUserDto(user),
    cpf: user.cpf,
    phone: user.phone,
    // A empresa **efetiva**, não a do perfil. Coincidem para todo mundo,
    // exceto para o super administrador: o perfil dele não tem empresa, e a
    // que vale é a que ele escolheu operar. Tirar o id de um lugar e o nome de
    // outro produziria uma resposta que se contradiz.
    companyId: company?.id ?? user.companyId,
    companyName: company?.name ?? null,
    isSuperAdmin: user.isSuperAdmin,
    addressStreet: user.addressStreet,
    addressNumber: user.addressNumber,
    addressDistrict: user.addressDistrict,
    addressCity: user.addressCity,
    addressState: user.addressState,
    addressZip: user.addressZip,
  };
}
