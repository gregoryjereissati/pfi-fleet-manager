import { UserRole } from '@fleet-manager/shared'

export function isAdminRole(role: UserRole | undefined) {
  return role === UserRole.ADMIN
}

export function canManageFleet(role: UserRole | undefined) {
  return role === UserRole.ADMIN || role === UserRole.MANAGER
}

/** Tela em que o motorista entra e para onde volta. */
export const TELA_INICIAL_DO_MOTORISTA = '/expenses'

/** Telas abertas ao motorista. As demais ficam apagadas no menu. */
const TELAS_DO_MOTORISTA = [TELA_INICIAL_DO_MOTORISTA, '/maintenances', '/alerts', '/profile']

/**
 * Indica se o papel abre a tela do caminho informado.
 *
 * Só o motorista tem restrição aqui. É uma regra de apresentação: o que cada
 * papel alcança continua decidido pelo servidor, a cada requisição.
 */
export function podeAbrirTela(role: UserRole | undefined, caminho: string) {
  if (role !== UserRole.OPERATOR) return true
  return TELAS_DO_MOTORISTA.some((tela) => caminho === tela || caminho.startsWith(`${tela}/`))
}
