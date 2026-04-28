import { UserRole } from '@fleet-manager/shared'

export function isAdminRole(role: UserRole | undefined) {
  return role === UserRole.ADMIN
}

export function canManageFleet(role: UserRole | undefined) {
  return role === UserRole.ADMIN || role === UserRole.MANAGER
}
