import { Router } from 'express';
import { markExpiringDocuments } from '../jobs/alertCron';

export const jobRouter = Router();

/**
 * Disparo externo da rotina diária de sinalização de vencimentos.
 *
 * Existe para ambientes serverless, onde não há processo persistente capaz de
 * manter um agendamento interno. O agendador da plataforma chama esta rota uma
 * vez por dia.
 *
 * Proteção: quando `CRON_SECRET` está definida, a requisição precisa
 * apresentá-la no cabeçalho `Authorization`. É o formato usado pelo agendador
 * da Vercel. Sem a variável definida, a rota é recusada — evita deixá-la
 * aberta por esquecimento de configuração.
 */
jobRouter.get('/alerts', async (req, res) => {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    res.status(503).json({ error: 'CRON_SECRET não configurado' });
    return;
  }

  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const flagged = await markExpiringDocuments();
    res.json({ status: 'ok', documentosSinalizados: flagged });
  } catch (error) {
    console.error('[alertCron] falha na execução', error);
    res.status(500).json({ error: 'Falha ao executar a rotina de alertas' });
  }
});
