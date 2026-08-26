/**
 * Entrypoint serverless da API na Vercel.
 *
 * A Vercel expõe cada arquivo em `api/` como uma função. Uma aplicação Express
 * é, na prática, um handler `(req, res)`, portanto pode ser exportada
 * diretamente: todas as rotas sob `/api/*` são encaminhadas para cá e
 * resolvidas pelo roteador da aplicação.
 *
 * Em desenvolvimento este arquivo não é usado — `apps/api/src/server.ts`
 * continua subindo o servidor HTTP tradicional.
 */
import { app } from '../apps/api/src/app';

export default app;
