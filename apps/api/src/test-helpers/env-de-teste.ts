import 'dotenv/config';

/**
 * Preparação da suíte padrão.
 *
 * `config/env.ts` encerra o processo quando falta variável obrigatória, e
 * qualquer teste que importe um serviço chega a ele. Sem `.env`, suítes que
 * substituem os repositórios — e nunca tocam o banco — caíam no carregamento.
 *
 * Aqui as ausentes recebem valores fictícios. `TEST_SEM_BANCO` registra que a
 * conexão não é real, para que os testes de integração sejam pulados em vez
 * de tentar conectar. Com `.env` presente, nada é alterado.
 */
if (!process.env.DATABASE_URL) {
  process.env.TEST_SEM_BANCO = '1';
}

const FICTICIOS: Record<string, string> = {
  DATABASE_URL: 'postgresql://sem-banco@127.0.0.1:1/sem-banco',
  DIRECT_URL: 'postgresql://sem-banco@127.0.0.1:1/sem-banco',
  SUPABASE_URL: 'http://127.0.0.1:1',
  SUPABASE_SERVICE_ROLE_KEY: 'sem-chave',
};

for (const [chave, valor] of Object.entries(FICTICIOS)) {
  process.env[chave] ??= valor;
}
