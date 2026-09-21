import type { CompanyStatus } from '../enums';

/**
 * Empresa cliente, como a plataforma a apresenta.
 *
 * Só o super administrador alcança estes dados: para os demais perfis a
 * empresa é o recorte em que trabalham, não um registro que consultam.
 */
export interface CompanyDto {
  id: string;
  name: string;
  cnpj: string | null;
  /**
   * Código apresentado no cadastro para endereçar a solicitação à empresa
   * certa. Não concede acesso algum por si.
   */
  joinCode: string;
  status: CompanyStatus;
  createdAt: string;
}

/** Empresa com o resumo que a tela de plataforma exibe. */
export interface CompanySummaryDto extends CompanyDto {
  activeUsers: number;
  pendingUsers: number;
  vehicles: number;
  drivers: number;
}

/** Dados para criar uma empresa. */
export interface CreateCompanyDto {
  name: string;
  cnpj?: string | null;
  joinCode: string;
}
