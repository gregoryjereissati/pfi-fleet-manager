import { UserRole } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { userRepository } from '../repositories/user.repository';
import type { SupabaseAuthUser } from '../lib/verify-token';
import type { RegisterProfileDto } from '@fleet-manager/shared';

/**
 * Serviço de cadastro de perfis.
 *
 * As credenciais (e-mail e senha) são gerenciadas pelo Supabase Auth. Este
 * serviço cuida apenas do **perfil da aplicação**: os dados cadastrais, o
 * papel de acesso e a situação de aprovação, que permanecem sob controle do
 * Fleet Manager.
 */
export const authService = {
  /**
   * Cria — ou vincula — o perfil correspondente a uma conta do Supabase Auth.
   *
   * Quando já existe um perfil com o mesmo e-mail e sem conta vinculada (caso
   * dos perfis criados pelo seed), o perfil existente é reaproveitado e seu
   * papel e situação são preservados. Caso contrário, um novo perfil é criado
   * com situação `PENDING`, aguardando aprovação de um administrador.
   */
  async registerProfile(authUser: SupabaseAuthUser, data: RegisterProfileDto) {
    const alreadyLinked = await userRepository.findByAuthUserId(authUser.authUserId);
    if (alreadyLinked) throw new AppError(409, 'PROFILE_ALREADY_EXISTS');

    const email = (authUser.email || data.email).trim().toLowerCase();
    const existingByEmail = await userRepository.findByEmail(email);

    if (existingByEmail) {
      if (existingByEmail.authUserId) throw new AppError(409, 'EMAIL_TAKEN');
      return userRepository.linkAuthUser(existingByEmail.id, authUser.authUserId);
    }

    const cpf = data.cpf.replace(/\D/g, '');
    const cpfExists = await userRepository.findByCpf(cpf);
    if (cpfExists) throw new AppError(409, 'CPF_TAKEN');

    return userRepository.createUser({
      name: data.name.trim(),
      cpf,
      phone: data.phone.trim(),
      email,
      authUserId: authUser.authUserId,
      role: data.requestedRole ?? UserRole.OPERATOR,
      addressStreet: data.addressStreet.trim(),
      addressNumber: data.addressNumber.trim(),
      addressDistrict: data.addressDistrict.trim(),
      addressCity: data.addressCity.trim(),
      addressState: data.addressState.trim().toUpperCase(),
      addressZip: data.addressZip.trim(),
    });
  },
};
