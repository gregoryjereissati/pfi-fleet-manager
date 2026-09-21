import { Request, Response, NextFunction } from 'express';
import { CompanyStatus, UserStatus } from '../types/db';
import { UserRole } from '@fleet-manager/shared';
import { verifySupabaseToken } from '../lib/verify-token';
import { userRepository } from '../repositories/user.repository';
import { companyRepository } from '../repositories/company.repository';

/**
 * Cabeçalho em que o super administrador informa a empresa que está operando.
 * Ignorado para qualquer outro perfil.
 */
const CABECALHO_EMPRESA = 'X-Company-Id';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Exige um token válido do Supabase Auth, mas **não** exige que o usuário já
 * possua perfil na aplicação.
 *
 * É usado no cadastro: entre criar a conta no Supabase e criar o perfil no
 * Fleet Manager existe um intervalo em que a pessoa está autenticada mas
 * ainda não tem registro em `User`.
 */
export async function requireSupabaseSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  try {
    req.authUser = await verifySupabaseToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Exige token válido do Supabase Auth **e** perfil ativo na aplicação.
 *
 * O perfil é reconsultado no banco a cada requisição, de modo que bloqueios e
 * alterações de papel tenham efeito imediato, sem depender da expiração do
 * token emitido pelo Supabase. A mesma consulta traz a empresa e a ficha de
 * motorista, que compõem o recorte de acesso.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  let authUser;

  try {
    authUser = await verifySupabaseToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await userRepository.findForAuthentication(authUser.authUserId);

  if (!user) {
    // Conta de acesso válida, porém sem perfil no Fleet Manager. O frontend
    // interpreta este código redirecionando para a conclusão do cadastro.
    res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
    return;
  }

  if (user.status === UserStatus.PENDING) {
    res.status(403).json({ error: 'PENDING_APPROVAL' });
    return;
  }

  if (user.status === UserStatus.REJECTED) {
    res.status(403).json({ error: 'REJECTED' });
    return;
  }

  if (user.status === UserStatus.BLOCKED) {
    res.status(403).json({ error: 'BLOCKED' });
    return;
  }

  const { company, driverProfile, ...profile } = user;

  req.user = profile;
  req.authUser = authUser;

  // ---------------------------------------------------------------------------
  // Super administrador da plataforma
  // ---------------------------------------------------------------------------
  // Ele não pertence a empresa alguma: a empresa em que age vem da escolha que
  // fez, transmitida no cabeçalho da requisição.
  //
  // Aceitar empresa vinda do cliente parece contrariar a regra de que o recorte
  // nunca se apoia em dado enviado por ele. A regra continua valendo, porque a
  // condição que autoriza essa escolha — `is_super_admin` — foi lida agora do
  // banco, e não do que chegou na requisição. Para todo perfil comum o
  // cabeçalho é simplesmente ignorado.
  if (profile.isSuperAdmin) {
    const escolhida = req.header(CABECALHO_EMPRESA)?.trim();

    // Sem empresa escolhida ele segue autenticado, porém sem recorte: alcança
    // as rotas de plataforma — listar e criar empresas — e nenhuma outra.
    // `authorize` responde COMPANY_NOT_SELECTED nas demais.
    if (!escolhida) {
      next();
      return;
    }

    const empresa = await companyRepository.findById(escolhida);

    if (!empresa) {
      res.status(404).json({ error: 'COMPANY_NOT_FOUND' });
      return;
    }

    if (empresa.status !== CompanyStatus.ACTIVE) {
      res.status(403).json({ error: 'COMPANY_INACTIVE' });
      return;
    }

    // Dentro da empresa escolhida ele **é** um administrador. Montar o recorte
    // assim mantém serviços, repositórios e testes sem saber que existe um
    // super administrador: o isolamento por empresa continua exatamente o
    // mesmo, e a autoria registrada no histórico continua sendo a dele.
    req.scope = {
      userId: profile.id,
      userName: profile.name,
      companyId: empresa.id,
      role: UserRole.ADMIN,
      driverId: null,
      isSuperAdmin: true,
    };

    next();
    return;
  }

  // ---------------------------------------------------------------------------
  // Perfis comuns
  // ---------------------------------------------------------------------------
  // Perfil sem empresa não recebe acesso, e tampouco é atribuído a alguma por
  // inferência: a correção é administrativa, não automática.
  if (!company) {
    res.status(403).json({ error: 'NO_COMPANY' });
    return;
  }

  if (company.status !== CompanyStatus.ACTIVE) {
    res.status(403).json({ error: 'COMPANY_INACTIVE' });
    return;
  }

  req.scope = {
    userId: profile.id,
    userName: profile.name,
    companyId: company.id,
    role: profile.role as UserRole,
    driverId: driverProfile?.id ?? null,
    isSuperAdmin: false,
  };

  next();
}
