/**
 * Volume de demonstração: um ano de operação nas duas empresas do seed.
 *
 * O seed cria o mínimo para exercitar as regras — três veículos e alguns
 * lançamentos por empresa. Para apresentar o sistema, isso deixa o painel
 * quase vazio e a paginação sem uso. Este script acrescenta, em cada empresa,
 * uma frota de dezoito veículos, catorze motoristas, solicitações de acesso e
 * doze meses de despesas, manutenções e documentos, com datas relativas a hoje.
 *
 * Uso (depois de db:migrate e db:seed):
 *   npm run db:popular
 *   npm run db:popular -- --remover      apaga o que este script criou
 *
 * Garantias:
 *
 *   * **Não toca no que já existe.** Só insere; nada do seed é alterado.
 *   * **Não duplica.** Se a frota de demonstração já estiver na empresa, a
 *     empresa é pulada.
 *   * **É reversível.** Tudo o que cria é reconhecível — placas iniciadas por
 *     LTD ou STD, fichas com CNH iniciada por 99, contas em
 *     frota-demo.example.com — e `--remover` apaga exatamente isso.
 *   * **É reprodutível.** Os números aleatórios vêm de uma semente fixa: a mesma
 *     execução produz os mesmos nomes, placas e valores.
 *
 * As contas criadas aqui são solicitações de acesso, sem login: servem para
 * mostrar o fluxo de aprovação. Nenhum endereço corresponde a pessoa real
 * (example.com é reservado pela RFC 2606).
 */

import 'dotenv/config';
import postgres from 'postgres';

// -----------------------------------------------------------------------------
// Aleatoriedade reprodutível
// -----------------------------------------------------------------------------

function geradorComSemente(semente: number) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let aleatorio = geradorComSemente(2026);
const entre = (min: number, max: number) => min + aleatorio() * (max - min);
const inteiro = (min: number, max: number) => Math.floor(entre(min, max + 1));
const um = <T>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)];
const chance = (probabilidade: number) => aleatorio() < probabilidade;
const centavos = (valor: number) => (Math.round(valor * 100) / 100).toFixed(2);

// -----------------------------------------------------------------------------
// Datas
// -----------------------------------------------------------------------------

const HOJE = new Date();

function emDias(dias: number, hora = 12): Date {
  const data = new Date(HOJE);
  data.setUTCDate(data.getUTCDate() + dias);
  data.setUTCHours(hora, inteiro(0, 59), 0, 0);
  return data;
}

function dataCivil(dias: number): string {
  return emDias(dias).toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// Catálogos
// -----------------------------------------------------------------------------

const EMPRESAS = [
  { codigo: 'LITORAL2026', prefixoPlaca: 'LTD', cidade: 'Fortaleza', digito: 1 },
  { codigo: 'SERTAO2026', prefixoPlaca: 'STD', cidade: 'Quixadá', digito: 2 },
] as const;

/** Modelo, faixa de consumo mensal de combustível e porte da manutenção. */
const MODELOS = [
  { brand: 'FIAT', model: 'STRADA ENDURANCE', abastecimento: [180, 320], porte: 1 },
  { brand: 'FIAT', model: 'FIORINO', abastecimento: [160, 290], porte: 1 },
  { brand: 'VOLKSWAGEN', model: 'SAVEIRO ROBUST', abastecimento: [180, 330], porte: 1 },
  { brand: 'CHEVROLET', model: 'S10 LT', abastecimento: [320, 560], porte: 2 },
  { brand: 'TOYOTA', model: 'HILUX SR', abastecimento: [340, 600], porte: 2 },
  { brand: 'RENAULT', model: 'MASTER FURGÃO', abastecimento: [380, 650], porte: 2 },
  { brand: 'MERCEDES-BENZ', model: 'SPRINTER 416', abastecimento: [420, 720], porte: 2 },
  { brand: 'IVECO', model: 'DAILY 35-150', abastecimento: [450, 760], porte: 2 },
  { brand: 'VOLKSWAGEN', model: 'DELIVERY 11.180', abastecimento: [650, 1150], porte: 3 },
  { brand: 'MERCEDES-BENZ', model: 'ACCELO 1016', abastecimento: [680, 1200], porte: 3 },
  { brand: 'FORD', model: 'CARGO 1119', abastecimento: [700, 1250], porte: 3 },
] as const;

const CORES = ['BRANCO', 'PRATA', 'CINZA', 'PRETO', 'VERMELHO', 'AZUL'] as const;

const NOMES = [
  'Antônio',
  'Francisco',
  'José',
  'Raimundo',
  'Carlos',
  'Paulo',
  'Marcos',
  'Luciano',
  'Rafael',
  'Diego',
  'Fábio',
  'Sérgio',
  'Edson',
  'Wellington',
  'Maria',
  'Ana',
  'Francisca',
  'Juliana',
  'Patrícia',
  'Luana',
  'Renata',
  'Cícero',
  'Gilmar',
  'Valdemir',
] as const;

const SOBRENOMES = [
  'Silva',
  'Oliveira',
  'Sousa',
  'Lima',
  'Pereira',
  'Costa',
  'Ferreira',
  'Alves',
  'Rodrigues',
  'Nascimento',
  'Barbosa',
  'Holanda',
  'Bezerra',
  'Cavalcante',
  'Moreira',
  'Teixeira',
] as const;

const BAIRROS = ['Centro', 'Aldeota', 'Messejana', 'Parangaba', 'Benfica', 'Montese'] as const;

const POSTOS = [
  'Posto Ipiranga BR-116',
  'Posto Shell Washington Soares',
  'Posto BR CE-060',
  'Posto Petrobras Messejana',
  'Posto Ale Maracanaú',
] as const;

const SERVICOS_PREVENTIVOS = [
  'Troca de óleo e filtros',
  'Revisão periódica',
  'Alinhamento e balanceamento',
  'Revisão do sistema de freios',
  'Troca de pneus dianteiros',
  'Revisão da suspensão',
  'Troca da correia dentada',
  'Higienização do ar-condicionado',
] as const;

const SERVICOS_CORRETIVOS = [
  'Troca de embreagem',
  'Reparo no sistema de arrefecimento',
  'Substituição da bateria',
  'Reparo elétrico no painel',
  'Troca de amortecedores',
  'Reparo no turbo',
  'Substituição do motor de partida',
  'Vazamento de óleo no cárter',
] as const;

const OUTRAS_DESPESAS = [
  ['Lavagem completa', 60, 140],
  ['Pedágio', 12, 45],
  ['Estacionamento', 15, 60],
  ['Taxa de licenciamento', 150, 280],
  ['Rastreador mensal', 79, 129],
] as const;

const MULTAS = [
  ['Excesso de velocidade até 20%', 130.16],
  ['Estacionar em local proibido', 195.23],
  ['Avançar o sinal vermelho', 293.47],
  ['Excesso de velocidade acima de 20%', 195.23],
  ['Dirigir usando o celular', 293.47],
] as const;

// -----------------------------------------------------------------------------
// Identidades sintéticas
// -----------------------------------------------------------------------------

const DOMINIO = 'frota-demo.example.com';

function cpfSintetico(base: number): string {
  const digitos = String(base).padStart(9, '0').slice(-9).split('').map(Number);
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

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// -----------------------------------------------------------------------------
// População de uma empresa
// -----------------------------------------------------------------------------

interface Empresa {
  id: string;
  name: string;
}

async function popular(sql: postgres.Sql, empresa: Empresa, config: (typeof EMPRESAS)[number]) {
  const [ja] = await sql<{ n: number }[]>`
    select count(*)::int as n from vehicles
    where company_id = ${empresa.id} and plate like ${`${config.prefixoPlaca}%`}
  `;
  if (ja.n > 0) {
    console.log(`  ${empresa.name}: a frota de demonstração já existe — pulada.`);
    return;
  }

  const autores = await sql<{ id: string; role: string; name: string }[]>`
    select id, role, name from users
    where company_id = ${empresa.id} and status = 'ACTIVE' and role in ('ADMIN', 'MANAGER')
    order by role desc
  `;
  if (autores.length === 0) throw new Error(`${empresa.name} não tem administrador nem gerente.`);
  const gerente = autores.find((a) => a.role === 'MANAGER')?.id ?? autores[0].id;
  const admin = autores.find((a) => a.role === 'ADMIN')?.id ?? gerente;
  const nomeDe = (id: unknown) => autores.find((a) => a.id === id)?.name ?? 'Gestor';

  await sql.begin(async (tx) => {
    // ---- veículos ----------------------------------------------------------
    const letras = 'ABCDEFGHIJ';
    const veiculosNovos = Array.from({ length: 18 }, (_, i) => {
      const modelo = MODELOS[i % MODELOS.length];
      return {
        company_id: empresa.id,
        plate: `${config.prefixoPlaca}${i % 10}${letras[Math.floor(i / 10)]}${String(inteiro(10, 99))}`,
        brand: modelo.brand,
        model: modelo.model,
        year: inteiro(2016, 2025),
        color: um(CORES),
        status: i >= 16 ? 'INACTIVE' : 'ACTIVE',
      };
    });
    const veiculos = await tx<{ id: string; status: string; model: string }[]>`
      insert into vehicles ${tx(veiculosNovos)} returning id, status, model
    `;
    const ativos = veiculos.filter((v) => v.status === 'ACTIVE');
    const porte = (modelo: string) => MODELOS.find((m) => m.model === modelo)!;

    // ---- motoristas (fichas sem conta) -------------------------------------
    const fichasNovas = Array.from({ length: 14 }, (_, i) => {
      const nome = `${um(NOMES)} ${um(SOBRENOMES)} ${um(SOBRENOMES)}`;
      // Uma CNH vencida, duas vencendo em até 30 dias, as demais em dia.
      const validade = i === 0 ? -12 : i <= 2 ? inteiro(5, 25) : inteiro(120, 1500);
      return {
        company_id: empresa.id,
        name: nome,
        cpf: cpfSintetico(700000000 + config.digito * 1000 + i),
        cnh: `99${config.digito}${String(10000000 + i * 7919).slice(-8)}`,
        cnh_expiry: dataCivil(validade),
        phone: `(85) 9${inteiro(8000, 9999)}-${inteiro(1000, 9999)}`,
        status: i === 13 ? 'INACTIVE' : 'ACTIVE',
      };
    });
    const fichas = await tx<{ id: string; status: string; cnhExpiry: string }[]>`
      insert into drivers ${tx(fichasNovas)}
      returning id, status, to_char(cnh_expiry, 'YYYY-MM-DD') as "cnhExpiry"
    `;
    const fichasAtivas = fichas.filter((f) => f.status === 'ACTIVE');

    // ---- vínculos: um ou dois motoristas por veículo ativo, e histórico ----
    const vinculos: Record<string, unknown>[] = [];
    ativos.forEach((veiculo, i) => {
      const titular = fichasAtivas[i % fichasAtivas.length];
      vinculos.push({
        company_id: empresa.id,
        vehicle_id: veiculo.id,
        driver_id: titular.id,
        start_date: emDias(-inteiro(60, 300)),
        created_by_id: gerente,
      });
      if (i % 3 === 0) {
        const reserva = fichasAtivas[(i + 5) % fichasAtivas.length];
        if (reserva.id !== titular.id) {
          vinculos.push({
            company_id: empresa.id,
            vehicle_id: veiculo.id,
            driver_id: reserva.id,
            start_date: emDias(-inteiro(20, 90)),
            created_by_id: gerente,
          });
        }
      }
      // Um motorista anterior, com o período encerrado.
      const anterior = fichas[(i + 9) % fichas.length];
      const inicio = -inteiro(330, 400);
      vinculos.push({
        company_id: empresa.id,
        vehicle_id: veiculo.id,
        driver_id: anterior.id,
        start_date: emDias(inicio),
        end_date: emDias(inicio + inteiro(60, 200)),
        created_by_id: gerente,
        ended_by_id: gerente,
      });
    });
    await tx`insert into vehicle_driver_assignments ${tx(vinculos)}`;

    // ---- despesas: doze meses ---------------------------------------------
    const despesas: Record<string, unknown>[] = [];
    const despesa = (
      vehicleId: string,
      type: string,
      valor: number,
      dias: number,
      descricao: string,
    ) => {
      const registro: Record<string, unknown> = {
        company_id: empresa.id,
        vehicle_id: vehicleId,
        type,
        amount: centavos(valor),
        date: emDias(dias, inteiro(8, 18)),
        description: descricao,
        created_by_id: chance(0.8) ? gerente : admin,
        status: 'ACTIVE',
        cancelled_at: null,
        cancelled_by_id: null,
        cancel_reason: null,
      };
      // Uma pequena parte foi lançada errada e cancelada, com motivo.
      if (chance(0.015)) {
        Object.assign(registro, {
          status: 'CANCELLED',
          cancelled_at: emDias(dias + 1),
          cancelled_by_id: gerente,
          cancel_reason: um([
            'Lançamento em duplicidade',
            'Veículo informado errado',
            'Valor digitado incorretamente',
          ]),
        });
      }
      despesas.push(registro);
    };

    for (const veiculo of veiculos) {
      const modelo = porte(veiculo.model);
      // Veículo desativado: operou até cerca de quatro meses atrás.
      const ultimoDia = veiculo.status === 'ACTIVE' ? -1 : -120;
      for (let dia = -365 + inteiro(0, 6); dia <= ultimoDia; dia += inteiro(5, 9)) {
        const [min, max] = modelo.abastecimento;
        despesa(veiculo.id, 'FUEL', entre(min, max), dia, `Abastecimento — ${um(POSTOS)}`);
      }
      for (let dia = -350; dia <= ultimoDia; dia += inteiro(25, 40)) {
        const [descricao, min, max] = um(OUTRAS_DESPESAS);
        despesa(veiculo.id, 'OTHER', entre(min, max), dia, descricao);
      }
      for (let n = inteiro(0, 3); n > 0; n -= 1) {
        const [descricao, valor] = um(MULTAS);
        despesa(veiculo.id, 'FINE', valor, -inteiro(5, 340), descricao);
      }
      despesa(
        veiculo.id,
        'IPVA',
        900 * modelo.porte + entre(300, 1600),
        -inteiro(250, 300),
        `IPVA ${HOJE.getFullYear()}`,
      );
      despesa(
        veiculo.id,
        'INSURANCE',
        1800 * modelo.porte + entre(400, 2200),
        -inteiro(30, 330),
        'Seguro anual da frota',
      );
    }

    // ---- manutenções e o custo de cada uma --------------------------------
    const manutencoes: Record<string, unknown>[] = [];
    const manutencao = (
      vehicleId: string,
      type: string,
      status: string,
      descricao: string,
      prevista: number,
      concluida?: number,
    ) => {
      manutencoes.push({
        company_id: empresa.id,
        vehicle_id: vehicleId,
        type,
        status,
        description: descricao,
        scheduled_date: emDias(prevista, 9),
        completed_date: concluida !== undefined ? emDias(concluida, 16) : null,
        created_by_id: gerente,
        cancelled_at: status === 'CANCELLED' ? emDias(prevista - 2) : null,
        cancelled_by_id: status === 'CANCELLED' ? gerente : null,
        cancel_reason: status === 'CANCELLED' ? 'Serviço remarcado pela oficina' : null,
      });
    };

    veiculos.forEach((veiculo, i) => {
      const modelo = porte(veiculo.model);
      const ultimoDia = veiculo.status === 'ACTIVE' ? -1 : -120;
      // Preventivas a cada três meses, concluídas, com a despesa correspondente.
      for (let dia = -360 + inteiro(0, 30); dia <= ultimoDia - 5; dia += inteiro(80, 100)) {
        const servico = um(SERVICOS_PREVENTIVOS);
        const conclusao = dia + inteiro(0, 2);
        manutencao(veiculo.id, 'PREVENTIVE', 'DONE', servico, dia, conclusao);
        despesa(veiculo.id, 'MAINTENANCE', 250 * modelo.porte + entre(80, 900), conclusao, servico);
      }
      // Corretivas ocasionais.
      for (let n = inteiro(0, 2); n > 0; n -= 1) {
        const servico = um(SERVICOS_CORRETIVOS);
        const dia = -inteiro(10, 330);
        manutencao(veiculo.id, 'CORRECTIVE', 'DONE', servico, dia, dia + inteiro(1, 4));
        despesa(veiculo.id, 'MAINTENANCE', 600 * modelo.porte + entre(200, 3500), dia + 2, servico);
      }
      if (veiculo.status !== 'ACTIVE') return;
      // A próxima preventiva, programada; algumas já passaram da data.
      if (i % 5 === 0) {
        manutencao(
          veiculo.id,
          'PREVENTIVE',
          'SCHEDULED',
          um(SERVICOS_PREVENTIVOS),
          -inteiro(2, 12),
        );
      } else {
        manutencao(veiculo.id, 'PREVENTIVE', 'SCHEDULED', um(SERVICOS_PREVENTIVOS), inteiro(2, 75));
      }
      if (i % 7 === 3) {
        manutencao(veiculo.id, 'CORRECTIVE', 'CANCELLED', um(SERVICOS_CORRETIVOS), inteiro(3, 20));
      }
    });

    // ---- histórico: o mesmo que a API grava a cada ação --------------------
    // Sem ele, a janela "Histórico" dos lançamentos de demonstração viria
    // vazia. Cada registro leva o nome do autor por cópia, como na aplicação.
    const historico: Record<string, unknown>[] = [];
    const registrar = (
      entityType: string,
      entityId: string,
      action: string,
      autor: unknown,
      quando: Date,
      changes: Record<string, unknown>,
      reason: string | null = null,
    ) => {
      historico.push({
        company_id: empresa.id,
        entity_type: entityType,
        entity_id: entityId,
        action,
        changes: tx.json(changes as postgres.JSONValue),
        reason,
        actor_id: autor,
        actor_name: nomeDe(autor),
        created_at: quando,
      });
    };

    for (let i = 0; i < despesas.length; i += 500) {
      const inseridas = await tx<
        {
          id: string;
          vehicle_id: string;
          amount: string;
          date: Date;
          status: string;
          created_by_id: string;
          cancelled_at: Date | null;
          cancelled_by_id: string | null;
          cancel_reason: string | null;
        }[]
      >`
        insert into expenses ${tx(despesas.slice(i, i + 500))}
        returning id, vehicle_id, amount, date, status, created_by_id, cancelled_at,
                  cancelled_by_id, cancel_reason
      `;
      for (const d of inseridas) {
        registrar('EXPENSE', d.id, 'CREATE', d.created_by_id, d.date, {
          vehicleId: { de: null, para: d.vehicle_id },
          amount: { de: null, para: d.amount },
          date: { de: null, para: d.date.toISOString() },
        });
        if (d.status === 'CANCELLED' && d.cancelled_at) {
          registrar(
            'EXPENSE',
            d.id,
            'CANCEL',
            d.cancelled_by_id,
            d.cancelled_at,
            { status: { de: 'ACTIVE', para: 'CANCELLED' } },
            d.cancel_reason,
          );
        }
      }
    }

    const manutencoesInseridas = await tx<
      {
        id: string;
        vehicle_id: string;
        status: string;
        scheduled_date: Date;
        completed_date: Date | null;
        created_by_id: string;
        cancelled_at: Date | null;
        cancel_reason: string | null;
      }[]
    >`
      insert into maintenances ${tx(manutencoes)}
      returning id, vehicle_id, status, scheduled_date, completed_date, created_by_id,
                cancelled_at, cancel_reason
    `;
    for (const m of manutencoesInseridas) {
      const criada = new Date(m.scheduled_date.getTime() - 7 * 86_400_000);
      registrar('MAINTENANCE', m.id, 'CREATE', m.created_by_id, criada, {
        vehicleId: { de: null, para: m.vehicle_id },
        scheduledDate: { de: null, para: m.scheduled_date.toISOString() },
      });
      if (m.status === 'DONE' && m.completed_date) {
        registrar('MAINTENANCE', m.id, 'UPDATE', m.created_by_id, m.completed_date, {
          status: { de: 'SCHEDULED', para: 'DONE' },
          completedDate: { de: null, para: m.completed_date.toISOString() },
        });
      }
      if (m.status === 'CANCELLED' && m.cancelled_at) {
        registrar(
          'MAINTENANCE',
          m.id,
          'CANCEL',
          m.created_by_id,
          m.cancelled_at,
          { status: { de: 'SCHEDULED', para: 'CANCELLED' } },
          m.cancel_reason,
        );
      }
    }

    for (let i = 0; i < historico.length; i += 500) {
      await tx`insert into change_logs ${tx(historico.slice(i, i + 500))}`;
    }

    // ---- documentos --------------------------------------------------------
    // A maior parte em dia; uma parte vencida ou vencendo, para a central.
    const validadeDeDocumento = () => {
      const sorteio = aleatorio();
      if (sorteio < 0.07) return -inteiro(3, 60);
      if (sorteio < 0.17) return inteiro(1, 30);
      return inteiro(31, 360);
    };
    const documentos: Record<string, unknown>[] = [];
    for (const veiculo of veiculos) {
      for (const tipo of ['CRLV', 'IPVA', 'SEGURO']) {
        documentos.push({
          company_id: empresa.id,
          vehicle_id: veiculo.id,
          driver_id: null,
          type: tipo,
          expiry_date: dataCivil(validadeDeDocumento()),
          created_by_id: gerente,
        });
      }
    }
    // CNH como documento para a maioria; duas fichas ficam só com a validade
    // própria, que a central também acompanha.
    fichas.forEach((ficha, i) => {
      if (i === 1 || i === 4) return;
      documentos.push({
        company_id: empresa.id,
        vehicle_id: null,
        driver_id: ficha.id,
        type: 'CNH',
        expiry_date: ficha.cnhExpiry,
        created_by_id: gerente,
      });
    });
    await tx`insert into documents ${tx(documentos)}`;

    // ---- solicitações de acesso, sem login --------------------------------
    const contas = [
      ['PENDING', 'OPERATOR'],
      ['PENDING', 'OPERATOR'],
      ['PENDING', 'MANAGER'],
      ['REJECTED', 'OPERATOR'],
      ['BLOCKED', 'OPERATOR'],
    ].map(([status, papel], i) => {
      const nome = `${um(NOMES)} ${um(SOBRENOMES)}`;
      return {
        company_id: empresa.id,
        name: nome,
        email: `${semAcento(nome).replace(/\s+/g, '.')}.${config.digito}${i}@${DOMINIO}`,
        cpf: cpfSintetico(800000000 + config.digito * 1000 + i),
        phone: `(85) 9${inteiro(8000, 9999)}-${inteiro(1000, 9999)}`,
        role: status === 'BLOCKED' ? papel : 'OPERATOR',
        requested_role: papel,
        status,
        address_street: 'Rua Exemplo',
        address_number: String(inteiro(10, 999)),
        address_district: um(BAIRROS),
        address_city: config.cidade,
        address_state: 'CE',
        address_zip: '60000-000',
      };
    });
    await tx`insert into users ${tx(contas)}`;

    console.log(
      `  ${empresa.name}: ${veiculos.length} veículos, ${fichas.length} motoristas, ` +
        `${vinculos.length} vínculos, ${despesas.length} despesas, ` +
        `${manutencoes.length} manutenções, ${documentos.length} documentos, ` +
        `${historico.length} registros de histórico, ` +
        `${contas.length} solicitações de acesso.`,
    );
  });
}

async function remover(sql: postgres.Sql, empresa: Empresa, config: (typeof EMPRESAS)[number]) {
  await sql.begin(async (tx) => {
    // O histórico não tem chave estrangeira — remover um registro não apaga o
    // que se disse sobre ele —, então sai antes, explicitamente.
    await tx`
      delete from change_logs
      where company_id = ${empresa.id}
        and entity_id in (
          select e.id from expenses e join vehicles v on v.id = e.vehicle_id
          where v.company_id = ${empresa.id} and v.plate like ${`${config.prefixoPlaca}%`}
          union all
          select m.id from maintenances m join vehicles v on v.id = m.vehicle_id
          where v.company_id = ${empresa.id} and v.plate like ${`${config.prefixoPlaca}%`}
        )
    `;
    // Despesas, manutenções, documentos e vínculos dos veículos saem em cascata.
    const veiculos = await tx`
      delete from vehicles
      where company_id = ${empresa.id} and plate like ${`${config.prefixoPlaca}%`}
    `;
    const fichas = await tx`
      delete from drivers
      where company_id = ${empresa.id} and user_id is null and cnh like ${`99${config.digito}%`}
    `;
    const contas = await tx`
      delete from users
      where company_id = ${empresa.id} and auth_user_id is null and email like ${`%@${DOMINIO}`}
    `;
    console.log(
      `  ${empresa.name}: removidos ${veiculos.count} veículos, ${fichas.count} motoristas e ` +
        `${contas.count} contas, com os registros dependentes.`,
    );
  });
}

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) {
    console.error('DIRECT_URL precisa estar definida. Confira o .env.');
    process.exit(1);
  }

  const removendo = process.argv.includes('--remover');
  const sql = postgres(url, { max: 1, onnotice: () => {} });

  try {
    console.log(
      removendo ? 'Removendo o volume de demonstração…' : 'Populando o volume de demonstração…',
    );
    for (const config of EMPRESAS) {
      aleatorio = geradorComSemente(2026 + config.digito);
      const [empresa] = await sql<Empresa[]>`
        select id, name from companies where join_code = ${config.codigo}
      `;
      if (!empresa) {
        console.log(`  Empresa ${config.codigo} não encontrada — rode db:seed antes.`);
        continue;
      }
      await (removendo ? remover(sql, empresa, config) : popular(sql, empresa, config));
    }
  } finally {
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
