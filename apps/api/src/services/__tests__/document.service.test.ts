import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DocumentType,
  DriverStatus,
  VehicleStatus,
  type DocumentStatus,
} from '@fleet-manager/shared';
import { documentService } from '../document.service';
import { documentRepository } from '../../repositories/document.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { driverRepository } from '../../repositories/driver.repository';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/document.repository', () => ({
  documentRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countAlertsActive: vi.fn(),
  },
}));

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: {
    findById: vi.fn(),
  },
}));

const mockVehicle = {
  id: 'vehicle-1',
  plate: 'ABC-1234',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2022,
  color: 'Prata',
  status: VehicleStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  drivers: [],
  expenses: [],
  maintenances: [],
};

const mockDriver = {
  id: 'driver-1',
  name: 'Joao Silva',
  cpf: '12345678901',
  cnh: 'CNH123',
  cnhExpiry: new Date('2027-01-01'),
  phone: null,
  status: DriverStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  vehicles: [],
};

const mockDocument = {
  id: 'doc-1',
  vehicleId: 'vehicle-1',
  vehiclePlate: 'ABC-1234',
  driverId: null,
  driverName: null,
  type: DocumentType.CRLV,
  expiryDate: '2027-01-01T00:00:00.000Z',
  alertSent: false,
  status: 'OK' as DocumentStatus,
  createdAt: '2026-04-17T00:00:00.000Z',
};

describe('documentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('returns the document list from repository', async () => {
      vi.mocked(documentRepository.findMany).mockResolvedValue([mockDocument]);

      const result = await documentService.listDocuments({ vehicleId: 'vehicle-1' });

      expect(result).toEqual([mockDocument]);
      expect(documentRepository.findMany).toHaveBeenCalledWith({ vehicleId: 'vehicle-1' });
    });

    it('returns documents filtered by status EXPIRING_SOON', async () => {
      vi.mocked(documentRepository.findMany).mockResolvedValue([
        { ...mockDocument, status: 'EXPIRING_SOON' },
      ]);

      const result = await documentService.listDocuments({ status: 'EXPIRING_SOON' });

      expect(result[0].status).toBe('EXPIRING_SOON');
      expect(documentRepository.findMany).toHaveBeenCalledWith({ status: 'EXPIRING_SOON' });
    });
  });

  describe('getDocument', () => {
    it('throws AppError 404 when document does not exist', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(null);

      await expect(documentService.getDocument('missing')).rejects.toThrow(
        new AppError(404, 'Document not found'),
      );
    });

    it('returns the document when found', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(mockDocument);

      const result = await documentService.getDocument('doc-1');

      expect(result).toEqual(mockDocument);
      expect(documentRepository.findById).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('createDocument', () => {
    it('throws AppError 400 when neither vehicleId nor driverId is provided', async () => {
      await expect(
        documentService.createDocument({
          type: DocumentType.CRLV,
          expiryDate: new Date('2027-01-01'),
        }),
      ).rejects.toThrow(new AppError(400, 'vehicleId or driverId is required'));

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('throws AppError 400 when both vehicleId and driverId are provided', async () => {
      await expect(
        documentService.createDocument({
          vehicleId: 'vehicle-1',
          driverId: 'driver-1',
          type: DocumentType.CRLV,
          expiryDate: new Date('2027-01-01'),
        }),
      ).rejects.toThrow(new AppError(400, 'Document must belong to either a vehicle or a driver'));

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(
        documentService.createDocument({
          vehicleId: 'vehicle-1',
          type: DocumentType.CRLV,
          expiryDate: new Date('2027-01-01'),
        }),
      ).rejects.toThrow(new AppError(404, 'Vehicle not found'));

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('throws AppError 404 when driver does not exist', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);

      await expect(
        documentService.createDocument({
          driverId: 'driver-1',
          type: DocumentType.CNH,
          expiryDate: new Date('2027-01-01'),
        }),
      ).rejects.toThrow(new AppError(404, 'Driver not found'));

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('creates and returns the document when vehicle exists', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(documentRepository.create).mockResolvedValue(mockDocument);

      const result = await documentService.createDocument({
        vehicleId: 'vehicle-1',
        type: DocumentType.CRLV,
        expiryDate: new Date('2027-01-01'),
      });

      expect(result).toEqual(mockDocument);
      expect(documentRepository.create).toHaveBeenCalledWith({
        vehicleId: 'vehicle-1',
        type: DocumentType.CRLV,
        expiryDate: new Date('2027-01-01'),
      });
    });

    it('creates and returns the document when driver exists', async () => {
      const driverDocument = {
        ...mockDocument,
        vehicleId: null,
        vehiclePlate: null,
        driverId: 'driver-1',
        driverName: 'Joao Silva',
        type: DocumentType.CNH,
      };

      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(documentRepository.create).mockResolvedValue(driverDocument);

      const result = await documentService.createDocument({
        driverId: 'driver-1',
        type: DocumentType.CNH,
        expiryDate: new Date('2027-01-01'),
      });

      expect(result).toEqual(driverDocument);
      expect(documentRepository.create).toHaveBeenCalledWith({
        driverId: 'driver-1',
        type: DocumentType.CNH,
        expiryDate: new Date('2027-01-01'),
      });
    });
  });

  describe('updateDocument', () => {
    it('throws AppError 404 when document does not exist', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(null);

      await expect(
        documentService.updateDocument('missing', { type: DocumentType.IPVA }),
      ).rejects.toThrow(new AppError(404, 'Document not found'));
    });

    it('updates and returns the document', async () => {
      const updatedDocument = { ...mockDocument, type: DocumentType.IPVA };

      vi.mocked(documentRepository.findById).mockResolvedValue(mockDocument);
      vi.mocked(documentRepository.update).mockResolvedValue(updatedDocument);

      const result = await documentService.updateDocument('doc-1', { type: DocumentType.IPVA });

      expect(result).toEqual(updatedDocument);
      expect(documentRepository.update).toHaveBeenCalledWith('doc-1', {
        type: DocumentType.IPVA,
      });
    });
  });

  describe('deleteDocument', () => {
    it('throws AppError 404 when document does not exist', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(null);

      await expect(documentService.deleteDocument('missing')).rejects.toThrow(
        new AppError(404, 'Document not found'),
      );
    });

    it('deletes the document', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(mockDocument);
      vi.mocked(documentRepository.delete).mockResolvedValue(mockDocument);

      const result = await documentService.deleteDocument('doc-1');

      expect(result).toEqual(mockDocument);
      expect(documentRepository.delete).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('getAlertsCount', () => {
    it('returns count from repository', async () => {
      vi.mocked(documentRepository.countAlertsActive).mockResolvedValue(5);

      const result = await documentService.getAlertsCount();

      expect(result).toBe(5);
      expect(documentRepository.countAlertsActive).toHaveBeenCalled();
    });
  });
});
