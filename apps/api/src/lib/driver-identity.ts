/**
 * Identidade do motorista.
 *
 * Motorista e usuário são a mesma pessoa. Quando a ficha está vinculada a uma
 * conta, nome e CPF pertencem ao `User` e não são duplicados na ficha; as
 * colunas próprias existem apenas para as fichas anteriores à integração.
 *
 * Este módulo é o único lugar que decide de onde a identidade vem, para que
 * não haja duas respostas diferentes em telas diferentes.
 */

export interface DriverIdentitySource {
  name: string | null;
  cpf: string | null;
  user: { id: string; name: string; cpf: string; email: string } | null;
}

export interface DriverIdentity {
  name: string;
  cpf: string | null;
  email: string | null;
  /** Verdadeiro quando a ficha tem conta de acesso vinculada. */
  linkedToUser: boolean;
}

export function resolveDriverIdentity(driver: DriverIdentitySource): DriverIdentity {
  if (driver.user) {
    return {
      name: driver.user.name,
      cpf: driver.user.cpf,
      email: driver.user.email,
      linkedToUser: true,
    };
  }

  return {
    name: driver.name ?? '',
    cpf: driver.cpf,
    email: null,
    linkedToUser: false,
  };
}
