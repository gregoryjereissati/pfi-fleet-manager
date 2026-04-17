import { ExpenseType } from '../enums';

export interface ExpenseDto {
  id: string;
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
}

export interface CreateExpenseDto {
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description?: string;
}

export interface UpdateExpenseDto {
  type?: ExpenseType;
  amount?: number;
  date?: string;
  description?: string;
}
