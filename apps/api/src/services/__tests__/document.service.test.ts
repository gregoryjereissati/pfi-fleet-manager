import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentType } from '@fleet-manager/shared';
import { documentService } from '../document.service';
import { documentRepository } from '../../repositories/document.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { driverRepository } from '../../repositories/driver.repository';
import { assignmentRepository } from '../../repositories/assignment.repository';
import {
  makeDriverScope,
  makeScope,
  registrosDeAuditoria,
  resetDbMock,
} from '../../test-helpers/db-mock';

vi.mock('../../config/database', async () => {
  const { sqlMock, emTransacaoMock } = await import('../../test-helpers/db-mock');
  return { sql: sqlMock, emTransacao: emTransacaoMock };
});

vi.mock('../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/audit')>();
  const { recordChangeMock } = await import('../../test-helpers/db-mock');
  return { ...actual, recordChange: recordChangeMock };
});

vi.mock('../../repositories/document.repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../repositories/document.repository')>();

  return {
    ...actual,
    documentRepository: {
      findMany: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countAlertsActive: vi.fn().mockResolvedValue(0),
    },
  };
});

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: { findSummaryById: vi.fn() },
}));

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: { findById: vi.fn() },
}));

vi.mock('../../repositories/assignment.repository', () => ({
  assignmentRepository: { activeVehicleIds: vi.fn().mockResolvedValue([]) },
}));

const vehicleDocument = {
  id: 'document-1',
  vehicleId: 'vehicle-1',
  vehiclePlate: 'ABC-1234',
  driverId: null,
  driverName: null,
  type: DocumentType.CRLV,
  expiryDate: '2027-01-01',
  fileUrl: null,
  alertSent: false,
  status: 'OK' as const,
  createdById: 'user-1',
  createdAt: '2026-09-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMock();
});

describe('documentService — recorte por empresa', () => {
  it('lista dentro da empresa', async () => {
    await documentService.listDocuments(makeScope(), { type: DocumentType.CRLV });

    expect(documentRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-a',
        type: DocumentType.CRLV,
        driverScope: undefined,
      }),
    );
  });

  it('não encontra documento de outra empresa', async () => {
    vi.mocked(documentRepository.findById).mockResolvedValue(null);

    await expect(
      documentService.getDocument(makeScope({ companyId: 'company-b' }), 'document-1'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(documentRepository.findById).toHaveBeenCalledWith(
      'document-1',
      'company-b',
      undefined,
    );
  });

  it('recusa anexar documento a veículo de outra empresa', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue(null);

    await expect(
      documentService.createDocument(makeScope(), {
        vehicleId: 'vehicle-de-fora',
        type: DocumentType.CRLV,
        expiryDate: '2027-06-30',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(documentRepository.create).not.toHaveBeenCalled();
  });

  it('recusa anexar documento a motorista de outra empresa', async () => {
    vi.mocked(driverRepository.findById).mockResolvedValue(null);

    await expect(
      documentService.createDocument(makeScope(), {
        driverId: 'driver-de-fora',
        type: DocumentType.CNH,
        expiryDate: '2027-06-30',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('documentService — recorte do motorista', () => {
  it('alcança a própria ficha e os veículos vinculados', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);

    await documentService.listDocuments(makeDriverScope(), {});

    expect(documentRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        driverScope: { driverId: 'driver-1', vehicleIds: ['vehicle-1'] },
      }),
    );
  });

  it('a contagem de alertas usa o mesmo recorte da central', async () => {
    vi.mocked(assignmentRepository.activeVehicleIds).mockResolvedValue(['vehicle-1']);

    await documentService.getAlertsCount(makeDriverScope());

    expect(documentRepository.countAlertsActive).toHaveBeenCalledWith('company-a', {
      driverId: 'driver-1',
      vehicleIds: ['vehicle-1'],
    });
  });

  it('a contagem do gerente cobre a empresa, sem recorte adicional', async () => {
    await documentService.getAlertsCount(makeScope());

    expect(documentRepository.countAlertsActive).toHaveBeenCalledWith('company-a', undefined);
  });
});

describe('documentService — vínculo do documento', () => {
  it('exige veículo ou motorista', async () => {
    await expect(
      documentService.createDocument(makeScope(), {
        type: DocumentType.CRLV,
        expiryDate: '2027-06-30',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('recusa documento vinculado aos dois ao mesmo tempo', async () => {
    await expect(
      documentService.createDocument(makeScope(), {
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        type: DocumentType.CRLV,
        expiryDate: '2027-06-30',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('grava a empresa e o autor a partir do recorte', async () => {
    vi.mocked(vehicleRepository.findSummaryById).mockResolvedValue({
      id: 'vehicle-1',
      companyId: 'company-a',
    } as never);
    vi.mocked(documentRepository.create).mockResolvedValue(vehicleDocument as never);

    await documentService.createDocument(makeScope(), {
      vehicleId: 'vehicle-1',
      type: DocumentType.CRLV,
      expiryDate: '2027-01-01',
    });

    expect(documentRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ companyId: 'company-a', createdById: 'user-1' }),
    );
  });
});

describe('documentService — alteração e remoção', () => {
  it('registra no histórico o que mudou', async () => {
    vi.mocked(documentRepository.findById).mockResolvedValue(vehicleDocument as never);
    vi.mocked(documentRepository.update).mockResolvedValue(vehicleDocument as never);

    await documentService.updateDocument(makeScope(), 'document-1', {
      expiryDate: '2028-01-01',
    });

    expect(registrosDeAuditoria()).toContainEqual(expect.objectContaining({
        entityType: 'DOCUMENT',
        changes: {
          // Data civil: o histórico guarda o dia, sem hora nem fuso.
          expiryDate: { de: '2027-01-01', para: '2028-01-01' },
        },
      }),
    );
  });

  it('não deixa o cliente trocar a entidade dona do documento', async () => {
    vi.mocked(documentRepository.findById).mockResolvedValue(vehicleDocument as never);
    vi.mocked(documentRepository.update).mockResolvedValue(vehicleDocument as never);

    await documentService.updateDocument(makeScope(), 'document-1', {
      type: DocumentType.IPVA,
      vehicleId: 'vehicle-9',
      driverId: 'driver-9',
    } as never);

    const [, , payload] = vi.mocked(documentRepository.update).mock.calls[0];
    expect(payload).toEqual({ type: DocumentType.IPVA });
  });

  it('remove apenas documento da própria empresa', async () => {
    vi.mocked(documentRepository.findById).mockResolvedValue(null);

    await expect(
      documentService.deleteDocument(makeScope({ companyId: 'company-b' }), 'document-1'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(documentRepository.delete).not.toHaveBeenCalled();
  });
});
