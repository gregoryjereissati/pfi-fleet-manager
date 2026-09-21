import { describe, expect, it } from 'vitest';
import { caminhoDeAnexo, caminhoDoAnexo, uploadUrlSchema } from '../anexos';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const VEHICLE = '22222222-2222-4222-8222-222222222222';

describe('extensões aceitas no anexo', () => {
  it.each(['jpg', 'jpeg', 'png', 'webp', 'pdf'])('aceita %s', (extensao) => {
    const resultado = uploadUrlSchema.safeParse({ vehicleId: VEHICLE, extensao });
    expect(resultado.success).toBe(true);
  });

  // Sem a API no caminho, a única barreira era a política do bucket. Agora a
  // barreira é esta, e ela não pode ser mais larga do que era.
  it.each(['exe', 'svg', 'html', 'pdf.exe', ''])('recusa %s', (extensao) => {
    const resultado = uploadUrlSchema.safeParse({ vehicleId: VEHICLE, extensao });
    expect(resultado.success).toBe(false);
  });

  it('normaliza a extensão informada em maiúsculas', () => {
    const resultado = uploadUrlSchema.parse({ vehicleId: VEHICLE, extensao: 'PDF' });
    expect(resultado.extensao).toBe('pdf');
  });

  it('exige veículo ou ficha, nunca os dois', () => {
    expect(uploadUrlSchema.safeParse({ extensao: 'pdf' }).success).toBe(false);
    expect(
      uploadUrlSchema.safeParse({ vehicleId: VEHICLE, driverId: 'd', extensao: 'pdf' }).success,
    ).toBe(false);
  });
});

describe('caminho do anexo', () => {
  it('começa pela empresa e termina na extensão pedida', () => {
    const caminho = caminhoDoAnexo(COMPANY, VEHICLE, 'png');

    expect(caminho.startsWith(`${COMPANY}/${VEHICLE}/`)).toBe(true);
    expect(caminho.endsWith('.png')).toBe(true);
    expect(caminhoDeAnexo.safeParse(caminho).success).toBe(true);
  });

  // `fileUrl` guarda o caminho. Uma URL inteira ali apontaria para fora do
  // bucket, e a API assinaria um endereço que não é o do anexo.
  it('recusa o que não for um caminho emitido pela API', () => {
    for (const valor of [
      'https://projeto.supabase.co/storage/v1/object/documents/a.pdf',
      `${COMPANY}/${VEHICLE}/arquivo.pdf`,
      `../${COMPANY}/${VEHICLE}/${COMPANY}.pdf`,
      `${COMPANY}/${VEHICLE}/${COMPANY}.exe`,
    ]) {
      expect(caminhoDeAnexo.safeParse(valor).success).toBe(false);
    }
  });
});
