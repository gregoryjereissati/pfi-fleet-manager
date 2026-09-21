import type { AssignmentDto, DriverDto, DriverStatus } from '@fleet-manager/shared';
import { resolveDriverIdentity, type DriverIdentitySource } from './driver-identity';

type DriverRow = DriverIdentitySource & {
  id: string;
  userId: string | null;
  cnh: string | null;
  /** Data civil, `YYYY-MM-DD`. Não passa por `Date`: ver config/database. */
  cnhExpiry: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Converte a ficha para o contrato do cliente, resolvendo a identidade em um
 * único lugar: a tela recebe nome e CPF prontos e não precisa saber se vieram
 * do usuário ou da própria ficha.
 */
export function toDriverDto(driver: DriverRow): DriverDto {
  const identity = resolveDriverIdentity(driver);

  return {
    id: driver.id,
    userId: driver.userId,
    linkedToUser: identity.linkedToUser,
    name: identity.name,
    cpf: identity.cpf,
    email: identity.email,
    cnh: driver.cnh,
    cnhExpiry: driver.cnhExpiry,
    phone: driver.phone,
    status: driver.status as DriverStatus,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}

type AssignmentRow = {
  id: string;
  vehicleId: string;
  driverId: string;
  startDate: Date;
  endDate: Date | null;
  startEstimated: boolean;
  vehicle: { plate: string; brand: string; model: string };
  driver: DriverIdentitySource;
};

export function toAssignmentDto(assignment: AssignmentRow): AssignmentDto {
  return {
    id: assignment.id,
    vehicleId: assignment.vehicleId,
    vehiclePlate: assignment.vehicle.plate,
    vehicleLabel: `${assignment.vehicle.plate} - ${assignment.vehicle.brand} ${assignment.vehicle.model}`,
    driverId: assignment.driverId,
    driverName: resolveDriverIdentity(assignment.driver).name,
    startDate: assignment.startDate.toISOString(),
    endDate: assignment.endDate ? assignment.endDate.toISOString() : null,
    startEstimated: assignment.startEstimated,
  };
}

/** Resumo da ficha, para quando ela aparece dentro de outro registro. */
export interface DriverSummaryDto {
  id: string;
  name: string;
  cpf: string | null;
  status: DriverStatus;
  linkedToUser: boolean;
}

export function toDriverSummaryDto(
  driver: DriverIdentitySource & { id: string; status: string },
): DriverSummaryDto {
  const identity = resolveDriverIdentity(driver);

  return {
    id: driver.id,
    name: identity.name,
    cpf: identity.cpf,
    status: driver.status as DriverStatus,
    linkedToUser: identity.linkedToUser,
  };
}
