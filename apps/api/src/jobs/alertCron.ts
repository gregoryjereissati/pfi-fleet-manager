import cron from 'node-cron';
import { documentRepository } from '../repositories/document.repository';

async function markExpiringDocuments() {
  const documents = await documentRepository.findNeedingAlert(30);

  if (documents.length === 0) {
    return;
  }

  await documentRepository.markAlertSent(documents.map((document) => document.id));
  console.log(`[alertCron] ${documents.length} document(s) marked as alert sent`);
}

export const alertCronTask =
  process.env.NODE_ENV === 'test'
    ? null
    : cron.schedule('0 0 * * *', () => {
        void markExpiringDocuments();
      });

export { markExpiringDocuments };
