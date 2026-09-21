/**
 * Base fictícia de desenvolvimento e teste.
 *
 * Cria duas empresas independentes, com pessoas, frota, vínculos e lançamentos
 * suficientes para exercitar as regras do sistema — inclusive as que só
 * aparecem no contraste entre duas empresas.
 *
 * Uso:
 *   npm run db:seed
 *
 * Duas garantias exigidas do procedimento:
 *
 *   * **Não apaga nada.** Se as empresas deste seed já existirem, o comando
 *     recusa e orienta a executar `db:reset` antes. Semear nunca destrói dados
 *     em silêncio, e reexecutar não duplica.
 *
 *   * **As contas entram no Supabase Auth de verdade**, pela API
 *     administrativa, com e-mail já confirmado. Inserir linhas na tabela de
 *     usuários da aplicação não bastaria: sem conta no Auth não há login.
 *
 * A senha das contas vem de `SEED_PASSWORD`. Sem ela, uma senha aleatória é
 * gerada e mostrada ao final da execução — uma vez, no terminal. Nenhuma senha
 * é gravada em arquivo versionado nem na documentação.
 */

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import postgres from 'postgres';

// -----------------------------------------------------------------------------
// Identidades sintéticas
// -----------------------------------------------------------------------------
// `example.com` é reservado pela RFC 2606 e não recebe mensagens: nenhuma conta
// deste seed corresponde a uma pessoa real nem a um endereço alcançável.

const DOMINIO = 'example.com';

/** CPF sintético com dígitos verificadores válidos, a partir de uma base. */
function cpfSintetico(base: string): string {
  const digitos = base.padStart(9, '0').slice(0, 9).split('').map(Number);

  const verificador = (parcial: number[]) => {
    const peso = parcial.length + 1;
    const soma = parcial.reduce((total, digito, i) => total + digito * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = verificador(digitos);
  const d2 = verificador([...digitos, d1]);

  return [...digitos, d1, d2].join('');
}

function senhaAleatoria(): string {
  return `Fm${randomBytes(9).toString('base64url')}!7`;
}

// -----------------------------------------------------------------------------
// Datas de referência
// -----------------------------------------------------------------------------

const HOJE = new Date();

/** Instante deslocado em dias a partir de agora. */
function emDias(dias: number): Date {
  const data = new Date(HOJE);
  data.setUTCDate(data.getUTCDate() + dias);
  return data;
}

/** Data civil (`YYYY-MM-DD`) deslocada em dias a partir de hoje. */
function dataCivilEmDias(dias: number): string {
  return emDias(dias).toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// Supabase Auth
// -----------------------------------------------------------------------------

interface ContaCriada {
  authUserId: string;
  email: string;
}

function cabecalhosAdmin(chave: string) {
  return {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Cria a conta de acesso no Supabase Auth.
 *
 * `email_confirm` evita a etapa de confirmação por e-mail: as contas precisam
 * poder entrar no sistema imediatamente, e nenhuma mensagem é enviada.
 */
async function criarConta(
  supabaseUrl: string,
  chave: string,
  email: string,
  senha: string,
): Promise<ContaCriada> {
  const resposta = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: cabecalhosAdmin(chave),
    body: JSON.stringify({ email, password: senha, email_confirm: true }),
  });

  if (!resposta.ok) {
    throw new Error(
      `Falha ao criar a conta ${email} (${resposta.status}): ${await resposta.text()}`,
    );
  }

  const conta = (await resposta.json()) as { id: string };
  return { authUserId: conta.id, email };
}

// -----------------------------------------------------------------------------
// Descrição da base
// -----------------------------------------------------------------------------

type Papel = 'ADMIN' | 'MANAGER' | 'OPERATOR';
type Situacao = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'BLOCKED';

interface PessoaSemente {
  chave: string;
  nome: string;
  email: string;
  cpf: string;
  papel: Papel;
  papelSolicitado?: Papel;
  situacao: Situacao;
  /** Cria a ficha de motorista, como faria a aprovação de um operador. */
  motorista?: boolean;
  cnh?: string;
  cnhVenceEm?: number;
}

interface VeiculoSemente {
  chave: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

interface EmpresaSemente {
  chave: string;
  nome: string;
  cnpj: string;
  codigo: string;
  pessoas: PessoaSemente[];
  veiculos: VeiculoSemente[];
}

/**
 * Super administrador da plataforma.
 *
 * Fica fora da lista de empresas de propósito: ele não pertence a nenhuma, e a
 * restrição do banco recusaria o contrário.
 */
const SUPER_ADMIN = {
  nome: 'Plataforma Fleet Manager',
  email: `plataforma.super@${DOMINIO}`,
  cpf: cpfSintetico('999888777'),
};

const EMPRESAS: EmpresaSemente[] = [
  {
    chave: 'litoral',
    nome: 'Transportes Litoral Norte',
    cnpj: '12345678000190',
    codigo: 'LITORAL2026',
    pessoas: [
      {
        chave: 'admin',
        nome: 'Helena Marques',
        email: `helena.admin@${DOMINIO}`,
        cpf: cpfSintetico('111222333'),
        papel: 'ADMIN',
        situacao: 'ACTIVE',
      },
      {
        chave: 'gerente',
        nome: 'Rogério Pontes',
        email: `rogerio.gerente@${DOMINIO}`,
        cpf: cpfSintetico('111222334'),
        papel: 'MANAGER',
        situacao: 'ACTIVE',
      },
      {
        chave: 'motorista1',
        nome: 'Cláudia Bezerra',
        email: `claudia.motorista@${DOMINIO}`,
        cpf: cpfSintetico('111222335'),
        papel: 'OPERATOR',
        situacao: 'ACTIVE',
        motorista: true,
        cnh: '01234567890',
        // Vence dentro da janela de aviso: a central de alertas deve mostrá-la.
        cnhVenceEm: 18,
      },
      {
        chave: 'motorista2',
        nome: 'Iranildo Souza',
        email: `iranildo.motorista@${DOMINIO}`,
        cpf: cpfSintetico('111222336'),
        papel: 'OPERATOR',
        situacao: 'ACTIVE',
        motorista: true,
        cnh: '01234567891',
        cnhVenceEm: 400,
      },
      {
        chave: 'pendente',
        nome: 'Marcos Tavares',
        email: `marcos.pendente@${DOMINIO}`,
        cpf: cpfSintetico('111222337'),
        // Papel efetivo mínimo; o pedido fica guardado à parte.
        papel: 'OPERATOR',
        papelSolicitado: 'MANAGER',
        situacao: 'PENDING',
      },
      {
        chave: 'recusado',
        nome: 'Vanda Lopes',
        email: `vanda.recusada@${DOMINIO}`,
        cpf: cpfSintetico('111222338'),
        papel: 'OPERATOR',
        situacao: 'REJECTED',
      },
    ],
    veiculos: [
      {
        chave: 'compartilhado',
        placa: 'LTN1A23',
        marca: 'Volkswagen',
        modelo: 'Delivery 9.170',
        ano: 2021,
        cor: 'Branco',
      },
      {
        chave: 'segundo',
        placa: 'LTN2B34',
        marca: 'Mercedes-Benz',
        modelo: 'Accelo 1016',
        ano: 2020,
        cor: 'Prata',
      },
      {
        chave: 'inativo',
        placa: 'LTN3C45',
        marca: 'Iveco',
        modelo: 'Daily 35-150',
        ano: 2018,
        cor: 'Azul',
        status: 'INACTIVE',
      },
    ],
  },
  {
    chave: 'sertao',
    nome: 'Frota Sertão Central',
    cnpj: '98765432000155',
    codigo: 'SERTAO2026',
    pessoas: [
      {
        chave: 'admin',
        nome: 'Otávio Nogueira',
        email: `otavio.admin@${DOMINIO}`,
        cpf: cpfSintetico('222333444'),
        papel: 'ADMIN',
        situacao: 'ACTIVE',
      },
      {
        chave: 'gerente',
        nome: 'Sandra Alencar',
        email: `sandra.gerente@${DOMINIO}`,
        cpf: cpfSintetico('222333445'),
        papel: 'MANAGER',
        situacao: 'ACTIVE',
      },
      {
        chave: 'motorista1',
        nome: 'Débora Viana',
        email: `debora.motorista@${DOMINIO}`,
        cpf: cpfSintetico('222333446'),
        papel: 'OPERATOR',
        situacao: 'ACTIVE',
        motorista: true,
        cnh: '09876543210',
        cnhVenceEm: 250,
      },
      {
        chave: 'motorista2',
        nome: 'Aldair Fontes',
        email: `aldair.motorista@${DOMINIO}`,
        cpf: cpfSintetico('222333447'),
        papel: 'OPERATOR',
        situacao: 'ACTIVE',
        motorista: true,
        cnh: '09876543211',
        cnhVenceEm: 90,
      },
      {
        chave: 'pendente',
        nome: 'Juliana Peixoto',
        email: `juliana.pendente@${DOMINIO}`,
        cpf: cpfSintetico('222333448'),
        papel: 'OPERATOR',
        papelSolicitado: 'OPERATOR',
        situacao: 'PENDING',
      },
    ],
    veiculos: [
      {
        chave: 'primeiro',
        placa: 'SRT1D56',
        marca: 'Ford',
        modelo: 'Cargo 816',
        ano: 2019,
        cor: 'Branco',
      },
      {
        chave: 'segundo',
        placa: 'SRT2E67',
        marca: 'Fiat',
        modelo: 'Ducato Cargo',
        ano: 2022,
        cor: 'Cinza',
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// Execução
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  const url = process.env.DIRECT_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !supabaseUrl) {
    console.error('DIRECT_URL e SUPABASE_URL precisam estar definidas. Confira o .env.');
    process.exit(1);
  }

  if (!chave) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY não está definida.\n\n' +
        'O seed cria contas reais no Supabase Auth, e isso exige a chave secreta do\n' +
        'projeto (Dashboard > Settings > API Keys > service_role). Sem ela as contas\n' +
        'não existiriam e nenhum login funcionaria.\n\n' +
        'Acrescente a chave em apps/api/.env — o arquivo está no .gitignore.',
    );
    process.exit(1);
  }

  const senha = process.env.SEED_PASSWORD ?? senhaAleatoria();
  const senhaGerada = !process.env.SEED_PASSWORD;

  const sql = postgres(url, { max: 1, onnotice: () => {} });

  try {
    // Recusa em vez de apagar: limpar a base é decisão de outro comando.
    const existentes = await sql<{ join_code: string }[]>`
      select join_code from companies
      where join_code = any(${EMPRESAS.map((e) => e.codigo)})
    `;

    if (existentes.length > 0) {
      console.error(
        `As empresas deste seed já existem (${existentes
          .map((linha) => linha.join_code)
          .join(', ')}).\n\n` +
          'O seed não apaga dados. Para recriar a base fictícia do zero:\n\n' +
          '  npm run db:reset -- --confirmar=<project_ref>\n' +
          '  npm run db:migrate\n' +
          '  npm run db:seed',
      );
      process.exit(1);
    }

    console.log('Criando contas no Supabase Auth...');

    /** Conta de acesso de cada pessoa, por "empresa.chave". */
    const contas = new Map<string, ContaCriada>();

    // O super administrador da plataforma. Não pertence a empresa alguma e
    // opera dentro da que escolher — é o perfil que permite exercitar o
    // isolamento a partir de fora, algo que nenhum perfil comum alcança.
    const contaSuper = await criarConta(supabaseUrl, chave, SUPER_ADMIN.email, senha);

    for (const empresa of EMPRESAS) {
      for (const pessoa of empresa.pessoas) {
        const conta = await criarConta(supabaseUrl, chave, pessoa.email, senha);
        contas.set(`${empresa.chave}.${pessoa.chave}`, conta);
      }
    }

    console.log(`  ✓ ${contas.size + 1} contas criadas\n`);
    console.log('Gravando a base fictícia...');

    await sql.begin(async (tx) => {
      await tx`
        insert into users (
          company_id, name, email, cpf, phone, auth_user_id,
          role, requested_role, status, is_super_admin,
          address_street, address_number, address_district,
          address_city, address_state, address_zip
        )
        values (
          null, ${SUPER_ADMIN.nome}, ${SUPER_ADMIN.email}, ${SUPER_ADMIN.cpf},
          '(85) 90000-0000', ${contaSuper.authUserId},
          'ADMIN', 'ADMIN', 'ACTIVE', true,
          'Rua Exemplo', '100', 'Centro', 'Fortaleza', 'CE', '60000-000'
        )
      `;

      for (const empresa of EMPRESAS) {
        const [registroEmpresa] = await tx<{ id: string }[]>`
          insert into companies (name, cnpj, join_code, status)
          values (${empresa.nome}, ${empresa.cnpj}, ${empresa.codigo}, 'ACTIVE')
          returning id
        `;

        const companyId = registroEmpresa.id;
        const usuarios = new Map<string, string>();
        const motoristas = new Map<string, string>();

        for (const pessoa of empresa.pessoas) {
          const conta = contas.get(`${empresa.chave}.${pessoa.chave}`)!;

          const [registroUsuario] = await tx<{ id: string }[]>`
            insert into users (
              company_id, name, email, cpf, phone, auth_user_id,
              role, requested_role, status,
              address_street, address_number, address_district,
              address_city, address_state, address_zip
            )
            values (
              ${companyId}, ${pessoa.nome}, ${pessoa.email}, ${pessoa.cpf},
              '(85) 90000-0000', ${conta.authUserId},
              ${pessoa.papel}, ${pessoa.papelSolicitado ?? pessoa.papel}, ${pessoa.situacao},
              'Rua Exemplo', '100', 'Centro', 'Fortaleza', 'CE', '60000-000'
            )
            returning id
          `;

          usuarios.set(pessoa.chave, registroUsuario.id);

          // A ficha de motorista nasce da aprovação do operador. Nome e CPF não
          // são copiados: a identidade pertence ao usuário.
          if (pessoa.motorista) {
            const [ficha] = await tx<{ id: string }[]>`
              insert into drivers (company_id, user_id, cnh, cnh_expiry, phone, status)
              values (
                ${companyId}, ${registroUsuario.id}, ${pessoa.cnh ?? null},
                ${pessoa.cnhVenceEm != null ? dataCivilEmDias(pessoa.cnhVenceEm) : null},
                '(85) 90000-0000', 'ACTIVE'
              )
              returning id
            `;

            motoristas.set(pessoa.chave, ficha.id);
          }
        }

        const veiculos = new Map<string, string>();

        for (const veiculo of empresa.veiculos) {
          const [registro] = await tx<{ id: string }[]>`
            insert into vehicles (company_id, plate, brand, model, year, color, status)
            values (
              ${companyId}, ${veiculo.placa}, ${veiculo.marca}, ${veiculo.modelo},
              ${veiculo.ano}, ${veiculo.cor}, ${veiculo.status ?? 'ACTIVE'}
            )
            returning id
          `;

          veiculos.set(veiculo.chave, registro.id);
        }

        await semearOperacao(tx, {
          empresa: empresa.chave,
          companyId,
          usuarios,
          motoristas,
          veiculos,
        });
      }
    });

    console.log('  ✓ base gravada\n');
    await relatar(sql);

    console.log('\nContas de teste:');
    console.log('\n  Plataforma — não pertence a empresa alguma');
    console.log(`      ${SUPER_ADMIN.email.padEnd(36)} SUPER    ACTIVE`);
    for (const empresa of EMPRESAS) {
      console.log(`\n  ${empresa.nome} — código de acesso: ${empresa.codigo}`);
      for (const pessoa of empresa.pessoas) {
        const marca = pessoa.situacao === 'ACTIVE' ? ' ' : '·';
        console.log(
          `    ${marca} ${pessoa.email.padEnd(36)} ${pessoa.papel.padEnd(8)} ${pessoa.situacao}`,
        );
      }
    }

    if (senhaGerada) {
      console.log(
        `\nSenha de todas as contas (gerada agora, mostrada uma única vez):\n\n    ${senha}\n\n` +
          'Anote-a em lugar seguro. Para escolher a senha, defina SEED_PASSWORD no\n' +
          'apps/api/.env antes de executar o seed.',
      );
    } else {
      console.log('\nSenha de todas as contas: a definida em SEED_PASSWORD.');
    }
  } finally {
    await sql.end();
  }
}

interface ContextoOperacao {
  empresa: string;
  companyId: string;
  usuarios: Map<string, string>;
  motoristas: Map<string, string>;
  veiculos: Map<string, string>;
}

/**
 * Vínculos e lançamentos de uma empresa.
 *
 * Os dados são escolhidos para que cada regra do sistema tenha pelo menos um
 * caso que a exercite: veículo compartilhado, motorista em mais de um veículo,
 * vínculo encerrado, lançamentos de autores diferentes, registros cancelados e
 * documentos nos três estados de vencimento.
 */
async function semearOperacao(
  tx: postgres.TransactionSql,
  ctx: ContextoOperacao,
): Promise<void> {
  const { companyId, usuarios, motoristas, veiculos } = ctx;

  const motorista1 = motoristas.get('motorista1')!;
  const motorista2 = motoristas.get('motorista2')!;
  const usuarioMotorista1 = usuarios.get('motorista1')!;
  const usuarioMotorista2 = usuarios.get('motorista2')!;
  const gerente = usuarios.get('gerente')!;

  const chavesVeiculos = [...veiculos.keys()];
  const veiculoA = veiculos.get(chavesVeiculos[0])!;
  const veiculoB = veiculos.get(chavesVeiculos[1])!;

  // --- Vínculos -------------------------------------------------------------
  // O primeiro veículo é compartilhado pelos dois motoristas, e o segundo
  // motorista dirige também o segundo veículo: um veículo com vários
  // motoristas e um motorista com vários veículos, ao mesmo tempo.
  await tx`
    insert into vehicle_driver_assignments
      (company_id, vehicle_id, driver_id, start_date, created_by_id)
    values
      (${companyId}, ${veiculoA}, ${motorista1}, ${emDias(-120)}, ${gerente}),
      (${companyId}, ${veiculoA}, ${motorista2}, ${emDias(-60)}, ${gerente}),
      (${companyId}, ${veiculoB}, ${motorista2}, ${emDias(-45)}, ${gerente})
  `;

  // Vínculo encerrado: o histórico permanece consultável, e o par pode ser
  // vinculado de novo no futuro sem esbarrar na restrição de unicidade.
  await tx`
    insert into vehicle_driver_assignments
      (company_id, vehicle_id, driver_id, start_date, end_date, created_by_id, ended_by_id)
    values
      (${companyId}, ${veiculoB}, ${motorista1}, ${emDias(-200)}, ${emDias(-130)},
       ${gerente}, ${gerente})
  `;

  // --- Despesas -------------------------------------------------------------
  // Autores diferentes, para exercitar o recorte por autoria: o motorista
  // enxerga apenas os próprios lançamentos.
  await tx`
    insert into expenses
      (company_id, vehicle_id, type, amount, date, description, created_by_id)
    values
      (${companyId}, ${veiculoA}, 'FUEL', '482.35', ${emDias(-40)},
       'Abastecimento — posto da BR-116', ${usuarioMotorista1}),
      (${companyId}, ${veiculoA}, 'FUEL', '511.90', ${emDias(-12)},
       'Abastecimento', ${usuarioMotorista2}),
      (${companyId}, ${veiculoA}, 'MAINTENANCE', '1290.00', ${emDias(-25)},
       'Troca de pastilhas de freio', ${gerente}),
      (${companyId}, ${veiculoB}, 'IPVA', '2340.75', ${emDias(-75)},
       'IPVA do exercício', ${gerente}),
      (${companyId}, ${veiculoB}, 'FINE', '195.23', ${emDias(-8)},
       'Excesso de velocidade', ${usuarioMotorista2}),
      (${companyId}, ${veiculoB}, 'INSURANCE', '3120.40', ${emDias(-95)},
       'Parcela do seguro', ${gerente})
  `;

  // Lançamento cancelado: permanece na lista, marcado, e sai de todo total.
  await tx`
    insert into expenses
      (company_id, vehicle_id, type, amount, date, description,
       status, created_by_id, cancelled_at, cancelled_by_id, cancel_reason, updated_by_id)
    values
      (${companyId}, ${veiculoA}, 'OTHER', '890.00', ${emDias(-30)},
       'Lançamento duplicado', 'CANCELLED', ${usuarioMotorista1},
       ${emDias(-29)}, ${gerente}, 'Duplicidade confirmada com o fornecedor', ${gerente})
  `;

  // --- Manutenções ----------------------------------------------------------
  await tx`
    insert into maintenances
      (company_id, vehicle_id, type, status, description,
       scheduled_date, completed_date, created_by_id)
    values
      (${companyId}, ${veiculoA}, 'PREVENTIVE', 'DONE', 'Revisão dos 60.000 km',
       ${emDias(-50)}, ${emDias(-49)}, ${gerente}),
      (${companyId}, ${veiculoA}, 'PREVENTIVE', 'SCHEDULED', 'Revisão dos 70.000 km',
       ${emDias(25)}, null, ${gerente}),
      (${companyId}, ${veiculoB}, 'CORRECTIVE', 'SCHEDULED', 'Ruído na suspensão dianteira',
       ${emDias(6)}, null, ${usuarioMotorista2}),
      (${companyId}, ${veiculoB}, 'CORRECTIVE', 'OVERDUE', 'Vazamento no sistema de arrefecimento',
       ${emDias(-15)}, null, ${usuarioMotorista2})
  `;

  await tx`
    insert into maintenances
      (company_id, vehicle_id, type, status, description, scheduled_date,
       created_by_id, cancelled_at, cancelled_by_id, cancel_reason, updated_by_id)
    values
      (${companyId}, ${veiculoA}, 'CORRECTIVE', 'CANCELLED', 'Troca de amortecedores',
       ${emDias(-5)}, ${gerente}, ${emDias(-6)}, ${gerente},
       'Resolvido na revisão anterior', ${gerente})
  `;

  // --- Documentos -----------------------------------------------------------
  // Um em dia, um dentro da janela de aviso e um vencido: os três estados que
  // a central de alertas distingue.
  await tx`
    insert into documents (company_id, vehicle_id, type, expiry_date, created_by_id)
    values
      (${companyId}, ${veiculoA}, 'CRLV', ${dataCivilEmDias(210)}, ${gerente}),
      (${companyId}, ${veiculoA}, 'SEGURO', ${dataCivilEmDias(21)}, ${gerente}),
      (${companyId}, ${veiculoB}, 'IPVA', ${dataCivilEmDias(-9)}, ${gerente}),
      (${companyId}, ${veiculoB}, 'CRLV', ${dataCivilEmDias(150)}, ${gerente})
  `;

  // Documento pessoal do motorista: fora do alcance do outro motorista, mesmo
  // quando os dois compartilham o veículo.
  await tx`
    insert into documents (company_id, driver_id, type, expiry_date, created_by_id)
    values
      (${companyId}, ${motorista1}, 'CNH', ${dataCivilEmDias(18)}, ${gerente}),
      (${companyId}, ${motorista2}, 'CNH', ${dataCivilEmDias(400)}, ${gerente})
  `;

  // --- Histórico ------------------------------------------------------------
  // Uma entrada por empresa, para que a tela de histórico não nasça vazia.
  const [despesaCancelada] = await tx<{ id: string }[]>`
    select id from expenses
    where company_id = ${companyId} and status = 'CANCELLED'
    limit 1
  `;

  await tx`
    insert into change_logs
      (company_id, entity_type, entity_id, action, changes, reason, actor_id, actor_name)
    values (
      ${companyId}, 'EXPENSE', ${despesaCancelada.id}, 'CANCEL',
      ${tx.json({ status: { de: 'ACTIVE', para: 'CANCELLED' } })},
      'Duplicidade confirmada com o fornecedor',
      ${gerente},
      (select name from users where id = ${gerente})
    )
  `;
}

/** Contagem do que foi criado, por tabela. */
async function relatar(sql: postgres.Sql): Promise<void> {
  const [contagem] = await sql<Record<string, string>[]>`
    select
      (select count(*) from companies) as empresas,
      (select count(*) from users) as usuarios,
      (select count(*) from drivers) as motoristas,
      (select count(*) from vehicles) as veiculos,
      (select count(*) from vehicle_driver_assignments) as vinculos,
      (select count(*) from vehicle_driver_assignments where end_date is null) as vinculos_vigentes,
      (select count(*) from expenses) as despesas,
      (select count(*) from expenses where status = 'CANCELLED') as despesas_canceladas,
      (select count(*) from maintenances) as manutencoes,
      (select count(*) from documents) as documentos,
      (select count(*) from documents where expiry_date < current_date) as documentos_vencidos,
      (select count(*) from change_logs) as historico
  `;

  console.log('Base criada:');
  for (const [tabela, total] of Object.entries(contagem)) {
    console.log(`  ${tabela.replace(/_/g, ' ').padEnd(22)} ${total}`);
  }
}

main().catch((erro) => {
  console.error('\nFalhou:', erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
