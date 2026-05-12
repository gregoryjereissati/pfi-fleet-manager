export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
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
}

export enum DocumentType {
  CRLV = 'CRLV',
  IPVA = 'IPVA',
  SEGURO = 'SEGURO',
  CNH = 'CNH',
  LICENCA = 'LICENCA',
  OUTRO = 'OUTRO',
}
