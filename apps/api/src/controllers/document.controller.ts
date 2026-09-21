import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { DocumentType, type DocumentStatus } from '@fleet-manager/shared';
import { documentService } from '../services/document.service';
import { getScope } from '../lib/request-scope';

const documentQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(DocumentType).optional(),
  status: z
    .enum(['OK', 'EXPIRING_SOON', 'EXPIRED'] satisfies [DocumentStatus, ...DocumentStatus[]])
    .optional(),
  orderBy: z.enum(['expiryDate', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const documentController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = documentQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }

      const documents = await documentService.listDocuments(getScope(req), parsed.data);
      res.json(documents);
    } catch (err) {
      next(err);
    }
  },

  async getAlertCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await documentService.getAlertsCount(getScope(req));
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const document = await documentService.getDocument(getScope(req), req.params.id);
      res.json(document);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const document = await documentService.createDocument(getScope(req), req.body);
      res.status(201).json(document);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const document = await documentService.updateDocument(
        getScope(req),
        req.params.id,
        req.body,
      );
      res.json(document);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const document = await documentService.deleteDocument(getScope(req), req.params.id);
      res.json(document);
    } catch (err) {
      next(err);
    }
  },
};
