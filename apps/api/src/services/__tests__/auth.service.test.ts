import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import { userRepository } from '../../repositories/user.repository';
import { UserRole, UserStatus } from '@fleet-manager/shared';

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findByCpf: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock('../../lib/verify-token', () => ({
  signJwt: vi.fn().mockResolvedValue('signed-token'),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';

const baseRegister = {
  name: 'João Silva',
  cpf: '123.456.789-00',
  phone: '(85) 99999-0001',
  email: 'joao@test.com',
  password: 'senha123',
  confirmPassword: 'senha123',
  requestedRole: UserRole.OPERATOR,
  addressStreet: 'Rua A',
  addressNumber: '10',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'CE',
  addressZip: '60000-000',
};

const mockUser = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@test.com',
  cpf: '123.456.789-00',
  phone: '(85) 99999-0001',
  passwordHash: 'hashed-password',
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

describe('authService.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria usuário com status PENDING quando dados são válidos', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockResolvedValue(mockUser);

    const result = await authService.register(baseRegister);

    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'joao@test.com', passwordHash: 'hashed-password' }),
    );
    expect(result).toEqual(mockUser);
  });

  it('lança 409 EMAIL_TAKEN quando e-mail já existe', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);

    await expect(authService.register(baseRegister)).rejects.toMatchObject({
      statusCode: 409,
      message: 'EMAIL_TAKEN',
    });
    expect(userRepository.createUser).not.toHaveBeenCalled();
  });

  it('lança 409 CPF_TAKEN quando CPF já existe', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(mockUser);

    await expect(authService.register(baseRegister)).rejects.toMatchObject({
      statusCode: 409,
      message: 'CPF_TAKEN',
    });
  });

  it('lança 400 PASSWORD_MISMATCH quando senhas não conferem', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(null);

    await expect(
      authService.register({ ...baseRegister, confirmPassword: 'outra' }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'PASSWORD_MISMATCH' });
  });
});

describe('authService.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna token e dados do usuário quando credenciais são válidas', async () => {
    const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
    vi.mocked(userRepository.findByEmail).mockResolvedValue(activeUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authService.login({ email: 'joao@test.com', password: 'senha123' });

    expect(result.token).toBe('signed-token');
    expect(result.user.email).toBe('joao@test.com');
  });

  it('lança 401 INVALID_CREDENTIALS quando usuário não existe', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

    await expect(
      authService.login({ email: 'nao@existe.com', password: '123' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'INVALID_CREDENTIALS' });
  });

  it('lança 401 INVALID_CREDENTIALS quando senha está errada', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...mockUser, status: UserStatus.ACTIVE });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      authService.login({ email: 'joao@test.com', password: 'errada' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'INVALID_CREDENTIALS' });
  });

  it('lança 403 PENDING_APPROVAL quando usuário está pendente', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      authService.login({ email: 'joao@test.com', password: 'senha123' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'PENDING_APPROVAL' });
  });

  it('lança 403 BLOCKED quando usuário está bloqueado', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...mockUser, status: UserStatus.BLOCKED });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      authService.login({ email: 'joao@test.com', password: 'senha123' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'BLOCKED' });
  });
});
