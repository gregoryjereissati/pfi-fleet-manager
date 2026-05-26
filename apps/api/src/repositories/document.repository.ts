import { type DocumentStatus, type DocumentType } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface DocumentFilters {
  vehicleId?: string;
  driverId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  orderBy?: 'expiryDate' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateDocumentData {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  expiryDate: Date;
  fileUrl?: string;
}

export interface UpdateDocumentData {
  type?: DocumentType;
  expiryDate?: Date;
  fileUrl?: string;
}

const documentInclude = {
  vehicle: {
    select: {
      id: true,
      plate: true,
    },
  },
  driver: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const validOrderBy = new Set(['expiryDate', 'createdAt']);

function getThresholds(days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + days);

  return { today, threshold };
}

function computeStatus(expiryDate: Date): DocumentStatus {
  const { today, threshold } = getThresholds();

  if (expiryDate < today) return 'EXPIRED';
  if (expiryDate <= threshold) return 'EXPIRING_SOON';
  return 'OK';
}

function statusToWhere(status: DocumentStatus) {
  const { today, threshold } = getThresholds();

  if (status === 'EXPIRED') {
    return { expiryDate: { lt: today } };
  }

  if (status === 'EXPIRING_SOON') {
    return { expiryDate: { gte: today, lte: threshold } };
  }

  return { expiryDate: { gt: threshold } };
}

function mapDocument(document: {
  id: string;
  vehicleId: string | null;
  vehicle: { id: string; plate: string } | null;
  driverId: string | null;
  driver: { id: string; name: string } | null;
  type: string;
  expiryDate: Date;
  fileUrl: string | null;
  alertSent: boolean;
  createdAt: Date;
}) {
  return {
    id: document.id,
    vehicleId: document.vehicleId,
    vehiclePlate: document.vehicle?.plate ?? null,
    driverId: document.driverId,
    driverName: document.driver?.name ?? null,
    type: document.type as DocumentType,
    expiryDate: document.expiryDate.toISOString(),
    fileUrl: document.fileUrl,
    alertSent: document.alertSent,
    status: computeStatus(document.expiryDate),
    createdAt: document.createdAt.toISOString(),
  };
}

export const documentRepository = {
  async findMany(filters: DocumentFilters = {}) {
    const {
      vehicleId,
      driverId,
      type,
      status,
      orderBy = 'expiryDate',
      order = 'asc',
    } = filters;

    const safeOrderBy = validOrderBy.has(orderBy) ? orderBy : 'expiryDate';

    const documents = await prisma.document.findMany({
      where: {
        ...(vehicleId && { vehicleId }),
        ...(driverId && { driverId }),
        ...(type && { type }),
        ...(status && statusToWhere(status)),
      },
      include: documentInclude,
      orderBy: { [safeOrderBy]: order },
    });

    return documents.map(mapDocument);
  },

  async findById(id: string) {
    const document = await prisma.document.findUnique({
      where: { id },
      include: documentInclude,
    });

    return document ? mapDocument(document) : null;
  },

  async create(data: CreateDocumentData) {
    const document = await prisma.document.create({
      data,
      include: documentInclude,
    });

    return mapDocument(document);
  },

  async update(id: string, data: UpdateDocumentData) {
    const document = await prisma.document.update({
      where: { id },
      data,
      include: documentInclude,
    });

    return mapDocument(document);
  },

  async delete(id: string) {
    const document = await prisma.document.delete({
      where: { id },
      include: documentInclude,
    });

    return mapDocument(document);
  },

  countAlertsActive() {
    const { threshold } = getThresholds();

    return prisma.document.count({
      where: {
        expiryDate: { lte: threshold },
      },
    });
  },

  findNeedingAlert(days: number) {
    const { threshold } = getThresholds(days);

    return prisma.document.findMany({
      where: {
        alertSent: false,
        expiryDate: { lte: threshold },
      },
      select: { id: true },
    });
  },

  markAlertSent(ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return prisma.document.updateMany({
      where: { id: { in: ids } },
      data: { alertSent: true },
    });
  },
};
