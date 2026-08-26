import cron from 'node-cron';
import { documentRepository } from '../repositories/document.repository';

/**
 * Marca como sinalizados os documentos que vencem em até 30 dias.
 *
 * A operação é idempotente: documentos já sinalizados não são reprocessados,
 * de modo que execuções repetidas no mesmo dia não têm efeito colateral.
 */
export async function markExpiringDocuments(): Promise<number> {
  const documents = await documentRepository.findNeedingAlert(30);

  if (documents.length === 0) {
    return 0;
  }

  await documentRepository.markAlertSent(documents.map((document) => document.id));
  console.log(`[alertCron] ${documents.length} documento(s) sinalizado(s)`);
  return documents.length;
}

/**
 * Em ambientes com processo persistente, a rotina é agendada internamente.
 *
 * Em execução serverless não há processo vivo entre requisições, portanto o
 * agendamento interno não funcionaria: nesses ambientes a rotina é disparada
 * externamente pelo agendador da plataforma, através de `GET /api/jobs/alerts`.
 * A variável DISABLE_INTERNAL_CRON desliga o agendamento interno.
 */
const internalCronDisabled =
  process.env.NODE_ENV === 'test' ||
  process.env.DISABLE_INTERNAL_CRON === 'true' ||
  process.env.VERCEL === '1';

export const alertCronTask = internalCronDisabled
  ? null
  : cron.schedule('0 0 * * *', () => {
      void markExpiringDocuments();
    });
