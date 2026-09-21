import { NextFunction, Request, Response } from 'express';
import { type CompanyDto, type CompanySummaryDto, CompanyStatus } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { companyService, type PlatformActor } from '../services/company.service';
import type { Company } from '../types/db';

/**
 * Autor da ação de plataforma.
 *
 * Vem de `req.user`, que `authenticate` preenche a partir do perfil lido no
 * banco. Não usa `getScope` porque estas rotas existem justamente para o
 * momento em que ainda não há empresa escolhida — e portanto não há recorte.
 */
function getPlatformActor(req: Request): PlatformActor {
  if (!req.user) throw new AppError(401, 'Unauthenticated');
  return { userId: req.user.id, userName: req.user.name };
}

function toCompanyDto(empresa: Company): CompanyDto {
  return {
    id: empresa.id,
    name: empresa.name,
    cnpj: empresa.cnpj,
    joinCode: empresa.joinCode,
    // O enum do pacote compartilhado e o do domínio têm os mesmos rótulos;
    // a conversão existe porque um é enum do TypeScript e o outro é união
    // de literais, como no restante da aplicação.
    status: empresa.status as CompanyStatus,
    createdAt: empresa.createdAt.toISOString(),
  };
}

export const companyController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const empresas = await companyService.listCompanies();

      const resposta: CompanySummaryDto[] = empresas.map((empresa) => ({
        ...toCompanyDto(empresa),
        activeUsers: empresa.activeUsers,
        pendingUsers: empresa.pendingUsers,
        vehicles: empresa.vehicles,
        drivers: empresa.drivers,
      }));

      res.json(resposta);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const empresa = await companyService.createCompany(req.body, getPlatformActor(req));
      res.status(201).json(toCompanyDto(empresa));
    } catch (err) {
      next(err);
    }
  },

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const empresa = await companyService.setStatus(
        req.params.id,
        req.body.status,
        getPlatformActor(req),
      );

      res.json(toCompanyDto(empresa));
    } catch (err) {
      next(err);
    }
  },
};
