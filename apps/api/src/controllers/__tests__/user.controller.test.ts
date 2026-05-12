import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { userController } from '../user.controller';
import { userService } from '../../services/user.service';

vi.mock('../../services/user.service', () => ({
  userService: {
    listUsers: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
    updateCurrentUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@test.com',
  cpf: '000.000.000-00',
  phone: '(85) 99999-0000',
  passwordHash: 'hash',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
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

describe('userController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getCurrentUser retorna dto sanitizado sem passwordHash', async () => {
    const req = { user: mockUser } as Request;
    const res = makeRes();

    await userController.getCurrentUser(req, res);

    expect(res.json).toHaveBeenCalledWith({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      cpf: mockUser.cpf,
      phone: mockUser.phone,
      role: mockUser.role,
      status: mockUser.status,
      addressStreet: mockUser.addressStreet,
      addressNumber: mockUser.addressNumber,
      addressDistrict: mockUser.addressDistrict,
      addressCity: mockUser.addressCity,
      addressState: mockUser.addressState,
      addressZip: mockUser.addressZip,
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });
  });

  it('updateCurrentUser chama userService com o id autenticado e retorna dto sanitizado', async () => {
    const req = {
      user: mockUser,
      body: {
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
      },
    } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    const updatedUser = {
      ...mockUser,
      ...req.body,
      updatedAt: new Date('2026-05-06T13:00:00.000Z'),
    };

    vi.mocked(userService.updateCurrentUser).mockResolvedValue(updatedUser);

    await userController.updateCurrentUser(req, res, next);

    expect(userService.updateCurrentUser).toHaveBeenCalledWith(mockUser.id, req.body);
    expect(res.json).toHaveBeenCalledWith({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      cpf: updatedUser.cpf,
      phone: updatedUser.phone,
      role: updatedUser.role,
      status: updatedUser.status,
      addressStreet: updatedUser.addressStreet,
      addressNumber: updatedUser.addressNumber,
      addressDistrict: updatedUser.addressDistrict,
      addressCity: updatedUser.addressCity,
      addressState: updatedUser.addressState,
      addressZip: updatedUser.addressZip,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    });
    expect(next).not.toHaveBeenCalled();
  });
});
