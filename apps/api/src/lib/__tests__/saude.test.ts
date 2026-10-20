import { describe, it, expect } from 'vitest';
import { bancoResponde } from '../saude';

describe('bancoResponde', () => {
  it('confirma quando a consulta responde', async () => {
    await expect(bancoResponde(() => Promise.resolve([{ '?column?': 1 }]))).resolves.toBe(true);
  });

  it('nega quando a consulta falha', async () => {
    await expect(bancoResponde(() => Promise.reject(new Error('ENOTFOUND')))).resolves.toBe(false);
  });

  it('nega quando a consulta não responde dentro do prazo', async () => {
    const nuncaResponde = () => new Promise(() => {});
    await expect(bancoResponde(nuncaResponde, 20)).resolves.toBe(false);
  });

  it('uma falha que chega depois do prazo não fica sem tratamento', async () => {
    const falhaTardia = () =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('CONNECT_TIMEOUT')), 40));

    await expect(bancoResponde(falhaTardia, 10)).resolves.toBe(false);
    // Espera a rejeição tardia acontecer: o Vitest acusaria rejeição sem tratamento.
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
});
