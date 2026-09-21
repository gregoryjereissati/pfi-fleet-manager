export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  REJECTED = 'REJECTED',
}

/** Situação da empresa cliente. Inativa não recebe acesso nem novas solicitações. */
export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ExpenseType {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  FINE = 'FINE',
  IPVA = 'IPVA',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  DONE = 'DONE',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

/**
 * Situação de um lançamento. Cancelado sai de todos os totais e permanece na
 * lista, marcado, com o motivo e quem cancelou.
 */
export enum EntryStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export enum DocumentType {
  CRLV = 'CRLV',
  IPVA = 'IPVA',
  SEGURO = 'SEGURO',
  CNH = 'CNH',
  LICENCA = 'LICENCA',
  OUTRO = 'OUTRO',
}
