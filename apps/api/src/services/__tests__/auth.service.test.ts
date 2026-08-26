import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole, UserStatus } from '@fleet-manager/shared';

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findByCpf: vi.fn(),
    findByAuthUserId: vi.fn(),
    createUser: vi.fn(),
    linkAuthUser: vi.fn(),
  },
}));

import { authService } from '../auth.service';
import { userRepository } from '../../repositories/user.repository';

const authUser = {
  authUserId: 'auth-uuid-1',
  email: 'joao@test.com',
};

const profileData = {
  name: 'João Silva',
  cpf: '123.456.789-00',
  phone: '(85) 99999-0001',
  email: 'joao@test.com',
  requestedRole: UserRole.OPERATOR,
  addressStreet: 'Rua A',
  addressNumber: '10',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'ce',
  addressZip: '60000-000',
};

const mockUser = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@test.com',
  cpf: '12345678900',
  phone: '(85) 99999-0001',
  authUserId: 'auth-uuid-1',
  role: UserRole.OPERATOR,
  status: UserStatus.PENDING,
  addressStreet: 'Rua A',
  addressNumber: '10',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'CE',
  addressZip: '60000-000',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('authService.registerProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria o perfil com situação PENDING e vincula a conta do Supabase', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockResolvedValue(mockUser);

    const result = await authService.registerProfile(authUser, profileData);

    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: 'auth-uuid-1',
        email: 'joao@test.com',
        role: UserRole.OPERATOR,
      }),
    );
    expect(result).toEqual(mockUser);
  });

  it('normaliza o CPF removendo pontuação e a UF em maiúsculas', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockResolvedValue(mockUser);

    await authService.registerProfile(authUser, profileData);

    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ cpf: '12345678900', addressState: 'CE' }),
    );
  });

  it('rejeita quando a conta do Supabase já possui perfil', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(mockUser);

    await expect(authService.registerProfile(authUser, profileData)).rejects.toThrow(
      'PROFILE_ALREADY_EXISTS',
    );
    expect(userRepository.createUser).not.toHaveBeenCalled();
  });

  it('rejeita quando o e-mail já pertence a outro perfil vinculado', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      ...mockUser,
      authUserId: 'outra-conta',
    });

    await expect(authService.registerProfile(authUser, profileData)).rejects.toThrow('EMAIL_TAKEN');
    expect(userRepository.createUser).not.toHaveBeenCalled();
  });

  it('vincula perfil preexistente sem conta, preservando papel e situação', async () => {
    const seeded = {
      ...mockUser,
      id: 'user-seed',
      authUserId: null,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    };
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(seeded);
    vi.mocked(userRepository.linkAuthUser).mockResolvedValue({
      ...seeded,
      authUserId: 'auth-uuid-1',
    });

    const result = await authService.registerProfile(authUser, profileData);

    expect(userRepository.linkAuthUser).toHaveBeenCalledWith('user-seed', 'auth-uuid-1');
    expect(userRepository.createUser).not.toHaveBeenCalled();
    expect(result.role).toBe(UserRole.ADMIN);
    expect(result.status).toBe(UserStatus.ACTIVE);
  });

  it('rejeita quando o CPF já está em uso por outro perfil', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue({ ...mockUser, id: 'outro' });

    await expect(authService.registerProfile(authUser, profileData)).rejects.toThrow('CPF_TAKEN');
    expect(userRepository.createUser).not.toHaveBeenCalled();
  });

  it('prefere o e-mail verificado pelo Supabase ao informado no formulário', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockResolvedValue(mockUser);

    await authService.registerProfile(
      { authUserId: 'auth-uuid-1', email: 'verificado@test.com' },
      { ...profileData, email: 'digitado@test.com' },
    );

    expect(userRepository.findByEmail).toHaveBeenCalledWith('verificado@test.com');
    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'verificado@test.com' }),
    );
  });

  it('usa o e-mail do formulário quando o token não traz e-mail', async () => {
    vi.mocked(userRepository.findByAuthUserId).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockResolvedValue(mockUser);

    await authService.registerProfile({ authUserId: 'auth-uuid-1', email: '' }, profileData);

    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'joao@test.com' }),
    );
  });
});
