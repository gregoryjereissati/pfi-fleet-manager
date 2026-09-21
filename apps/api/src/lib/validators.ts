import { z } from 'zod';

/**
 * Data civil: dia do calendário, sem hora e sem fuso.
 *
 * Vencimento de documento e de habilitação são datas civis. Guardá-las como
 * instante obriga a escolher um horário arbitrário, e esse horário reaparece
 * como erro de um dia sempre que o fuso de quem lê difere do fuso de quem
 * gravou.
 *
 * O formulário envia `YYYY-MM-DD` — é o que `<input type="date">` produz. A
 * coerção continua aceitando o que aceitava antes, inclusive um instante ISO
 * completo, e reduz o valor ao dia correspondente em UTC, que é o mesmo
 * critério que a aplicação já aplicava.
 */
export const dataCivil = z.coerce
  .date()
  .transform((valor) => valor.toISOString().slice(0, 10));
