import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaintenanceStatus, MaintenanceType } from '@fleet-manager/shared';
import { maintenanceService } from '../maintenance.service';
import { maintenanceRepository } from '../../repositories/maintenance.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { assignmentRepository } from '../../repositories/assignment.repository';
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

vi.mock('../../repositories/maintenance.repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../repositories/maintenance.repository')>();

  return {
    ...actual,
    maintenanceRepository: {
      findMany: vi.fn().mockResolvedValue([]),
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
  assignmentRepository: { activeVehicleIds: vi.fn().mockResolvedValue([]) },
}));

const vehicle = { id: 'vehicle-1', companyId: 'company-a', plate: 'ABC-1234', status: 'ACTIVE' };

const maintenance = {
  id: 'maintenance-1',
  companyId: 'company-a',
  vehicleId: 'vehicle-1',
  type: MaintenanceType.PREVENTIVE,
  status: MaintenanceStatus.SCHEDULED,
  description: 'Revisão 50.000 km',
  scheduledDate: new Date('2026-09-20'),
  completedDate: null,
  createdById: 'driver-user-1',
  updatedById: null,
  cancelledAt: null,
  cancelledById: null,
  cancelReason: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
});

describe('maintenanceService — recorte', () => {
  it('lista dentro da empresa', async () => {
    await maintenanceService.listMaintenances(makeScope(), {});

    expect(maintenanceRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-a', createdById: undefined }),
    );
  });

  it('o motorista lista apenas as manutenções que registrou', async () => {
    await maintenanceService.listMaintenances(makeDriverScope(), {});

    expect(maintenanceRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ createdById: 'driver-user-1' }),
    );
  });

  it('não encontra manutenção de outra empresa', async () => {
    vi.mocked(maintenanceRepository.findById).mockResolvedValue(null);

    await expect(
      maintenanceService.getMaintenance(makeScope({ companyId: 'company-b' }), 'maintenance-1'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('maintenanceService — registro pelo motorista', () => {
  it('o motorista registra manutenção do veículo vinculado', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);
    vi.mocked(maintenanceRepository.create).mockResolvedValue(maintenance as never);

    await maintenanceService.createMaintenance(makeDriverScope(), {
      vehicleId: 'vehicle-1',
      type: MaintenanceType.CORRECTIVE,
      description: 'Pneu furado na estrada',
      scheduledDate: new Date('2026-09-21'),
    });

    expect(maintenanceRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: 'company-a',
        createdById: 'driver-user-1',
        type: MaintenanceType.CORRECTIVE,
      }),
    );
  });

  it('recusa registrar em veículo sem vínculo', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue([]);

    await expect(
      maintenanceService.createMaintenance(makeDriverScope(), {
        vehicleId: 'vehicle-1',
        type: MaintenanceType.PREVENTIVE,
        description: 'Revisão',
        scheduledDate: new Date(),
      }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'VEHICLE_NOT_ASSIGNED' });
  });
});

describe('maintenanceService — conclusão e cancelamento', () => {
  it('concluir sem informar data usa a data do momento', async () => {
    vi.mocked(maintenanceRepository.findById).mockResolvedValue(maintenance as never);
    vi.mocked(maintenanceRepository.update).mockResolvedValue(maintenance as never);

    await maintenanceService.updateMaintenance(makeScope(), 'maintenance-1', {
      status: MaintenanceStatus.DONE,
    });

    const [, , payload] = vi.mocked(maintenanceRepository.update).mock.calls[0];
    expect(payload.completedDate).toBeInstanceOf(Date);
  });

  it('reabrir limpa a data de conclusão', async () => {
    vi.mocked(maintenanceRepository.findById).mockResolvedValue({
      ...maintenance,
      status: MaintenanceStatus.DONE,
      completedDate: new Date('2026-09-10'),
    } as never);
    vi.mocked(maintenanceRepository.update).mockResolvedValue(maintenance as never);

    await maintenanceService.updateMaintenance(makeScope(), 'maintenance-1', {
      status: MaintenanceStatus.SCHEDULED,
    });

    const [, , payload] = vi.mocked(maintenanceRepository.update).mock.calls[0];
    expect(payload.completedDate).toBeNull();
  });

  it('o cancelamento não passa pela edição, porque exige motivo', async () => {
    vi.mocked(maintenanceRepository.findById).mockResolvedValue(maintenance as never);

    await expect(
      maintenanceService.updateMaintenance(makeScope(), 'maintenance-1', {
        status: MaintenanceStatus.CANCELLED,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'USE_CANCEL_ENDPOINT' });

    expect(maintenanceRepository.update).not.toHaveBeenCalled();
  });

  it('cancelar preserva o registro e guarda o motivo', async () => {
    vi.mocked(maintenanceRepository.findById).mockResolvedValue(maintenance as never);
    vi.mocked(maintenanceRepository.cancel).mockResolvedValue(maintenance as never);

    await maintenanceService.cancelMaintenance(
      makeScope(),
      'maintenance-1',
      'serviço feito em outra oficina',
    );

    expect(maintenanceRepository.cancel).toHaveBeenCalledWith(
      expect.anything(),
      'maintenance-1',
      'user-1',
      'serviço feito em outra oficina',
    );
    expect(maintenanceRepository.delete).not.toHaveBeenCalled();
    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({ action: 'CANCEL' }),
    );
  });

  it('recusa editar uma manutenção cancelada', async () => {
    vi.mocked(maintenanceRepository.findById).mockResolvedValue({
      ...maintenance,
      status: MaintenanceStatus.CANCELLED,
    } as never);

    await expect(
      maintenanceService.updateMaintenance(makeScope(), 'maintenance-1', {
        description: 'outra coisa',
      }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'MAINTENANCE_CANCELLED' });
  });

  it('a exclusão física continua fora do alcance do motorista', async () => {
    await expect(
      maintenanceService.deleteMaintenance(makeDriverScope(), 'maintenance-1'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
