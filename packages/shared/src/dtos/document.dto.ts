import { DocumentType } from '../enums';

export type DocumentStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED';

export interface DocumentDto {
  id: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  driverId: string | null;
  driverName: string | null;
  type: DocumentType;
  expiryDate: string;
  fileUrl: string | null;
  alertSent: boolean;
  status: DocumentStatus;
  createdAt: string;
}

export interface CreateDocumentDto {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  expiryDate: string;
  fileUrl?: string;
}

export interface UpdateDocumentDto {
  type?: DocumentType;
  expiryDate?: string;
  fileUrl?: string;
}
