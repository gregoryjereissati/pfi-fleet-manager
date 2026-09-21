import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignmentService } from '../assignment.service';
import { assignmentRepository } from '../../repositories/assignment.repository';
import { driverRepository } from '../../repositories/driver.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
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

vi.mock('../../repositories/assignment.repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../repositories/assignment.repository')>();

  return {
    ...actual,
    assignmentRepository: {
      activeVehicleIds: vi.fn().mockResolvedValue([]),
      findActive: vi.fn().mockResolvedValue(null),
      findActiveByVehicle: vi.fn().mockResolvedValue([]),
      findHistoryByVehicle: vi.fn().mockResolvedValue([]),
      findHistoryByDriver: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'assignment-1' }),
      end: vi.fn().mockResolvedValue({}),
    },
  };
});

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: { findSummaryById: vi.fn() },
}));

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: { findManyByIds: vi.fn(), findById: vi.fn() },
}));

const vehicle = { id: 'vehicle-1', companyId: 'company-a', plate: 'ABC-1234', status: 'ACTIVE' };
const driver = { id: 'driver-1', companyId: 'company-a' };

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
});

describe('assignmentService — isolamento entre empresas', () => {
  it('não vincula a um veículo de outra empresa', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(null);

    await expect(
      assignmentService.assignDrivers(makeScope({ companyId: 'company-b' }), 'vehicle-1', [
        'driver-1',
      ]),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(assignmentRepository.create).not.toHaveBeenCalled();
  });

  it('não vincula um motorista de outra empresa', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    // A busca é feita dentro da empresa: o motorista de fora simplesmente não
    // aparece, e a contagem não fecha.
    vi.mocked(driverRepository.findManyByIds).mockResolvedValue([] as never);

    await expect(
      assignmentService.assignDrivers(makeScope(), 'vehicle-1', ['driver-de-outra-empresa']),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(driverRepository.findManyByIds).toHaveBeenCalledWith('company-a', [
      'driver-de-outra-empresa',
    ]);
    expect(assignmentRepository.create).not.toHaveBeenCalled();
  });
});

describe('assignmentService — vínculos com período', () => {
  it('abre o vínculo com data de início e autor', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(driverRepository.findManyByIds).mockResolvedValue([driver] as never);

    const start = new Date('2026-09-01');
    await assignmentService.assignDrivers(makeScope(), 'vehicle-1', ['driver-1'], start);

    expect(assignmentRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: 'company-a',
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        startDate: start,
        createdById: 'user-1',
      }),
    );
  });

  it('vincular de novo quem já está vinculado não abre um segundo vínculo', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(driverRepository.findManyByIds).mockResolvedValue([driver] as never);
    vi.mocked(assignmentRepository.findActive).mockResolvedValue({
      id: 'assignment-existente',
    } as never);

    await assignmentService.assignDrivers(makeScope(), 'vehicle-1', ['driver-1']);

    expect(assignmentRepository.create).not.toHaveBeenCalled();
  });

  it('desvincular encerra o vínculo em vez de apagá-lo', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(assignmentRepository.findActive).mockResolvedValue({
      id: 'assignment-1',
      startDate: new Date('2026-09-01'),
    } as never);

    const end = new Date('2026-09-20');
    await assignmentService.endAssignment(makeScope(), 'vehicle-1', 'driver-1', end);

    expect(assignmentRepository.end).toHaveBeenCalledWith(
      expect.anything(),
      'assignment-1',
      end,
      'user-1',
    );
    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({ action: 'UNLINK', entityType: 'ASSIGNMENT' }),
    );
  });

  it('recusa encerrar antes do início', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(assignmentRepository.findActive).mockResolvedValue({
      id: 'assignment-1',
      startDate: new Date('2026-09-10'),
    } as never);

    await expect(
      assignmentService.endAssignment(
        makeScope(),
        'vehicle-1',
        'driver-1',
        new Date('2026-09-01'),
      ),
    ).rejects.toMatchObject({ statusCode: 400, message: 'END_DATE_BEFORE_START' });

    expect(assignmentRepository.end).not.toHaveBeenCalled();
  });

  it('recusa encerrar um vínculo que não está vigente', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(vehicle as never);
    vi.mocked(assignmentRepository.findActive).mockResolvedValue(null);

    await expect(
      assignmentService.endAssignment(makeScope(), 'vehicle-1', 'driver-1'),
    ).rejects.toMatchObject({ statusCode: 404, message: 'ASSIGNMENT_NOT_FOUND' });
  });
});

describe('assignmentService — veículos autorizados', () => {
  it('gerente e administrador não têm restrição de veículo', async () => {
    await expect(assignmentService.authorizedVehicleIds(makeScope())).resolves.toBeNull();
    expect(assignmentRepository.activeVehicleIds).not.toHaveBeenCalled();
  });

  it('motorista fica restrito aos veículos com vínculo vigente', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);

    await expect(assignmentService.authorizedVehicleIds(makeDriverScope())).resolves.toEqual([
      'vehicle-1',
    ]);
  });

  it('motorista sem ficha não tem veículo autorizado', async () => {
    await expect(
      assignmentService.authorizedVehicleIds(makeDriverScope({ driverId: null })),
    ).resolves.toEqual([]);
  });

  it('o recorte de documentos do motorista cobre a própria ficha e os veículos vinculados', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);

    await expect(assignmentService.driverDataScope(makeDriverScope())).resolves.toEqual({
      driverId: 'driver-1',
      vehicleIds: ['vehicle-1'],
    });
  });

  it('não há recorte de documentos no escopo da empresa', async () => {
    await expect(assignmentService.driverDataScope(makeScope())).resolves.toBeUndefined();
  });
});
