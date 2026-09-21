import { EntryStatus, ExpenseType } from '../enums';

export interface ExpenseDto {
  id: string;
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description?: string;
  status: EntryStatus;
  /**
   * Autor do lançamento. Nulo nos lançamentos anteriores ao registro de
   * autoria — a interface mostra "autor não registrado" em vez de atribuir a
   * autoria a quem estiver consultando.
   */
  createdById: string | null;
  updatedById: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description?: string;
}

export interface UpdateExpenseDto {
  /** Corrigível: mover o lançamento desloca custo entre dois veículos. */
  vehicleId?: string;
  type?: ExpenseType;
  amount?: number;
  date?: string;
  description?: string;
}

export interface CancelEntryDto {
  reason: string;
}

/** Uma entrada do histórico de alterações. */
export interface ChangeLogDto {
  id: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'CANCEL' | 'UNCANCEL' | 'DELETE' | 'LINK' | 'UNLINK';
  changes: Record<string, { de: string | number | boolean | null; para: string | number | boolean | null }> | null;
  reason: string | null;
  actorId: string | null;
  actorName: string;
  createdAt: string;
}
