import { Router } from 'express';
import { z } from 'zod';
import { CompanyStatus } from '@fleet-manager/shared';
import { companyController } from '../controllers/company.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizePlatform } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

/**
 * Rotas de plataforma: as únicas que existem fora do recorte de uma empresa.
 *
 * Usam `authorizePlatform`, e não `authorize(...)`, por dois motivos. O
 * primeiro é que não há papel a conferir — a condição de super administrador
 * não é um papel. O segundo é que `authorize` exige recorte de empresa, e
 * estas são exatamente as rotas que ele precisa alcançar **antes** de escolher
 * uma.
 */
export const companyRouter = Router();

const createCompanySchema = z.object({
  name: z.string().min(2, 'Informe o nome da empresa'),
  cnpj: z.string().optional().nullable(),
  // O código endereça a solicitação de cadastro à empresa certa. Não concede
  // acesso, mas é digitado por quem se cadastra: precisa ser legível.
  joinCode: z
    .string()
    .min(4, 'O código precisa de ao menos 4 caracteres')
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/, 'Use apenas letras, números e hífen'),
});

const setStatusSchema = z.object({
  status: z.nativeEnum(CompanyStatus),
});

companyRouter.use(authenticate, authorizePlatform());

companyRouter.get('/', companyController.list);
companyRouter.post('/', validate(createCompanySchema), companyController.create);
companyRouter.patch('/:id/status', validate(setStatusSchema), companyController.setStatus);
