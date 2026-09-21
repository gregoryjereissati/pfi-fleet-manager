import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, VehicleStatus } from '@fleet-manager/shared';
import { vehicleService } from '../vehicle.service';
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

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: {
    findMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    findSummaryById: vi.fn(),
    findByPlate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setInactive: vi.fn(),
    hardDelete: vi.fn(),
    countDependents: vi
      .fn()
      .mockResolvedValue({ expenses: 0, maintenances: 0, documents: 0, assignments: 0 }),
  },
}));

vi.mock('../../repositories/assignment.repository', () => ({
  assignmentRepository: {
    activeIdsByVehicle: vi.fn().mockResolvedValue([]),
    activeIdsByDriver: vi.fn().mockResolvedValue([]),
    activeVehicleIds: vi.fn().mockResolvedValue([]),
    end: vi.fn(),
  },
}));

const vehicle = {
  id: 'vehicle-1',
  companyId: 'company-a',
  plate: 'ABC-1234',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2022,
  color: 'PRATA',
  status: VehicleStatus.ACTIVE,
  assignments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
});

describe('vehicleService — recorte por empresa', () => {
  it('lista sempre dentro da empresa', async () => {
    await vehicleService.listVehicles(makeScope(), { status: VehicleStatus.ACTIVE });

    expect(vehicleRepository.findMany).toHaveBeenCalledWith('company-a', {
      status: VehicleStatus.ACTIVE,
    });
  });

  it('não encontra veículo de outra empresa por ID', async () => {
    vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

    await expect(
      vehicleService.getVehicle(makeScope({ companyId: 'company-b' }), 'vehicle-1'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(vehicleRepository.findById).toHaveBeenCalledWith('vehicle-1', 'company-b');
  });

  it('a placa é única dentro da empresa, e a busca é recortada', async () => {
    vi.mocked(vehicleRepository.findByPlate).mockResolvedValue(null);
    vi.mocked(vehicleRepository.create).mockResolvedValue(vehicle as never);

    await vehicleService.createVehicle(makeScope(), {
      plate: 'ABC-1234',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
    });

    expect(vehicleRepository.findByPlate).toHaveBeenCalledWith('company-a', 'ABC-1234');
    expect(vehicleRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      'company-a',
      expect.objectContaining({ plate: 'ABC-1234' }),
    );
  });

  it('recusa placa repetida na mesma empresa', async () => {
    vi.mocked(vehicleRepository.findByPlate).mockResolvedValue(vehicle as never);

    await expect(
      vehicleService.createVehicle(makeScope(), {
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('vehicleService — escopo do motorista', () => {
  it('a listagem devolve apenas os veículos vinculados', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);

    await vehicleService.listVehicles(makeDriverScope(), {});

    expect(vehicleRepository.findMany).toHaveBeenCalledWith('company-a', {
      vehicleIds: ['vehicle-1'],
    });
  });

  it('o motorista sem vínculo não enxerga a frota', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue([]);

    await vehicleService.listVehicles(makeDriverScope(), {});

    expect(vehicleRepository.findMany).toHaveBeenCalledWith('company-a', { vehicleIds: [] });
  });

  it('um veículo fora do vínculo responde como inexistente', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-9']);

    await expect(
      vehicleService.getVehicle(makeDriverScope(), 'vehicle-1'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(vehicleRepository.findById).not.toHaveBeenCalled();
  });

  it('um veículo vinculado é acessível', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);
    vi.mocked(vehicleRepository.findById).mockResolvedValue(vehicle as never);

    await expect(
      vehicleService.getVehicle(makeDriverScope(), 'vehicle-1'),
    ).resolves.toMatchObject({ id: 'vehicle-1' });
  });
});

describe('vehicleService — inativar e excluir', () => {
  it('inativar encerra os vínculos e preserva o histórico financeiro', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(vehicleRepository.setInactive).mockResolvedValue(vehicle as never);
    vi.mocked(assignmentRepository.activeIdsByVehicle).mockResolvedValue([
      { id: 'assignment-1' },
    ]);

    await vehicleService.deleteVehicle(makeScope(), 'vehicle-1');

    expect(assignmentRepository.end).toHaveBeenCalled();
    expect(vehicleRepository.setInactive).toHaveBeenCalled();
    // Nada é apagado: despesas e manutenções seguem existindo.
    expect(vehicleRepository.hardDelete).not.toHaveBeenCalled();
  });

  it('a exclusão permanente não é do gerente', async () => {
    await expect(
      vehicleService.hardDeleteVehicle(makeScope({ role: UserRole.MANAGER }), 'vehicle-1'),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(vehicleRepository.hardDelete).not.toHaveBeenCalled();
  });

  it('a exclusão permanente exige veículo inativo', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);

    await expect(
      vehicleService.hardDeleteVehicle(makeScope({ role: UserRole.ADMIN }), 'vehicle-1'),
    ).rejects.toMatchObject({ statusCode: 409, message: 'VEHICLE_MUST_BE_INACTIVE' });
  });

  it('a exclusão permanente registra a contagem do que foi apagado', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue({
      ...vehicle,
      status: VehicleStatus.INACTIVE,
    } as never);
    vi.mocked(vehicleRepository.countDependents).mockResolvedValue({
      expenses: 40,
      maintenances: 12,
      documents: 5,
      assignments: 3,
    });
    vi.mocked(vehicleRepository.hardDelete).mockResolvedValue(vehicle as never);

    await vehicleService.hardDeleteVehicle(makeScope({ role: UserRole.ADMIN }), 'vehicle-1');

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({
        action: 'DELETE',
        changes: expect.objectContaining({
          despesas: { de: 40, para: 0 },
          manutencoes: { de: 12, para: 0 },
        }),
      }),
    );
  });

  it('a prévia da exclusão só funciona dentro da empresa', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(null);

    await expect(
      vehicleService.previewHardDelete(makeScope({ companyId: 'company-b' }), 'vehicle-1'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('vehicleService — correção', () => {
  it('registra o que mudou, com autor', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(vehicleRepository.findById).mockResolvedValue(vehicle as never);
    vi.mocked(vehicleRepository.update).mockResolvedValue(vehicle as never);

    await vehicleService.updateVehicle(makeScope(), 'vehicle-1', { color: 'PRETO' });

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({
        entityType: 'VEHICLE',
        changes: { color: { de: 'PRATA', para: 'PRETO' } },
        actorName: 'Fulano',
      }),
    );
  });

  it('não deixa o cliente trocar a empresa do veículo', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(vehicleRepository.findById).mockResolvedValue(vehicle as never);
    vi.mocked(vehicleRepository.update).mockResolvedValue(vehicle as never);

    await vehicleService.updateVehicle(makeScope(), 'vehicle-1', {
      color: 'PRETO',
      companyId: 'company-b',
    } as never);

    const [, , payload] = vi.mocked(vehicleRepository.update).mock.calls[0];
    expect(payload).toEqual({ color: 'PRETO' });
  });
});
