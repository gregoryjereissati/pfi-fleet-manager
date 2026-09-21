import { emTransacao, sql } from '../src/config/database';
import { companyRepository } from '../src/repositories/company.repository';
import { userRepository } from '../src/repositories/user.repository';
import { UserRole, UserStatus } from '../src/types/db';

/**
 * Provisiona uma empresa e o seu primeiro administrador.
 *
 * Por que isto é um script e não uma rota
 * ---------------------------------------
 * Criar empresa é o único ato que não pode depender de aprovação — não existe
 * ainda quem aprove. Expor isso publicamente permitiria a qualquer pessoa
 * criar uma empresa e tornar-se administradora dela. Enquanto o desenho de
 * contratação não estiver decidido, o provisionamento fica fora da aplicação,
 * ao alcance de quem já tem acesso ao banco.
 *
 * O que ele faz
 * -------------
 * 1. Cria a empresa com um código de acesso.
 * 2. Cria o perfil do primeiro administrador, já ACTIVE e **sem** conta de
 *    acesso vinculada.
 * 3. A pessoa se cadastra pela tela normal, com o mesmo e-mail e o código da
 *    empresa; o perfil existente é vinculado à conta, preservando o papel.
 *
 * A senha nunca passa por aqui: ela é do Supabase Auth.
 *
 * Uso:
 *   npm run provisionar --workspace @fleet-manager/api -- \
 *     --empresa "Transportes Silva" \
 *     --codigo TSILVA-01 \
 *     --admin-nome "Maria Silva" \
 *     --admin-email maria@transportessilva.com.br \
 *     --admin-cpf 12345678900 \
 *     --admin-telefone "(85) 99999-0000"
 */

function arg(nome: string): string | undefined {
  const index = process.argv.indexOf(`--${nome}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function exigir(nome: string): string {
  const valor = arg(nome);

  if (!valor || valor.startsWith('--')) {
    console.error(`Argumento obrigatório ausente: --${nome}`);
    process.exit(1);
  }

  return valor.trim();
}

async function main() {
  const nomeEmpresa = exigir('empresa');
  const codigo = exigir('codigo').toUpperCase();
  const cnpj = arg('cnpj')?.replace(/\D/g, '') || null;

  const adminNome = exigir('admin-nome');
  const adminEmail = exigir('admin-email').toLowerCase();
  const adminCpf = exigir('admin-cpf').replace(/\D/g, '');
  const adminTelefone = exigir('admin-telefone');

  const codigoEmUso = await companyRepository.findByJoinCode(codigo);
  if (codigoEmUso) {
    console.error(`O código ${codigo} já pertence à empresa "${codigoEmUso.name}".`);
    process.exit(1);
  }

  const emailEmUso = await userRepository.findByEmail(adminEmail);
  if (emailEmUso) {
    console.error(`Já existe perfil com o e-mail ${adminEmail}.`);
    process.exit(1);
  }

  const cpfEmUso = await userRepository.findByCpf(adminCpf);
  if (cpfEmUso) {
    console.error('Já existe perfil com o CPF informado.');
    process.exit(1);
  }

  // Empresa e administrador nascem juntos: uma empresa sem administrador não
  // teria como aprovar ninguém, nem a si mesma. As verificações acima reduzem
  // a chance de colisão, mas quem decide é a restrição de unicidade do banco —
  // e a transação garante que uma empresa não fique órfã se o perfil falhar.
  const { empresa, admin } = await emTransacao(async (tx) => {
    const empresa = await companyRepository.create(tx, {
      name: nomeEmpresa,
      joinCode: codigo,
      cnpj,
    });

    const [admin] = await tx<{ id: string; name: string; email: string }[]>`
      insert into users (
        company_id, name, email, cpf, phone,
        role, requested_role, status,
        address_street, address_number, address_district,
        address_city, address_state, address_zip
      )
      values (
        ${empresa.id}, ${adminNome}, ${adminEmail}, ${adminCpf}, ${adminTelefone},
        ${UserRole.ADMIN}, ${UserRole.ADMIN}, ${UserStatus.ACTIVE},
        ${arg('endereco-rua') ?? ''},
        ${arg('endereco-numero') ?? ''},
        ${arg('endereco-bairro') ?? ''},
        ${arg('endereco-cidade') ?? ''},
        ${(arg('endereco-uf') ?? '').toUpperCase()},
        ${arg('endereco-cep') ?? ''}
      )
      returning id, name, email
    `;

    return { empresa, admin };
  });

  console.log('Empresa provisionada.');
  console.log('');
  console.log(`  Empresa ......: ${empresa.name}`);
  console.log(`  Código .......: ${empresa.joinCode}`);
  console.log(`  Administrador : ${admin.name} <${admin.email}>`);
  console.log('');
  console.log('Próximo passo, feito pela própria pessoa:');
  console.log(`  1. abrir a tela de cadastro e criar a conta com ${admin.email};`);
  console.log(`  2. informar o código ${empresa.joinCode};`);
  console.log('  3. o perfil existente é vinculado à conta, já como ADMIN e ativo.');
  console.log('');
  console.log('Os demais membros da empresa se cadastram com o mesmo código e');
  console.log('ficam pendentes até que este administrador os aprove.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => sql.end());
