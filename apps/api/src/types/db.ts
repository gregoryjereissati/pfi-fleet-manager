/**
 * Tipos do modelo de dados.
 *
 * Substitui o que era gerado pelo `@prisma/client`. Cada enumeração aparece
 * como objeto constante **e** como tipo de mesmo nome, para que os dois usos
 * do código existente continuem válidos:
 *
 *     import { UserStatus } from '../types/db';
 *     if (user.status === UserStatus.ACTIVE) { ... }   // valor
 *     function f(s: UserStatus) { ... }                 // tipo
 *
 * Os rótulos são idênticos aos do banco (`create type ... as enum`). Mudá-los
 * aqui sem mudar a migration correspondente quebraria a gravação.
 */

// -----------------------------------------------------------------------------
// Enumerações
// -----------------------------------------------------------------------------

export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  REJECTED: 'REJECTED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const CompanyStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];

export const VehicleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const DriverStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const ExpenseType = {
  FUEL: 'FUEL',
  MAINTENANCE: 'MAINTENANCE',
  FINE: 'FINE',
  IPVA: 'IPVA',
  INSURANCE: 'INSURANCE',
  OTHER: 'OTHER',
} as const;
export type ExpenseType = (typeof ExpenseType)[keyof typeof ExpenseType];

export const MaintenanceType = {
  PREVENTIVE: 'PREVENTIVE',
  CORRECTIVE: 'CORRECTIVE',
} as const;
export type MaintenanceType = (typeof MaintenanceType)[keyof typeof MaintenanceType];

export const MaintenanceStatus = {
  SCHEDULED: 'SCHEDULED',
  DONE: 'DONE',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;
export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

/**
 * Situação de um lançamento. `CANCELLED` anula o efeito do lançamento sem
 * apagar o registro: ele permanece na lista, marcado, e sai de todos os totais.
 */
export const EntryStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;
export type EntryStatus = (typeof EntryStatus)[keyof typeof EntryStatus];

export const DocumentType = {
  CRLV: 'CRLV',
  IPVA: 'IPVA',
  SEGURO: 'SEGURO',
  CNH: 'CNH',
  LICENCA: 'LICENCA',
  OUTRO: 'OUTRO',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const AuditEntity = {
  EXPENSE: 'EXPENSE',
  MAINTENANCE: 'MAINTENANCE',
  DOCUMENT: 'DOCUMENT',
  VEHICLE: 'VEHICLE',
  DRIVER: 'DRIVER',
  USER: 'USER',
  ASSIGNMENT: 'ASSIGNMENT',
  /** Ações do super administrador sobre a própria empresa. */
  COMPANY: 'COMPANY',
} as const;
export type AuditEntity = (typeof AuditEntity)[keyof typeof AuditEntity];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  CANCEL: 'CANCEL',
  UNCANCEL: 'UNCANCEL',
  DELETE: 'DELETE',
  LINK: 'LINK',
  UNLINK: 'UNLINK',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// -----------------------------------------------------------------------------
// Linhas das tabelas
// -----------------------------------------------------------------------------
//
// Duas convenções de tipo que valem para todas as interfaces abaixo, e que
// decorrem de como o driver entrega cada tipo do PostgreSQL:
//
//   * **Dinheiro é `string`.** Colunas `numeric` chegam como texto. É
//     deliberado: converter para `number` perderia precisão. A conversão para
//     cálculo acontece onde o valor é usado, explicitamente.
//
//   * **Data civil é `string` no formato `YYYY-MM-DD`.** Colunas `date`
//     (vencimentos) não têm hora e não dependem de fuso. Colunas `timestamptz`
//     — que marcam um instante — chegam como `Date`.

export interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  joinCode: string;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  authUserId: string | null;
  role: UserRole;
  requestedRole: UserRole;
  status: UserStatus;
  /**
   * Perfil da plataforma: não pertence a empresa alguma e opera dentro da que
   * escolher. Não é um papel — papel descreve a posição dentro de uma empresa.
   */
  isSuperAdmin: boolean;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  companyId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  companyId: string;
  userId: string | null;
  name: string | null;
  cpf: string | null;
  cnh: string | null;
  /** Data civil, `YYYY-MM-DD`. */
  cnhExpiry: string | null;
  phone: string | null;
  status: DriverStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDriverAssignment {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string;
  startDate: Date;
  endDate: Date | null;
  startEstimated: boolean;
  /**
   * Coluna gerada pelo banco: existe enquanto `endDate` é nulo, e serve à
   * restrição de unicidade que impede dois vínculos vigentes para o mesmo par.
   * Somente leitura — escrever nela é erro do PostgreSQL.
   */
  activeLinkKey: string | null;
  createdById: string | null;
  endedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  companyId: string;
  vehicleId: string;
  type: ExpenseType;
  /** Valor monetário em texto decimal. Nunca converter para `number` sem necessidade. */
  amount: string;
  date: Date;
  description: string | null;
  status: EntryStatus;
  createdById: string | null;
  updatedById: string | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Maintenance {
  id: string;
  companyId: string;
  vehicleId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  scheduledDate: Date;
  completedDate: Date | null;
  createdById: string | null;
  updatedById: string | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  companyId: string;
  vehicleId: string | null;
  driverId: string | null;
  type: DocumentType;
  /** Data civil, `YYYY-MM-DD`. */
  expiryDate: string;
  fileUrl: string | null;
  alertSent: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChangeLog {
  id: string;
  companyId: string;
  entityType: AuditEntity;
  entityId: string;
  action: AuditAction;
  changes: Record<string, unknown> | null;
  reason: string | null;
  actorId: string | null;
  actorName: string;
  createdAt: Date;
}
