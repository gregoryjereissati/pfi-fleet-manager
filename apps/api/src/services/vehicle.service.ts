import {
  CreateVehicleData,
  UpdateVehicleData,
  VehicleFilters,
  vehicleRepository,
} from '../repositories/vehicle.repository';
import { driverRepository } from '../repositories/driver.repository';
import { AppError } from '../middlewares/error-handler';

export const vehicleService = {
  async listVehicles(filters: VehicleFilters) {
    return vehicleRepository.findMany(filters);
  },

  async getVehicle(id: string) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicle;
  },

  async createVehicle(data: CreateVehicleData) {
    const existingPlate = await vehicleRepository.findByPlate(data.plate);
    if (existingPlate) throw new AppError(409, 'Plate already in use');
    return vehicleRepository.create(data);
  },

  async updateVehicle(id: string, data: UpdateVehicleData) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    if (data.plate && data.plate !== vehicle.plate) {
      const existingPlate = await vehicleRepository.findByPlate(data.plate);
      if (existingPlate) throw new AppError(409, 'Plate already in use');
    }

    return vehicleRepository.update(id, data);
  },

  async deleteVehicle(id: string) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicleRepository.setInactive(id);
  },

  async linkDrivers(vehicleId: string, driverIds: string[]) {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    const drivers = await driverRepository.findManyByIds(driverIds);
    if (drivers.length !== driverIds.length) {
      throw new AppError(404, 'Driver not found');
    }

    return vehicleRepository.connectDrivers(vehicleId, driverIds);
  },

  async unlinkDriver(vehicleId: string, driverId: string) {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(404, 'Driver not found');

    return vehicleRepository.disconnectDriver(vehicleId, driverId);
  },
};
