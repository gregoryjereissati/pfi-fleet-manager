import { UserRole } from '@fleet-manager/shared';

/**
 * Recorte de acesso do usuário autenticado.
 *
 * Toda consulta e toda escrita da aplicação são feitas dentro deste recorte.
 * Ele é montado a partir do token verificado e do perfil consultado no banco —
 * **nunca** a partir de dados enviados pelo cliente.
 */
export interface AccessScope {
  /** Perfil do usuário na aplicação (`User.id`). */
  userId: string;
  /** Nome no momento da ação, usado no histórico de alterações. */
  userName: string;
  /** Empresa à qual o usuário pertence. Fronteira de isolamento. */
  companyId: string;
  /** Papel efetivo. Nunca o papel solicitado no cadastro. */
  role: UserRole;
  /**
   * Ficha de motorista da mesma pessoa, quando existe.
   * Nulo para quem não atua como motorista.
   */
  driverId: string | null;
  /**
   * Verdadeiro quando quem age é o super administrador da plataforma.
   *
   * O recorte dele é montado com `role` ADMIN e a empresa que escolheu, de
   * modo que serviços e repositórios não precisem saber da existência dele:
   * dentro da empresa escolhida, ele **é** um administrador. Este campo existe
   * para o que fica fora desse recorte — gerenciar empresas e trocar de
   * empresa — e para que o histórico possa distinguir a origem da ação.
   */
  isSuperAdmin: boolean;
}

/** Super administrador da plataforma, agindo em qualquer empresa. */
export function isPlatformAdmin(scope: AccessScope): boolean {
  return scope.isSuperAdmin;
}

/** Administrador da empresa cliente: controla os acessos da própria empresa. */
export function isCompanyAdmin(scope: AccessScope): boolean {
  return scope.role === UserRole.ADMIN;
}

/**
 * Trabalha no escopo da empresa inteira: administrador e gerente.
 * Contrapõe-se ao escopo do motorista, restrito aos próprios lançamentos.
 */
export function hasCompanyWideScope(scope: AccessScope): boolean {
  return scope.role === UserRole.ADMIN || scope.role === UserRole.MANAGER;
}

/**
 * Escopo de motorista: enxerga e altera apenas os lançamentos de sua autoria.
 *
 * Compartilhar um veículo com outro motorista **não** dá acesso aos
 * lançamentos dele.
 */
export function isDriverScope(scope: AccessScope): boolean {
  return scope.role === UserRole.OPERATOR;
}

/**
 * Autor pelo qual as consultas devem ser filtradas, ou `undefined` quando o
 * usuário trabalha no escopo da empresa.
 *
 * Usado para montar o `where` dos repositórios sem espalhar a regra de papel
 * por eles.
 */
export function authorFilter(scope: AccessScope): string | undefined {
  return isDriverScope(scope) ? scope.userId : undefined;
}
