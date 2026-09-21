import { UserRole } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { userRepository } from '../repositories/user.repository';
import { companyRepository } from '../repositories/company.repository';
import type { SupabaseAuthUser } from '../lib/verify-token';
import type { RegisterProfileDto } from '@fleet-manager/shared';

/**
 * Serviço de cadastro de perfis.
 *
 * As credenciais (e-mail e senha) são gerenciadas pelo Supabase Auth. Este
 * serviço cuida apenas do **perfil da aplicação**: os dados cadastrais, a
 * empresa pretendida, o papel solicitado e a situação de aprovação, que
 * permanecem sob controle do Fleet Manager.
 *
 * O cadastro é uma **solicitação**. Ele nunca concede acesso: o perfil nasce
 * PENDING, o papel efetivo nasce no mínimo, e o papel pedido fica guardado em
 * `requestedRole` até que um administrador da empresa decida.
 */
export const authService = {
  async registerProfile(authUser: SupabaseAuthUser, data: RegisterProfileDto) {
    const alreadyLinked = await userRepository.findByAuthUserId(authUser.authUserId);
    if (alreadyLinked) throw new AppError(409, 'PROFILE_ALREADY_EXISTS');

    // A empresa é identificada por um código apresentado por quem se cadastra.
    // O código não concede nada — apenas endereça a solicitação.
    const company = await companyRepository.findByJoinCode(data.companyJoinCode);
    if (!company) throw new AppError(404, 'COMPANY_NOT_FOUND');

    const email = (authUser.email || data.email).trim().toLowerCase();
    const existingByEmail = await userRepository.findByEmail(email);

    if (existingByEmail) {
      if (existingByEmail.authUserId) throw new AppError(409, 'EMAIL_TAKEN');

      // Perfil criado antes da conta de acesso — caso do seed e dos perfis
      // provisionados. Papel e situação são preservados; a empresa também,
      // e um código que aponte para outra empresa é recusado em vez de
      // transferir o perfil em silêncio.
      if (existingByEmail.companyId && existingByEmail.companyId !== company.id) {
        throw new AppError(409, 'COMPANY_MISMATCH');
      }

      if (!existingByEmail.companyId) {
        await userRepository.setCompany(existingByEmail.id, company.id);
      }

      return userRepository.linkAuthUser(existingByEmail.id, authUser.authUserId);
    }

    const cpf = data.cpf.replace(/\D/g, '');
    const cpfExists = await userRepository.findByCpf(cpf);
    if (cpfExists) throw new AppError(409, 'CPF_TAKEN');

    return userRepository.createUser({
      companyId: company.id,
      name: data.name.trim(),
      cpf,
      phone: data.phone.trim(),
      email,
      authUserId: authUser.authUserId,
      requestedRole: data.requestedRole ?? UserRole.OPERATOR,
      addressStreet: data.addressStreet.trim(),
      addressNumber: data.addressNumber.trim(),
      addressDistrict: data.addressDistrict.trim(),
      addressCity: data.addressCity.trim(),
      addressState: data.addressState.trim().toUpperCase(),
      addressZip: data.addressZip.trim(),
    });
  },
};
