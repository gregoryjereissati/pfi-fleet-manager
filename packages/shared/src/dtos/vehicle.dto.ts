import { VehicleStatus } from '../enums';

export interface VehicleDto {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleDto {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
}

export interface UpdateVehicleDto {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status?: VehicleStatus;
}
