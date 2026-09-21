import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseType } from '@fleet-manager/shared';
import { dashboardService } from '../dashboard.service';
import { dashboardRepository } from '../../repositories/dashboard.repository';
import { assignmentRepository } from '../../repositories/assignment.repository';
import { makeDriverScope, makeScope } from '../../test-helpers/db-mock';

vi.mock('../../repositories/dashboard.repository', () => ({
  dashboardRepository: {
    getSummary: vi.fn(),
    getExpensesByMonth: vi.fn(),
    getExpensesByType: vi.fn(),
    getExpensesByVehicle: vi.fn(),
    getRecentExpenses: vi.fn(),
  },
}));

vi.mock('../../repositories/assignment.repository', () => ({
  assignmentRepository: { activeVehicleIds: vi.fn().mockResolvedValue([]) },
}));

const emptySummary = {
  totalVehicles: 0,
  activeVehicles: 0,
  totalDrivers: 0,
  activeDrivers: 0,
  totalExpenses: 0,
  averageExpense: 0,
  expenseCount: 0,
  pendingMaintenances: 0,
  expiringDocuments: 0,
  overdueMaintenances: 0,
  expiredDocuments: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dashboardRepository.getSummary).mockResolvedValue(emptySummary);
  vi.mocked(dashboardRepository.getExpensesByMonth).mockResolvedValue([]);
  vi.mocked(dashboardRepository.getExpensesByType).mockResolvedValue([]);
  vi.mocked(dashboardRepository.getExpensesByVehicle).mockResolvedValue([]);
  vi.mocked(dashboardRepository.getRecentExpenses).mockResolvedValue([]);
});

describe('dashboardService — recorte de acesso', () => {
  it('todo bloco recebe a empresa do usuário autenticado', async () => {
    await dashboardService.getIndicators(makeScope(), {});

    for (const call of [
      vi.mocked(dashboardRepository.getSummary).mock.calls[0][0],
      vi.mocked(dashboardRepository.getExpensesByType).mock.calls[0][0],
      vi.mocked(dashboardRepository.getRecentExpenses).mock.calls[0][0],
    ]) {
      expect(call).toMatchObject({ companyId: 'company-a' });
    }
  });

  it('a empresa do recorte vence a que vier na consulta', async () => {
    await dashboardService.getIndicators(makeScope({ companyId: 'company-a' }), {
      companyId: 'company-b',
    } as never);

    expect(dashboardRepository.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-a' }),
    );
  });

  it('o motorista recebe indicadores apenas do próprio conjunto', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);

    await dashboardService.getIndicators(makeDriverScope(), {});

    expect(dashboardRepository.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-a',
        createdById: 'driver-user-1',
        driverScope: { driverId: 'driver-1', vehicleIds: ['vehicle-1'] },
      }),
    );
  });

  it('gerente e administrador não recebem filtro de autoria', async () => {
    await dashboardService.getIndicators(makeScope(), {});

    expect(dashboardRepository.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ createdById: undefined, driverScope: undefined }),
    );
  });
});

describe('dashboardService — filtros', () => {
  it('estende a data final até o fim do dia', async () => {
    await dashboardService.getIndicators(makeScope(), {
      endDate: new Date('2026-09-30T00:00:00.000Z'),
    });

    const filters = vi.mocked(dashboardRepository.getSummary).mock.calls[0][0];
    expect(filters.endDate?.toISOString()).toBe('2026-09-30T23:59:59.999Z');
  });

  it('repassa veículo, tipo e período', async () => {
    const startDate = new Date('2026-09-01');
    const endDate = new Date('2026-09-30');

    await dashboardService.getIndicators(makeScope(), {
      vehicleId: 'vehicle-1',
      type: ExpenseType.FUEL,
      startDate,
      endDate,
    });

    expect(dashboardRepository.getExpensesByVehicle).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
        startDate,
      }),
      5,
    );
  });

  it('devolve os cinco blocos do painel', async () => {
    const result = await dashboardService.getIndicators(makeScope(), {});

    expect(result).toEqual({
      summary: emptySummary,
      expensesByMonth: [],
      expensesByType: [],
      expensesByVehicle: [],
      recentExpenses: [],
    });
  });
});
