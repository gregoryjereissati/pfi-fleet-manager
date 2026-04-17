import { DriverStatus } from '../enums';

export interface DriverDto {
  id: string;
  name: string;
  cpf: string;
  cnh: string;
  cnhExpiry: string;
  phone?: string;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverDto {
  name: string;
  cpf: string;
  cnh: string;
  cnhExpiry: string;
  phone?: string;
}

export interface UpdateDriverDto {
  name?: string;
  cnh?: string;
  cnhExpiry?: string;
  phone?: string;
  status?: DriverStatus;
}
