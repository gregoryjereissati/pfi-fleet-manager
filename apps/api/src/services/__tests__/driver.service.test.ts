import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverStatus, UserRole, UserStatus } from '@fleet-manager/shared';
import { driverService } from '../driver.service';
import { driverRepository } from '../../repositories/driver.repository';
import { userRepository } from '../../repositories/user.repository';
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

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: {
    findByUserId: vi.fn().mockResolvedValue(null),
    findUnlinkedByCpf: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    findByCnh: vi.fn(),
    createForUser: vi.fn(),
    linkToUser: vi.fn(),
    update: vi.fn(),
    setInactive: vi.fn(),
    hardDelete: vi.fn(),
    countDependents: vi.fn().mockResolvedValue({ documents: 0, assignments: 0 }),
  },
}));

vi.mock('../../repositories/user.repository', () => ({
  userRepository: { findByIdInCompany: vi.fn() },
}));

vi.mock('../../repositories/assignment.repository', () => ({
  assignmentRepository: {
    activeIdsByDriver: vi.fn().mockResolvedValue([]),
    activeIdsByVehicle: vi.fn().mockResolvedValue([]),
    end: vi.fn().mockResolvedValue({}),
    findHistoryByDriver: vi.fn().mockResolvedValue([]),
  },
}));

const linkedDriver = {
  id: 'driver-1',
  companyId: 'company-a',
  userId: 'driver-user-1',
  name: null,
  cpf: null,
  cnh: '12345678901',
  cnhExpiry: new Date('2027-01-01'),
  phone: '(85) 90000-0000',
  status: DriverStatus.ACTIVE,
  user: {
    id: 'driver-user-1',
    name: 'Patrícia Lima',
    cpf: '55566677788',
    email: 'patricia@empresa.com',
  },
};

const activeUser = {
  id: 'user-9',
  companyId: 'company-a',
  cpf: '99988877766',
  phone: '(85) 91111-1111',
  status: UserStatus.ACTIVE,
  role: UserRole.OPERATOR,
  driverProfile: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
});

describe('driverService — recorte', () => {
  it('o motorista enxerga apenas a própria ficha', async () => {
    await driverService.listDrivers(makeDriverScope(), {});

    expect(driverRepository.findMany).toHaveBeenCalledWith('company-a', {
      driverIds: ['driver-1'],
    });
  });

  it('o motorista sem ficha não lista ninguém', async () => {
    await driverService.listDrivers(makeDriverScope({ driverId: null }), {});

    expect(driverRepository.findMany).toHaveBeenCalledWith('company-a', { driverIds: [] });
  });

  it('o gerente lista a equipe da empresa', async () => {
    await driverService.listDrivers(makeScope(), { status: DriverStatus.ACTIVE });

    expect(driverRepository.findMany).toHaveBeenCalledWith('company-a', {
      status: DriverStatus.ACTIVE,
    });
  });

  it('o motorista não abre a ficha de outro motorista', async () => {
    await expect(
      driverService.getDriver(makeDriverScope(), 'driver-9'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(driverRepository.findById).not.toHaveBeenCalled();
  });

  it('não encontra ficha de outra empresa', async () => {
    vi.mocked(driverRepository.findById).mockResolvedValue(null);

    await expect(
      driverService.getDriver(makeScope({ companyId: 'company-b' }), 'driver-1'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(driverRepository.findById).toHaveBeenCalledWith('driver-1', 'company-b');
  });
});

describe('driverService — a ficha nasce de um usuário', () => {
  it('cria a ficha a partir de quem já tem conta, sem redigitar identidade', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(activeUser as never);
    vi.mocked(driverRepository.createForUser).mockResolvedValue({ id: 'driver-9' } as never);

    await driverService.createDriverForUser(makeScope(), 'user-9');

    expect(driverRepository.createForUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: 'company-a', userId: 'user-9' }),
    );
  });

  it('recusa criar ficha para usuário de outra empresa', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(null);

    await expect(
      driverService.createDriverForUser(makeScope(), 'user-de-fora'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('recusa criar ficha para usuário que ainda não foi aprovado', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue({
      ...activeUser,
      status: UserStatus.PENDING,
    } as never);

    await expect(
      driverService.createDriverForUser(makeScope(), 'user-9'),
    ).rejects.toMatchObject({ statusCode: 409, message: 'USER_NOT_ACTIVE' });
  });

  it('recusa criar uma segunda ficha para a mesma pessoa', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue({
      ...activeUser,
      driverProfile: { id: 'driver-9', status: 'ACTIVE' },
    } as never);

    await expect(
      driverService.createDriverForUser(makeScope(), 'user-9'),
    ).rejects.toMatchObject({ statusCode: 409, message: 'DRIVER_ALREADY_EXISTS' });
  });

  it('reaproveita a ficha antiga de mesmo CPF em vez de criar outra', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(activeUser as never);
    vi.mocked(driverRepository.findUnlinkedByCpf).mockResolvedValue({
      id: 'driver-antigo',
    } as never);
    vi.mocked(driverRepository.linkToUser).mockResolvedValue({ id: 'driver-antigo' } as never);

    await driverService.createDriverForUser(makeScope(), 'user-9');

    expect(driverRepository.linkToUser).toHaveBeenCalledWith(
      expect.anything(),
      'driver-antigo',
      'user-9',
    );
    expect(driverRepository.createForUser).not.toHaveBeenCalled();
  });
});

describe('driverService — dados operacionais', () => {
  it('a identidade não é editável pela ficha', async () => {
    vi.mocked(driverRepository.findById).mockResolvedValue(linkedDriver as never);
    vi.mocked(driverRepository.update).mockResolvedValue(linkedDriver as never);

    await driverService.updateDriver(makeScope(), 'driver-1', {
      phone: '(85) 92222-2222',
      name: 'Outro Nome',
      cpf: '00000000000',
    } as never);

    const [, , payload] = vi.mocked(driverRepository.update).mock.calls[0];
    expect(payload).toEqual({ phone: '(85) 92222-2222' });
  });

  it('recusa CNH já usada por outra ficha da empresa', async () => {
    vi.mocked(driverRepository.findById).mockResolvedValue(linkedDriver as never);
    vi.mocked(driverRepository.findByCnh).mockResolvedValue({ id: 'driver-2' } as never);

    await expect(
      driverService.updateDriver(makeScope(), 'driver-1', { cnh: '99999999999' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('inativar encerra os vínculos vigentes sem apagá-los', async () => {
    vi.mocked(driverRepository.findById).mockResolvedValue(linkedDriver as never);
    vi.mocked(driverRepository.setInactive).mockResolvedValue(linkedDriver as never);
    vi.mocked(assignmentRepository.activeIdsByDriver).mockResolvedValue([
      { id: 'assignment-1' },
    ]);

    await driverService.deleteDriver(makeScope(), 'driver-1');

    expect(assignmentRepository.end).toHaveBeenCalledWith(
      expect.anything(),
      'assignment-1',
      expect.any(Date),
      'user-1',
    );
    expect(driverRepository.setInactive).toHaveBeenCalled();
  });
});

describe('driverService — exclusão permanente', () => {
  it('não é do gerente', async () => {
    await expect(
      driverService.hardDeleteDriver(makeScope({ role: UserRole.MANAGER }), 'driver-1'),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(driverRepository.hardDelete).not.toHaveBeenCalled();
  });

  it('exige que a ficha esteja inativa', async () => {
    vi.mocked(driverRepository.findById).mockResolvedValue(linkedDriver as never);

    await expect(
      driverService.hardDeleteDriver(makeScope({ role: UserRole.ADMIN }), 'driver-1'),
    ).rejects.toMatchObject({ statusCode: 409, message: 'DRIVER_MUST_BE_INACTIVE' });
  });

  it('registra o que será apagado antes de apagar', async () => {
    vi.mocked(driverRepository.findById).mockResolvedValue({
      ...linkedDriver,
      status: DriverStatus.INACTIVE,
    } as never);
    vi.mocked(driverRepository.countDependents).mockResolvedValue({
      documents: 3,
      assignments: 2,
    });
    vi.mocked(driverRepository.hardDelete).mockResolvedValue(linkedDriver as never);

    await driverService.hardDeleteDriver(makeScope({ role: UserRole.ADMIN }), 'driver-1');

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({
        action: 'DELETE',
        changes: {
          documentos: { de: 3, para: 0 },
          vinculos: { de: 2, para: 0 },
        },
      }),
    );
  });
});
