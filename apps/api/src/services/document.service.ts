import { AppError } from '../middlewares/error-handler';
import {
  documentRepository,
  type DocumentFilters,
  type CreateDocumentData,
  type UpdateDocumentData,
} from '../repositories/document.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import { driverRepository } from '../repositories/driver.repository';

export const documentService = {
  async listDocuments(filters: DocumentFilters) {
    return documentRepository.findMany(filters);
  },

  async getDocument(id: string) {
    const document = await documentRepository.findById(id);

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    return document;
  },

  async createDocument(data: CreateDocumentData) {
    if (!data.vehicleId && !data.driverId) {
      throw new AppError(400, 'vehicleId or driverId is required');
    }

    if (data.vehicleId && data.driverId) {
      throw new AppError(400, 'Document must belong to either a vehicle or a driver');
    }

    if (data.vehicleId) {
      const vehicle = await vehicleRepository.findById(data.vehicleId);

      if (!vehicle) {
        throw new AppError(404, 'Vehicle not found');
      }
    }

    if (data.driverId) {
      const driver = await driverRepository.findById(data.driverId);

      if (!driver) {
        throw new AppError(404, 'Driver not found');
      }
    }

    return documentRepository.create(data);
  },

  async updateDocument(id: string, data: UpdateDocumentData) {
    const document = await documentRepository.findById(id);

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    return documentRepository.update(id, data);
  },

  async deleteDocument(id: string) {
    const document = await documentRepository.findById(id);

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    return documentRepository.delete(id);
  },

  getAlertsCount() {
    return documentRepository.countAlertsActive();
  },
};
