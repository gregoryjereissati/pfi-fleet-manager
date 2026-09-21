import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { driverRepository } from '../../repositories/driver.repository';
import { makeScope, registrosDeAuditoria, resetDbMock } from '../../test-helpers/db-mock';

vi.mock('../../config/database', async () => {
  const { sqlMock, emTransacaoMock } = await import('../../test-helpers/db-mock');
  return { sql: sqlMock, emTransacao: emTransacaoMock };
});

vi.mock('../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/audit')>();
  const { recordChangeMock } = await import('../../test-helpers/db-mock');
  return { ...actual, recordChange: recordChangeMock };
});

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAllByCompany: vi.fn(),
    findByIdInCompany: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByCpf: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
    updateProfile: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: {
    findByUserId: vi.fn().mockResolvedValue(null),
    findUnlinkedByCpf: vi.fn().mockResolvedValue(null),
    createForUser: vi.fn(),
    linkToUser: vi.fn(),
  },
}));

const adminScope = makeScope({ role: UserRole.ADMIN, userId: 'admin-1', userName: 'Admin' });

const pendingUser = {
  id: 'user-2',
  companyId: 'company-a',
  name: 'Patrícia Lima',
  email: 'patricia@empresa.com',
  cpf: '55566677788',
  phone: '(85) 97777-2222',
  role: UserRole.OPERATOR,
  requestedRole: UserRole.OPERATOR,
  status: UserStatus.PENDING,
  driverProfile: null,
};

/**
 * Violação de unicidade como o PostgreSQL a relata.
 *
 * O código é o do próprio banco, não uma tradução do ORM: é o que a aplicação
 * passa a reconhecer para distinguir aprovação simultânea de erro real.
 */
function uniqueViolation() {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    constraint_name: 'drivers_user_id_key',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
  vi.mocked(userRepository.updateStatus).mockImplementation(
    ((_client: unknown, id: string, status: unknown) =>
      Promise.resolve({ ...pendingUser, id, status })) as never,
  );
  vi.mocked(userRepository.updateRole).mockImplementation(
    ((_client: unknown, id: string, role: unknown) =>
      Promise.resolve({ ...pendingUser, id, role })) as never,
  );
});

describe('userService — administrador atua só na própria empresa', () => {
  it('lista apenas os usuários da empresa', async () => {
    vi.mocked(userRepository.findAllByCompany).mockResolvedValue([] as never);

    await userService.listUsers(adminScope, { status: UserStatus.PENDING });

    expect(userRepository.findAllByCompany).toHaveBeenCalledWith('company-a', {
      status: UserStatus.PENDING,
    });
  });

  it('não aprova usuário de outra empresa', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(null);

    await expect(
      userService.updateStatus(adminScope, 'user-de-outra-empresa', UserStatus.ACTIVE),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(userRepository.findByIdInCompany).toHaveBeenCalledWith(
      'user-de-outra-empresa',
      'company-a',
    );
    expect(userRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('não altera o papel de usuário de outra empresa', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(null);

    await expect(
      userService.updateRole(adminScope, 'user-de-fora', UserRole.MANAGER),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(userRepository.updateRole).not.toHaveBeenCalled();
  });

  it('não altera a própria situação', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue({
      ...pendingUser,
      id: 'admin-1',
    } as never);

    await expect(
      userService.updateStatus(adminScope, 'admin-1', UserStatus.BLOCKED),
    ).rejects.toMatchObject({ statusCode: 403, message: 'CANNOT_CHANGE_OWN_STATUS' });
  });
});

describe('userService — aprovação cria a ficha de motorista', () => {
  it('aprovar como motorista cria a ficha, sem redigitar a identidade', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(pendingUser as never);
    vi.mocked(driverRepository.createForUser).mockResolvedValue({ id: 'driver-1' } as never);

    await userService.updateStatus(
      adminScope,
      'user-2',
      UserStatus.ACTIVE,
      UserRole.OPERATOR,
    );

    expect(driverRepository.createForUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: 'company-a', userId: 'user-2' }),
    );

    const [, payload] = vi.mocked(driverRepository.createForUser).mock.calls[0];
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('cpf');
  });

  it('aprovação repetida não cria um segundo motorista', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue({
      ...pendingUser,
      status: UserStatus.ACTIVE,
    } as never);
    vi.mocked(driverRepository.findByUserId).mockResolvedValue({ id: 'driver-1' } as never);

    await userService.updateStatus(adminScope, 'user-2', UserStatus.ACTIVE, UserRole.OPERATOR);

    expect(driverRepository.createForUser).not.toHaveBeenCalled();
  });

  it('aprovações simultâneas não duplicam: a segunda relê a ficha da primeira', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(pendingUser as never);
    // A primeira consulta não vê ficha; a inserção esbarra na unicidade de
    // `userId`, e a releitura devolve a ficha criada pela outra requisição.
    vi.mocked(driverRepository.findByUserId)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'driver-1' } as never);
    vi.mocked(driverRepository.createForUser).mockRejectedValue(uniqueViolation());

    await expect(
      userService.updateStatus(adminScope, 'user-2', UserStatus.ACTIVE, UserRole.OPERATOR),
    ).resolves.toBeDefined();
  });

  it('reaproveita a ficha antiga de mesmo CPF em vez de criar outra pessoa', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(pendingUser as never);
    vi.mocked(driverRepository.findByUserId).mockResolvedValue(null);
    vi.mocked(driverRepository.findUnlinkedByCpf).mockResolvedValue({
      id: 'driver-antigo',
    } as never);
    vi.mocked(driverRepository.linkToUser).mockResolvedValue({ id: 'driver-antigo' } as never);

    await userService.updateStatus(adminScope, 'user-2', UserStatus.ACTIVE, UserRole.OPERATOR);

    expect(driverRepository.linkToUser).toHaveBeenCalledWith(
      expect.anything(),
      'driver-antigo',
      'user-2',
    );
    expect(driverRepository.createForUser).not.toHaveBeenCalled();
  });

  it('aprovar como gerente não cria ficha de motorista', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(pendingUser as never);

    await userService.updateStatus(adminScope, 'user-2', UserStatus.ACTIVE, UserRole.MANAGER);

    expect(driverRepository.createForUser).not.toHaveBeenCalled();
  });

  it('recusar a solicitação não cria ficha alguma', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(pendingUser as never);

    await userService.updateStatus(adminScope, 'user-2', UserStatus.REJECTED);

    expect(driverRepository.createForUser).not.toHaveBeenCalled();
    expect(userRepository.updateStatus).toHaveBeenCalledWith(
      expect.anything(),
      'user-2',
      UserStatus.REJECTED,
    );
  });

  it('registra a decisão no histórico, com quem decidiu', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(pendingUser as never);

    await userService.updateStatus(adminScope, 'user-2', UserStatus.ACTIVE, UserRole.MANAGER);

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({
        entityType: 'USER',
        entityId: 'user-2',
        actorId: 'admin-1',
        actorName: 'Admin',
        changes: {
          status: { de: UserStatus.PENDING, para: UserStatus.ACTIVE },
          role: { de: UserRole.OPERATOR, para: UserRole.MANAGER },
        },
      }),
    );
  });
});

describe('userService — conta protegida e remoção', () => {
  it('a conta protegida não muda de papel', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue({
      ...pendingUser,
      email: 'admin@fleet-manager.com',
    } as never);

    await expect(
      userService.updateRole(adminScope, 'user-2', UserRole.OPERATOR),
    ).rejects.toMatchObject({ statusCode: 403, message: 'PROTECTED_ACCOUNT' });
  });

  it('recusa remover quem tem ficha de motorista, para não apagar histórico', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue({
      ...pendingUser,
      driverProfile: { id: 'driver-1', status: 'ACTIVE' },
    } as never);

    await expect(userService.deleteUser(adminScope, 'user-2')).rejects.toMatchObject({
      statusCode: 409,
      message: 'USER_HAS_DRIVER_PROFILE',
    });

    expect(userRepository.deleteUser).not.toHaveBeenCalled();
  });

  it('remove quem não tem ficha, registrando a remoção antes', async () => {
    vi.mocked(userRepository.findByIdInCompany).mockResolvedValue(pendingUser as never);
    vi.mocked(userRepository.deleteUser).mockResolvedValue(pendingUser as never);

    await userService.deleteUser(adminScope, 'user-2');

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({ action: 'DELETE', entityType: 'USER' }),
    );
    expect(userRepository.deleteUser).toHaveBeenCalled();
  });
});
