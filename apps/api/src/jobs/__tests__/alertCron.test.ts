import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../repositories/document.repository', () => ({
  documentRepository: {
    findNeedingAlert: vi.fn(),
    markAlertSent: vi.fn(),
  },
}));

import { documentRepository } from '../../repositories/document.repository';
import { executarRotina, markExpiringDocuments } from '../alertCron';

describe('markExpiringDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('procura os documentos que vencem em até 30 dias', async () => {
    vi.mocked(documentRepository.findNeedingAlert).mockResolvedValue([]);

    await markExpiringDocuments();

    expect(documentRepository.findNeedingAlert).toHaveBeenCalledWith(30);
  });

  it('sem documentos a sinalizar, não grava nada', async () => {
    vi.mocked(documentRepository.findNeedingAlert).mockResolvedValue([]);

    await expect(markExpiringDocuments()).resolves.toBe(0);
    expect(documentRepository.markAlertSent).not.toHaveBeenCalled();
  });

  it('sinaliza os encontrados de uma vez e devolve a quantidade', async () => {
    vi.mocked(documentRepository.findNeedingAlert).mockResolvedValue([
      { id: 'doc-1' },
      { id: 'doc-2' },
    ] as never);

    await expect(markExpiringDocuments()).resolves.toBe(2);
    expect(documentRepository.markAlertSent).toHaveBeenCalledWith(['doc-1', 'doc-2']);
  });

  it('a execução agendada registra a falha em vez de rejeitar', async () => {
    const falha = new Error('banco indisponível');
    vi.mocked(documentRepository.findNeedingAlert).mockRejectedValue(falha);

    await expect(executarRotina()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[alertCron] falha na execução', falha);
  });
});
