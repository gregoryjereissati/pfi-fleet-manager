const ROLE_CLAIM = 'https://fleet-manager.com/role'

type FleetRole = 'ADMIN' | 'MANAGER' | 'OPERATOR'

function isFleetRole(value: unknown): value is FleetRole {
  return value === 'ADMIN' || value === 'MANAGER' || value === 'OPERATOR'
}

export function getUserRole(user: unknown): FleetRole | undefined {
  if (!user || typeof user !== 'object') return undefined

  const rawRole = (user as Record<string, unknown>)[ROLE_CLAIM]
  return isFleetRole(rawRole) ? rawRole : undefined
}

export function canManageFleet(user: unknown): boolean {
  const role = getUserRole(user)
  return !role || role === 'ADMIN' || role === 'MANAGER'
}
