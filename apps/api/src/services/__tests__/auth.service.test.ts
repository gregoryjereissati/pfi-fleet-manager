import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { authService } from '../auth.service';
import { userRepository } from '../../repositories/user.repository';
import { companyRepository } from '../../repositories/company.repository';
import { resetDbMock } from '../../test-helpers/db-mock';

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
    setCompany: vi.fn(),
    findByAuthUserId: vi.fn(),
    findByEmail: vi.fn(),
    findByCpf: vi.fn(),
    linkAuthUser: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock('../../repositories/company.repository', () => ({
  companyRepository: { findByJoinCode: vi.fn() },
}));

const authUser = { authUserId: 'auth-uuid-1', email: 'novo@empresa.com' };
const company = { id: 'company-a', name: 'Empresa A', joinCode: 'EMPRESA-A' };

const registerData = {
  name: 'Novo Usuário',
  cpf: '123.456.789-00',
  phone: '(85) 90000-0000',
  email: 'novo@empresa.com',
  companyJoinCode: 'EMPRESA-A',
  requestedRole: UserRole.MANAGER,
  addressStreet: 'Rua A',
  addressNumber: '1',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'ce',
  addressZip: '60000-000',
};

const createdUser = {
  id: 'user-1',
  companyId: 'company-a',
  name: 'Novo Usuário',
  email: 'novo@empresa.com',
  cpf: '12345678900',
  phone: '(85) 90000-0000',
  authUserId: 'auth-uuid-1',
  role: UserRole.OPERATOR,
  requestedRole: UserRole.MANAGER,
  status: UserStatus.PENDING,
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
  vi.mocked(companyRepository.findByJoinCode).mockResolvedValue(company as never);
  vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
  vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
  vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
  vi.mocked(userRepository.createUser).mockResolvedValue(createdUser as never);
});

describe('authService — cadastro é solicitação, não concessão', () => {
  it('cria o perfil na empresa identificada pelo código', async () => {
    await authService.registerProfile(authUser, registerData);

    expect(companyRepository.findByJoinCode).toHaveBeenCalledWith('EMPRESA-A');
    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-a',
        cpf: '12345678900',
        email: 'novo@empresa.com',
        addressState: 'CE',
      }),
    );
  });

  it('guarda o papel pedido sem convertê-lo em papel efetivo', async () => {
    await authService.registerProfile(authUser, registerData);

    const [payload] = vi.mocked(userRepository.createUser).mock.calls[0];
    expect(payload.requestedRole).toBe(UserRole.MANAGER);
    // O papel efetivo e a situação são decididos pelo repositório, sempre no
    // mínimo e sempre pendentes — o cadastro não os escolhe.
    expect(payload).not.toHaveProperty('role');
    expect(payload).not.toHaveProperty('status');
  });

  it('recusa um código de empresa inexistente ou inativo', async () => {
    vi.mocked(companyRepository.findByJoinCode).mockResolvedValue(null);

    await expect(
      authService.registerProfile(authUser, registerData),
    ).rejects.toMatchObject({ statusCode: 404, message: 'COMPANY_NOT_FOUND' });

    expect(userRepository.createUser).not.toHaveBeenCalled();
  });

  it('recusa quando a conta já tem perfil', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(createdUser as never);

    await expect(
      authService.registerProfile(authUser, registerData),
    ).rejects.toMatchObject({ statusCode: 409, message: 'PROFILE_ALREADY_EXISTS' });
  });

  it('recusa e-mail que já pertence a outra conta de acesso', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      ...createdUser,
      authUserId: 'outra-conta',
    } as never);

    await expect(
      authService.registerProfile(authUser, registerData),
    ).rejects.toMatchObject({ statusCode: 409, message: 'EMAIL_TAKEN' });
  });

  it('recusa CPF já cadastrado', async () => {
    vi.mocked(userRepository.findByCpf).mockResolvedValue({ id: 'outro' } as never);

    await expect(
      authService.registerProfile(authUser, registerData),
    ).rejects.toMatchObject({ statusCode: 409, message: 'CPF_TAKEN' });

    expect(userRepository.createUser).not.toHaveBeenCalled();
  });
});

describe('authService — perfis criados antes da conta de acesso', () => {
  it('vincula o perfil existente preservando papel e situação', async () => {
    const seeded = {
      ...createdUser,
      id: 'user-seed',
      authUserId: null,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    };

    vi.mocked(userRepository.findByEmail).mockResolvedValue(seeded as never);
    vi.mocked(userRepository.linkAuthUser).mockResolvedValue({
      ...seeded,
      authUserId: 'auth-uuid-1',
    } as never);

    const result = await authService.registerProfile(authUser, registerData);

    expect(userRepository.linkAuthUser).toHaveBeenCalledWith('user-seed', 'auth-uuid-1');
    expect(userRepository.createUser).not.toHaveBeenCalled();
    expect(result.role).toBe(UserRole.ADMIN);
    expect(result.status).toBe(UserStatus.ACTIVE);
  });

  it('preenche a empresa do perfil que ainda não tinha uma', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      ...createdUser,
      id: 'user-seed',
      authUserId: null,
      companyId: null,
    } as never);
    vi.mocked(userRepository.linkAuthUser).mockResolvedValue(createdUser as never);

    await authService.registerProfile(authUser, registerData);

    expect(userRepository.setCompany).toHaveBeenCalledWith('user-seed', 'company-a');
  });

  it('recusa transferir de empresa um perfil que já pertence a outra', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      ...createdUser,
      id: 'user-seed',
      authUserId: null,
      companyId: 'company-b',
    } as never);

    await expect(
      authService.registerProfile(authUser, registerData),
    ).rejects.toMatchObject({ statusCode: 409, message: 'COMPANY_MISMATCH' });

    expect(userRepository.linkAuthUser).not.toHaveBeenCalled();
  });
});
