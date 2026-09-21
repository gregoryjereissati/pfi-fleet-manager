import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { userController } from '../user.controller';
import { userService } from '../../services/user.service';
import { companyRepository } from '../../repositories/company.repository';
import { makeScope } from '../../test-helpers/db-mock';

vi.mock('../../services/user.service', () => ({
  userService: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    getOwnProfile: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
    updateCurrentUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

vi.mock('../../repositories/company.repository', () => ({
  companyRepository: { findById: vi.fn() },
}));

const company = { id: 'company-a', name: 'Empresa A' };

const mockUser = {
  id: 'user-1',
  companyId: 'company-a',
  name: 'Admin',
  email: 'admin@test.com',
  cpf: '000.000.000-00',
  phone: '(85) 99999-0000',
  authUserId: 'auth-uuid-1',
  role: UserRole.ADMIN,
  requestedRole: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  isSuperAdmin: false,
  driverProfile: null,
  addressStreet: 'Rua A',
  addressNumber: '1',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'CE',
  addressZip: '60000-000',
  createdAt: new Date('2026-05-06T12:00:00.000Z'),
  updatedAt: new Date('2026-05-06T12:00:00.000Z'),
};

function makeRes() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  } as unknown as Response;
}

const scope = makeScope({ role: UserRole.ADMIN, userId: 'user-1', userName: 'Admin' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(companyRepository.findById).mockResolvedValue(company as never);
});

describe('userController', () => {
  it('devolve o perfil sem dados de credencial e com a empresa', async () => {
    vi.mocked(userService.getOwnProfile).mockResolvedValue(mockUser as never);

    // `/users/me` responde a partir do perfil autenticado, e não do recorte:
    // o super administrador precisa se identificar antes de escolher empresa.
    const req = { user: mockUser, scope } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await userController.getCurrentUser(req, res, next);

    expect(userService.getOwnProfile).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      cpf: mockUser.cpf,
      phone: mockUser.phone,
      role: mockUser.role,
      requestedRole: mockUser.requestedRole,
      status: mockUser.status,
      driverId: null,
      companyId: 'company-a',
      companyName: 'Empresa A',
      isSuperAdmin: false,
      addressStreet: mockUser.addressStreet,
      addressNumber: mockUser.addressNumber,
      addressDistrict: mockUser.addressDistrict,
      addressCity: mockUser.addressCity,
      addressState: mockUser.addressState,
      addressZip: mockUser.addressZip,
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('informa a ficha de motorista de quem é motorista', async () => {
    vi.mocked(userService.getOwnProfile).mockResolvedValue({
      ...mockUser,
      role: UserRole.OPERATOR,
      driverProfile: { id: 'driver-1', status: 'ACTIVE' },
    } as never);

    const res = makeRes();
    await userController.getCurrentUser(
      { user: mockUser, scope } as unknown as Request,
      res,
      vi.fn() as unknown as NextFunction,
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ driverId: 'driver-1' }));
  });

  it('atualiza o perfil usando o id do recorte, não o do corpo', async () => {
    const body = {
      name: 'Admin Atualizado',
      cpf: '111.111.111-11',
      phone: '(85) 98888-0000',
      email: 'novo@test.com',
      addressStreet: 'Rua B',
      addressNumber: '22',
      addressDistrict: 'Aldeota',
      addressCity: 'Fortaleza',
      addressState: 'CE',
      addressZip: '60110-000',
      id: 'user-9',
    };

    const req = { scope, body } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.mocked(userService.updateCurrentUser).mockResolvedValue({
      ...mockUser,
      ...body,
      id: mockUser.id,
      updatedAt: new Date('2026-05-06T13:00:00.000Z'),
    } as never);

    await userController.updateCurrentUser(req, res, next);

    expect(userService.updateCurrentUser).toHaveBeenCalledWith('user-1', body);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('a listagem repassa o recorte e os filtros validados', async () => {
    vi.mocked(userService.listUsers).mockResolvedValue([mockUser] as never);

    const req = { scope, query: { status: UserStatus.PENDING } } as unknown as Request;
    const res = makeRes();

    await userController.listUsers(req, res, vi.fn() as unknown as NextFunction);

    expect(userService.listUsers).toHaveBeenCalledWith(scope, {
      status: UserStatus.PENDING,
    });
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'user-1', requestedRole: UserRole.ADMIN }),
    ]);
  });

  it('recusa filtro inválido na listagem', async () => {
    const req = { scope, query: { status: 'QUALQUER' } } as unknown as Request;
    const res = makeRes();

    await userController.listUsers(req, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(userService.listUsers).not.toHaveBeenCalled();
  });

  it('a aprovação repassa situação e papel ao serviço, com o recorte', async () => {
    vi.mocked(userService.updateStatus).mockResolvedValue(mockUser as never);

    const req = {
      scope,
      params: { id: 'user-2' },
      body: { status: UserStatus.ACTIVE, role: UserRole.OPERATOR },
    } as unknown as Request;

    await userController.updateStatus(
      req,
      makeRes(),
      vi.fn() as unknown as NextFunction,
    );

    expect(userService.updateStatus).toHaveBeenCalledWith(
      scope,
      'user-2',
      UserStatus.ACTIVE,
      UserRole.OPERATOR,
    );
  });

  it('recusa requisição sem recorte de acesso', async () => {
    const next = vi.fn() as unknown as NextFunction;

    await userController.getCurrentUser({} as unknown as Request, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
