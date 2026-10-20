import type { NextFunction, Request, Response } from 'express';

/**
 * Tempo máximo de uma requisição antes de a API desistir e responder 503.
 *
 * Com o banco indisponível, uma consulta pode ficar esperando indefinidamente
 * por uma conexão que não responde. Sem limite, quem chamou fica preso e a
 * função continua contando tempo de execução na Vercel. Nenhuma rota legítima
 * chega perto deste valor: a mais pesada, o painel, responde em milissegundos.
 */
export const TEMPO_LIMITE_MS = 10_000;

/**
 * Registra uma linha por requisição atendida: método, caminho, status e
 * duração. A query string fica de fora — o caminho basta para localizar a
 * rota, e filtros não precisam ir para o log.
 *
 * Desligado nos testes, onde só poluiria a saída.
 */
export function registrarRequisicao(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const caminho = req.originalUrl.split('?')[0];
    console.log(`[req] ${req.method} ${caminho} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
}

/**
 * Responde 503 quando a requisição passa de `ms` sem resposta.
 *
 * Se o handler terminar depois disso, a resposta já foi enviada e a dele é
 * descartada pelo `errorHandler`, que não tenta responder duas vezes.
 */
export function tempoLimite(ms: number = TEMPO_LIMITE_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const relogio = setTimeout(() => {
      if (res.headersSent) return;
      console.error(`[timeout] ${req.method} ${req.originalUrl.split('?')[0]} passou de ${ms}ms`);
      res.status(503).json({ error: 'Service unavailable' });
    }, ms);

    const parar = () => clearTimeout(relogio);
    res.on('finish', parar);
    res.on('close', parar);
    next();
  };
}
