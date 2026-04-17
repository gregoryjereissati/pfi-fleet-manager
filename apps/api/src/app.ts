import express from 'express';
import './jobs/alertCron';
import { router } from './routes';
import { errorHandler } from './middlewares/error-handler';

export const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && /^http:\/\/localhost:\d+$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);
app.use(errorHandler);
