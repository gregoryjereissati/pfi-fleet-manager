import { DriverStatus } from '../enums';

/**
 * Ficha operacional do motorista.
 *
 * Nome e CPF vêm do usuário vinculado quando existe um — motorista e usuário
 * são a mesma pessoa, e a identidade não é duplicada. `linkedToUser` distingue
 * a ficha integrada da ficha anterior à integração, que ainda guarda a
 * identidade em si mesma.
 */
export interface DriverDto {
  id: string;
  userId: string | null;
  linkedToUser: boolean;
  name: string;
  cpf: string | null;
  email: string | null;
  cnh: string | null;
  cnhExpiry: string | null;
  phone: string | null;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

/** Cria a ficha de alguém que já tem conta na empresa. */
export interface CreateDriverDto {
  userId: string;
  phone?: string;
}

/** Só dados operacionais: a identidade é editada no perfil do usuário. */
export interface UpdateDriverDto {
  cnh?: string | null;
  cnhExpiry?: string | null;
  phone?: string | null;
  status?: DriverStatus;
}

/**
 * Vínculo entre motorista e veículo, com período.
 *
 * `endDate` nulo significa vínculo vigente. `startEstimated` marca os vínculos
 * migrados da relação anterior, que não guardava datas: o início é estimativa
 * até alguém confirmá-lo.
 */
export interface AssignmentDto {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleLabel: string;
  driverId: string;
  driverName: string;
  startDate: string;
  endDate: string | null;
  startEstimated: boolean;
}

export interface AssignDriversDto {
  driverIds: string[];
  startDate?: string;
}
