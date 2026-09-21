import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseType, UserRole } from '@fleet-manager/shared';
import { expenseService } from '../expense.service';
import { expenseRepository } from '../../repositories/expense.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { assignmentRepository } from '../../repositories/assignment.repository';
import { AppError } from '../../middlewares/error-handler';
import {
  makeDriverScope,
  makeScope,
  registrosDeAuditoria,
  resetDbMock,
} from '../../test-helpers/db-mock';

vi.mock('../../config/database', async () => {
  const { sqlMock, emTransacaoMock } = await import('../../test-helpers/db-mock');
  return { sql: sqlMock, emTransacao: emTransacaoMock };
});

vi.mock('../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/audit')>();
  const { recordChangeMock } = await import('../../test-helpers/db-mock');
  return { ...actual, recordChange: recordChangeMock };
});

vi.mock('../../repositories/expense.repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../repositories/expense.repository')>();

  return {
    ...actual,
    expenseRepository: {
      findMany: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      uncancel: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: { findSummaryById: vi.fn() },
}));

vi.mock('../../repositories/assignment.repository', () => ({
  assignmentRepository: { activeVehicleIds: vi.fn() },
}));

const vehicleOfCompanyA = {
  id: 'vehicle-1',
  companyId: 'company-a',
  plate: 'ABC-1234',
  status: 'ACTIVE',
};

const expenseOfCompanyA = {
  id: 'expense-1',
  companyId: 'company-a',
  vehicleId: 'vehicle-1',
  type: ExpenseType.FUEL,
  // Valor monetário como o banco o entrega: texto decimal, nunca float.
  amount: '320.00',
  date: new Date('2026-09-01'),
  description: null,
  status: 'ACTIVE',
  createdById: 'driver-user-1',
  updatedById: null,
  cancelledAt: null,
  cancelledById: null,
  cancelReason: null,
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
  vehicle: { id: 'vehicle-1', plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla' },
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
});

describe('expenseService — recorte por empresa', () => {
  it('sempre consulta dentro da empresa do usuário autenticado', async () => {
    vi.mocked(expenseRepository.findMany).mockResolvedValue([] as never);

    await expenseService.listExpenses(makeScope({ companyId: 'company-a' }), {});

    expect(expenseRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-a' }),
    );
  });

  it('não encontra, por ID, um lançamento de outra empresa', async () => {
    // O recorte entra na condição da consulta: o repositório não devolve nada
    // para um identificador que pertence a outra empresa.
    vi.mocked(expenseRepository.findById).mockResolvedValue(null);

    await expect(
      expenseService.getExpense(makeScope({ companyId: 'company-b' }), 'expense-1'),
    ).rejects.toThrow(AppError);

    expect(expenseRepository.findById).toHaveBeenCalledWith(
      'expense-1',
      'company-b',
      undefined,
    );
  });

  it('recusa lançar em veículo de outra empresa', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(null);

    await expect(
      expenseService.createExpense(makeScope({ companyId: 'company-b' }), {
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
        amount: 100,
        date: new Date(),
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(expenseRepository.create).not.toHaveBeenCalled();
  });
});

describe('expenseService — escopo do motorista', () => {
  it('filtra a listagem pela própria autoria', async () => {
    vi.mocked(expenseRepository.findMany).mockResolvedValue([] as never);

    await expenseService.listExpenses(makeDriverScope(), {});

    expect(expenseRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-a', createdById: 'driver-user-1' }),
    );
  });

  it('não alcança o lançamento de outro motorista, nem por ID', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(null);

    await expect(
      expenseService.getExpense(makeDriverScope(), 'expense-de-outro'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(expenseRepository.findById).toHaveBeenCalledWith(
      'expense-de-outro',
      'company-a',
      'driver-user-1',
    );
  });

  it('gerente e administrador não são filtrados por autoria', async () => {
    vi.mocked(expenseRepository.findMany).mockResolvedValue([] as never);

    await expenseService.listExpenses(makeScope({ role: UserRole.ADMIN }), {});

    expect(expenseRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ createdById: undefined }),
    );
  });
});

describe('expenseService — vínculo com o veículo', () => {
  it('recusa lançar em veículo sem vínculo vigente', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicleOfCompanyA as never);
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-9']);

    await expect(
      expenseService.createExpense(makeDriverScope(), {
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
        amount: 100,
        date: new Date(),
      }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'VEHICLE_NOT_ASSIGNED' });

    expect(expenseRepository.create).not.toHaveBeenCalled();
  });

  it('aceita lançar em veículo vinculado e grava a autoria do token', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicleOfCompanyA as never);
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);
    vi.mocked(expenseRepository.create).mockResolvedValue(expenseOfCompanyA as never);

    await expenseService.createExpense(makeDriverScope(), {
      vehicleId: 'vehicle-1',
      type: ExpenseType.FUEL,
      amount: 100,
      date: new Date('2026-09-10'),
    });

    expect(expenseRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: 'company-a',
        createdById: 'driver-user-1',
        vehicleId: 'vehicle-1',
      }),
    );
  });

  it('o motorista sem ficha não lança em veículo algum', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicleOfCompanyA as never);

    await expect(
      expenseService.createExpense(makeDriverScope({ driverId: null }), {
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
        amount: 100,
        date: new Date(),
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('gerente lança em qualquer veículo da empresa, sem consultar vínculos', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicleOfCompanyA as never);
    vi.mocked(expenseRepository.create).mockResolvedValue(expenseOfCompanyA as never);

    await expenseService.createExpense(makeScope(), {
      vehicleId: 'vehicle-1',
      type: ExpenseType.FUEL,
      amount: 100,
      date: new Date(),
    });

    expect(assignmentRepository.activeVehicleIds).not.toHaveBeenCalled();
    expect(expenseRepository.create).toHaveBeenCalled();
  });

  it('trocar o veículo de um lançamento reaplica a verificação de vínculo', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(expenseOfCompanyA as never);
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue({
      ...vehicleOfCompanyA,
      id: 'vehicle-2',
    } as never);
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);

    await expect(
      expenseService.updateExpense(makeDriverScope(), 'expense-1', {
        vehicleId: 'vehicle-2',
      }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'VEHICLE_NOT_ASSIGNED' });

    expect(expenseRepository.update).not.toHaveBeenCalled();
  });
});

describe('expenseService — correção e histórico', () => {
  it('registra no histórico apenas o que mudou, com autor e valores', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(expenseOfCompanyA as never);
    vi.mocked(expenseRepository.update).mockResolvedValue(expenseOfCompanyA as never);

    await expenseService.updateExpense(makeScope(), 'expense-1', { amount: 450 });

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({
        companyId: 'company-a',
        entityType: 'EXPENSE',
        entityId: 'expense-1',
        action: 'UPDATE',
        actorId: 'user-1',
        actorName: 'Fulano',
        changes: { amount: { de: 320, para: 450 } },
      }),
    );
  });

  it('não grava histórico quando nada mudou de fato', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(expenseOfCompanyA as never);

    await expenseService.updateExpense(makeScope(), 'expense-1', { amount: 320 });

    expect(expenseRepository.update).not.toHaveBeenCalled();
    expect(registrosDeAuditoria()).toHaveLength(0);
  });

  it('a autoria não é editável: o corpo da requisição não a alcança', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(expenseOfCompanyA as never);
    vi.mocked(expenseRepository.update).mockResolvedValue(expenseOfCompanyA as never);

    await expenseService.updateExpense(makeScope(), 'expense-1', {
      amount: 450,
      createdById: 'outra-pessoa',
    } as never);

    // `updatedById` vem do recorte, e `createdById` não é repassado.
    const [, , data, updatedById] = vi.mocked(expenseRepository.update).mock.calls[0];
    expect(updatedById).toBe('user-1');
    expect(data).not.toHaveProperty('createdById');
  });
});

describe('expenseService — cancelamento', () => {
  it('cancela preservando o registro, com motivo e autor', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(expenseOfCompanyA as never);
    vi.mocked(expenseRepository.cancel).mockResolvedValue({
      ...expenseOfCompanyA,
      status: 'CANCELLED',
    } as never);

    await expenseService.cancelExpense(makeScope(), 'expense-1', 'duplicidade');

    expect(expenseRepository.cancel).toHaveBeenCalledWith(
      expect.anything(),
      'expense-1',
      'user-1',
      'duplicidade',
    );
    expect(expenseRepository.delete).not.toHaveBeenCalled();
    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({ action: 'CANCEL', reason: 'duplicidade' }),
    );
  });

  it('recusa cancelar duas vezes', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue({
      ...expenseOfCompanyA,
      status: 'CANCELLED',
    } as never);

    await expect(
      expenseService.cancelExpense(makeScope(), 'expense-1', 'motivo'),
    ).rejects.toMatchObject({ statusCode: 409, message: 'ALREADY_CANCELLED' });
  });

  it('recusa corrigir um lançamento cancelado', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue({
      ...expenseOfCompanyA,
      status: 'CANCELLED',
    } as never);

    await expect(
      expenseService.updateExpense(makeScope(), 'expense-1', { amount: 10 }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'EXPENSE_CANCELLED' });
  });

  it('o motorista cancela o próprio lançamento', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(expenseOfCompanyA as never);
    vi.mocked(expenseRepository.cancel).mockResolvedValue(expenseOfCompanyA as never);

    await expenseService.cancelExpense(makeDriverScope(), 'expense-1', 'erro de digitação');

    expect(expenseRepository.findById).toHaveBeenCalledWith(
      'expense-1',
      'company-a',
      'driver-user-1',
    );
  });
});

describe('expenseService — exclusão física', () => {
  it('permanece indisponível ao motorista', async () => {
    await expect(
      expenseService.deleteExpense(makeDriverScope(), 'expense-1'),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(expenseRepository.delete).not.toHaveBeenCalled();
  });

  it('registra o que foi apagado antes de apagar', async () => {
    vi.mocked(expenseRepository.findById).mockResolvedValue(expenseOfCompanyA as never);
    vi.mocked(expenseRepository.delete).mockResolvedValue(expenseOfCompanyA as never);

    await expenseService.deleteExpense(makeScope(), 'expense-1');

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({ action: 'DELETE' }),
    );
  });
});
