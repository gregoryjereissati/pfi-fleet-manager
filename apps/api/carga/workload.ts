import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { PESSOAS, ehAmbienteLocal, entrar, type Pessoa } from '../e2e/helpers';
import { sql } from '../src/config/database';

/**
 * Teste de carga com workload misto.
 *
 * O teste por rota mede o máximo de cada uma isolada. Aqui todas as rotas
 * disputam a API e o banco ao mesmo tempo, na proporção de um uso realista:
 * a listagem de despesas é a tela mais aberta, o lançamento de despesa é a
 * escrita mais comum, e o painel — a rota mais cara — aparece pouco, mas pesa.
 *
 * Funcionamento (modelo de carga fechado, como o do autocannon):
 * - `conexoes` trabalhadores rodam em paralelo, sem pausa entre um pedido e
 *   o seguinte;
 * - a cada pedido, o trabalhador sorteia a rota pelo peso da tabela ROTAS e o
 *   perfil que faz o pedido;
 * - cada resposta é lida por inteiro, e o tempo é medido do envio ao fim da
 *   leitura;
 * - os primeiros segundos são aquecimento e não entram na conta.
 *
 * Grava no banco (as despesas do POST), por isso só roda contra o Supabase
 * local, nunca contra produção. Ao final, apaga as despesas que criou — e só
 * elas, reconhecidas pela descrição —, para que a base volte ao estado de
 * antes; `--manter` as preserva.
 *
 * Uso, com a API compilada no ar (`npm run build && npm start`):
 *   npm run carga:workload -- --conexoes=10,50,100 --duracao=30
 */

interface Rota {
  nome: string;
  peso: number;
  metodo: 'GET' | 'POST';
  caminho: string;
  /** Perfis sorteados para a rota. Vazio: sem autenticação. */
  perfis: Pessoa[];
  corpo?: (perfil: Pessoa) => unknown;
}

const DESCRICAO_DA_CARGA = 'carga: workload misto';

/** Despesa sintética, sempre com data de hoje e valor com centavos. */
function novaDespesa(perfil: Pessoa) {
  const veiculos = veiculosPorPerfil.get(perfil) ?? [];
  return {
    vehicleId: veiculos[Math.floor(Math.random() * veiculos.length)],
    type: 'FUEL',
    amount: Math.round((50 + Math.random() * 450) * 100) / 100,
    date: new Date().toISOString().slice(0, 10),
    description: DESCRICAO_DA_CARGA,
  };
}

/**
 * Proporção do workload, em pesos que somam 100.
 *
 * GET e POST de despesas, 60% e 15%, vêm do enunciado do professor; os
 * demais completam os 25% restantes, com o painel e os veículos pouco
 * frequentes e o /health como o monitor externo consultando o sistema.
 */
const ROTAS: Rota[] = [
  {
    nome: 'GET /api/expenses',
    peso: 60,
    metodo: 'GET',
    caminho: '/api/expenses',
    perfis: ['helena', 'rogerio', 'claudia'],
  },
  {
    nome: 'POST /api/expenses',
    peso: 15,
    metodo: 'POST',
    caminho: '/api/expenses',
    perfis: ['rogerio', 'claudia'],
    corpo: novaDespesa,
  },
  {
    nome: 'GET /api/documents',
    peso: 8,
    metodo: 'GET',
    caminho: '/api/documents',
    perfis: ['helena', 'rogerio', 'claudia'],
  },
  { nome: 'GET /health', peso: 8, metodo: 'GET', caminho: '/health', perfis: [] },
  {
    nome: 'GET /api/dashboard/indicators',
    peso: 5,
    metodo: 'GET',
    caminho: '/api/dashboard/indicators',
    perfis: ['helena', 'rogerio', 'claudia'],
  },
  {
    nome: 'GET /api/vehicles',
    peso: 4,
    metodo: 'GET',
    caminho: '/api/vehicles',
    perfis: ['helena', 'rogerio', 'claudia'],
  },
];

const PESO_TOTAL = ROTAS.reduce((soma, rota) => soma + rota.peso, 0);

function sortearRota(): Rota {
  let sorteio = Math.random() * PESO_TOTAL;
  for (const rota of ROTAS) {
    sorteio -= rota.peso;
    if (sorteio < 0) return rota;
  }
  return ROTAS[ROTAS.length - 1];
}

function sortear<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

// ---------------------------------------------------------------------------

function argumento(nome: string, padrao: string): string {
  const achado = process.argv.find((arg) => arg.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
}

const URL_BASE = argumento('url', 'http://localhost:3000').replace(/\/$/, '');
const NIVEIS = argumento('conexoes', '10,50,100').split(',').map(Number);
const DURACAO_S = Number(argumento('duracao', '30'));
const AQUECIMENTO_S = Number(argumento('aquecimento', '3'));
const PRAZO_MS = 15_000;
const SAIDA = resolve(
  argumento('saida', resolve(__dirname, '../../../docs/testes/workload-misto.json')),
);

const tokens = new Map<Pessoa, string>();
const veiculosPorPerfil = new Map<Pessoa, string[]>();

interface Medida {
  rota: string;
  ms: number;
  ok: boolean;
}

async function pedir(rota: Rota): Promise<Medida> {
  const perfil = rota.perfis.length > 0 ? sortear(rota.perfis) : null;
  const headers: Record<string, string> = {};
  if (perfil) headers.authorization = `Bearer ${tokens.get(perfil)}`;

  let body: string | undefined;
  if (rota.corpo && perfil) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(rota.corpo(perfil));
  }

  const inicio = performance.now();
  try {
    // Prazo por pedido: um pedido sem resposta conta como erro, em vez de
    // prender o trabalhador e o teste inteiro.
    const resposta = await fetch(`${URL_BASE}${rota.caminho}`, {
      method: rota.metodo,
      headers,
      body,
      signal: AbortSignal.timeout(PRAZO_MS),
    });
    await resposta.arrayBuffer();
    return { rota: rota.nome, ms: performance.now() - inicio, ok: resposta.ok };
  } catch {
    return { rota: rota.nome, ms: performance.now() - inicio, ok: false };
  }
}

function percentil(ordenado: number[], p: number): number {
  if (ordenado.length === 0) return 0;
  const indice = Math.min(ordenado.length - 1, Math.ceil((p / 100) * ordenado.length) - 1);
  return ordenado[Math.max(0, indice)];
}

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

function resumir(medidas: Medida[], duracaoS: number) {
  const tempos = medidas.map((m) => m.ms).sort((x, y) => x - y);
  return {
    requisicoes: medidas.length,
    reqPorSegundo: Math.round(medidas.length / duracaoS),
    participacao: 0,
    erros: medidas.filter((m) => !m.ok).length,
    medianaMs: arredondar(percentil(tempos, 50)),
    p90Ms: arredondar(percentil(tempos, 90)),
    p99Ms: arredondar(percentil(tempos, 99)),
    maximoMs: arredondar(tempos[tempos.length - 1] ?? 0),
  };
}

async function rodarNivel(conexoes: number) {
  const medidas: Medida[] = [];
  const fimDoAquecimento = performance.now() + AQUECIMENTO_S * 1000;
  const fim = fimDoAquecimento + DURACAO_S * 1000;

  async function trabalhador() {
    while (performance.now() < fim) {
      const medida = await pedir(sortearRota());
      if (performance.now() >= fimDoAquecimento) medidas.push(medida);
    }
  }

  await Promise.all(Array.from({ length: conexoes }, trabalhador));

  const total = resumir(medidas, DURACAO_S);
  const porRota = ROTAS.map((rota) => {
    const daRota = medidas.filter((m) => m.rota === rota.nome);
    const resumo = resumir(daRota, DURACAO_S);
    resumo.participacao = arredondar((daRota.length / Math.max(1, medidas.length)) * 100);
    return { rota: rota.nome, pesoAlvo: rota.peso, ...resumo };
  });

  return { conexoes, total, porRota };
}

async function main() {
  if (!ehAmbienteLocal) {
    console.error('O workload grava despesas e só roda contra o Supabase local.');
    process.exit(1);
  }

  const perfis: Pessoa[] = ['helena', 'rogerio', 'claudia'];
  for (const perfil of perfis) tokens.set(perfil, await entrar(PESSOAS[perfil]));

  for (const perfil of perfis) {
    const resposta = await fetch(`${URL_BASE}/api/vehicles`, {
      headers: { authorization: `Bearer ${tokens.get(perfil)}` },
    });
    const veiculos = (await resposta.json()) as { id: string; status: string }[];
    veiculosPorPerfil.set(
      perfil,
      veiculos.filter((v) => v.status === 'ACTIVE').map((v) => v.id),
    );
  }

  const niveis = [];
  for (const conexoes of NIVEIS) {
    console.log(`\n→ ${conexoes} conexões, ${DURACAO_S} s (+${AQUECIMENTO_S} s de aquecimento)`);
    const resultado = await rodarNivel(conexoes);
    niveis.push(resultado);

    const { total } = resultado;
    console.log(
      `  total: ${total.reqPorSegundo} req/s · mediana ${total.medianaMs} ms · ` +
        `p99 ${total.p99Ms} ms · erros ${total.erros}`,
    );
    for (const rota of resultado.porRota) {
      console.log(
        `  ${rota.rota.padEnd(32)} ${String(rota.participacao).padStart(5)}% ` +
          `mediana ${String(rota.medianaMs).padStart(6)} ms · p99 ${String(rota.p99Ms).padStart(6)} ms · ` +
          `erros ${rota.erros}`,
      );
    }
  }

  const relatorio = {
    data: new Date().toISOString(),
    alvo: URL_BASE,
    duracaoS: DURACAO_S,
    aquecimentoS: AQUECIMENTO_S,
    maquina: {
      cpu: cpus()[0]?.model ?? 'desconhecida',
      nucleos: cpus().length,
      memoriaGb: Math.round(totalmem() / 1024 ** 3),
      node: process.version,
    },
    pesos: ROTAS.map(({ nome, peso }) => ({ rota: nome, peso })),
    niveis,
  };

  mkdirSync(dirname(SAIDA), { recursive: true });
  writeFileSync(SAIDA, `${JSON.stringify(relatorio, null, 2)}\n`);
  console.log(`\nResultado gravado em ${SAIDA}`);

  if (!process.argv.includes('--manter')) {
    const [{ total }] = await sql<{ total: number }[]>`
      with removidas as (
        delete from expenses where description = ${DESCRICAO_DA_CARGA} returning id
      ),
      historico as (
        delete from change_logs
        where entity_type = 'EXPENSE' and entity_id in (select id from removidas)
      )
      select count(*)::int as total from removidas
    `;
    console.log(`Despesas criadas pela carga e removidas: ${total}`);
  }

  // As conexões keep-alive do fetch mantêm o processo vivo depois do teste.
  await sql.end();
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
