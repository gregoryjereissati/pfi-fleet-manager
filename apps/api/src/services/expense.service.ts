import { AuditAction, AuditEntity, EntryStatus } from '../types/db';
import { ExpenseType, UserRole } from '@fleet-manager/shared';
import { emTransacao } from '../config/database';
import { AppError } from '../middlewares/error-handler';
import {
  expenseRepository,
  type ExpenseFilters,
  type UpdateExpenseData,
} from '../repositories/expense.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import { assignmentService } from './assignment.service';
import { diffFields, listChanges, pickFields, recordChange } from '../lib/audit';
import { authorFilter, type AccessScope } from '../lib/access-scope';

const AUDITED_FIELDS = ['vehicleId', 'type', 'amount', 'date', 'description'] as const;

/** Filtros públicos da listagem, antes de receberem o recorte de acesso. */
export type ExpenseQuery = Omit<ExpenseFilters, 'companyId' | 'createdById'>;

export interface CreateExpenseInput {
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: Date;
  description?: string;
}

export const expenseService = {
  /**
   * Lista os lançamentos ao alcance de quem consulta.
   *
   * O motorista consulta os próprios lançamentos. Compartilhar um veículo com
   * outro motorista não dá acesso aos lançamentos dele.
   */
  async listExpenses(scope: AccessScope, filters: ExpenseQuery = {}) {
    return expenseRepository.findMany({
      ...filters,
      companyId: scope.companyId,
      createdById: authorFilter(scope),
    });
  },

  async getExpense(scope: AccessScope, id: string) {
    const expense = await expenseRepository.findById(id, scope.companyId, authorFilter(scope));
    if (!expense) throw new AppError(404, 'Expense not found');
    return expense;
  },

  /** Histórico de alterações do lançamento, do mais recente ao mais antigo. */
  async getExpenseHistory(scope: AccessScope, id: string) {
    await this.getExpense(scope, id);
    return listChanges(scope.companyId, AuditEntity.EXPENSE, id);
  },

  /**
   * Registra um lançamento.
   *
   * O veículo precisa ser da empresa e, no escopo do motorista, precisa estar
   * vinculado a ele agora. A autoria vem da identidade autenticada — um autor
   * enviado no corpo da requisição é ignorado, porque o corpo nem chega a ter
   * esse campo.
   */
  async createExpense(scope: AccessScope, data: CreateExpenseInput) {
    const vehicle = await vehicleRepository.findSummaryById(data.vehicleId, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    await assignmentService.assertVehicleAllowed(scope, data.vehicleId);

    return emTransacao(async (tx) => {
      const expense = await expenseRepository.create(tx, {
        ...data,
        companyId: scope.companyId,
        createdById: scope.userId,
      });

      await recordChange(tx, {
        entityType: AuditEntity.EXPENSE,
        entityId: expense.id,
        action: AuditAction.CREATE,
        scope,
        changes: {
          vehicleId: { de: null, para: data.vehicleId },
          amount: { de: null, para: data.amount },
          date: { de: null, para: data.date.toISOString() },
        },
      });

      return expense;
    });
  },

  /**
   * Corrige um lançamento.
   *
   * O autor corrige o que registrou; gerente e administrador corrigem no
   * escopo da empresa. Toda alteração grava autor, momento e os valores
   * anterior e novo — o histórico acumula, não substitui.
   */
  async updateExpense(scope: AccessScope, id: string, data: UpdateExpenseData) {
    const expense = await expenseRepository.findById(id, scope.companyId, authorFilter(scope));
    if (!expense) throw new AppError(404, 'Expense not found');

    if (expense.status === EntryStatus.CANCELLED) {
      throw new AppError(409, 'EXPENSE_CANCELLED');
    }

    // Trocar o veículo desloca custo de um veículo para outro; o destino
    // precisa passar pelas mesmas verificações do lançamento original.
    if (data.vehicleId && data.vehicleId !== expense.vehicleId) {
      const target = await vehicleRepository.findSummaryById(data.vehicleId, scope.companyId);
      if (!target) throw new AppError(404, 'Vehicle not found');
      await assignmentService.assertVehicleAllowed(scope, data.vehicleId);
    }

    // Só os campos corrigíveis seguem adiante. Autoria, empresa e situação de
    // cancelamento não são alcançáveis pelo corpo da requisição.
    const payload = pickFields<UpdateExpenseData>(data, AUDITED_FIELDS);

    // `amount` é declarado como decimal para que a comparação use a forma
    // canônica: o valor gravado chega do banco como texto e o informado chega
    // do formulário como número. Sem isso, informar de novo o mesmo valor
    // seria registrado como alteração.
    const changes = diffFields(
      expense as unknown as Record<string, unknown>,
      payload,
      AUDITED_FIELDS,
      ['amount'],
    );

    if (!changes) return expense;

    return emTransacao(async (tx) => {
      const updated = await expenseRepository.update(tx, id, payload, scope.userId);

      await recordChange(tx, {
        entityType: AuditEntity.EXPENSE,
        entityId: id,
        action: AuditAction.UPDATE,
        scope,
        changes,
      });

      return updated;
    });
  },

  /**
   * Cancela o lançamento: ele sai de todos os totais e gráficos e permanece
   * na lista, marcado, com o motivo e quem cancelou.
   */
  async cancelExpense(scope: AccessScope, id: string, reason: string) {
    const expense = await expenseRepository.findById(id, scope.companyId, authorFilter(scope));
    if (!expense) throw new AppError(404, 'Expense not found');
    if (expense.status === EntryStatus.CANCELLED) throw new AppError(409, 'ALREADY_CANCELLED');

    return emTransacao(async (tx) => {
      const cancelled = await expenseRepository.cancel(tx, id, scope.userId, reason);

      await recordChange(tx, {
        entityType: AuditEntity.EXPENSE,
        entityId: id,
        action: AuditAction.CANCEL,
        scope,
        reason,
        changes: { status: { de: EntryStatus.ACTIVE, para: EntryStatus.CANCELLED } },
      });

      return cancelled;
    });
  },

  /** Reverte o cancelamento, devolvendo o lançamento aos totais. */
  async uncancelExpense(scope: AccessScope, id: string) {
    const expense = await expenseRepository.findById(id, scope.companyId, authorFilter(scope));
    if (!expense) throw new AppError(404, 'Expense not found');
    if (expense.status !== EntryStatus.CANCELLED) throw new AppError(409, 'NOT_CANCELLED');

    return emTransacao(async (tx) => {
      const restored = await expenseRepository.uncancel(tx, id, scope.userId);

      await recordChange(tx, {
        entityType: AuditEntity.EXPENSE,
        entityId: id,
        action: AuditAction.UNCANCEL,
        scope,
        changes: { status: { de: EntryStatus.CANCELLED, para: EntryStatus.ACTIVE } },
      });

      return restored;
    });
  },

  /**
   * Exclusão física. Continua restrita a administrador e gerente, como antes,
   * e permanece distinta do cancelamento: aqui o registro deixa de existir.
   */
  async deleteExpense(scope: AccessScope, id: string) {
    if (scope.role === UserRole.OPERATOR) throw new AppError(403, 'Insufficient permissions');

    const expense = await expenseRepository.findById(id, scope.companyId);
    if (!expense) throw new AppError(404, 'Expense not found');

    return emTransacao(async (tx) => {
      await recordChange(tx, {
        entityType: AuditEntity.EXPENSE,
        entityId: id,
        action: AuditAction.DELETE,
        scope,
        changes: {
          amount: { de: expense.amount.toString(), para: null },
          date: { de: expense.date.toISOString(), para: null },
        },
      });

      return expenseRepository.delete(tx, id);
    });
  },
};
