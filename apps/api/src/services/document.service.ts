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
import { assinarEnvio, assinarLeitura, removerArquivo } from '../lib/storage';
import { caminhoDoAnexo, type ExtensaoDeAnexo } from '../lib/anexos';
import type { AccessScope } from '../lib/access-scope';

const AUDITED_FIELDS = ['type', 'expiryDate', 'fileUrl'] as const;

export type DocumentQuery = Omit<DocumentFilters, 'companyId' | 'driverScope'>;

export interface UploadUrlInput {
  vehicleId?: string;
  driverId?: string;
  extensao: ExtensaoDeAnexo;
}

export interface CreateDocumentInput {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  /** Data civil, `YYYY-MM-DD`. */
  expiryDate: string;
  fileUrl?: string;
}

/**
 * Entidade dona do documento, conferida dentro da empresa de quem pede.
 *
 * Veículo e motorista são localizados **dentro da empresa**: um documento — e o
 * anexo dele — não chega a ser vinculado a uma entidade de outra empresa,
 * porque a entidade não é encontrada.
 *
 * Devolve o identificador da entidade, que é o segundo segmento do caminho do
 * anexo no Storage.
 */
async function titularDoDocumento(
  scope: AccessScope,
  data: { vehicleId?: string; driverId?: string },
): Promise<string> {
  if (!data.vehicleId && !data.driverId) {
    throw new AppError(400, 'vehicleId or driverId is required');
  }

  if (data.vehicleId && data.driverId) {
    throw new AppError(400, 'Document must belong to either a vehicle or a driver');
  }

  if (data.vehicleId) {
    const vehicle = await vehicleRepository.findSummaryById(data.vehicleId, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    return data.vehicleId;
  }

  const driver = await driverRepository.findById(data.driverId as string, scope.companyId);
  if (!driver) throw new AppError(404, 'Driver not found');

  return data.driverId as string;
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
    await titularDoDocumento(scope, data);

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

    const updated = await emTransacao(async (tx) => {
      const alterado = await documentRepository.update(tx, id, payload, scope.userId);

      if (changes) {
        await recordChange(tx, {
          entityType: AuditEntity.DOCUMENT,
          entityId: id,
          action: AuditAction.UPDATE,
          scope,
          changes,
        });
      }

      return alterado;
    });

    // Trocar o anexo grava o caminho novo; o anterior deixa de ser alcançável
    // por qualquer tela. A remoção vem **depois** da transação: se ela tivesse
    // sido revertida, o documento ainda apontaria para o arquivo antigo.
    if (payload.fileUrl && document.fileUrl && payload.fileUrl !== document.fileUrl) {
      await removerArquivo(document.fileUrl);
    }

    return updated;
  },

  async deleteDocument(scope: AccessScope, id: string) {
    const document = await documentRepository.findById(id, scope.companyId);
    if (!document) throw new AppError(404, 'Document not found');

    const removido = await emTransacao(async (tx) => {
      await recordChange(tx, {
        entityType: AuditEntity.DOCUMENT,
        entityId: id,
        action: AuditAction.DELETE,
        scope,
        changes: { type: { de: document.type, para: null } },
      });

      return documentRepository.delete(tx, id);
    });

    // Sem a linha, o arquivo não tem mais como ser pedido: só a API alcança o
    // bucket, e ela parte sempre do documento.
    if (document.fileUrl) await removerArquivo(document.fileUrl);

    return removido;
  },

  /**
   * Endereço temporário para ler o anexo de um documento.
   *
   * O recorte é o mesmo da consulta ao documento — `getDocument` já devolve 404
   * para o que está fora do alcance de quem pede, inclusive o documento pessoal
   * de um colega da mesma empresa. A regra não é reescrita aqui: é justamente
   * por reaproveitá-la que o arquivo obedece à mesma condição que a linha.
   */
  async getFileUrl(scope: AccessScope, id: string): Promise<{ url: string }> {
    const document = await this.getDocument(scope, id);

    // Documento sem anexo não tem arquivo a servir. A resposta é a mesma de um
    // documento inexistente: não há o que abrir.
    if (!document.fileUrl) throw new AppError(404, 'Document file not found');

    return { url: await assinarLeitura(document.fileUrl) };
  },

  /**
   * Endereço temporário para enviar um anexo, com o caminho já decidido.
   *
   * A empresa do caminho vem do recorte de acesso, nunca do corpo da
   * requisição: quem envia escolhe o arquivo, não onde ele cai.
   *
   * O caminho devolvido é o que o cliente grava depois em `fileUrl`. Um envio
   * sem o documento correspondente deixa apenas um arquivo órfão, que nenhuma
   * tela alcança.
   */
  async createUploadUrl(
    scope: AccessScope,
    data: UploadUrlInput,
  ): Promise<{ url: string; caminho: string }> {
    const entityId = await titularDoDocumento(scope, data);
    const caminho = caminhoDoAnexo(scope.companyId, entityId, data.extensao);

    return { url: await assinarEnvio(caminho), caminho };
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
