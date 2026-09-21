import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { sql } from '../src/config/database';
import { userRepository } from '../src/repositories/user.repository';
import { UserRole, UserStatus } from '../src/types/db';

/**
 * Provisiona o super administrador da plataforma.
 *
 * Por que isto é um script
 * -----------------------
 * Mesma razão do provisionamento de empresa: não existe quem aprove o
 * primeiro. Mas aqui a razão é mais forte. A condição de super administrador
 * dá acesso a **todas** as empresas; se houvesse qualquer rota capaz de
 * concedê-la, ela seria o alvo mais valioso do sistema. Não havendo rota, a
 * única forma de obtê-la é já ter acesso ao banco — e quem tem acesso ao banco
 * já tem tudo de qualquer maneira.
 *
 * É por isso também que `is_super_admin` é coluna própria, e não um valor do
 * enum de papéis: papel é dado de entrada no cadastro e na aprovação, e um
 * valor a mais ali abriria justamente o caminho que este desenho fecha.
 *
 * Por que ele cria a conta de acesso, diferente do provisionamento de empresa
 * ---------------------------------------------------------------------------
 * O administrador de uma empresa se cadastra pela tela normal e é reconhecido
 * pelo código da empresa. O super administrador não tem código, porque não
 * pertence a empresa alguma. Fazê-lo passar pela tela de cadastro exigiria
 * abrir ali uma exceção — e a tela de cadastro é exatamente o lugar onde não
 * se deve abrir exceção. Criar a conta aqui evita esse caminho.
 *
 * Uso:
 *   npm run provisionar-super-admin --workspace @fleet-manager/api -- \
 *     --nome "Gregory Jereissati" \
 *     --email gregory@exemplo.com \
 *     --cpf 12345678900 \
 *     --telefone "(85) 99999-0000"
 *
 * A senha vem de SUPER_ADMIN_PASSWORD; sem ela, uma senha aleatória é gerada e
 * mostrada uma única vez ao final.
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

async function criarConta(email: string, senha: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !chave) {
    console.error(
      'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidas.\n' +
        'A conta de acesso é criada pela API administrativa do Supabase Auth.',
    );
    process.exit(1);
  }

  const resposta = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: senha, email_confirm: true }),
  });

  if (!resposta.ok) {
    throw new Error(
      `Falha ao criar a conta ${email} (${resposta.status}): ${await resposta.text()}`,
    );
  }

  const conta = (await resposta.json()) as { id: string };
  return conta.id;
}

async function main() {
  const nome = exigir('nome');
  const email = exigir('email').toLowerCase();
  const cpf = exigir('cpf').replace(/\D/g, '');
  const telefone = exigir('telefone');

  const emailEmUso = await userRepository.findByEmail(email);
  if (emailEmUso) {
    console.error(`Já existe perfil com o e-mail ${email}.`);
    process.exit(1);
  }

  const cpfEmUso = await userRepository.findByCpf(cpf);
  if (cpfEmUso) {
    console.error('Já existe perfil com o CPF informado.');
    process.exit(1);
  }

  const senha = process.env.SUPER_ADMIN_PASSWORD ?? `Fm${randomBytes(9).toString('base64url')}!7`;
  const senhaGerada = !process.env.SUPER_ADMIN_PASSWORD;

  const authUserId = await criarConta(email, senha);

  // `company_id` fica nulo, e a restrição do banco garante a coerência: ser
  // super administrador e pertencer a uma empresa são condições mutuamente
  // exclusivas. O papel gravado é ADMIN por clareza — o papel efetivo nasce no
  // recorte, quando ele escolhe a empresa.
  const [criado] = await sql<{ id: string; name: string; email: string }[]>`
    insert into users (
      company_id, name, email, cpf, phone, auth_user_id,
      role, requested_role, status, is_super_admin,
      address_street, address_number, address_district,
      address_city, address_state, address_zip
    )
    values (
      null, ${nome}, ${email}, ${cpf}, ${telefone}, ${authUserId},
      ${UserRole.ADMIN}, ${UserRole.ADMIN}, ${UserStatus.ACTIVE}, true,
      ${arg('endereco-rua') ?? ''},
      ${arg('endereco-numero') ?? ''},
      ${arg('endereco-bairro') ?? ''},
      ${arg('endereco-cidade') ?? ''},
      ${(arg('endereco-uf') ?? '').toUpperCase()},
      ${arg('endereco-cep') ?? ''}
    )
    returning id, name, email
  `;

  console.log('Super administrador provisionado.');
  console.log('');
  console.log(`  Nome ....: ${criado.name}`);
  console.log(`  E-mail ..: ${criado.email}`);
  console.log('');
  console.log('Ele não pertence a empresa alguma e pode operar em qualquer uma,');
  console.log('uma por vez, com os poderes de administrador dentro dela.');

  if (senhaGerada) {
    console.log(`\nSenha (gerada agora, mostrada uma única vez):\n\n    ${senha}\n`);
    console.log('Anote-a em lugar seguro. Para escolher a senha, defina');
    console.log('SUPER_ADMIN_PASSWORD no apps/api/.env antes de executar.');
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => sql.end());
