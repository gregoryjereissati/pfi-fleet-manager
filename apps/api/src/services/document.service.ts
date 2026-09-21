import { AuditAction, AuditEntity } from '../types/db';
import { DocumentType } from '@fleet-manager/shared';
import { emTransacao } from '../config/database';
import { AppError } from '../middlewares/error-handler';
import {
  documentRepository,
  type DocumentFilters,
  type UpdateDocumentData,
} from '../repositories/document.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import { driverRepository } from '../repositories/driver.repository';
import { assignmentService } from './assignment.service';
import { diffFields, pickFields, recordChange } from '../lib/audit';
import type { AccessScope } from '../lib/access-scope';

const AUDITED_FIELDS = ['type', 'expiryDate', 'fileUrl'] as const;

export type DocumentQuery = Omit<DocumentFilters, 'companyId' | 'driverScope'>;

export interface CreateDocumentInput {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  /** Data civil, `YYYY-MM-DD`. */
  expiryDate: string;
  fileUrl?: string;
}

export const documentService = {
  /**
   * Lista documentos ao alcance de quem consulta.
   *
   * O motorista alcança os próprios documentos pessoais e os documentos dos
   * veículos a que está vinculado. Documentos pessoais de outros motoristas
   * ficam de fora, mesmo quando o veículo é compartilhado.
   */
  async listDocuments(scope: AccessScope, filters: DocumentQuery = {}) {
    const driverScope = await assignmentService.driverDataScope(scope);

    return documentRepository.findMany({
      ...filters,
      companyId: scope.companyId,
      driverScope,
    });
  },

  async getDocument(scope: AccessScope, id: string) {
    const driverScope = await assignmentService.driverDataScope(scope);
    const document = await documentRepository.findById(id, scope.companyId, driverScope);

    if (!document) throw new AppError(404, 'Document not found');

    return document;
  },

  async createDocument(scope: AccessScope, data: CreateDocumentInput) {
    if (!data.vehicleId && !data.driverId) {
      throw new AppError(400, 'vehicleId or driverId is required');
    }

    if (data.vehicleId && data.driverId) {
      throw new AppError(400, 'Document must belong to either a vehicle or a driver');
    }

    // Veículo e motorista são localizados dentro da empresa: um documento não
    // chega a ser anexado a uma entidade de outra empresa.
    if (data.vehicleId) {
      const vehicle = await vehicleRepository.findSummaryById(data.vehicleId, scope.companyId);
      if (!vehicle) throw new AppError(404, 'Vehicle not found');
    }

    if (data.driverId) {
      const driver = await driverRepository.findById(data.driverId, scope.companyId);
      if (!driver) throw new AppError(404, 'Driver not found');
    }

    return emTransacao(async (tx) => {
      const document = await documentRepository.create(tx, {
        ...data,
        companyId: scope.companyId,
        createdById: scope.userId,
      });

      await recordChange(tx, {
        entityType: AuditEntity.DOCUMENT,
        entityId: document.id,
        action: AuditAction.CREATE,
        scope,
        changes: {
          type: { de: null, para: document.type },
          expiryDate: { de: null, para: document.expiryDate },
        },
      });

      return document;
    });
  },

  async updateDocument(scope: AccessScope, id: string, data: UpdateDocumentData) {
    const document = await documentRepository.findById(id, scope.companyId);
    if (!document) throw new AppError(404, 'Document not found');

    const payload = pickFields<UpdateDocumentData>(data, AUDITED_FIELDS);

    const changes = diffFields(
      document as unknown as Record<string, unknown>,
      payload,
      AUDITED_FIELDS,
    );

    return emTransacao(async (tx) => {
      const updated = await documentRepository.update(tx, id, payload, scope.userId);

      if (changes) {
        await recordChange(tx, {
          entityType: AuditEntity.DOCUMENT,
          entityId: id,
          action: AuditAction.UPDATE,
          scope,
          changes,
        });
      }

      return updated;
    });
  },

  async deleteDocument(scope: AccessScope, id: string) {
    const document = await documentRepository.findById(id, scope.companyId);
    if (!document) throw new AppError(404, 'Document not found');

    return emTransacao(async (tx) => {
      await recordChange(tx, {
        entityType: AuditEntity.DOCUMENT,
        entityId: id,
        action: AuditAction.DELETE,
        scope,
        changes: { type: { de: document.type, para: null } },
      });

      return documentRepository.delete(tx, id);
    });
  },

  /**
   * Contagem de alertas, no mesmo recorte da central.
   *
   * O número do menu e o total listado saem da mesma condição — o que muda
   * entre um usuário e outro é o recorte, não o critério.
   */
  async getAlertsCount(scope: AccessScope) {
    const driverScope = await assignmentService.driverDataScope(scope);
    return documentRepository.countAlertsActive(scope.companyId, driverScope);
  },
};
